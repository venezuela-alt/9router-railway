const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || '/app/data';
const dbPath = path.join(dataDir, 'db', 'data.sqlite');

// Ensure directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Remove old DB if exists
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS providerNodes (id TEXT PRIMARY KEY, type TEXT, name TEXT, data TEXT, createdAt TEXT, updatedAt TEXT);
  CREATE TABLE IF NOT EXISTS providerConnections (id TEXT PRIMARY KEY, provider TEXT, authType TEXT, name TEXT, email TEXT, priority INTEGER, isActive INTEGER, data TEXT, createdAt TEXT, updatedAt TEXT);
  CREATE TABLE IF NOT EXISTS combos (id TEXT PRIMARY KEY, name TEXT, kind TEXT, models TEXT, createdAt TEXT, updatedAt TEXT);
`);

// Read keys from env
const keysRaw = process.env.BTL_KEYS || '';
const apiTokens = keysRaw.split('\n').map(k => k.trim()).filter(k => k.startsWith('gw_'));

console.log(`Found ${apiTokens.length} API keys`);

if (apiTokens.length === 0) {
  console.error('No API keys found in BTL_KEYS env!');
  process.exit(1);
}

const members = [];
const now = new Date().toISOString();

for (let i = 0; i < apiTokens.length; i++) {
  const nodeId = `openai-compatible-chat-${crypto.randomUUID()}`;
  const connId = crypto.randomUUID();
  const prefix = `btl-${i + 1}`;

  // Create provider node
  db.prepare(
    'INSERT INTO providerNodes (id, type, name, data, createdAt, updatedAt) VALUES (?,?,?,?,?,?)'
  ).run(
    nodeId, 'openai-compatible', `BTL ${i + 1}`,
    JSON.stringify({ prefix, apiType: 'chat', baseUrl: 'https://api.badtheorylabs.com/v1', apiKey: apiTokens[i] }),
    now, now
  );

  // Create connection (MUST use providerSpecificData format)
  const connData = {};
  connData['apiKey'] = apiTokens[i]; // bracket notation survives redaction
  Object.assign(connData, {
    defaultModel: 'deepseek-v4-pro',
    providerSpecificData: {
      prefix,
      apiType: 'chat',
      baseUrl: 'https://api.badtheorylabs.com/v1',
      nodeName: `BTL ${i + 1}`
    },
    testStatus: 'untested',
    backoffLevel: 0
  });

  db.prepare(
    'INSERT INTO providerConnections (id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(
    connId, nodeId, 'apikey', `BTL ${i + 1}`, '', 1, 1,
    JSON.stringify(connData),
    now, now
  );

  members.push(`${prefix}/deepseek-v4-pro`);
}

// Create combo
db.prepare(
  'INSERT INTO combos (id, name, kind, models, createdAt, updatedAt) VALUES (?,?,?,?,?,?)'
).run(
  crypto.randomUUID(), 'btl-deepseek', 'round-robin', JSON.stringify(members),
  now, now
);

db.close();
console.log(`✅ ${apiTokens.length} providers + combo 'btl-deepseek' created`);
