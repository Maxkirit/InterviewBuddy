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

psql -U postgres -c "CREATE USER $POSTGRES_ADMIN WITH PASSWORD '$(cat /run/secrets/interview_store_db_admin_password)'"
psql -U postgres -c "GRANT CONNECT ON DATABASE $DB_NAME TO $POSTGRES_ADMIN"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_ADMIN"

psql -U postgres -c "CREATE USER $POSTGRES_APP_USER WITH PASSWORD '$(cat /run/secrets/interview_store_db_app_password)'"
psql -U postgres -c "GRANT CONNECT ON DATABASE $DB_NAME TO $POSTGRES_APP_USER"

psql -U postgres -d $DB_NAME <<EOF
CREATE TYPE role_type AS ENUM (
    'admin',
    'recruiter',
    'candidate'
);

-- Genres possibles (optionnel, rempli par l'utilisateur)
CREATE TYPE gender_type AS ENUM (
    'male',
    'female',
    'non_binary',
    'prefer_not_to_say'
);

-- Statuts possibles d'une connexion recruteur <-> candidat
CREATE TYPE conn_status AS ENUM (
    'pending',
    'accepted',
    'rejected'
);

CREATE TABLE users (
	user_id			SERIAL			NOT NULL PRIMARY KEY,
	auth_id			INT				NOT NULL UNIQUE,
	role			role_type		NOT NULL DEFAULT 'candidate',
	firstname		VARCHAR(64)		NOT NULL,						-- 64 = convention standard
	lastname		VARCHAR(64)		NOT NULL,
	profile_pic_url	TEXT,
	gender			gender_type,
	date_of_birth	DATE,
	country			VARCHAR(64),
	job_title		TEXT,
	organization	TEXT,
	bio				TEXT,
	linkedin_link	TEXT,
	email			VARCHAR(255)	NOT NULL UNIQUE,			--255 = RFC 5321
	phone_number	VARCHAR(32),
	is_active		BOOLEAN			NOT NULL DEFAULT TRUE,
	last_login		TIMESTAMPTZ,
	created_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
	updated_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
	deleted_at		TIMESTAMPTZ								--definie a null, sinon = utilisateur delete virtuellement interdir l'accès
);

-- En POSTgreSql, pas de check possible pour verifier si candidat =candidat ou recruteur = recruteur, prevoir une fonction lors des insertion.
CREATE TABLE connections(
	recruiter_id	INT							NOT NULL REFERENCES users(user_id),
	candidate_id	INT							NOT NULL REFERENCES users(user_id),
	status			conn_status					NOT NULL DEFAULT 'pending',
	is_active		BOOLEAN						NOT NULL DEFAULT TRUE,
	accepted_at		TIMESTAMPTZ,
	rejected_at		TIMESTAMPTZ,
	created_at		TIMESTAMPTZ					NOT NULL DEFAULT NOW(),
	updated_at		TIMESTAMPTZ					NOT NULL DEFAULT NOW(),

-- garantie (recruiter + candidate = unique)
	PRIMARY KEY (recruiter_id, candidate_id)
);

CREATE TABLE invite_links(
	link_id			SERIAL			PRIMARY KEY,
	recruiter_id	INT				NOT NULL REFERENCES users(user_id),
	link			TEXT			NOT NULL UNIQUE,
	expiry_date		TIMESTAMPTZ		NOT NULL DEFAULT NOW() + INTERVAL '3 days',
	created_at		TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
	updated_at		TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $POSTGRES_ADMIN, $POSTGRES_APP_USER;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $POSTGRES_ADMIN;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $POSTGRES_APP_USER;
EOF
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_SUPERUSER"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_ADMIN"