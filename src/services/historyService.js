const db = require('../db');

const upsertStmt = db.prepare(`
  INSERT INTO calorie_history (device_id, date, target, total_consumed, sessions_json, created_at)
  VALUES (@deviceId, @date, @target, @totalConsumed, @sessionsJson, @createdAt)
  ON CONFLICT(device_id, date) DO UPDATE SET
    target = excluded.target,
    total_consumed = excluded.total_consumed,
    sessions_json = excluded.sessions_json,
    created_at = excluded.created_at
`);

const listStmt = db.prepare(`
  SELECT date, target, total_consumed AS totalConsumed, sessions_json AS sessionsJson, created_at AS createdAt
  FROM calorie_history
  WHERE device_id = ?
  ORDER BY date DESC
  LIMIT ?
`);

const deleteStmt = db.prepare(`
  DELETE FROM calorie_history WHERE device_id = ? AND date = ?
`);

function rowToEntry(row) {
  return {
    date: row.date,
    target: row.target,
    totalConsumed: row.totalConsumed,
    sessions: JSON.parse(row.sessionsJson),
    createdAt: row.createdAt
  };
}

function saveDailyReport(deviceId, entry) {
  upsertStmt.run({
    deviceId,
    date: entry.date,
    target: Math.round(entry.target),
    totalConsumed: Math.round(entry.totalConsumed),
    sessionsJson: JSON.stringify(entry.sessions || []),
    createdAt: entry.createdAt || Date.now()
  });
}

function listDailyReports(deviceId, limit = 90) {
  return listStmt.all(deviceId, limit).map(rowToEntry);
}

function deleteDailyReport(deviceId, date) {
  const result = deleteStmt.run(deviceId, date);
  return result.changes > 0;
}

module.exports = { saveDailyReport, listDailyReports, deleteDailyReport };
