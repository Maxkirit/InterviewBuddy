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

CREATE TABLE IF NOT EXISTS $TABLE_ROLES (
    role_id         INT		        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            TEXT            UNIQUE NOT NULL,
    is_active       BOOL            DEFAULT TRUE,
    created_at		TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
	updated_at		TIMESTAMPTZ	    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS $TABLE_USER_ROLES (
    user_id         INT             UNIQUE NOT NULL,
    role_id         INT             REFERENCES $TABLE_ROLES(role_id),
    assigned_date   TIMESTAMPTZ     DEFAULT NOW(),
	created_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
	updated_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS $TABLE_PERMISSIONS (
    permission_id   INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            TEXT            NOT NULL,
    created_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
	updated_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW() 
);

CREATE TABLE IF NOT EXISTS $TABLE_ROLE_PERMISSIONS (
    role_permission_id  INT             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id             INT             REFERENCES $TABLE_ROLES(role_id),
    permission_id       INT             REFERENCES $TABLE_PERMISSIONS(permission_id),
    is_active           BOOLEAN         DEFAULT TRUE,
    created_at		    TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
	updated_at		    TIMESTAMPTZ		NOT NULL DEFAULT NOW(),
    UNIQUE (role_id, permission_id)
);

INSERT INTO $TABLE_ROLES (name)
SELECT 'admin'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_ROLES WHERE name = 'admin');

INSERT INTO $TABLE_ROLES (name)
SELECT 'recruiter'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_ROLES WHERE name = 'recruiter');

INSERT INTO $TABLE_ROLES (name)
SELECT 'candidate'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_ROLES WHERE name = 'candidate');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'readModelAnswer'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'readModelAnswer');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'manageQuestion'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'manageQuestion');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'readQuestion'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'readQuestion');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'manageConnection'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'manageConnection');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'deleteConnection'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'deleteConnection');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'readConnection'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'readConnection');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'acceptConnection'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'acceptConnection');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'createConnection'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'createConnection');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'manageUserInfo'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'manageUserInfo');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'updateUserInfo'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'updateUserInfo');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'readConnectionInfo'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'readConnectionInfo');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'readUserInfo'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'readUserInfo');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'deleteUserInfo'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'deleteUserInfo');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'modifyOwnUser'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'modifyOwnUser');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'manageInterview'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'manageInterview');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'deleteRealInterview'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'deleteRealInterview');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'deleteMockInterview'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'deleteMockInterview');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'createRealInterview'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'createRealInterview');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'createMockInterview'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'createMockInterview');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'readGradingReport'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'readGradingReport');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'updateInterview'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'updateInterview');

INSERT INTO $TABLE_PERMISSIONS (name)
SELECT 'readInterview'
WHERE NOT EXISTS (SELECT 1 FROM $TABLE_PERMISSIONS WHERE name = 'readInterview');

-- Role-Permission Mappings for Recruiter
INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readInterview')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readInterview')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'updateInterview')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'updateInterview')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readGradingReport')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readGradingReport')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'createRealInterview')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'createRealInterview')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'deleteRealInterview')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'deleteRealInterview')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'modifyOwnUser')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'modifyOwnUser')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'deleteUserInfo')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'deleteUserInfo')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readUserInfo')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readUserInfo')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'updateUserInfo')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'updateUserInfo')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readConnectionInfo')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readConnectionInfo')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'createConnection')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'createConnection')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readConnection')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readConnection')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'deleteConnection')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'deleteConnection')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readQuestion')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'recruiter')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readQuestion')
);

-- Role-Permission Mappings for Candidate
INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readInterview')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readInterview')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readGradingReport')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readGradingReport')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'createMockInterview')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'createMockInterview')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'deleteMockInterview')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'deleteMockInterview')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'modifyOwnUser')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'modifyOwnUser')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'deleteUserInfo')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'deleteUserInfo')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readUserInfo')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readUserInfo')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readConnectionInfo')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readConnectionInfo')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'updateUserInfo')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'updateUserInfo')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'acceptConnection')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'acceptConnection')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readConnection')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readConnection')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'deleteConnection')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'deleteConnection')
);

INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate'),
    (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readQuestion')
WHERE NOT EXISTS (
    SELECT 1 FROM $TABLE_ROLE_PERMISSIONS
    WHERE role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'candidate')
    AND permission_id = (SELECT permission_id FROM $TABLE_PERMISSIONS WHERE name = 'readQuestion')
);


INSERT INTO $TABLE_ROLE_PERMISSIONS (role_id, permission_id)
SELECT
    (SELECT role_id FROM $TABLE_ROLES WHERE name = 'admin'),
    p.permission_id
FROM $TABLE_PERMISSIONS p
WHERE NOT EXISTS (
    SELECT 1
    FROM $TABLE_ROLE_PERMISSIONS rp
    WHERE rp.role_id = (SELECT role_id FROM $TABLE_ROLES WHERE name = 'admin')
    AND rp.permission_id = p.permission_id
);


ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $POSTGRES_ADMIN, $POSTGRES_APP_USER, $POSTGRES_SUPERUSER;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $POSTGRES_SUPERUSER;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $POSTGRES_ADMIN;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $POSTGRES_APP_USER;
EOF
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_SUPERUSER"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $POSTGRES_ADMIN"