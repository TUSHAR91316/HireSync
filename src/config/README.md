# HireSync Environment Configuration Module (`src/config/`)

> 🔧 **Centralized Configuration — Single Source of Truth**

This module loads and validates all application runtime parameters from `process.env`. **No ports, URLs, database URIs, API keys, scoring thresholds, or SLA windows should ever be hardcoded** anywhere in the codebase.

---

## 📦 Usage Pattern

Always import configuration from this module — never from `process.env` directly in business logic files:

```js
// ✅ CORRECT — always import from src/config
const config = require('./src/config');

const server = app.listen(config.port, config.host, () => {
  console.log(`HireSync API running on ${config.host}:${config.port}`);
});

// ✅ ATS threshold example
if (score >= config.ats.tier1Threshold) {
  tier = 'TIER_1';
} else if (score >= config.ats.tier2Threshold) {
  tier = 'TIER_2';
} else {
  tier = 'TIER_3';
}

// ❌ WRONG — Never access process.env directly in logic files
const port = process.env.PORT; // Prohibited outside src/config/index.js
```

---

## 📁 Config Module Structure

```
src/config/
└── index.js    ← Main configuration export module
```

---

## 🔑 Configuration Namespaces

| Namespace                                                    | Key Parameters                  |
| :----------------------------------------------------------- | :------------------------------ |
| `config.env` / `config.port` / `config.host`                 | Server runtime environment      |
| `config.jwt.secret` / `config.jwt.expiresIn`                 | Authentication signing          |
| `config.db.url` / `config.db.host` / `config.db.port`        | PostgreSQL database             |
| `config.redis.url` / `config.redis.host`                     | Redis connection                |
| `config.ats.tier1Threshold` / `config.ats.weights`           | ATS scoring thresholds          |
| `config.gatekeeper.skillUnlockBufferPercentage`              | Eligibility unlock buffer (15%) |
| `config.sla.defaultSlaDays` / `config.sla.warningFirstHours` | SLA engine parameters           |
| `config.webrtc.stunServer`                                   | WebRTC STUN/TURN servers        |
| `config.mail.smtpHost` / `config.mail.fromAddress`           | Transactional email             |

All parameters are defined in **[`.env.example`](../../.env.example)** with full documentation.
