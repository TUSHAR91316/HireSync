# HireSync — Collaborator Task Assignment Matrix

> 📌 **Instructions for Collaborators**:
>
> 1. Set up local environment first: **[SETUP.md](SETUP.md)**
> 2. Find your assigned branch in the **Collaborator Branch Ownership Roster** below.
> 3. Checkout your branch: `git checkout <branch-name>`
> 4. Implement the specified Candidate or HR/Company interface tasks.
> 5. Run all 3 pre-commit scripts before committing:
>    ```bash
>    npm run format          # Auto-format code
>    npm run security:scan   # Anti-backdoor check
>    npm run test            # Run test suite
>    ```
> 6. Commit using conventional commit messages and open a Pull Request against `main`.

---

## 💻 Dual Interface Overview

HireSync is structured around two distinct web interface roles:

- 🧑‍💻 **Candidate Portal**: Profile setup, job browsing with eligibility indicators, skill unlock test interface, live pipeline status tracker (`Applied` $\rightarrow$ `Screened` $\rightarrow$ `Assessment` $\rightarrow$ `Interview` $\rightarrow$ `Decision`), and candidate WebRTC video room.
- 🏢 **HR / Company Portal**: Job creation with restriction filters & SLA parameters, ATS candidate pool dashboard (Tier 1/2/3 breakdown), live scorecards, WebRTC interview room with recruiter evaluation rubric, and SLA alert management.

---

## 👥 Collaborator Branch Ownership Roster

Use this table to assign team members to specific feature and auxiliary branches:

| Branch Name                          | Assigned Collaborator(s) | Primary Module / Target               | Branch Status  |
| :----------------------------------- | :----------------------- | :------------------------------------ | :------------- |
| **`feature/auth-and-dashboard`**     | `@collaborator_name`     | JWT Auth, Candidate & HR Dashboards   | 🟡 In Progress |
| **`feature/eligibility-gatekeeper`** | `@collaborator_name`     | Job Creation Form & Gatekeeper Unlock | 🟡 In Progress |
| **`feature/ats-resume-parser`**      | `@collaborator_name`     | PDF Resume Parsing & Match Scoring    | 🟡 In Progress |
| **`feature/assessment-engine`**      | `@collaborator_name`     | Timed Skill Assessment Testing Portal | 🟡 In Progress |
| **`feature/webrtc-video-interview`** | `@collaborator_name`     | Embedded WebRTC Video & Scorecards    | 🟡 In Progress |
| **`feature/sla-decision-engine`**    | `@collaborator_name`     | Redis BullMQ SLA Worker & Alerts      | 🟡 In Progress |
| **`bugfix/general-fixes`**           | `@collaborator_name`     | Bug Fixes & Edge-Case Remediation     | 🟢 Active      |
| **`refactor/code-optimization`**     | `@collaborator_name`     | Performance & Query Optimization      | 🟢 Active      |
| **`docs/documentation-updates`**     | `@collaborator_name`     | API Documentation & Diagrams          | 🟢 Active      |
| **`chore/dev-setup`**                | `@collaborator_name`     | Tooling & Dependencies Setup          | 🟢 Active      |

---

## 🌿 Branch-Wise Task Breakdown

### 1. `feature/auth-and-dashboard`

> **Primary Goal**: Authentication, Role-Based Access Control (RBAC), and Core Dashboard Layouts.

#### 🧑‍💻 Candidate Interface Tasks

- [ ] Implement Candidate Login & Registration UI (Email, Password, Candidate Profile fields).
- [ ] Build Candidate Dashboard Shell with persistent sidebar navigation (Jobs, My Applications, Assessments, Interviews, Settings).
- [ ] Build Candidate Profile Management Page (Upload resume, experience years, batch year, degree stream, notice period).

#### 🏢 HR / Company Interface Tasks

- [ ] Implement HR / Recruiter Login & Registration UI (Company Name, HR Email, Designation, Company Logo).
- [ ] Build HR Dashboard Shell with recruiter navigation (Post Job, Active Listings, Applicant Pools, SLA Alerts, Analytics).
- [ ] Implement JWT Middleware for Role Isolation (`CANDIDATE` routes vs `RECRUITER` routes).

#### 📝 Branch Commit Example

`feat(auth): add JWT role-based routing for candidate and HR dashboards`

---

### 2. `feature/eligibility-gatekeeper`

> **Primary Goal**: Upstream eligibility filtering and Skill-Based Unlock mechanism.

#### 🧑‍💻 Candidate Interface Tasks

- [ ] Build Candidate Job Search & Feed page with visual eligibility status badges (`Eligible`, `Skill Unlock Available`, `Ineligible`).
- [ ] Create Skill Unlock Modal: Timed 15-minute test trigger for candidates who fall within experience threshold buffer (e.g. 1.5 yrs vs 2.0 yrs required).
- [ ] Implement application button locking logic for ineligible candidates.

#### 🏢 HR / Company Interface Tasks

- [ ] Build HR Job Creation Form: Input job title, description, minimum experience, allowed graduation batch years, degree streams, maximum notice period, and SLA window (days).
- [ ] Build HR Job Configuration Manager: Edit or update eligibility criteria and evaluation weightages for active job postings.

#### 📝 Branch Commit Example

`feat(gatekeeper): build HR job creation form with eligibility hard filters`

---

### 3. `feature/ats-resume-parser`

> **Primary Goal**: PDF resume text extraction, algorithmic match scoring, and applicant tiering.

#### 🧑‍💻 Candidate Interface Tasks

- [ ] Build Candidate Resume Upload Component (Drag-and-drop PDF resume upload with progress bar).
- [ ] Display Candidate Resume Extraction Preview (Parsed work history, extracted skills, contact details confirmation).

#### 🏢 HR / Company Interface Tasks

- [ ] Implement PDF Resume Parsing Service (`pdf-parse` / `pdfplumber`) extracting skills, experience, and education.
- [ ] Implement Algorithmic Match Scoring engine comparing JD keywords against candidate parsed data.
- [ ] Build HR Applicant Pool View: Tiered lists for **Tier-1** (Ideal Match $\ge 80\%$), **Tier-2** (Conditional $60-79\%$), and **Tier-3** (Ineligible $< 60\%$).
- [ ] Build Candidate Detailed Resume Match Breakdown modal for HR recruiters.

#### 📝 Branch Commit Example

`feat(ats): implement weighted match scoring and candidate tiering view`

---

### 4. `feature/assessment-engine`

> **Primary Goal**: Native, auto-graded in-app skill evaluation testing.

#### 🧑‍💻 Candidate Interface Tasks

- [ ] Build Candidate Skill Test Portal: Timed multiple-choice and short-answer assessment environment.
- [ ] Build Auto-Submit & Timer Component for candidate assessments.
- [ ] Build Test Completion Screen with submission status.

#### 🏢 HR / Company Interface Tasks

- [ ] Build HR Test Creator Module: Add multiple-choice questions, correct answer keys, and passing score thresholds per job posting.
- [ ] Build HR Applicant Test Scorecard: View candidate assessment scores, time taken, and detailed question-by-question breakdown.

#### 📝 Branch Commit Example

`feat(assessment): build candidate timed testing UI and auto-grading engine`

---

### 5. `feature/webrtc-video-interview`

> **Primary Goal**: Embedded browser-based WebRTC video conferencing & live evaluation scorecards.

#### 🧑‍💻 Candidate Interface Tasks

- [ ] Build Candidate WebRTC Video Room: Video stream, audio toggle, screen share, and waiting room UI.
- [ ] Build Candidate Interview Schedule view with countdown timer and join button.

#### 🏢 HR / Company Interface Tasks

- [ ] Build HR WebRTC Video Room: Dual view (Live Candidate Video on left frame, Live Recruiter Scorecard on right frame).
- [ ] Build HR Recruiter Evaluation Scorecard: Real-time rating sliders (Technical Skills, Communication, Problem Solving) & recruiter notes.
- [ ] Implement interview completion trigger updating candidate application status to `Interview Completed`.

#### 📝 Branch Commit Example

`feat(webrtc): build recruiter video room with embedded live evaluation scorecard`

---

### 6. `feature/sla-decision-engine`

> **Primary Goal**: Redis + BullMQ background SLA countdown timers & automated notifications.

#### 🧑‍💻 Candidate Interface Tasks

- [ ] Build Candidate Stage-by-Stage Live Pipeline Tracker (`Applied` $\rightarrow$ `Screened` $\rightarrow$ `Assessment` $\rightarrow$ `Interview` $\rightarrow$ `Decision`).
- [ ] Display Candidate Estimated Waiting Time badge based on active SLA window.

#### 🏢 HR / Company Interface Tasks

- [ ] Implement Redis + BullMQ SLA Worker: Delayed countdown queue monitoring candidate decision deadlines.
- [ ] Build HR SLA Alert Center: Visual warnings for expiring candidate decision windows (T-48h, T-24h).
- [ ] Build Automated Fallback Action Routine: Release polite rejection/feedback emails if HR timer expires without manual action.

#### 📝 Branch Commit Example

`feat(sla): implement Redis BullMQ delay queue and HR SLA alert dashboard`

---

### 7. Auxiliary Branches Tasks

#### `bugfix/general-fixes`

- [ ] Fix edge-case defects in candidate form validations and HR table filters.
- [ ] Resolve cross-browser layout inconsistencies.

#### `refactor/code-optimization`

- [ ] Refactor API route handlers for cleaner async/await error catching.
- [ ] Optimize database query indexing for high-volume candidate listings.

#### `docs/documentation-updates`

- [ ] Update API endpoint documentation and schema diagrams.

#### `chore/dev-setup`

- [ ] Maintain dependencies, Prettier formatting scripts, and development tooling.

---

## 🎨 Code Formatting Requirement Before Commit

All collaborators must run formatting before committing code on their branch:

```bash
# Check code formatting
npm run format:check

# Auto-format all code files
npm run format
```
