# HireSync Test Suites (`tests/`)

This directory contains the automated unit, integration, and security test suites for HireSync.

---

## 📁 Test Directory Structure

```
tests/
├── unit/                       # Isolated unit tests for individual functions/modules
│   ├── atsScoring.test.js      # ATS match scoring algorithm and tier classification
│   ├── eligibilityCheck.test.js# Upstream gatekeeper eligibility logic
│   └── jwtAuth.test.js         # JWT signing, verification, and expiry tests
│
├── integration/                # API endpoint integration tests
│   ├── auth.test.js            # Registration and login API tests
│   ├── jobs.test.js            # HR job creation and candidate job feed API tests
│   ├── applications.test.js    # Candidate application submission tests
│   └── sla.test.js             # SLA worker queue and timer integration tests
│
└── security/                   # Security and anti-backdoor test assertions
    ├── authBypass.test.js      # Verify unauthorized route access returns 401/403
    └── inputSanitization.test.js # SQL injection and XSS input validation tests
```

---

## 🧪 Running Tests

```bash
# Run all tests
npm run test

# Run only unit tests
npm run test -- --testPathPattern=tests/unit

# Run only integration tests
npm run test -- --testPathPattern=tests/integration

# Run security tests
npm run test -- --testPathPattern=tests/security
```

---

## ✅ Test Requirements Before Opening a PR

All the following must pass before submitting a Pull Request:

```bash
npm run format:check     # ✅ No formatting errors
npm run security:scan    # ✅ No backdoor or secret violations
npm run lint             # ✅ No linting errors
npm run test             # ✅ All tests pass
```
