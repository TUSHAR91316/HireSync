# HireSync — Unified Off-Campus Recruitment System & Automated ATS Engine

> An End-to-End Platform for Candidate Pool Control, In-App Assessment, WebRTC Interviews, and Recruiter Decision SLAs.

---

## 📌 Executive Summary

The modern off-campus recruitment ecosystem is broken for both job seekers and hiring managers. Passive job boards flood recruiters with thousands of unvetted, irrelevant applications, leading to recruiter fatigue, high drop-off rates, and systemic **candidate ghosting**.

**HireSync** (or TalentPulse ATS) is an integrated, end-to-end off-campus recruitment middleware. The platform unifies upstream eligibility gatekeeping, automated ATS resume parsing, native skill assessments, embedded WebRTC video interviewing, and automated Service-Level Agreement (SLA) decision enforcement under a single web ecosystem.

---

## 🚀 Key Features

### 1. Upstream Eligibility Gatekeeper
* **Hard Filters**: Locks application buttons based on experience, graduation batch year, degree stream, and maximum notice period.
* **Skill-Based Unlock**: Enables candidates who fall slightly below experience thresholds (e.g., 1.5 years vs. 2 years) to attempt timed skill tests to unlock their application.

### 2. Automated ATS Engine & Resume Parser
* **PDF Document Parsing**: Extracts structured data (work history, skills, education, contact details) from uploaded PDF resumes.
* **Algorithmic Match Scoring**: Calculates weighted percentage match scores by comparing job description requirements against candidate profile metrics.
* **Automated Candidate Tiering**: Categorizes applicants into **Tier-1** (Ideal Match), **Tier-2** (Conditional / Assessment), and **Tier-3** (Ineligible).

### 3. Integrated In-App Assessment & WebRTC Interviewing
* **Native Testing Engine**: Serves auto-graded multiple-choice and short-form skill tests directly within the candidate dashboard.
* **Embedded Video Interviewing**: Built-in WebRTC video rooms allow recruiters to conduct live interviews with real-time evaluation scorecards right next to the video frame.

### 4. Live Application Status Tracking
* Provides candidates with a real-time, stage-by-stage pipeline tracker:
  $$\text{Applied} \longrightarrow \text{Screened} \longrightarrow \text{Assessment} \longrightarrow \text{Interview} \longrightarrow \text{Decision}$$
* Displays maximum estimated waiting times for each stage for complete transparency.

### 5. Recruiter Decision SLA Engine
* Implements a background timer (e.g., 7 days) upon assessment or interview completion.
* Triggers automated alerts to recruiters as deadlines approach and executes fallback actions (releasing polite rejection/feedback emails) if no manual decision is made before timer expiration.

---

## 🏗️ System Architecture

HireSync is built using a **Three-Tier Web Application Architecture**:

```
+-------------------------------------------------------------------+
|                   CLIENT LAYER (PRESENTATION)                     |
|      React.js / Next.js Web Interface (Candidate & HR Dashboards) |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                 APPLICATION LAYER (BACKEND API)                   |
|        Node.js (Express) / Python (FastAPI) Web Framework         |
|                                                                   |
|  +-----------------------+     +-------------------------------+  |
|  | Resume Parsing Engine |     | Candidate Eligibility Module  |  |
|  +-----------------------+     +-------------------------------+  |
|  | WebRTC Video Services |     | Assessment Evaluation Engine  |  |
|  +-----------------------+     +-------------------------------+  |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                DATA & BACKGROUND SERVICES LAYER                   |
|                                                                   |
|  +-----------------------+     +-------------------------------+  |
|  | PostgreSQL Database   |     | Redis Queue + BullMQ Worker   |  |
|  | (Relational Storage)  |     | (SLA Timers & Email Workers)  |  |
|  +-----------------------+     +-------------------------------+  |
+-------------------------------------------------------------------+
```

### Data Flow Sequence
1. **Recruiter** posts a job with minimum eligibility criteria, evaluation weightages, and SLA window.
2. **Candidate** views filtered job listings matching their profile parameters.
3. Candidate submits resume $\rightarrow$ **ATS Engine** parses file and generates a match score.
4. Candidates in Tier-1 or Tier-2 receive an **in-app assessment**.
5. Upon passing, a **WebRTC video interview** slot is scheduled.
6. **SLA Background Worker** monitors decision timers and sends notifications or triggers automated fallback outcomes.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React.js / Next.js, Tailwind CSS |
| **Backend API** | Node.js (Express) / Python (FastAPI) |
| **Database** | PostgreSQL |
| **Cache & Queue** | Redis + BullMQ / Celery |
| **Real-Time Video** | WebRTC API / Agora SDK |
| **Parsing & Email** | `pdfplumber` / `pdf-parse`, Nodemailer / SendGrid |

---

## 🗓️ Project Roadmap

- [x] **Phase 1: Requirement Analysis & Repository Setup (Week 1)**
  - Finalize specifications, schema designs, and setup contribution workflows.
- [ ] **Phase 2: Core Platform Development & Gatekeeping (Week 2)**
  - JWT Authentication, Job posting modules with eligibility lock, Candidate Dashboard.
- [ ] **Phase 3: ATS Engine, Assessment & SLA Integration (Week 3)**
  - PDF parser algorithm, test module, Redis background queue for SLA timers.
- [ ] **Phase 4: WebRTC Video Call, Testing & Deployment (Week 4)**
  - WebRTC video rooms, end-to-end integration testing, cloud deployment.

---

## ⚙️ Automated CI Pipeline

HireSync uses **GitHub Actions** for continuous integration and automated quality enforcement on every Pull Request to `main`:
- ⚡ **Code Quality**: Linter checks and code formatting verification.
- 🛡️ **Security Audit**: Dependency vulnerability auditing (`npm audit`).
- 🧪 **Build & Test**: Automated execution of test suites and production build verification.
- 🚀 **Performance Optimization**: Includes build-level caching and parallel job execution.

For detailed branching rules and PR submission steps, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 🤝 Development & Contribution Guidelines

This repository is maintained by multiple developers. All team members must adhere to our contribution workflow:
- **No direct commits to `main`**. All work must be conducted on dedicated branches (`feature/*`, `bugfix/*`).
- All changes require a **Pull Request (PR)**, passing code checks, and approval before merging into `main`.
- See [CONTRIBUTING.md](CONTRIBUTING.md) for full instructions and PR templates.

---

## 📄 License & Conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for team interaction rules.
