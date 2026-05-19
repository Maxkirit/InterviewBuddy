import axios, { AxiosError, AxiosInstance } from "axios";

export interface Session {
  email: string;
  userId: number;
  role: string;
  permissions: string[];
  accessToken: string;
}

export interface JwtPayload {
  userId: number;
  role: string;
  permissions: string[];
  exp?: number;
  iat?: number;
}

function decodeJwt(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed JWT");
  const payload = Buffer.from(parts[1], "base64url").toString("utf8");
  return JSON.parse(payload) as JwtPayload;
}

function sessionFromToken(email: string, accessToken: string): Session {
  const payload = decodeJwt(accessToken);
  return {
    email,
    accessToken,
    userId: payload.userId,
    role: payload.role,
    permissions: payload.permissions ?? [],
  };
}

export class GatewayClient {
  private http: AxiosInstance;

  constructor(baseURL: string) {
    this.http = axios.create({
      baseURL,
      validateStatus: () => true,
      timeout: 15_000,
    });
  }

  private auth(session: Session) {
    return { Authorization: `Bearer ${session.accessToken}` };
  }

  async register(
    email: string,
    password: string,
    name: string,
    surname: string,
    role: "candidate" | "recruiter",
  ): Promise<Session | null> {
    const res = await this.http.post("/api/v1/auth/register", {
      email,
      password,
      name,
      surname,
      role_type: role,
    });
    if (res.status === 203) {
      return sessionFromToken(email, res.data.accessToken);
    }
    if (res.status === 409) return null;
    throw new Error(`register ${email} failed: ${res.status} ${JSON.stringify(res.data)}`);
  }

  async login(email: string, password: string): Promise<Session | null> {
    const res = await this.http.post("/api/v1/auth/login", { email, password });
    if (res.status === 200) return sessionFromToken(email, res.data.accessToken);
    if (res.status === 401 || res.status === 404) return null;
    throw new Error(`login ${email} failed: ${res.status} ${JSON.stringify(res.data)}`);
  }

  async getUser(session: Session, userId: number) {
    const res = await this.http.get(`/api/v1/user/${userId}`, { headers: this.auth(session) });
    if (res.status !== 200) {
      throw new Error(`getUser(${userId}) ${res.status} ${JSON.stringify(res.data)}`);
    }
    return res.data;
  }

  async updateProfile(session: Session, profile: Record<string, unknown>) {
    const res = await this.http.patch(`/api/v1/user/profile/${session.userId}`, profile, {
      headers: this.auth(session),
    });
    if (res.status !== 201) {
      throw new Error(`updateProfile(${session.email}) ${res.status} ${JSON.stringify(res.data)}`);
    }
  }

  async uploadAvatar(session: Session, png: Buffer) {
    const res = await this.http.post(`/api/v1/user/avatar/${session.userId}`, png, {
      headers: {
        ...this.auth(session),
        "Content-Type": "image/png",
      },
    });
    if (res.status !== 201) {
      throw new Error(`uploadAvatar(${session.email}) ${res.status} ${JSON.stringify(res.data)}`);
    }
  }

  async generateInviteLink(session: Session): Promise<string> {
    const res = await this.http.get("/api/v1/user/link/generate", { headers: this.auth(session) });
    if (res.status !== 200) {
      throw new Error(`generateInviteLink ${res.status} ${JSON.stringify(res.data)}`);
    }
    const url: string = res.data.url;
    const match = url.match(/[?&]token=([^&]+)/);
    if (!match) throw new Error(`invite url has no token: ${url}`);
    return match[1];
  }

  async acceptInvite(session: Session, linkToken: string) {
    const res = await this.http.post(
      `/api/v1/user/${session.userId}/connections/${linkToken}`,
      {},
      { headers: this.auth(session) },
    );
    if (res.status !== 201) {
      throw new Error(`acceptInvite ${res.status} ${JSON.stringify(res.data)}`);
    }
  }

  async listConnections(session: Session, userId: number): Promise<Array<{ user_id: number }>> {
    const res = await this.http.get(`/api/v1/user/${userId}/connections`, {
      headers: this.auth(session),
    });
    if (res.status !== 200) {
      throw new Error(`listConnections ${res.status} ${JSON.stringify(res.data)}`);
    }
    return (res.data.connections ?? []).filter(Boolean);
  }

  async createRealInterview(
    session: Session,
    payload: {
      recruiter_id: number;
      candidate_id: number;
      question_id: number;
      job_title: string;
      due_date: string;
    },
  ) {
    const res = await this.http.post("/api/v1/interview/real-interview", payload, {
      headers: this.auth(session),
    });
    if (res.status !== 201) {
      throw new Error(`createRealInterview ${res.status} ${JSON.stringify(res.data)}`);
    }
  }

  async listRealInterviewsForRecruiter(session: Session, recruiterId: number) {
    const res = await this.http.get(`/api/v1/interview/real-interviews/${recruiterId}`, {
      headers: this.auth(session),
    });
    if (res.status !== 200) {
      throw new Error(`listRealInterviews ${res.status} ${JSON.stringify(res.data)}`);
    }
    return res.data as Array<{
      unique_interview_id: number;
      recruiter_id: number;
      candidate_id: number;
      question_id: number;
      job_title: string | null;
      status: string;
    }>;
  }

  async listInterviewsForCandidate(session: Session, candidateId: number) {
    const res = await this.http.get(`/api/v1/interview/candidat-interviews/${candidateId}`, {
      headers: this.auth(session),
    });
    if (res.status !== 200) {
      throw new Error(`listCandidateInterviews ${res.status} ${JSON.stringify(res.data)}`);
    }
    return res.data as Array<{
      unique_interview_id: number;
      candidate_id: number;
      question_id: number;
      status: string;
    }>;
  }

  /**
   * Mock-interview creation goes through the gateway, which double-wraps the body
   * in `{ body, userId, permissions }`. The svc-interview-store mock handler reads
   * `req.body.*` directly, so this currently fails with 502 when called via the
   * gateway. Returns the raw status so the caller can soft-skip.
   */
  async createMockInterviewAttempt(
    session: Session,
    payload: { candidate_id: number; question_id: number },
  ): Promise<number> {
    const res = await this.http.post("/api/v1/interview/mock-inteview", payload, {
      headers: this.auth(session),
    });
    return res.status;
  }

  async startInterview(session: Session, interviewId: number): Promise<number> {
    const res = await this.http.get(`/api/v1/interview/${interviewId}/start`, {
      headers: this.auth(session),
    });
    return res.status;
  }

  async submitInterview(
    session: Session,
    interviewId: number,
    reasoning: string,
  ): Promise<number> {
    const res = await this.http.patch(
      `/api/v1/interview/${interviewId}/submit`,
      { reasoning },
      { headers: this.auth(session) },
    );
    return res.status;
  }

  async createGradingReport(
    session: Session,
    interviewId: number,
    report: Record<string, unknown>,
  ): Promise<number> {
    const res = await this.http.post(
      "/api/v1/grading/grading-report",
      { unique_interview_id: interviewId, report },
      { headers: this.auth(session) },
    );
    return res.status;
  }
}

export function isAxiosNetworkError(err: unknown): boolean {
  if (err instanceof AxiosError) {
    return !err.response;
  }
  return false;
}
