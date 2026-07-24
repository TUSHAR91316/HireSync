# Application Middleware (`src/middleware/`)

HTTP request processing middleware for authentication, role access control, and eligibility gatekeeping.

---

## 📁 Middleware Files

| File                       | Description                                                                       |
| :------------------------- | :-------------------------------------------------------------------------------- |
| `authMiddleware.js`        | JWT token extraction, verification, and `req.user` hydration                      |
| `roleGuard.js`             | Role isolation — restricts routes to `CANDIDATE` or `RECRUITER` only              |
| `eligibilityGatekeeper.js` | Upstream job eligibility check — validates candidate profile against job criteria |

---

## 💡 Usage Patterns

### `authMiddleware` — Protect any route requiring a logged-in user

```js
const { authMiddleware } = require('../middleware/authMiddleware');

// Requires a valid JWT bearer token in the Authorization header
router.get('/api/candidate/applications', authMiddleware, getApplications);
```

### `roleGuard` — Restrict a route to a specific role

```js
const { roleGuard } = require('../middleware/roleGuard');

// Only RECRUITER accounts can create jobs
router.post('/api/hr/jobs', authMiddleware, roleGuard('RECRUITER'), createJob);

// Only CANDIDATE accounts can apply
router.post('/api/candidate/jobs/:id/apply', authMiddleware, roleGuard('CANDIDATE'), applyToJob);
```

### `eligibilityGatekeeper` — Block ineligible candidates at the application endpoint

```js
const { eligibilityGatekeeper } = require('../middleware/eligibilityGatekeeper');

// Checks candidate profile vs. job criteria before allowing the application
router.post(
  '/api/candidate/jobs/:id/apply',
  authMiddleware,
  roleGuard('CANDIDATE'),
  eligibilityGatekeeper,
  applyToJob
);
```

---

## ⚙️ Configuration

All thresholds used in `eligibilityGatekeeper.js` (e.g., skill unlock buffer percentage) are loaded from `src/config/index.js`. Never hardcode values in middleware files.
