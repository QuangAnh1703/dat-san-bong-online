'use strict';
const { createClient } = require('redis');

// Cloud (Upstash...) cap mot URL dang rediss://default:<mat-khau>@<host>:6379
const client = process.env.REDIS_URL
  ? createClient({ url: process.env.REDIS_URL })
  : createClient({
      socket: { host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT || 6379) },
      database: 0,
    });

client.on('error', (err) => console.error('[redis] error:', err.message));
client.on('connect', () => console.log('[redis] connected'));

async function connect() {
  if (!client.isOpen) {
    await client.connect();
  }
}

module.exports = { client, connect };
