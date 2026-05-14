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

CREATE TABLE IF NOT EXISTS $TABLE_GRADING (
    report_id			INT				GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unique_interview_id			INT			NOT NULL,
    serialized_id			INT,
    report    TEXT,
    created_at 			TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
    updated_at 			TIMESTAMPTZ		NOT NULL DEFAULT NOW()
);

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $POSTGRES_ADMIN, $POSTGRES_APP_USER, $POSTGRES_SUPERUSER;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $POSTGRES_SUPERUSER;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $POSTGRES_ADMIN;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $POSTGRES_APP_USER;
EOF
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_SUPERUSER"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_ADMIN"