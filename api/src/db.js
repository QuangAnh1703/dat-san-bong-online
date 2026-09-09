'use strict';
const { Pool } = require('pg');

// Tra ve DECIMAL/NUMERIC duoi dang so thay vi chuoi
const types = require('pg').types;
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[pg] loi tren client roi rac:', err.message);
});

async function query(text, params) {
  const started = Date.now();
  const res = await pool.query(text, params);
  if (process.env.LOG_SQL === '1') {
    console.log('[sql] %dms %s', Date.now() - started, text.split('\n')[0].trim());
  }
  return res;
}

// Chay nhieu lenh trong 1 giao dich
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Doi ket noi den khi Postgres san sang (huu ich khi chay chung docker compose)
async function waitForDb(retries = 30, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('[pg] da ket noi CSDL');
      return;
    } catch (err) {
      console.log('[pg] chua san sang (%d/%d): %s', i, retries, err.message);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Khong ket noi duoc CSDL sau nhieu lan thu');
}

module.exports = { pool, query, withTransaction, waitForDb };
