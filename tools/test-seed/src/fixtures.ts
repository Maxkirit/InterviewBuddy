export interface UserFixture {
  key: string;
  email: string;
  password: string;
  name: string;
  surname: string;
  role: "recruiter" | "candidate";
  profile: {
    gender: "male" | "female" | "non_binary" | "prefer_not_to_say";
    date_of_birth: string;
    country: string;
    job_title: string;
    organization: string;
    bio: string;
    linkedin_link: string;
    phone_number: string;
  };
}

export interface ConnectionFixture {
  recruiter: string;
  candidate: string;
  /** When true, this connection is intended as expendable — meant to be revoked during testing. */
  revocable?: boolean;
}

export interface InterviewFixture {
  recruiter: string;
  candidate: string;
  question_id: number;
  job_title: string;
  /** Days from now; may be negative to seed a past-due interview. */
  due_date_days_from_now: number;
  lifecycle: "scheduled" | "past_due_date" | "completed" | "graded";
}

const PASSWORD = "Seed!Password1";

function makeUser(
  key: string,
  role: "recruiter" | "candidate",
  index: number,
  name: string,
  surname: string,
): UserFixture {
  return {
    key,
    email: `seed+${role}${index}@example.com`,
    password: PASSWORD,
    name,
    surname,
    role,
    profile: {
      gender: index % 2 === 0 ? "female" : "male",
      date_of_birth: `199${index % 10}-0${(index % 9) + 1}-15`,
      country: role === "recruiter" ? "France" : "Canada",
      job_title: role === "recruiter" ? "Talent Partner" : "Software Engineer",
      organization: role === "recruiter" ? "Acme Hiring" : "Initech",
      bio: `${role} fixture #${index} created by test-seed`,
      linkedin_link: `https://linkedin.com/in/seed-${role}-${index}`,
      phone_number: `+33${String(100000000 + index).padStart(9, "0")}`,
    },
  };
}

export const USERS: UserFixture[] = [
  makeUser("recruiter1", "recruiter", 1, "Renee", "Recruiter"),
  makeUser("recruiter2", "recruiter", 2, "Rohan", "Hire"),
  makeUser("recruiter3", "recruiter", 3, "Rita", "Talent"),
  makeUser("candidate1", "candidate", 1, "Cara", "Candidate"),
  makeUser("candidate2", "candidate", 2, "Caleb", "Coder"),
  makeUser("candidate3", "candidate", 3, "Chen", "Devs"),
];

// Full bipartite mesh: every recruiter is connected to every candidate (3 * 3 = 9).
// Connections not load-bearing for a lifecycle interview are flagged revocable so
// testers know which ones are safe to delete without breaking other fixtures.
export const CONNECTIONS: ConnectionFixture[] = [
  { recruiter: "recruiter1", candidate: "candidate1" }, // used by scheduled interview
  { recruiter: "recruiter1", candidate: "candidate2" }, // used by graded interview
  { recruiter: "recruiter1", candidate: "candidate3", revocable: true },
  { recruiter: "recruiter2", candidate: "candidate1", revocable: true },
  { recruiter: "recruiter2", candidate: "candidate2" }, // used by past_due_date interview
  { recruiter: "recruiter2", candidate: "candidate3", revocable: true },
  { recruiter: "recruiter3", candidate: "candidate1", revocable: true },
  { recruiter: "recruiter3", candidate: "candidate2", revocable: true },
  { recruiter: "recruiter3", candidate: "candidate3" }, // used by completed interview
];

// One interview per lifecycle state. Question IDs 1–3 are the only ones pre-seeded
// by infrastructure/databases/interview-store-db/entrypoint.sh (URL Shortener /
// Dropbox / Distributed Counter). The three "active" lifecycle interviews
// (scheduled, past_due_date, completed) each use a distinct question; the graded
// one reuses question 1 since only three questions exist.
export const REAL_INTERVIEWS: InterviewFixture[] = [
  {
    recruiter: "recruiter1",
    candidate: "candidate1",
    question_id: 1,
    job_title: "Backend Engineer",
    due_date_days_from_now: 14,
    lifecycle: "scheduled",
  },
  {
    recruiter: "recruiter2",
    candidate: "candidate2",
    question_id: 2,
    job_title: "Distributed Systems Engineer",
    due_date_days_from_now: -3,
    lifecycle: "past_due_date",
  },
  {
    recruiter: "recruiter3",
    candidate: "candidate3",
    question_id: 3,
    job_title: "Staff Engineer",
    due_date_days_from_now: 21,
    lifecycle: "completed",
  },
  {
    recruiter: "recruiter1",
    candidate: "candidate2",
    question_id: 1,
    job_title: "Senior Backend Engineer",
    due_date_days_from_now: 30,
    lifecycle: "graded",
  },
];

export const GRADING_REPORT_SAMPLE = {
  total_score: 78,
  strengths: ["clear API design", "covered scaling tradeoffs"],
  weaknesses: ["limited discussion of caching"],
  per_section: {
    short_key_strategy: 8,
    read_vs_write_path: 7,
    db_bottleneck: 6,
    api_design: 9,
    estimations: 7,
  },
  feedback: "Solid mid-level answer, seeded by test-seed.",
};

// 1×1 red PNG, base64-encoded. Sharp will upscale to 512×512 on upload.
// Verified to start with the PNG magic bytes the gateway checks for.
export const AVATAR_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNkqGf4DwACiwGB/sNqWQAAAABJRU5ErkJggg==";
