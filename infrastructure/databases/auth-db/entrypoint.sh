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

psql -U postgres -c "CREATE USER $POSTGRES_SUPERUSER WITH PASSWORD '$(cat /run/secrets/auth_db_superuser_password)'"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_SUPERUSER"
psql -U postgres -c "ALTER USER $POSTGRES_SUPERUSER CREATEDB"

psql -U postgres -c "CREATE USER $POSTGRES_ADMIN WITH PASSWORD '$(cat /run/secrets/auth_db_admin_password)'"
psql -U postgres -c "GRANT CONNECT ON DATABASE $DB_NAME TO $POSTGRES_ADMIN"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_ADMIN"

psql -U postgres -c "CREATE USER $POSTGRES_APP_USER WITH PASSWORD '$(cat /run/secrets/auth_db_app_password)'"
psql -U postgres -c "GRANT CONNECT ON DATABASE $DB_NAME TO $POSTGRES_APP_USER"

psql -U postgres -d $DB_NAME <<EOF
CREATE TABLE IF NOT EXISTS $TABLE_AUTHS (
	auth_id			INT				GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	email			VARCHAR(255)	NOT NULL UNIQUE,
	hashed_password	TEXT			NOT NULL,
	sub				TEXT,
	created_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
	updated_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS $TABLE_FAILED_LOGINS (
	attempt_id		INT				GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	auth_id			INT				REFERENCES $TABLE_AUTHS(auth_id),
	attempt_count	INT				NOT NULL,
	ip_address		TEXT			NOT NULL,
	created_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
	updated_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS $TABLE_PASSWORD_RESET_TOKENS (
	auth_id			INT				PRIMARY KEY REFERENCES $TABLE_AUTHS(auth_id),
	reset_token		TEXT			NOT NULL UNIQUE,
	token_expiry	TIMESTAMPTZ		NOT NULL,
	created_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
	updated_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS $TABLE_REFRESH_TOKENS (
	JTI				TEXT			PRIMARY KEY,
	token			TEXT			NOT NULL,
	user_id			INT				NOT NULL,
	token_expiry	TIMESTAMPTZ		NOT NULL DEFAULT NOW() + INTERVAL '7 days',
	created_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
	updated_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
	revoked_at		TIMESTAMPTZ
);

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $POSTGRES_ADMIN, $POSTGRES_APP_USER, $POSTGRES_SUPERUSER;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $POSTGRES_SUPERUSER;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $POSTGRES_ADMIN;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $POSTGRES_APP_USER;
EOF
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_SUPERUSER"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_ADMIN"