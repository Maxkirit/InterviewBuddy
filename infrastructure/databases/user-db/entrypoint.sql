#!/bin/bash

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
	user_id			SERIAL			NOT NULL
	auth_id			INT				NOT NULL
	role			role_type
	firstname		VARCHAR(64)								-- 64 = convention standard
	lastname		VARCHAR(64)
	profile_pic_url	TEXT
	gender			gender_type
	date_of_birth	DATE
	country			VARCHAR
	job_title		VARCHAR
	organization	VARCHAR
	bio				TEXT
	linkedin_link	TEXT
	email			VARCHAR(255)	NOT NULL UNIQUE			--255 = RFC 5321
	phone_number	VARCHAR(32)
	is_active		BOOLEAN
	last_login		TIMESTAMPTZ
	created_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW()
	updated_at		TIMESTAMPTZ		NOT NULL DEFAULT NOW()
	deleted_at		TIMESTAMPTZ								--definie a null, sinon = utilisateur delete virtuellement interdir l'accès
)