# HireSync — System Architecture Reference

> 📐 Deep-dive technical reference for the HireSync Unified Recruitment System architecture.

---

## 📌 Overview

HireSync is a **Three-Tier Web Application** built around 5 core recruitment middleware pillars:

```
┌─────────────────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER (CLIENT)                    │
│  🧑‍💻 Candidate Portal           🏢 HR / Recruiter Portal        │
│  (Next.js / React)              (Next.js / React)               │
└──────────────────────┬───────────────────────┬─────────────────┘
                       │      REST / WebSocket  │
┌──────────────────────▼───────────────────────▼─────────────────┐
│                 APPLICATION LAYER (BACKEND API)                  │
│   Node.js / Express  ────  FastAPI (Python services)           │
│                                                                  │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │  Auth Module  │  │ ATS Parser   │  │  SLA Queue Worker   │  │
│  │  (JWT/RBAC)   │  │  Engine      │  │  (Redis + BullMQ)   │  │
│  └───────────────┘  └──────────────┘  └─────────────────────┘  │
│  ┌───────────────┐  ┌──────────────┐                            │
│  │  Eligibility  │  │  WebRTC      │                            │
│  │  Gatekeeper   │  │  Signaling   │                            │
│  └───────────────┘  └──────────────┘                            │
└──────────────────────┬───────────────────────────────────────── ┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                  DATA & SERVICES LAYER                           │
│  ┌─────────────────────┐      ┌────────────────────────────┐    │
│  │   PostgreSQL DB      │      │    Redis + BullMQ Queue    │    │
│  │  (Relational Store)  │      │    (SLA Timer Workers)     │    │
│  └─────────────────────┘      └────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### `users` Table

| Column          | Type                                    | Constraints                     | Description                |
| :-------------- | :-------------------------------------- | :------------------------------ | :------------------------- |
| `id`            | `UUID`                                  | `PK, DEFAULT gen_random_uuid()` | Unique user identifier     |
| `email`         | `VARCHAR(255)`                          | `UNIQUE, NOT NULL`              | User email address         |
| `password_hash` | `VARCHAR(255)`                          | `NOT NULL`                      | Bcrypt hashed password     |
| `role`          | `ENUM('CANDIDATE','RECRUITER','ADMIN')` | `NOT NULL`                      | User role                  |
| `created_at`    | `TIMESTAMPTZ`                           | `DEFAULT NOW()`                 | Account creation timestamp |

### `profiles` Table

| Column               | Type           | Constraints     | Description                   |
| :------------------- | :------------- | :-------------- | :---------------------------- |
| `user_id`            | `UUID`         | `FK → users.id` | References user               |
| `full_name`          | `VARCHAR(255)` | `NOT NULL`      | Display name                  |
| `phone`              | `VARCHAR(20)`  |                 | Contact phone number          |
| `years_experience`   | `DECIMAL(4,1)` |                 | Total years of experience     |
| `batch_year`         | `INT`          |                 | Graduation batch year         |
| `degree_stream`      | `VARCHAR(100)` |                 | e.g., Computer Science, ECE   |
| `notice_period_days` | `INT`          |                 | Current notice period in days |
| `resume_url`         | `TEXT`         |                 | Stored PDF resume URL         |

### `jobs` Table

| Column                   | Type           | Constraints     | Description                      |
| :----------------------- | :------------- | :-------------- | :------------------------------- |
| `id`                     | `UUID`         | `PK`            | Unique job identifier            |
| `recruiter_id`           | `UUID`         | `FK → users.id` | Posting recruiter                |
| `title`                  | `VARCHAR(255)` | `NOT NULL`      | Job title                        |
| `description`            | `TEXT`         |                 | Full job description             |
| `min_experience`         | `DECIMAL(4,1)` | `NOT NULL`      | Minimum years required           |
| `allowed_batch_years`    | `INT[]`        |                 | Array of valid batch years       |
| `allowed_degrees`        | `TEXT[]`       |                 | Array of accepted degree streams |
| `max_notice_period_days` | `INT`          |                 | Max notice period in days        |
| `sla_days`               | `INT`          | `DEFAULT 7`     | Recruiter decision SLA in days   |
| `created_at`             | `TIMESTAMPTZ`  | `DEFAULT NOW()` | Posting timestamp                |
| `is_active`              | `BOOLEAN`      | `DEFAULT TRUE`  | Whether posting is live          |

### `applications` Table

| Column         | Type                                                                                           | Constraints         | Description                      |
| :------------- | :--------------------------------------------------------------------------------------------- | :------------------ | :------------------------------- |
| `id`           | `UUID`                                                                                         | `PK`                | Application identifier           |
| `job_id`       | `UUID`                                                                                         | `FK → jobs.id`      | Target job                       |
| `candidate_id` | `UUID`                                                                                         | `FK → users.id`     | Applicant                        |
| `resume_url`   | `TEXT`                                                                                         |                     | Uploaded resume PDF URL          |
| `match_score`  | `DECIMAL(5,2)`                                                                                 |                     | ATS match percentage (0–100)     |
| `tier`         | `ENUM('TIER_1','TIER_2','TIER_3')`                                                             |                     | ATS tier classification          |
| `status`       | `ENUM('APPLIED','SCREENED','ASSESSMENT','INTERVIEW','DECISION_PENDING','ACCEPTED','REJECTED')` | `DEFAULT 'APPLIED'` | Pipeline stage                   |
| `applied_at`   | `TIMESTAMPTZ`                                                                                  | `DEFAULT NOW()`     | Application submission timestamp |

### `test_scores` Table

| Column           | Type           | Constraints            | Description               |
| :--------------- | :------------- | :--------------------- | :------------------------ |
| `id`             | `UUID`         | `PK`                   | Score record identifier   |
| `application_id` | `UUID`         | `FK → applications.id` | Linked application        |
| `score`          | `DECIMAL(5,2)` |                        | Test score percentage     |
| `passed`         | `BOOLEAN`      |                        | Whether candidate passed  |
| `completed_at`   | `TIMESTAMPTZ`  |                        | Test completion timestamp |

### `sla_timers` Table

| Column           | Type                                   | Constraints            | Description              |
| :--------------- | :------------------------------------- | :--------------------- | :----------------------- |
| `id`             | `UUID`                                 | `PK`                   | Timer identifier         |
| `application_id` | `UUID`                                 | `FK → applications.id` | Linked application       |
| `expires_at`     | `TIMESTAMPTZ`                          | `NOT NULL`             | SLA deadline             |
| `status`         | `ENUM('ACTIVE','COMPLETED','EXPIRED')` | `DEFAULT 'ACTIVE'`     | Timer state              |
| `created_at`     | `TIMESTAMPTZ`                          | `DEFAULT NOW()`        | Timer creation timestamp |

---

## 🛣️ API Route Map

### Auth & User Routes (`/api/auth`)

| Method | Endpoint             | Auth         | Description                                |
| :----- | :------------------- | :----------- | :----------------------------------------- |
| `POST` | `/api/auth/register` | Public       | Register new user (Candidate or Recruiter) |
| `POST` | `/api/auth/login`    | Public       | Login and receive JWT access token         |
| `GET`  | `/api/auth/me`       | JWT Required | Fetch authenticated user profile           |

### Candidate Routes (`/api/candidate`)

| Method | Endpoint                        | Auth          | Description                         |
| :----- | :------------------------------ | :------------ | :---------------------------------- |
| `PUT`  | `/api/candidate/profile`        | Candidate JWT | Update candidate profile            |
| `POST` | `/api/candidate/resume`         | Candidate JWT | Upload PDF resume                   |
| `GET`  | `/api/candidate/jobs`           | Candidate JWT | Fetch eligible job listings feed    |
| `POST` | `/api/candidate/jobs/:id/apply` | Candidate JWT | Submit job application              |
| `GET`  | `/api/candidate/applications`   | Candidate JWT | Get own application pipeline status |

### HR / Recruiter Routes (`/api/hr`)

| Method | Endpoint                          | Auth          | Description                         |
| :----- | :-------------------------------- | :------------ | :---------------------------------- |
| `POST` | `/api/hr/jobs`                    | Recruiter JWT | Create new job posting              |
| `PUT`  | `/api/hr/jobs/:id`                | Recruiter JWT | Update job eligibility criteria     |
| `GET`  | `/api/hr/jobs/:id/applicants`     | Recruiter JWT | View tiered applicant pool          |
| `PUT`  | `/api/hr/applications/:id/status` | Recruiter JWT | Update candidate pipeline status    |
| `GET`  | `/api/hr/sla-alerts`              | Recruiter JWT | Fetch active SLA countdown warnings |

---

## 🔀 Data Flow: Full Candidate Lifecycle

```
1. HR Posts Job
   └─ Eligibility criteria (exp, batch, degree, SLA days) stored in DB

2. Candidate Applies (POST /api/candidate/jobs/:id/apply)
   └─ Gatekeeper checks profile vs job criteria
   └─ If INELIGIBLE → rejected immediately
   └─ If BUFFER ZONE (exp within 15%) → Skill Unlock Test issued
   └─ If ELIGIBLE → PDF resume parsed by ATS Engine

3. ATS Engine Scores Resume
   └─ Weighted score = (skills × 0.5) + (experience × 0.3) + (education × 0.2)
   └─ Tier-1 (≥80%) → Direct to Interview
   └─ Tier-2 (60–79%) → Assessment Test issued
   └─ Tier-3 (<60%) → Auto-rejected

4. Assessment Completed
   └─ Auto-graded test score stored in test_scores table
   └─ Pass → Interview scheduled

5. WebRTC Interview Conducted
   └─ Recruiter and candidate join video room
   └─ Recruiter completes live scorecard

6. SLA Timer Activated (Redis + BullMQ)
   └─ T-48h alert sent to recruiter
   └─ T-24h final alert sent to recruiter
   └─ T-0 expiry → Automated rejection email dispatched to candidate
```
