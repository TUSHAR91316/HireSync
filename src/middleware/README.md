# Application Middleware (`src/middleware/`)

HTTP request processing middleware for authentication, role access control, and gatekeeping.

## 📁 Middleware Breakdown

- `authMiddleware.js`: JWT token verification and authentication state hydration.
- `roleGuard.js`: Role isolation middleware (`CANDIDATE` vs. `RECRUITER` route protection).
- `eligibilityGatekeeper.js`: Upstream job restriction checking middleware.
