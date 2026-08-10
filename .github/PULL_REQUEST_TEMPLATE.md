<!-- ✅ HOW TO USE CHECKBOXES: The boxes below are NOT clickable in the "Preview" tab.
     Submit the PR first → then click each checkbox directly on the PR page to tick it. -->

## 📌 Pull Request Description

### Summary of Changes

Provide a clear, concise summary of the changes introduced in this PR.

### Type of Change

- [ ] 🚀 **New Feature** (non-breaking change introducing new functionality)
- [ ] 🐛 **Bug Fix** (non-breaking change fixing an issue)
- [ ] 🧹 **Refactor** (code restructuring without changing external behavior)
- [ ] ⚡ **Performance Improvement** (optimizing execution speed or memory usage)
- [ ] 📝 **Documentation Update** (updates to README, CONTRIBUTING, or inline comments)
- [ ] 🔒 **Security Fix** (vulnerability remediation)

---

## 🎯 Related Module / Pillar

- [ ] Upstream Eligibility Gatekeeper
- [ ] Automated ATS Engine & Resume Parser
- [ ] In-App Skill Assessment Module
- [ ] WebRTC Embedded Video Interviewing
- [ ] Recruiter Decision SLA Engine & Redis Queue
- [ ] Database Schema & Authentication

---

## 🧪 Verification & Testing

### ✅ Automated Test Results

Paste the output of your local test run here:

```
# Run this before raising the PR:
npm run test

# Expected output:
Test Suites: X passed, X total
Tests:       X passed, X total
```

### 🔬 Manual Testing Steps

Describe **exactly** what you manually tested. Be specific — not generic:

| Step | What You Did | Expected Result | Actual Result |
| :--- | :--- | :--- | :--- |
| 1 | e.g. Uploaded a valid PDF resume via `ResumeUploader` | Parse result returned with skills extracted | ✅ Pass / ❌ Fail |
| 2 | e.g. Uploaded a `.exe` file renamed to `.pdf` | Rejected with `INVALID_FILE_TYPE` error | ✅ Pass / ❌ Fail |
| 3 | e.g. Submitted a PR with white-font keywords in resume | Anti-gaming flag triggered (`SEC-AG-001`) | ✅ Pass / ❌ Fail |

### 🛡️ Security & Format Verification Output

```
npm run security:scan    → ✅ PASSED / ❌ FAILED (paste result)
npm run format:check     → ✅ PASSED / ❌ FAILED (paste result)
```

### Pre-Merge Checklist

- [ ] Checked [TASKS.md](../TASKS.md) and completed all applicable task items.
- [ ] My code follows zero-hardcoding rules — all config imported from `src/config/index.js`.
- [ ] Ran `npm run format` — zero formatting errors.
- [ ] Ran `npm run security:scan` — **PASSED** with no violations.
- [ ] Ran `npm run lint` — zero lint errors.
- [ ] Ran `npm run test` — all tests pass.
- [ ] I have performed a self-review of my own code.
- [ ] I have added/updated relevant unit or integration tests.
- [ ] My branch is up-to-date with `main` (`git rebase main` or `git merge main`).
- [ ] All CI status checks are passing cleanly.
- [ ] PR reviewer has completed the [Security Checklist](SECURITY_CHECKLIST.md).
