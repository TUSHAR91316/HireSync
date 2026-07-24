# HireSync — Local Development Setup Guide

> 🛠️ Follow this guide to get HireSync running on your local machine for development.

---

## 📋 Prerequisites

Before you begin, ensure the following tools are installed on your machine:

| Tool           | Required Version | Install Link                                  |
| :------------- | :--------------- | :-------------------------------------------- |
| **Node.js**    | `>= 18.x LTS`    | [nodejs.org](https://nodejs.org/)             |
| **npm**        | `>= 9.x`         | Included with Node.js                         |
| **PostgreSQL** | `>= 15.x`        | [postgresql.org](https://www.postgresql.org/) |
| **Redis**      | `>= 7.x`         | [redis.io](https://redis.io/)                 |
| **Git**        | `>= 2.40`        | [git-scm.com](https://git-scm.com/)           |

---

## ⚡ 1. Clone the Repository

```bash
git clone https://github.com/TUSHAR91316/HireSync.git
cd HireSync
```

---

## 📦 2. Install Dependencies

```bash
npm install
```

---

## 🔐 3. Configure Environment Variables

Copy the `.env.example` template to create your local `.env` file:

```bash
cp .env.example .env
```

Open `.env` and fill in your local values. Key variables:

| Variable       | Description                      | Example                                                                         |
| :------------- | :------------------------------- | :------------------------------------------------------------------------------ |
| `JWT_SECRET`   | Minimum 32-character signing key | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DATABASE_URL` | PostgreSQL connection URI        | `postgres://user:pass@localhost:5432/hiresync_db`                               |
| `REDIS_URL`    | Redis connection URI             | `redis://localhost:6379`                                                        |

> 💡 **Generate a secure JWT_SECRET:**
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 🗄️ 4. Setup PostgreSQL Database

```bash
# Connect to PostgreSQL CLI
psql -U postgres

# Create database and user
CREATE DATABASE hiresync_db;
CREATE USER hiresync_user WITH PASSWORD 'hiresync_password';
GRANT ALL PRIVILEGES ON DATABASE hiresync_db TO hiresync_user;

# Exit psql
\q
```

---

## 🔴 5. Start Redis Server

```bash
# Linux / macOS
redis-server

# Windows (using WSL or Redis for Windows)
redis-server --port 6379
```

---

## 🚀 6. Run the Development Server

```bash
npm run dev
```

---

## 🧪 7. Run Pre-Commit Verification Scripts

Before committing or pushing any code, always run:

```bash
# Format all code files
npm run format

# Run local anti-backdoor security scan
npm run security:scan

# Run test suite
npm run test

# Run linter
npm run lint
```

---

## 🌿 8. Checkout Your Assigned Branch

Find your assigned branch in [`TASKS.md`](TASKS.md) and switch to it:

```bash
git checkout feature/your-assigned-branch
git pull origin feature/your-assigned-branch
```

---

## 📚 Key Project Files Reference

| File / Directory                                         | Purpose                                                         |
| :------------------------------------------------------- | :-------------------------------------------------------------- |
| [`src/config/index.js`](src/config/index.js)             | Centralized environment configuration — import params from here |
| [`src/components/candidate/`](src/components/candidate/) | Candidate Portal UI components                                  |
| [`src/components/hr/`](src/components/hr/)               | HR / Recruiter Portal UI components                             |
| [`src/services/`](src/services/)                         | ATS parser, SLA queue worker, WebRTC signaling                  |
| [`src/middleware/`](src/middleware/)                     | JWT auth and role isolation middleware                          |
| [`src/db/`](src/db/)                                     | PostgreSQL database client and schemas                          |
| [`tests/`](tests/)                                       | Unit, integration, and security tests                           |
| [`.env.example`](.env.example)                           | Environment variable reference template                         |
| [`TASKS.md`](TASKS.md)                                   | Branch-wise task assignments                                    |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)                     | Contribution workflow and commit standards                      |
| [`SECURITY.md`](SECURITY.md)                             | Security policy and anti-backdoor guidelines                    |
