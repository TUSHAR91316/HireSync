/**
 * HireSync PostgreSQL Connection Pool (`src/db/pool.js`)
 *
 * Provides a shared pg.Pool instance initialized from `src/config/index.js`.
 * Fail-fast strategy: on server startup, a SELECT 1 probe is run immediately.
 * If the database is unreachable, the process exits with code 1 rather than
 * silently allowing a broken server to serve requests.
 */

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.db.url,
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  min: config.db.poolMin,
  max: config.db.poolMax,
});

/**
 * Parameterized query helper.
 * Always use parameterized queries — never string interpolation.
 * @param {string} text - SQL query string with $1, $2, ... placeholders
 * @param {Array}  params - Query parameters array
 * @returns {Promise<pg.QueryResult>}
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Fail-fast startup DB probe.
 * Call this once in server.js during app startup.
 * In production or strict mode, exits the process if the database is unreachable.
 */
async function connectWithFailFast() {
  try {
    await pool.query('SELECT 1');
    console.log('[DB] ✅ PostgreSQL connection pool established successfully.');
  } catch (err) {
    if (config.isProduction || process.env.STRICT_DB === 'true') {
      console.error('[DB] ❌ FATAL: Cannot connect to PostgreSQL. Server will not start.');
      console.error('[DB] Error details:', err.message);
      process.exit(1);
    } else {
      console.warn('[DB] ⚠️  WARNING: PostgreSQL is currently offline at ' + config.db.url);
      console.warn(
        '[DB] 💡 Running in development UI preview mode. Start PostgreSQL to enable database persistence.'
      );
    }
  }
}

module.exports = { query, pool, connectWithFailFast };
