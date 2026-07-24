# Security Policy & Anti-Backdoor Code Integrity Guidelines

The **HireSync** team takes security, user privacy, and code integrity extremely seriously. This document outlines our security governance, anti-backdoor standards, code review protocols, and vulnerability reporting procedures.

---

## 📋 Table of Contents

- [Anti-Backdoor & Code Integrity Policy](#️-anti-backdoor--code-integrity-policy)
- [Local Automated Anti-Backdoor Scanner](#-local-automated-anti-backdoor-scanner)
- [Scanner Rule Reference](#-scanner-rule-reference)
- [Reporting a Security Vulnerability](#-reporting-a-security-vulnerability)

---

## 🛡️ Anti-Backdoor & Code Integrity Policy

To maintain a secure recruitment platform and prevent unauthorized access or malicious code insertion, **all contributors must strictly adhere to the following security rules**:

### 1. Zero Tolerance for Authentication Bypasses & Master Passwords

- **No Hardcoded Master Passwords**: Hardcoding fallback passwords (e.g., `if (password === "admin_secret") return true;`) is strictly forbidden.
- **No Role Bypasses**: Bypassing role-based authorization checks (`CANDIDATE` vs. `RECRUITER`) using hidden flags or query parameters is prohibited.
- **No Hidden Debug Endpoints**: Creating unauthenticated routes for dumping database records, bypassing authentication, or executing shell commands (e.g., `/api/backdoor`, `/api/debug/dump`) is prohibited.

### 2. Zero Tolerance for Code Obfuscation

- All pull requests (PRs) must consist of clear, un-obfuscated, human-readable source code.
- Base64-encoded logic, minified code snippets, or runtime string evaluation (`eval()`, `new Function()`, `atob()`) will result in immediate PR rejection.

### 3. Secret & Credential Isolation

- Absolutely **no API keys, database connection strings, JWT signing keys, or passwords** may be committed to the repository.
- Use `.env` environment variables exclusively. All secret references must be loaded via `process.env.VARIABLE_NAME` — and only accessed through **`src/config/index.js`**, not directly in business logic.
- Reference: [`.env.example`](.env.example) documents all required environment variables.

### 4. Mandatory Peer Review & Audit

- All PRs targeting `main` require a minimum of **2 peer code review approvals**.
- Self-merging of PRs is disabled on protected branches.
- PR reviewers must complete the **[Security Review Checklist](.github/SECURITY_CHECKLIST.md)** prior to approving any code.

---

## 🔍 Local Automated Anti-Backdoor Scanner

Before committing code, developers must run the local automated security scanner to inspect their changes for backdoor signatures and secret leaks:

```bash
# Run local security & anti-backdoor scan
npm run security:scan
```

**Expected output on a clean codebase:**

```
====================================================
 🛡️  HireSync Local Anti-Backdoor & Security Scanner
====================================================

Scanned 3 file(s).

✅ Security Scan PASSED: No backdoors, secret leaks, or dangerous patterns detected.
```

---

## 📋 Scanner Rule Reference

| Rule ID   | Severity  | Pattern Detected                                                                       | Action on Detection                       |
| :-------- | :-------- | :------------------------------------------------------------------------------------- | :---------------------------------------- |
| `SEC-001` | 🔴 HIGH   | Hardcoded master passwords, `bypassAuth = true`, `skipAuth = true`                     | **FAIL** — must be removed                |
| `SEC-002` | 🔴 HIGH   | Hardcoded `JWT_SECRET`, `AWS_SECRET_ACCESS_KEY`, raw database URI strings              | **FAIL** — must be removed                |
| `SEC-003` | 🔴 HIGH   | `eval()`, `new Function()`, `child_process.exec()`                                     | **FAIL** — must be removed                |
| `SEC-004` | 🔴 HIGH   | Hidden routes: `/api/backdoor`, `/api/debug-shell`, `/api/dump-db`                     | **FAIL** — must be removed                |
| `SEC-005` | 🟡 MEDIUM | Base64 `atob()` / `Buffer.from(..., 'base64').toString()` executed via eval            | **FAIL** — must be removed                |
| `SEC-006` | 🟢 LOW    | Hardcoded `localhost:PORT`, `postgres://...`, `redis://localhost` outside `src/config` | **WARN** — must be externalized to config |

---

## 📩 Reporting a Security Vulnerability

If you discover a potential security vulnerability or backdoor in HireSync, please report it immediately to the project maintainers:

> [!CAUTION]
> **Do NOT create a public GitHub issue for undisclosed security vulnerabilities.** This could expose active exploits to malicious actors before a fix is deployed.

- **Email**: `security@hiresync.internal` (or reach out directly to the Lead Repository Administrator via private message).
- Include: detailed steps to reproduce the issue, proof-of-concept payload, and the affected HireSync module or endpoint.
- Expected response time: within **48 hours** of report submission.
