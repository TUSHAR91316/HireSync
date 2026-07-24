# Contributing to HireSync

Thank you for contributing to HireSync! To maintain code quality, consistency, and a reliable production deployment, we enforce a **strict multi-developer feature-branch workflow**.

> ⚠️ **CRITICAL RULE**: Direct pushing or committing to the `main` branch is strictly prohibited. All changes MUST be submitted via a Pull Request (PR) from a dedicated branch and merged only after passing all status checks and obtaining peer approval.

---

## 🌲 Git Branching Strategy

Our git branching model isolates features, bug fixes, and refactoring tasks into individual, short-lived branches created from `main`.

```
main ------------------------●------------------------●---> (Production Ready)
      \                     /                        /
feature/ats-parser --●----●/                        /
       \                                           /
bugfix/webrtc-audio --------------●----●----------/
```

### Branch Naming Conventions

All branch names must follow standard prefix conventions using lowercase and hyphens:

| Branch Type       | Naming Prefix           | Example                     | Description                                     |
| :---------------- | :---------------------- | :-------------------------- | :---------------------------------------------- |
| **Feature**       | `feature/<short-desc>`  | `feature/ats-resume-parser` | Developing a new core feature or module         |
| **Bug Fix**       | `bugfix/<short-desc>`   | `bugfix/sla-timer-overflow` | Fixing a bug in existing logic                  |
| **Refactor**      | `refactor/<short-desc>` | `refactor/auth-middleware`  | Code restructure without changing functionality |
| **Documentation** | `docs/<short-desc>`     | `docs/update-api-routes`    | Adding or updating documentation                |
| **Hotfix**        | `hotfix/<short-desc>`   | `hotfix/security-jwt-patch` | Urgent fix needed directly for production issue |
| **Chore**         | `chore/<short-desc>`    | `chore/update-dependencies` | Tooling, config, dependency updates             |

---

## 🔄 Step-by-Step Contribution Workflow

### 1. Sync Your Local Repository

Before creating a new branch, always sync your local `main` branch with the latest remote changes:

```bash
git checkout main
git pull origin main
```

### 2. Create a Feature Branch

Create and switch to your dedicated branch:

```bash
git checkout -b feature/your-feature-name
```

### 3. Check Tasks, Format Code & Run Security Scan

1. Refer to **[TASKS.md](TASKS.md)** to review the detailed Candidate vs. HR interface task list assigned to your branch.
2. Make your code changes.
3. Run **code formatting** and **local anti-backdoor security scan** before committing:
   ```bash
   # Auto-format all code files
   npm run format

   # Run local anti-backdoor & security scan
   npm run security:scan
   ```
4. Review **[SECURITY.md](SECURITY.md)** for anti-backdoor policies (no hardcoded master passwords, no hidden debug routes, no obfuscated code).

Follow **Conventional Commit Messages** format:

- `feat`: A new feature (e.g., `feat(ats): add pdf parsing score algorithm`)
- `fix`: A bug fix (e.g., `fix(webrtc): resolve peer connection dropped on renegotiate`)
- `docs`: Documentation changes (e.g., `docs: update setup instructions in README`)
- `style`: Formatting, missing semi-colons, no code logic change
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Build process or auxiliary tools updates

Commit example:

```bash
git add .
git commit -m "feat(gatekeeper): add eligibility hard filter validation"
```

### 4. Push Branch to Remote Repository

Push your local branch to GitHub / GitLab / Bitbucket:

```bash
git push -u origin feature/your-feature-name
```

### 5. Create a Pull Request (PR)

Open a Pull Request against the `main` branch:

1. GitHub will automatically load the [PULL_REQUEST_TEMPLATE](.github/PULL_REQUEST_TEMPLATE.md).
2. Complete the checklist, select the affected HireSync module, and provide a descriptive summary of changes.
3. Link relevant issue numbers (e.g., `Closes #12`).
4. Tag team members for peer code review.

### 6. Automated CI Pipeline & Code Review

Before any PR can be merged into `main`, GitHub Actions runs the **[HireSync CI Pipeline](.github/workflows/ci.yml)** automatically:

- ⚡ **Job 1: Code Quality**: ESLint, formatting, and syntax validation.
- 🛡️ **Job 2: Security Audit**: Dependency vulnerability scan (`npm audit`).
- 🧪 **Job 3: Build & Test**: Executes test suites and validates build outputs.

**Merge Requirements**:

- [ ] **All CI Pipeline Status Checks** must pass with green checkmarks.
- [ ] **Peer Review**: At least **1 mandatory review approval** from a team member.
- [ ] **No Conflicts**: Resolve any merge conflicts with `main` before merging.

### 7. Merge into `main`

Once all checks pass and approval is received:

- Select **Squash and Merge** (or **Rebase and Merge**) to keep the `main` branch commit history clean.
- Delete the remote and local feature branch after merging:

```bash
git checkout main
git pull origin main
git branch -d feature/your-feature-name
```

---

## 🧪 Code Quality & Zero-Hardcoding Requirements

1. **Zero Hardcoding Policy**: Never hardcode ports (`5000`), URLs (`localhost:3000`), database URIs, secret keys, ATS scoring thresholds (80%), or SLA windows in logic code. Always import parameters from **`src/config/index.js`**.
2. **Environment Variables**: Use **`.env.example`** to document new environment parameters. Never commit `.env` files or API secrets to Git.
3. **Verification**: Always verify your code formatting and security scan pass locally before pushing:
   ```bash
   # For Node.js / Next.js
   npm run lint
   npm run test
   npm run build

   # For Python (if applicable)
   pytest
   flake8
   ```

## 💬 Team Communication & GitHub Discussions

If you have questions about system architecture, database schema designs, ATS algorithms, or API endpoints, use **[GitHub Discussions](.github/DISCUSSIONS.md)** before starting implementation:

- 🏗️ Open an **[Architecture Proposal](.github/DISCUSSION_TEMPLATE/architecture_proposal.yml)** for schema or API design changes.
- 💡 Open a **[Feature Idea](.github/DISCUSSION_TEMPLATE/feature_idea.yml)** for candidate or HR portal feature proposals.
- ❓ Open a **[Question / Q&A](.github/DISCUSSION_TEMPLATE/question_qa.yml)** for environment setup or troubleshooting help.
