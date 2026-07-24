# Security Policy & Anti-Backdoor Code Integrity Guidelines

The **HireSync** team takes security, user privacy, and code integrity extremely seriously. This document outlines our security governance, anti-backdoor standards, code review protocols, and vulnerability reporting procedures.

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
- Use `.env` environment variables exclusively. All secret references must be loaded via `process.env.VARIABLE_NAME`.

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

The scan checks for:
- 🚫 Hardcoded master credentials and authentication bypass variables (`SEC-001`)
- 🚫 Hardcoded secrets, API keys, and database connection strings (`SEC-002`)
- 🚫 Dangerous dynamic code execution (`eval()`, `child_process.exec()`) (`SEC-003`)
- 🚫 Suspicious unauthenticated backdoor endpoints (`SEC-004`)
- 🚫 Base64-encoded runtime obfuscated code execution (`SEC-005`)

---

## 📩 Reporting a Security Vulnerability

If you discover a potential security vulnerability or backdoor in HireSync, please report it immediately to the project maintainers:

- **Email**: `security@hiresync.internal` (or reach out directly to the Lead Repository Administrator).
- **Do NOT create a public GitHub issue** for undisclosed security vulnerabilities.
- Include detailed steps to reproduce the issue, proof-of-concept payload, and affected module.
