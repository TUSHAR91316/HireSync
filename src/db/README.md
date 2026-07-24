# Database Client & Schemas (`src/db/`)

PostgreSQL database connections, migrations, and schema definitions.

---

## 📁 Directory Contents

| File         | Description                                                                              |
| :----------- | :--------------------------------------------------------------------------------------- |
| `index.js`   | PostgreSQL connection pool setup using `pg` — imported by all services needing DB access |
| `schema.sql` | Full PostgreSQL table definitions — run once during setup                                |

---

## 🗄️ Running the Schema

```bash
psql -U hiresync_user -d hiresync_db -f src/db/schema.sql
```

This creates all 6 tables: `users`, `profiles`, `jobs`, `applications`, `test_scores`, `sla_timers`, along with ENUM types and performance indexes.

---

## 💡 Usage Pattern

Always access the database through the connection pool — never open raw connections in services:

```js
// ✅ CORRECT — import the shared pool client
const db = require('../db');

async function getApplicationById(id) {
  const result = await db.query('SELECT * FROM applications WHERE id = $1', [id]);
  return result.rows[0];
}

// ❌ WRONG — never create a new pg.Pool inside service files
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://...' }); // Prohibited
```

---

## 📊 Schema Summary

See the full schema in [`schema.sql`](schema.sql) and the entity table reference in [`ARCHITECTURE.md`](../../ARCHITECTURE.md).

| Table          | Primary Key    | Description                                         |
| :------------- | :------------- | :-------------------------------------------------- |
| `users`        | `UUID`         | Auth and role records for Candidates and Recruiters |
| `profiles`     | `user_id (FK)` | Extended profile data                               |
| `jobs`         | `UUID`         | Job postings with eligibility criteria              |
| `applications` | `UUID`         | Candidate → Job links with ATS score and status     |
| `test_scores`  | `UUID`         | In-app skill assessment results                     |
| `sla_timers`   | `UUID`         | SLA deadline metadata for recruiter decisions       |
