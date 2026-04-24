
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
	job_title		VARCHAR(128),
	organization	VARCHAR(128),
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

--PK = reference pour la table -> une seul par table possible (equivault a NOT NULL UNIQUE)