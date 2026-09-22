'use strict';
const { createClient } = require('redis');

const client = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  database: 0,
});

client.on('error', (err) => console.error('[redis] error:', err));
client.on('connect', () => console.log('[redis] connected'));

async function connect() {
  if (!client.isOpen) {
    await client.connect();
  }
}

module.exports = { client, connect };
