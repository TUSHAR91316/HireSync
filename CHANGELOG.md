# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added

- Centralized environment configuration module (`src/config/index.js`) with zero-hardcoding enforcement.
- `.env.example` comprehensive environment variables template.
- Local automated anti-backdoor & security scanner (`scripts/security-scan.js`, `npm run security:scan`).
- 6 feature branches for parallel team development (`feature/auth-and-dashboard`, `feature/eligibility-gatekeeper`, `feature/ats-resume-parser`, `feature/assessment-engine`, `feature/webrtc-video-interview`, `feature/sla-decision-engine`).
- 5 auxiliary branches (`bugfix/general-fixes`, `hotfix/critical-patches`, `refactor/code-optimization`, `docs/documentation-updates`, `chore/dev-setup`).
- Modular `src/` directory layout (`components/candidate/`, `components/hr/`, `components/common/`, `services/`, `middleware/`, `db/`).
- GitHub Actions CI pipeline (`.github/workflows/ci.yml`) with Code Quality, Security Audit, and Build & Test jobs.
- GitHub PR Template (`.github/PULL_REQUEST_TEMPLATE.md`).
- GitHub Issue Templates — Bug Report and Feature Request (`.github/ISSUE_TEMPLATE/`).
- GitHub Discussion Templates — Architecture Proposal, Feature Idea, Q&A (`.github/DISCUSSION_TEMPLATE/`).
- Collaborator Task Assignment Matrix with Candidate and HR Portal task breakdowns (`TASKS.md`).
- Collaborator Branch Ownership Roster tracking table (`TASKS.md`).
- Project-wide Prettier code formatting rules (`.prettierrc`, `.prettierignore`, `.editorconfig`).
- `.gitignore` — Ensures `.ai/` local AI context folder, `.env`, and build outputs are excluded.
- Local AI context directory (`.ai/` — local only, never committed) with system context, schema map, and prompt templates.
- `SETUP.md` — Full local development environment setup guide.
- `SECURITY.md` — Security policy and anti-backdoor code integrity guidelines.
- `.github/SECURITY_CHECKLIST.md` — PR reviewer security audit checklist.
- `CODE_OF_CONDUCT.md` — Team collaboration and conduct standards.
- `CONTRIBUTING.md` — Multi-developer Git workflow, branching rules, and pre-commit requirements.
- `README.md` — Project documentation with architecture diagram, tech stack, roadmap, and governance overview.

---

## [0.1.0] — 2026-07-24

### Added

- Project repository initialized.
- Initial commit with `Project_Proposal_Unified_Recruitment_System.pdf`.
