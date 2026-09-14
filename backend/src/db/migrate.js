'use strict';
/**
 * Migration runner cho Node, thay the Flyway (khong dung Spring Boot).
 *
 * - `migrate()`  : baseline schema hien co (neu chua baseline) roi chay cac file
 *                  migration moi chua duoc ap dung.
 * - `validate()` : chi kiem tra schema_history khop voi cac file .sql hien tai,
 *                  KHONG tu sua schema - tuong duong `ddl-auto: validate` cua Hibernate.
 *
 * `csdl/docker-compose.yml` da tu chay V01..V10 qua docker-entrypoint-initdb.d khi
 * tao container Postgres lan dau, nen lan chay dau tien o day se "baseline" (ghi
 * nhan la da ap dung) thay vi chay lai - giong `flyway.baseline-on-migrate: true`.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('../db');

const MIGRATION_DIR = path.join(__dirname, '..', '..', '..', 'csdl', 'db', 'migration');
const FILENAME_RE = /^V(\d+)__(.+)\.sql$/;

function listMigrationFiles() {
  return fs.readdirSync(MIGRATION_DIR)
    .map((filename) => {
      const m = filename.match(FILENAME_RE);
      if (!m) return null;
      const fullPath = path.join(MIGRATION_DIR, filename);
      const content = fs.readFileSync(fullPath, 'utf8');
      return {
        version: m[1],
        description: m[2].replace(/_/g, ' '),
        filename,
        content,
        checksum: crypto.createHash('sha256').update(content).digest('hex'),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.version) - Number(b.version));
}

async function ensureHistoryTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_history (
      version      TEXT PRIMARY KEY,
      description  TEXT NOT NULL,
      checksum     TEXT NOT NULL,
      installed_on TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedRows(client) {
  const r = await client.query('SELECT version, description, checksum FROM schema_history ORDER BY version');
  return r.rows;
}

/** DB da co san schema (tu docker-entrypoint-initdb.d) nhung chua duoc ghi vao schema_history */
async function isPreExistingSchema(client) {
  const r = await client.query(`SELECT to_regclass('public.venue') AS t`);
  return r.rows[0].t !== null;
}

async function baselineIfNeeded(client, files) {
  const applied = await getAppliedRows(client);
  if (applied.length > 0) return false;
  if (!(await isPreExistingSchema(client))) return false;

  for (const f of files) {
    await client.query(
      `INSERT INTO schema_history (version, description, checksum) VALUES ($1, $2, $3)`,
      [f.version, f.description, f.checksum]
    );
  }
  console.log('[migrate] baseline: ghi nhan %d migration da co san trong CSDL', files.length);
  return true;
}

async function migrate() {
  const client = await pool.connect();
  try {
    await ensureHistoryTable(client);
    const files = listMigrationFiles();
    const baselined = await baselineIfNeeded(client, files);
    if (baselined) return;

    const applied = new Set((await getAppliedRows(client)).map((r) => r.version));
    const pending = files.filter((f) => !applied.has(f.version));
    if (pending.length === 0) {
      console.log('[migrate] khong co migration moi can ap dung');
      return;
    }

    for (const f of pending) {
      console.log('[migrate] ap dung %s (%s)', f.filename, f.description);
      await client.query('BEGIN');
      try {
        await client.query(f.content);
        await client.query(
          `INSERT INTO schema_history (version, description, checksum) VALUES ($1, $2, $3)`,
          [f.version, f.description, f.checksum]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Loi khi chay migration ${f.filename}: ${err.message}`);
      }
    }
  } finally {
    client.release();
  }
}

/** Kiem tra schema khop migration, KHONG sua gi ca. Nem loi neu lech. */
async function validate() {
  const client = await pool.connect();
  try {
    await ensureHistoryTable(client);
    const files = listMigrationFiles();
    const applied = await getAppliedRows(client);

    if (applied.length === 0) {
      throw new Error('Chua co migration nao duoc ghi nhan - chay "npm run migrate" truoc');
    }

    const appliedByVersion = new Map(applied.map((r) => [r.version, r]));
    for (const f of files) {
      const row = appliedByVersion.get(f.version);
      if (!row) {
        throw new Error(`Migration ${f.filename} chua duoc ap dung - chay "npm run migrate"`);
      }
      if (row.checksum !== f.checksum) {
        throw new Error(`Migration ${f.filename} da bi sua doi sau khi ap dung (checksum lech)`);
      }
    }
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const cmd = process.argv[2];
  const run = cmd === 'validate' ? validate : migrate;
  run()
    .then(() => { console.log('[migrate] %s: OK', cmd || 'migrate'); process.exit(0); })
    .catch((err) => { console.error('[migrate] that bai:', err.message); process.exit(1); });
}

module.exports = { migrate, validate };
