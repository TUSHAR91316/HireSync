-- =============================================================
-- HireSync PostgreSQL Database Schema
-- =============================================================
-- Run against your PostgreSQL database:
--   psql -U hiresync_user -d hiresync_db -f schema.sql
--
-- All UUIDs use gen_random_uuid() (requires pg_crypto extension).
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------
-- ENUM Types
-- -------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('CANDIDATE', 'RECRUITER', 'ADMIN');

CREATE TYPE application_status AS ENUM (
    'APPLIED',
    'SCREENED',
    'ASSESSMENT',
    'INTERVIEW',
    'DECISION_PENDING',
    'ACCEPTED',
    'REJECTED'
);

CREATE TYPE candidate_tier AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

CREATE TYPE sla_status AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');

-- -------------------------------------------------------------
-- Table: users
-- Core authentication and role table.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          user_role     NOT NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Table: profiles
-- Extended profile data for both Candidate and Recruiter users.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    user_id              UUID          PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name            VARCHAR(255)  NOT NULL,
    phone                VARCHAR(20),
    company_name         VARCHAR(255), -- Recruiter field
    years_experience     DECIMAL(4,1), -- Candidate field
    batch_year           INT,          -- Candidate field: graduation year
    degree_stream        VARCHAR(100), -- Candidate field: e.g. "Computer Science"
    notice_period_days   INT,          -- Candidate field
    resume_url           TEXT,         -- Candidate field: stored PDF resume path/URL
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Table: jobs
-- Job postings with recruiter-defined eligibility criteria.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
    id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id            UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title                   VARCHAR(255)  NOT NULL,
    description             TEXT,
    department              VARCHAR(100),
    location                VARCHAR(100),
    workplace_type          VARCHAR(50)   DEFAULT 'Remote', -- 'Remote' | 'Hybrid' | 'Onsite'
    salary_range            VARCHAR(100),
    min_experience          DECIMAL(4,1)  NOT NULL,
    allowed_batch_years     INT[],        -- e.g. {2022, 2023, 2024}
    allowed_degrees         TEXT[],       -- e.g. {"Computer Science", "ECE"}
    max_notice_period_days  INT,
    required_skills         TEXT[],       -- e.g. {"React", "Node.js", "PostgreSQL"}
    sla_days                INT           NOT NULL DEFAULT 7,
    is_active               BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Table: skill_unlocks
-- Records candidate timed skill challenge results, anti-cheating
-- telemetry (tab switches), and AI content detection flags.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_unlocks (
    id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id            UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id                  UUID          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    score                   DECIMAL(5,2)  NOT NULL,
    passed                  BOOLEAN       NOT NULL,
    tab_switch_count        INT           NOT NULL DEFAULT 0,
    ai_confidence           DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
    disqualified            BOOLEAN       NOT NULL DEFAULT FALSE,
    disqualification_reason VARCHAR(255),
    started_at              TIMESTAMPTZ   NOT NULL,
    completed_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_unlocks_candidate_job ON skill_unlocks(candidate_id, job_id);

-- -------------------------------------------------------------
-- Table: applications
-- Links a candidate's application to a specific job posting.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID                NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id    UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_url      TEXT,
    match_score     DECIMAL(5,2),       -- ATS percentage score: 0.00 to 100.00
    tier            candidate_tier,     -- ATS classification result
    status          application_status  NOT NULL DEFAULT 'APPLIED',
    applied_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, candidate_id)       -- Prevent duplicate applications
);

-- -------------------------------------------------------------
-- Table: test_scores
-- Stores in-app assessment results for a given application.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_scores (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    score           DECIMAL(5,2) NOT NULL,  -- Score percentage: 0.00 to 100.00
    passed          BOOLEAN     NOT NULL,
    completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Table: sla_timers
-- Redis-backed SLA decision countdown metadata.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sla_timers (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    status          sla_status  NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- Indexes for common query access patterns
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_applications_job_id        ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id  ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status        ON applications(status);
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id          ON jobs(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active             ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_sla_timers_expires_at      ON sla_timers(expires_at);
CREATE INDEX IF NOT EXISTS idx_sla_timers_status          ON sla_timers(status);

-- -------------------------------------------------------------
-- Table: password_reset_tokens
-- One-time UUID tokens for the forgot-password email flow.
-- Each token expires after RESET_TOKEN_EXPIRY_MINUTES (default 60 min).
-- Tokens are marked used=TRUE after successful password reset
-- to prevent re-use.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_token      ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id    ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires_at ON password_reset_tokens(expires_at);

