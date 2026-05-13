#!/bin/bash

set -e

until pg_isready -U postgres; do
  echo "Waiting for PostgreSQL to start"
  sleep 1
done

psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || psql -U postgres -c "CREATE DATABASE $DB_NAME;"

# Create users and roles. GRANTS are not idempotent so will fail if users already have roles. shouldn't happen as we will only start container once ?

# IF NOT EXISTS only valid for tables and databases in Postgre s we need this instead
psql -U postgres -c "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin;
  END IF;
END
\$\$;
"
psql -U postgres -c "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'usage') THEN
    CREATE ROLE usage;
  END IF;
END
\$\$;
"

psql -U postgres -c "CREATE USER $POSTGRES_SUPERUSER WITH PASSWORD '$(cat /run/secrets/interview_store_db_superuser_password)'"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_SUPERUSER"
psql -U postgres -c "ALTER USER $POSTGRES_SUPERUSER CREATEDB"

psql -U postgres -c "CREATE USER $POSTGRES_ADMIN WITH PASSWORD '$(cat /run/secrets/interview_store_db_admin_password)'"
psql -U postgres -c "GRANT CONNECT ON DATABASE $DB_NAME TO $POSTGRES_ADMIN"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_ADMIN"

psql -U postgres -c "CREATE USER $POSTGRES_APP_USER WITH PASSWORD '$(cat /run/secrets/interview_store_db_app_password)'"
psql -U postgres -c "GRANT CONNECT ON DATABASE $DB_NAME TO $POSTGRES_APP_USER"

psql -U postgres -d $DB_NAME <<EOF

CREATE TYPE interview_status AS ENUM (
    'scheduled',
    'past_due_date',
    'completed',
    'graded',
    'mock'
);

CREATE TABLE IF NOT EXISTS $TABLE_QUESTIONS (
    question_id			INT				GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name				TEXT			NOT NULL,
    context				TEXT,
    functional_req		TEXT			NOT NULL,
    non_functional_req	TEXT			NOT NULL,
    grading_guide	TEXT,
    created_at 			TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
    updated_at 			TIMESTAMPTZ		NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS $TABLE_INTERVIEWS (
    unique_interview_id	INT				GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recruiter_id 		INT,
    candidate_id 		INT				NOT NULL,
    question_id 		INT				REFERENCES $TABLE_QUESTIONS(question_id) NOT NULL,
    job_title 			TEXT,
    unfinished_diagram	JSON,
    unfinished_text		TEXT,
    status				interview_status NOT NULL,
    due_date			TIMESTAMPTZ,
    created_at			TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
    updated_at			TIMESTAMPTZ		NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS $TABLE_MODEL_ANSWERS (
    answer_id				INT				GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id				INT				REFERENCES $TABLE_QUESTIONS(question_id) NOT NULL,
    model_answer_text		TEXT			NOT NULL,
    model_answer_graph_url	TEXT			NOT NULL,
    rubric					TEXT			NOT NULL,
    created_at				TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
    updated_at				TIMESTAMPTZ		NOT NULL DEFAULT NOW()
);

ALTER TABLE questions ADD CONSTRAINT questions_name_unique UNIQUE (name);

INSERT INTO questions (name, context, functional_req, non_functional_req, grading_guide)
VALUES (
    'URL Shortener',
    'Design a URL Shortener',

    'Given a URL, our service should generate a shorter and unique alias of it. This is called a short link. This link should be short enough to be easily copied and pasted into applications.'
    || E'\n\n' ||
    'When users access a short link, our service should redirect them to the original link.'
    || E'\n\n' ||
    'Users should optionally be able to pick a custom short link for their URL.'
    || E'\n\n' ||
    'Links will expire after a standard default timespan. Users should be able to specify the expiration time.',

    'The system should be highly available. This is required because, if our service is down, all the URL redirections will start failing.'
    || E'\n\n' ||
    'URL redirection should happen in real-time with minimal latency.'
    || E'\n\n' ||
    'Shortened links should not be guessable (not predictable).',

    'How robust is their short key generation strategy?'
    || E'\n\n' ||
    'How well does the candidate prioritize the read path over the write path?'
    || E'\n\n' ||
    'How do they handle the database bottleneck at scale?'
    || E'\n\n' ||
    'How clean is their API design?'
    || E'\n\n' ||
    'Can they calculate back-of-the-envelope estimations?'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO questions (name, context, functional_req, non_functional_req, grading_guide)
VALUES (
    'Design Dropbox or Google Drive',
    'Design a cloud file storage and sync service like Dropbox or Google Drive.',

    'Users should be able to upload a file from any device.'
    || E'\n\n' ||
    'Users should be able to download a file from any device.'
    || E'\n\n' ||
    'Users should be able to share a file with other users and view the files shared with them.'
    || E'\n\n' ||
    'Users can automatically sync files across devices.'
    || E'\n\n' ||
    'Editing files is out of scope.',

    'The system should be highly available (prioritizing availability over consistency).'
    || E'\n\n' ||
    'The system should support files as large as 50GB.'
    || E'\n\n' ||
    'The system should be secure and reliable. We should be able to recover files if they are lost or corrupted.'
    || E'\n\n' ||
    'The system should make upload, download, and sync times as fast as possible (low latency).',

    'How has the candidate handled the differences between file content and metadata storage?'
    || E'\n\n' ||
    'How does the candidate''s answer handle file uploads at scale?'
    || E'\n\n' ||
    'What is the candidate''s understanding of caching opportunities for file download?'
    || E'\n\n' ||
    'What solution has the candidate proposed for the remote-to-local sync?'
    || E'\n\n' ||
    'Has the candidate understood the database query implications of file sharing?'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO questions (name, context, functional_req, non_functional_req, grading_guide)
VALUES (
    'Distributed Counter',
    'Design a distributed counter system.',

    'The total count of users currently viewing the website or a particular web page should be shown in real-time.'
    || E'\n\n' ||
    'The value of the counter must decrement when a user exits the website.'
    || E'\n\n' ||
    'The user receives the count of unread notifications when subscribed web pages are modified.',

    'Highly available.'
    || E'\n\n' ||
    'Eventually consistent.'
    || E'\n\n' ||
    'Accurate.'
    || E'\n\n' ||
    'Reliable.'
    || E'\n\n' ||
    'Scalable.'
    || E'\n\n' ||
    'Low latency.',

    'How do they solve the write contention problem?'
    || E'\n\n' ||
    'How do they think about exact vs approximate counting in the context of stability?'
    || E'\n\n' ||
    'How do they handle network partitions and consistency?'
    || E'\n\n' ||
    'What is their strategy for real time data delivery?'
    || E'\n\n' ||
    'Do they address idempotency and double-counting problem?'
)
ON CONFLICT (name) DO NOTHING;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $POSTGRES_ADMIN, $POSTGRES_APP_USER, $POSTGRES_SUPERUSER;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $POSTGRES_SUPERUSER;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $POSTGRES_ADMIN;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $POSTGRES_APP_USER;
EOF
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_SUPERUSER"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_ADMIN"