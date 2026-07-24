# HireSync — NPM Scripts Reference

All available npm scripts for local development, formatting, security scanning, and testing.

---

## 📋 Available Scripts

| Script              | Command                 | Description                                                                               |
| :------------------ | :---------------------- | :---------------------------------------------------------------------------------------- |
| **`dev`**           | `npm run dev`           | Start local development server                                                            |
| **`build`**         | `npm run build`         | Build production bundle                                                                   |
| **`start`**         | `npm run start`         | Start production server                                                                   |
| **`test`**          | `npm run test`          | Run all test suites (`tests/unit`, `tests/integration`, `tests/security`)                 |
| **`lint`**          | `npm run lint`          | Run ESLint / Flake8 code quality checks                                                   |
| **`format`**        | `npm run format`        | Auto-format all `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css`, `.md` files using Prettier |
| **`format:check`**  | `npm run format:check`  | Check formatting without modifying files (CI-safe)                                        |
| **`security:scan`** | `npm run security:scan` | Run local anti-backdoor static analysis scanner                                           |

---

## 🔒 Pre-Commit Required Scripts

The following 3 scripts **must** pass before pushing or opening a Pull Request:

```bash
# 1. Format all code
npm run format

# 2. Anti-backdoor security scan
npm run security:scan

# 3. Run tests
npm run test
```

---

## 🛡️ Security Scanner Details

The `npm run security:scan` script runs [`scripts/security-scan.js`](security-scan.js), which statically scans the codebase for:

| Rule      | Pattern                                                         |
| :-------- | :-------------------------------------------------------------- |
| `SEC-001` | Hardcoded master passwords and auth bypass variables            |
| `SEC-002` | Hardcoded secrets, API keys, and database URIs                  |
| `SEC-003` | Dangerous code execution (`eval()`, `child_process.exec()`)     |
| `SEC-004` | Hidden backdoor or debug API endpoints                          |
| `SEC-005` | Base64-encoded obfuscated code execution                        |
| `SEC-006` | Hardcoded localhost URLs or ports outside `src/config/index.js` |

See [`SECURITY.md`](../SECURITY.md) for full rule details.
