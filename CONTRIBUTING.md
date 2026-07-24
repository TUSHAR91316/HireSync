# Contributing to HireSync

Thank you for contributing to HireSync! To maintain code quality, consistency, and a reliable production deployment, we enforce a **strict multi-developer feature-branch workflow**.

> ⚠️ **CRITICAL RULE**: Direct pushing or committing to the `main` branch is strictly prohibited. All changes MUST be submitted via a Pull Request (PR) from a dedicated branch and merged only after passing all status checks and obtaining peer approval.

---

## 📋 Table of Contents

- [First-Time Contributors](#-first-time-contributors)
- [Git Branching Strategy](#-git-branching-strategy)
- [Step-by-Step Contribution Workflow](#-step-by-step-contribution-workflow)
- [Code Quality & Zero-Hardcoding Requirements](#-code-quality--zero-hardcoding-requirements)
- [Team Communication & GitHub Discussions](#-team-communication--github-discussions)

---

## 👋 First-Time Contributors

If this is your first time contributing, follow these steps to get up and running:

1. **Read the project overview**: [README.md](README.md)
2. **Set up local development**: [SETUP.md](SETUP.md) — covers Node.js, PostgreSQL, Redis, and `.env` setup.
3. **Understand the system architecture**: [ARCHITECTURE.md](ARCHITECTURE.md) — DB schemas, API routes, and data flows.
4. **Find your task**: [TASKS.md](TASKS.md) — Your assigned branch and Candidate / HR interface task list.
5. **Review security rules**: [SECURITY.md](SECURITY.md) — Anti-backdoor and zero-hardcoding policies.
6. **Follow this workflow** (steps below).

---

## 🌲 Git Branching Strategy

Our git branching model isolates features, bug fixes, and refactoring tasks into individual, short-lived branches created from `main`.

```
main ─────────────●─────────────────●──> (Production Ready)
     \            ↑                 ↑
      feature/ats-parser ──●──●────/
       \
        bugfix/webrtc-audio ──●──●────/
```

### Branch Naming Conventions

All branch names must follow standard prefix conventions using lowercase and hyphens:

| Branch Type       | Naming Prefix           | Example                     | Description                              |
| :---------------- | :---------------------- | :-------------------------- | :--------------------------------------- |
| **Feature**       | `feature/<short-desc>`  | `feature/ats-resume-parser` | New core feature or module               |
| **Bug Fix**       | `bugfix/<short-desc>`   | `bugfix/sla-timer-overflow` | Fix existing logic defect                |
| **Refactor**      | `refactor/<short-desc>` | `refactor/auth-middleware`  | Code restructure without behavior change |
| **Documentation** | `docs/<short-desc>`     | `docs/update-api-routes`    | Add or update documentation              |
| **Hotfix**        | `hotfix/<short-desc>`   | `hotfix/security-jwt-patch` | Urgent production-level patch            |
| **Chore**         | `chore/<short-desc>`    | `chore/update-dependencies` | Tooling, config, and dependency updates  |

---

## 🔄 Step-by-Step Contribution Workflow

### 1. Sync Your Local Repository

Before creating a new branch, always sync with the latest remote `main`:

```bash
git checkout main
git pull origin main
```

### 2. Checkout Your Assigned Branch

Find your assignment in [TASKS.md](TASKS.md) and switch to your branch:

```bash
git checkout feature/your-assigned-branch
git pull origin feature/your-assigned-branch
```

### 3. Implement, Format, and Scan

1. Make your code changes following the tasks in [TASKS.md](TASKS.md).
2. Always import all configuration from **`src/config/index.js`** — never hardcode values.
3. Run pre-commit verification scripts:

```bash
# Auto-format all code files
npm run format

# Run local anti-backdoor & security scan
npm run security:scan

# Run linter
npm run lint

# Run tests
npm run test
```

4. Review [SECURITY.md](SECURITY.md) for anti-backdoor policies.

### 4. Commit with Conventional Messages

Follow the **Conventional Commit Messages** format:

| Prefix     | Meaning                   | Example                                        |
| :--------- | :------------------------ | :--------------------------------------------- |
| `feat`     | New feature               | `feat(ats): add pdf parsing score algorithm`   |
| `fix`      | Bug fix                   | `fix(webrtc): resolve peer connection drop`    |
| `docs`     | Documentation             | `docs: update setup instructions`              |
| `style`    | Formatting only           | `style: apply prettier formatting`             |
| `refactor` | Refactor (no bug/feature) | `refactor(auth): simplify middleware chain`    |
| `test`     | Add/update tests          | `test(sla): add redis worker integration test` |
| `chore`    | Tooling updates           | `chore: update prettier to v3.0`               |
| `security` | Security fix              | `security: remove hardcoded JWT secret`        |

```bash
git add .
git commit -m "feat(gatekeeper): add eligibility hard filter validation"
```

### 5. Push to Remote Branch

```bash
git push -u origin feature/your-feature-name
```

### 6. Open a Pull Request

Open a PR against `main` on GitHub:

1. GitHub will auto-load the [PR Template](.github/PULL_REQUEST_TEMPLATE.md).
2. Fill in the summary, type of change, and affected HireSync module.
3. Complete the pre-merge checklist (including security scan confirmation).
4. Link relevant issues (e.g., `Closes #12`).
5. Tag team members for code review.

### 7. CI Pipeline & Peer Review

GitHub Actions runs the **[CI Pipeline](.github/workflows/ci.yml)** automatically:

| Job                   | Check                           |
| :-------------------- | :------------------------------ |
| ⚡ **Code Quality**   | ESLint, formatting verification |
| 🛡️ **Security Audit** | `npm audit` dependency scan     |
| 🧪 **Build & Test**   | Test suite + production build   |

**Merge Requirements:**

- [ ] All CI status checks pass.
- [ ] At least **1 peer code review approval**.
- [ ] PR reviewer completes [Security Checklist](.github/SECURITY_CHECKLIST.md).
- [ ] No merge conflicts with `main`.

### 8. Merge into `main` & Clean Up

Select **Squash and Merge** to keep history clean:

```bash
git checkout main
git pull origin main
git branch -d feature/your-feature-name
```

---

## 🧪 Code Quality & Zero-Hardcoding Requirements

1. **Zero Hardcoding Policy**: Never hardcode ports, URLs, database URIs, JWT secrets, ATS thresholds, or SLA windows. Always import from **`src/config/index.js`**.
2. **Environment Variables**: Document all new parameters in **`.env.example`**. Never commit `.env` files or secrets.
3. **Clean Code**: Follow DRY, modular design, and proper error handling.
4. **Verification checklist before pushing**:
   ```bash
   npm run format:check   # ✅ Zero formatting errors
   npm run security:scan  # ✅ Zero security violations
   npm run lint           # ✅ Zero lint errors
   npm run test           # ✅ All tests pass
   ```

---

## 💬 Team Communication & GitHub Discussions

Use **GitHub Discussions** before starting implementation of major changes:

- 🏗️ Open an **[Architecture Proposal](.github/DISCUSSION_TEMPLATE/architecture_proposal.yml)** for schema or API design changes.
- 💡 Open a **[Feature Idea](.github/DISCUSSION_TEMPLATE/feature_idea.yml)** for Candidate or HR portal feature proposals.
- ❓ Open a **[Question / Q&A](.github/DISCUSSION_TEMPLATE/question_qa.yml)** for environment setup or troubleshooting.

Guidelines: [.github/DISCUSSIONS.md](.github/DISCUSSIONS.md)
