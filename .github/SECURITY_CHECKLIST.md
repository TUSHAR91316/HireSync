# Pull Request Security & Anti-Backdoor Checklist

PR Reviewers must complete this checklist for every Pull Request before approving code for merge into `main`.

---

## 🚫 1. Anti-Backdoor & Logic Bypass Inspection

- [ ] **No Hardcoded Passwords**: Verified no hardcoded master passwords, default admin credentials, or logic shortcuts (`if (password === 'admin')`).
- [ ] **No Hidden Routes**: Verified no undocumented API endpoints (`/api/backdoor`, `/api/debug/*`, `/api/shell`) exist in the PR diff.
- [ ] **No Obfuscation**: Verified all code is human-readable with no base64-encoded runtime string evaluations.
- [ ] **No Dangerous Execution**: Verified no `eval()`, `new Function()`, or un-sanitized `child_process.exec()` calls are used.

---

## 🔐 2. Authentication & Role Isolation Audit

- [ ] **JWT Verification**: Verified all protected endpoints validate JWT tokens via authentication middleware.
- [ ] **Role Isolation**: Verified Candidate endpoints cannot access Recruiter/HR actions and vice-versa.
- [ ] **No Credential Leaks**: Verified no secret keys, JWT secrets, database connection strings, or API tokens are hardcoded.

---

## 🛡️ 3. Input Sanitization & SQL/XSS Prevention

- [ ] **SQL / Query Injection**: Verified parameterized database queries are used for PostgreSQL interactions.
- [ ] **XSS Prevention**: Verified user inputs (resumes, application notes, job descriptions) are sanitized before rendering.
- [ ] **File Upload Validation**: Verified PDF resume parser checks file types (`application/pdf`) and size limits before processing.

---

## 🧪 4. Automated Verification

- [ ] **Local Security Scan Passed**: `npm run security:scan` executed with zero security violations.
- [ ] **Linter & Formatting Passed**: `npm run format:check` executed cleanly.
