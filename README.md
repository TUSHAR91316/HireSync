# HireSync — Unified Off-Campus Recruitment System & Automated ATS Engine

> An End-to-End Platform for Candidate Pool Control, In-App Assessment, WebRTC Interviews, and Recruiter Decision SLAs.

---

## 📋 Table of Contents

- [Executive Summary](#-executive-summary)
- [Quick Start](#-quick-start)
- [Key Features](#-key-features)
- [Dual Interface Architecture](#-dual-interface-architecture)
- [System Architecture](#️-system-architecture)
- [Technology Stack](#️-technology-stack)
- [Project Roadmap](#️-project-roadmap)
- [Repository Structure](#-repository-structure)
- [Automated CI Pipeline](#️-automated-ci-pipeline)
- [Development & Contribution](#-development--contribution-guidelines)
- [Security Governance](#️-security-governance--anti-backdoor-controls)
- [Discussions & Team Communication](#-discussions--team-communication)
- [License & Conduct](#-license--conduct)

---

## 📌 Executive Summary

The modern off-campus recruitment ecosystem is broken for both job seekers and hiring managers. Passive job boards flood recruiters with thousands of unvetted, irrelevant applications, leading to recruiter fatigue, high drop-off rates, and systemic **candidate ghosting**.

**HireSync** is an integrated, end-to-end off-campus recruitment middleware. The platform unifies upstream eligibility gatekeeping, automated ATS resume parsing, native skill assessments, embedded WebRTC video interviewing, and automated Service-Level Agreement (SLA) decision enforcement under a single web ecosystem.

---

## ⚡ Quick Start

> Full setup instructions: **[SETUP.md](SETUP.md)**

```bash
# 1. Clone the repository
git clone https://github.com/TUSHAR91316/HireSync.git
cd HireSync

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Run pre-commit verification scripts
npm run format
npm run security:scan
npm run test

# 5. Checkout your assigned branch
git checkout feature/your-assigned-branch
```

---

## 🚀 Key Features

### 1. Upstream Eligibility Gatekeeper

- **Hard Filters**: Locks application buttons based on experience, graduation batch year, degree stream, and maximum notice period.
- **Skill-Based Unlock**: Enables candidates within 15% of the experience threshold to attempt timed skill tests to unlock their application.

### 2. Automated ATS Engine & Resume Parser

- **PDF Document Parsing**: Extracts structured data (work history, skills, education, contact details) from uploaded PDF resumes.
- **Algorithmic Match Scoring**: Calculates weighted percentage match scores comparing job description requirements against candidate profiles.
- **Automated Candidate Tiering**: Categorizes applicants into **Tier-1** (≥80%, Ideal Match), **Tier-2** (60–79%, Conditional), and **Tier-3** (<60%, Ineligible).

### 3. Integrated In-App Assessment & WebRTC Interviewing

- **Native Testing Engine**: Serves auto-graded multiple-choice and short-form skill tests within the candidate dashboard.
- **Embedded Video Interviewing**: Built-in WebRTC video rooms with real-time recruiter evaluation scorecards alongside the live video frame.

### 4. Live Application Status Tracking

- Real-time, stage-by-stage pipeline tracker: **Applied → Screened → Assessment → Interview → Decision**
- Maximum estimated waiting times displayed per stage for complete candidate transparency.

### 5. Recruiter Decision SLA Engine

- Background Redis + BullMQ timer activated upon interview completion.
- T-48h and T-24h countdown alerts sent to recruiters.
- Automated polite rejection email triggered on SLA deadline expiry without recruiter action.

---

## 💻 Dual Interface Architecture

HireSync serves two distinct user role portals:

| 🧑‍💻 Candidate Portal                | 🏢 HR / Company Portal                      |
| :--------------------------------- | :------------------------------------------ |
| Profile & resume upload            | Job posting creation (eligibility criteria) |
| Job search with eligibility badges | ATS applicant pool (Tier 1/2/3 view)        |
| Skill Unlock timed test            | Candidate test scorecards                   |
| In-app skill assessment            | WebRTC interview room + evaluation rubric   |
| Live pipeline status tracker       | SLA countdown alert center                  |
| Candidate WebRTC video room        | Automated fallback action management        |

---

## 🏗️ System Architecture

HireSync is built using a **Three-Tier Web Application Architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER (CLIENT)                    │
│  🧑‍💻 Candidate Portal           🏢 HR / Recruiter Portal        │
│        (Next.js / React)              (Next.js / React)         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                 APPLICATION LAYER (BACKEND API)                  │
│   Node.js (Express) / Python (FastAPI)                          │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Auth & RBAC    │  │  ATS Parser     │  │  SLA BullMQ     │ │
│  │  Middleware     │  │  Engine         │  │  Queue Worker   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │  Eligibility    │  │  WebRTC         │                       │
│  │  Gatekeeper     │  │  Signaling      │                       │
│  └─────────────────┘  └─────────────────┘                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    DATA & SERVICES LAYER                         │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │  PostgreSQL Database  │    │  Redis + BullMQ Queue        │   │
│  │  (Relational Store)   │    │  (SLA Timers & Email Workers)│   │
│  └──────────────────────┘    └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

Full schema tables, API route map, and data flow diagrams: **[ARCHITECTURE.md](ARCHITECTURE.md)**

---

## 🛠️ Technology Stack

| Layer               | Technologies                                      |
| :------------------ | :------------------------------------------------ |
| **Frontend**        | React.js / Next.js, Tailwind CSS                  |
| **Backend API**     | Node.js (Express) / Python (FastAPI)              |
| **Database**        | PostgreSQL                                        |
| **Cache & Queue**   | Redis + BullMQ / Celery                           |
| **Real-Time Video** | WebRTC API / Agora SDK                            |
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

## 📁 Repository Structure

```
HireSync/
├── src/
│   ├── components/
│   │   ├── candidate/          # 🧑‍💻 Candidate Portal UI components
│   │   ├── hr/                 # 🏢 HR / Recruiter Portal UI components
│   │   └── common/             # Shared UI components (Navbar, Sidebar, Badges)
│   ├── services/               # ATS Parser, Redis SLA Worker, WebRTC Signaling
│   ├── middleware/             # JWT Auth, Role Isolation, Eligibility Gatekeeper
│   ├── db/                     # PostgreSQL client & schema definitions
│   └── config/                 # Centralized environment configuration (no hardcoding)
├── tests/
│   ├── unit/                   # ATS scoring, eligibility, JWT unit tests
│   ├── integration/            # API endpoint integration tests
│   └── security/               # Auth bypass and XSS sanitization tests
├── scripts/
│   └── security-scan.js        # Local anti-backdoor static scanner (npm run security:scan)
├── .github/
│   ├── workflows/ci.yml        # GitHub Actions CI pipeline
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── SECURITY_CHECKLIST.md
│   ├── DISCUSSION_TEMPLATE/    # Architecture, Feature Idea, Q&A templates
│   └── ISSUE_TEMPLATE/         # Bug report and feature request templates
├── .env.example                # Environment variable template
├── .prettierrc                 # Code formatting rules
├── TASKS.md                    # Branch-wise task assignments + collaborator roster
├── SETUP.md                    # Local development setup guide
├── ARCHITECTURE.md             # DB schemas, API routes, and data flow
├── CHANGELOG.md                # Version history
├── CONTRIBUTING.md             # Git workflow and PR standards
├── SECURITY.md                 # Security policy and anti-backdoor rules
└── README.md                   # This file
```

---

## ⚙️ Automated CI Pipeline

HireSync uses **GitHub Actions** for continuous integration on every Pull Request to `main`:

- ⚡ **Code Quality**: Linter and formatting checks.
- 🛡️ **Security Audit**: Dependency vulnerability scanning (`npm audit`).
- 🧪 **Build & Test**: Test suite execution and production build verification.
- 🚀 **Optimized**: Dependency caching and parallel job execution.

CI is currently set to `workflow_dispatch` (manual trigger). Re-enable by uncommenting push/PR triggers in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## 🤝 Development & Contribution Guidelines

This repository is maintained by multiple developers. All team members must adhere to our contribution workflow:

- 📋 **Task Assignment Matrix**: See **[TASKS.md](TASKS.md)** for branch-wise tasks across **Candidate Portal** and **HR/Company Portal**, including the **Collaborator Branch Ownership Roster**.
- 🎨 **Code Formatting**: Run `npm run format` (Prettier) before committing.
- 🛡️ **Security Scan**: Run `npm run security:scan` before committing.
- 🚫 **No direct commits to `main`**: All work must use dedicated branches (`feature/*`, `bugfix/*`).
- 📖 Full guide: **[CONTRIBUTING.md](CONTRIBUTING.md)** · Setup guide: **[SETUP.md](SETUP.md)**

---

## 🛡️ Security Governance & Anti-Backdoor Controls

HireSync enforces strict security policies:

- 🔍 **Local Security Scanner**: Run `npm run security:scan` before committing code.
- 🚫 **Anti-Backdoor Policy**: Zero tolerance for hardcoded master passwords, hidden debug routes, or obfuscated code.
- ✅ **PR Security Checklist**: Reviewers audit PRs using [`.github/SECURITY_CHECKLIST.md`](.github/SECURITY_CHECKLIST.md).
- 📄 Full policy: **[SECURITY.md](SECURITY.md)**

---

## 💬 Discussions & Team Communication

Use **GitHub Discussions** to align before starting implementation:

- 🏗️ **[Architecture Proposals](.github/DISCUSSION_TEMPLATE/architecture_proposal.yml)** — Schema, API, or algorithm design changes
- 💡 **[Feature Ideas](.github/DISCUSSION_TEMPLATE/feature_idea.yml)** — Candidate or HR portal feature proposals
- ❓ **[Q&A / Help](.github/DISCUSSION_TEMPLATE/question_qa.yml)** — Environment setup or troubleshooting

Guidelines: **[.github/DISCUSSIONS.md](.github/DISCUSSIONS.md)**

---

## 📄 License & Conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for team interaction and conduct rules.
