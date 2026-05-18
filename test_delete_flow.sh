#!/bin/bash
set -e

BASE="http://localhost:3000/api/v1"

echo "=== LOGIN RECRUITER ==="
REC=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "recruiter@test.com", "password": "Test1234!"}')
REC_TOKEN=$(echo $REC | jq -r '.accessToken')
REC_ID=$(echo $REC_TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq -r '.userId')
echo "recruiter_id: $REC_ID"

echo ""
echo "=== LOGIN CANDIDAT 1 ==="
CAND=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "candidate1@test.com", "password": "Test1234!"}')
CAND_TOKEN=$(echo $CAND | jq -r '.accessToken')
CAND_ID=$(echo $CAND_TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq -r '.userId')
echo "candidate_id: $CAND_ID"

echo ""
echo "=== GÉNÉRATION INVITE LINK (recruiter) ==="
LINK_RESP=$(curl -s $BASE/user/link/generate \
  -H "Authorization: Bearer $REC_TOKEN")
echo $LINK_RESP
LINK_TOKEN=$(echo $LINK_RESP | jq -r '.url' | sed 's/.*token=//')
echo "link_token: $LINK_TOKEN"

echo ""
echo "=== CONNEXION (candidat accepte le lien) ==="
CONN=$(curl -s -X POST $BASE/user/$CAND_ID/connections/$LINK_TOKEN \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CAND_TOKEN")
echo $CONN

echo ""
echo "=== CRÉATION INTERVIEW ==="
INTERVIEW=$(curl -s -X POST $BASE/interview/real-interview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REC_TOKEN" \
  -d "{
    \"recruiter_id\": $REC_ID,
    \"candidate_id\": $CAND_ID,
    \"question_id\": 1,
    \"job_title\": \"Software Engineer\",
    \"due_date\": \"2026-06-01T00:00:00.000Z\"
  }")
echo $INTERVIEW

echo ""
echo "=== TEST DELETE USER (recruiter supprime son compte) ==="
DELETE=$(curl -s -X PATCH $BASE/user/$REC_ID/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REC_TOKEN")
echo $DELETE
