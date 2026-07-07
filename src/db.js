const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

// Pastikan folder data ada (baik ./data di lokal, maupun mount path disk Render).
fs.mkdirSync(config.dataDir, { recursive: true });

const dbPath = path.join(config.dataDir, 'kalori.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Satu baris = satu laporan kalori harian yang sudah final untuk satu device_id + date.
// sessions_json menyimpan rincian per sesi makan (sarapan/siang/camilan/malam) sebagai JSON string.
db.exec(`
  CREATE TABLE IF NOT EXISTS calorie_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    date TEXT NOT NULL,
    target INTEGER NOT NULL,
    total_consumed INTEGER NOT NULL,
    sessions_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(device_id, date)
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_calorie_history_device_date
  ON calorie_history(device_id, date DESC);
`);

module.exports = db;
