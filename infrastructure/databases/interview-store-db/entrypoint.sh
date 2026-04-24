#!/bin/bash

psql -U postgres --password=$(cat /run/secrets/interview_store_db_superuser_password.txt)

# eventually add conditional checks for when DBs/TABLES exist already
CREATE DATABASE [IF NOT EXISTS] $DB_NAME;
\c $DB_NAME;
CREATE TABLE [IF NOT EXISTS] $TABLE_INTERVIEWS (
    unique_interview_id SERIAL PRIMARY KEY,
    recruiter_id SERIAL FOREIGN KEY UNIQUE,
    candidate_id SERIAL FOREIGN KEY NOT NULL,
    question_id SERIAL FOREIGN KEY NOT NULL,
    job_title TEXT NOT NULL,
    unfinished_diagram JSON,
    unfinished_text TEXT,
    status ENUM ('scheduled', 'past due date', 'completed'),
    due_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
)