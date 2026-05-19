import { GatewayClient, Session, isAxiosNetworkError } from "./api.js";
import {
  USERS,
  CONNECTIONS,
  REAL_INTERVIEWS,
  GRADING_REPORT_SAMPLE,
  AVATAR_PNG_BASE64,
  UserFixture,
  InterviewFixture,
} from "./fixtures.js";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://api-gateway:3000";
const AVATAR_PNG = Buffer.from(AVATAR_PNG_BASE64, "base64");

type Stat = "created" | "skipped" | "error";

class Counter {
  private buckets: Record<string, Record<Stat, number>> = {};
  bump(kind: string, stat: Stat) {
    if (!this.buckets[kind]) this.buckets[kind] = { created: 0, skipped: 0, error: 0 };
    this.buckets[kind][stat] += 1;
  }
  print() {
    console.log("\n=== Seed summary ===");
    for (const [kind, counts] of Object.entries(this.buckets)) {
      console.log(
        `  ${kind.padEnd(20)} created=${counts.created} skipped=${counts.skipped} error=${counts.error}`,
      );
    }
  }
  hasErrors(): boolean {
    return Object.values(this.buckets).some((c) => c.error > 0);
  }
}

async function waitForGateway(client: GatewayClient): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      await client.login("seed-probe@example.com", "definitely-wrong");
      return;
    } catch (err) {
      if (!isAxiosNetworkError(err)) return;
      console.log("[seed] gateway not reachable yet, retrying…");
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(`gateway at ${GATEWAY_URL} not reachable after 30s`);
}

async function ensureUser(
  client: GatewayClient,
  fixture: UserFixture,
  counter: Counter,
): Promise<Session> {
  let session = await client.login(fixture.email, fixture.password);
  let isNew = false;
  if (!session) {
    const created = await client.register(
      fixture.email,
      fixture.password,
      fixture.name,
      fixture.surname,
      fixture.role,
    );
    if (!created) {
      session = await client.login(fixture.email, fixture.password);
      if (!session) {
        throw new Error(
          `cannot create or log in as ${fixture.email}: already exists with different credentials`,
        );
      }
    } else {
      session = created;
      isNew = true;
    }
  }
  counter.bump("users", isNew ? "created" : "skipped");

  const user = await client.getUser(session, session.userId);
  if (!user?.country) {
    await client.updateProfile(session, fixture.profile);
    counter.bump("profiles", "created");
  } else {
    counter.bump("profiles", "skipped");
  }

  if (!user?.profile_pic_url) {
    await client.uploadAvatar(session, AVATAR_PNG);
    counter.bump("avatars", "created");
  } else {
    counter.bump("avatars", "skipped");
  }

  console.log(
    `[seed] ${isNew ? "registered" : "logged in as"} ${fixture.role} ${fixture.email} (user_id=${session.userId})`,
  );
  return session;
}

async function ensureConnection(
  client: GatewayClient,
  recruiter: Session,
  candidate: Session,
  counter: Counter,
) {
  const existing = await client.listConnections(recruiter, recruiter.userId);
  if (existing.some((c) => c?.user_id === candidate.userId)) {
    counter.bump("connections", "skipped");
    return;
  }
  const linkToken = await client.generateInviteLink(recruiter);
  await client.acceptInvite(candidate, linkToken);
  counter.bump("connections", "created");
  console.log(`[seed] connected ${recruiter.email} <-> ${candidate.email}`);
}

async function ensureRealInterview(
  client: GatewayClient,
  recruiter: Session,
  candidate: Session,
  fixture: InterviewFixture,
  counter: Counter,
): Promise<{ id: number; status: string } | null> {
  const before = await client.listRealInterviewsForRecruiter(recruiter, recruiter.userId);
  const existing = before.find(
    (i) =>
      i.candidate_id === candidate.userId &&
      i.question_id === fixture.question_id &&
      i.job_title === fixture.job_title,
  );
  if (existing) {
    counter.bump("real_interviews", "skipped");
    return { id: existing.unique_interview_id, status: existing.status };
  }
  const due = new Date(Date.now() + fixture.due_date_days_from_now * 86_400_000);
  await client.createRealInterview(recruiter, {
    recruiter_id: recruiter.userId,
    candidate_id: candidate.userId,
    question_id: fixture.question_id,
    job_title: fixture.job_title,
    due_date: due.toISOString(),
  });
  counter.bump("real_interviews", "created");
  const after = await client.listRealInterviewsForRecruiter(recruiter, recruiter.userId);
  const created = after.find(
    (i) =>
      i.candidate_id === candidate.userId &&
      i.question_id === fixture.question_id &&
      i.job_title === fixture.job_title,
  );
  if (!created) return null;
  return { id: created.unique_interview_id, status: created.status };
}

async function advanceLifecycle(
  client: GatewayClient,
  candidate: Session,
  recruiter: Session,
  interviewId: number,
  currentStatus: string,
  target: InterviewFixture["lifecycle"],
  counter: Counter,
) {
  // For `past_due_date`, listing the interview already triggered the server-side
  // auto-flip from `scheduled` to `past_due_date`. Nothing else to do.
  if (target === "scheduled" || target === "past_due_date") {
    counter.bump("interview_lifecycle", "skipped");
    return;
  }

  // To progress to completed/graded we must take it as the candidate, which only
  // works while status === "scheduled". On re-runs the status will already be
  // beyond "scheduled" and we leave it alone.
  if (currentStatus !== "scheduled") {
    counter.bump("interview_lifecycle", "skipped");
  } else {
    const startStatus = await client.startInterview(candidate, interviewId);
    if (startStatus !== 200) {
      counter.bump("interview_lifecycle", "error");
      console.warn(`[seed] startInterview(${interviewId}) returned ${startStatus}`);
      return;
    }
    const submitStatus = await client.submitInterview(
      candidate,
      interviewId,
      `Seeded submission for interview ${interviewId}`,
    );
    if (submitStatus !== 200) {
      counter.bump("interview_lifecycle", "error");
      console.warn(`[seed] submitInterview(${interviewId}) returned ${submitStatus}`);
      return;
    }
    counter.bump("interview_lifecycle", "created");
  }

  if (target === "graded") {
    // Grading is itself idempotent at the DB layer (status transitions to graded),
    // so we always try — if it returns 409/4xx because already graded, count skip.
    const gradeStatus = await client.createGradingReport(
      recruiter,
      interviewId,
      GRADING_REPORT_SAMPLE,
    );
    if (gradeStatus === 201) counter.bump("grading_reports", "created");
    else if (gradeStatus >= 400 && gradeStatus < 500) counter.bump("grading_reports", "skipped");
    else {
      counter.bump("grading_reports", "error");
      console.warn(`[seed] createGradingReport(${interviewId}) returned ${gradeStatus}`);
    }
  }
}

async function main() {
  console.log(`[seed] starting against ${GATEWAY_URL}`);
  const client = new GatewayClient(GATEWAY_URL);
  await waitForGateway(client);

  const counter = new Counter();
  const sessions = new Map<string, Session>();

  for (const user of USERS) {
    sessions.set(user.key, await ensureUser(client, user, counter));
  }

  for (const conn of CONNECTIONS) {
    const recruiter = sessions.get(conn.recruiter);
    const candidate = sessions.get(conn.candidate);
    if (!recruiter || !candidate) continue;
    await ensureConnection(client, recruiter, candidate, counter);
  }

  for (const fixture of REAL_INTERVIEWS) {
    const recruiter = sessions.get(fixture.recruiter);
    const candidate = sessions.get(fixture.candidate);
    if (!recruiter || !candidate) continue;
    const result = await ensureRealInterview(client, recruiter, candidate, fixture, counter);
    if (!result) continue;
    await advanceLifecycle(
      client,
      candidate,
      recruiter,
      result.id,
      result.status,
      fixture.lifecycle,
      counter,
    );
  }

  counter.print();
  if (counter.hasErrors()) {
    console.warn("[seed] completed with non-fatal errors (see above)");
  } else {
    console.log("[seed] completed cleanly");
  }
}

main().catch((err) => {
  console.error("[seed] FATAL:", err);
  process.exit(1);
});
