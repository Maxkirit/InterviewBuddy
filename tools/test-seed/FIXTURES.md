# Test-seed fixtures

Reference for the data created by `make seed`. All seeded accounts share the
same password and live under the `seed+...@example.com` namespace so they're
easy to spot in the DB.

**Password for every seeded account:** `Seed!Password1`

The admin account is **not** created by this seed — it is bootstrapped by
`services/svc-auth/src/seed-admin.ts` from the Vault-rendered
`/secrets/admin_email` and `/secrets/admin_password`.

Every seeded user has:
- a complete profile (gender, DOB, country, job title, organization, bio,
  LinkedIn, phone),
- an uploaded avatar (a small PNG resized to 512×512 jpeg by the gateway).

## Users

| Key          | Role      | Email                          | Name              |
| ------------ | --------- | ------------------------------ | ----------------- |
| `recruiter1` | recruiter | `seed+recruiter1@example.com`  | Renee Recruiter   |
| `recruiter2` | recruiter | `seed+recruiter2@example.com`  | Rohan Hire        |
| `recruiter3` | recruiter | `seed+recruiter3@example.com`  | Rita Talent       |
| `candidate1` | candidate | `seed+candidate1@example.com`  | Cara Candidate    |
| `candidate2` | candidate | `seed+candidate2@example.com`  | Caleb Coder       |
| `candidate3` | candidate | `seed+candidate3@example.com`  | Chen Devs         |
| *(admin)*    | admin     | from `/secrets/admin_email`    | seed-admin        |

## Connections — full 3×3 mesh

Every recruiter is connected to every candidate (9 connections total).
This guarantees:
- every candidate has multiple recruiter connections,
- every recruiter has multiple candidate connections,
- there are spare ("revocable") connections that can be deleted in tests
  without breaking any seeded interview.

| Recruiter ↓ \ Candidate → | `candidate1`     | `candidate2`     | `candidate3`     |
| ------------------------- | ---------------- | ---------------- | ---------------- |
| `recruiter1`              | **scheduled**    | **graded**       | revocable        |
| `recruiter2`              | revocable        | **past_due_date** | revocable       |
| `recruiter3`              | revocable        | revocable        | **completed**    |

Bold cells are load-bearing for an interview lifecycle below. The five
`revocable` cells exist purely to be deleted during testing — removing
any of them will not invalidate other fixtures.

### From each user's perspective

| User         | Connected to                                  |
| ------------ | --------------------------------------------- |
| `recruiter1` | `candidate1`, `candidate2`, `candidate3`      |
| `recruiter2` | `candidate1`, `candidate2`, `candidate3`      |
| `recruiter3` | `candidate1`, `candidate2`, `candidate3`      |
| `candidate1` | `recruiter1`, `recruiter2`, `recruiter3`      |
| `candidate2` | `recruiter1`, `recruiter2`, `recruiter3`      |
| `candidate3` | `recruiter1`, `recruiter2`, `recruiter3`      |

## Real interviews — one per lifecycle state

Question IDs 1–3 are pre-seeded by
`infrastructure/databases/interview-store-db/entrypoint.sh`. The three
"active" lifecycle interviews (scheduled, past_due_date, completed) each
use a distinct question. The graded interview reuses question 1 because
only three questions exist in the database; it's a distinct fixture
(different recruiter/candidate pair and job title).

| Recruiter    | Candidate    | Q# | Question                | Job title                       | due_date  | Final status     |
| ------------ | ------------ | -- | ----------------------- | ------------------------------- | --------- | ---------------- |
| `recruiter1` | `candidate1` | 1  | URL Shortener           | Backend Engineer                | now + 14d | **scheduled**    |
| `recruiter2` | `candidate2` | 2  | Dropbox / Google Drive  | Distributed Systems Engineer    | now − 3d  | **past_due_date** |
| `recruiter3` | `candidate3` | 3  | Distributed Counter     | Staff Engineer                  | now + 21d | **completed**    |
| `recruiter1` | `candidate2` | 1  | URL Shortener           | Senior Backend Engineer         | now + 30d | **graded**       |

**Lifecycle meaning:**
- `scheduled` — created, never started; due_date in the future.
- `past_due_date` — created with a due_date already in the past; the server
  auto-flips its status from `scheduled` to `past_due_date` on the next read.
- `completed` — candidate hit `/start` and `/submit`. Has `started_at` and
  `submitted_at`; no grading report attached.
- `graded` — completed AND a grading report has been posted by the recruiter.

## Quick test recipes

- **See a scheduled interview from the recruiter side** → log in as
  `seed+recruiter1@example.com`; the URL Shortener interview for
  `candidate1` is still ahead of its due date.
- **See a past-due interview** → log in as `seed+recruiter2@example.com`
  or `seed+candidate2@example.com`; the Dropbox interview is past due.
- **Take an interview as candidate (none seeded in "scheduled" for this
  candidate, but the past-due one is theirs to inspect)** → log in as
  `seed+candidate1@example.com` to see what a candidate's dashboard
  looks like with one scheduled interview ahead.
- **Inspect a completed-but-not-graded interview** → log in as
  `seed+recruiter3@example.com` or `seed+candidate3@example.com`.
- **Inspect a graded interview + report** → log in as
  `seed+recruiter1@example.com` (URL Shortener / Senior Backend Engineer
  interview with `candidate2`) or `seed+candidate2@example.com`.
- **Revoke a connection** → log in as any recruiter and remove one of
  their connections to a candidate whose cell in the mesh table is
  marked `revocable` (e.g. `recruiter1` ↔ `candidate3`).
- **Verify a candidate has multiple recruiters** → log in as any
  candidate — all three recruiters appear in their connections list.
