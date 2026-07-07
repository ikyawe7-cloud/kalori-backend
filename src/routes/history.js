const express = require('express');
const deviceAuth = require('../middleware/deviceAuth');
const { saveDailyReport, listDailyReports, deleteDailyReport } = require('../services/historyService');

const router = express.Router();
router.use(deviceAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidEntry(entry) {
  return entry
    && DATE_RE.test(entry.date)
    && typeof entry.target === 'number'
    && typeof entry.totalConsumed === 'number'
    && Array.isArray(entry.sessions);
}

// POST /api/history
// body: { date: "YYYY-MM-DD", target: number, totalConsumed: number, sessions: [{key,name,consumed,target}] }
// Dipanggil oleh app Android setelah WorkManager selesai menunggu 30 menit pasca sesi Makan Malam ditutup.
router.post('/history', (req, res) => {
  const entry = req.body;
  if (!isValidEntry(entry)) {
    return res.status(400).json({
      error: 'Body tidak valid. Wajib ada: date (YYYY-MM-DD), target (number), totalConsumed (number), sessions (array).'
    });
  }
  saveDailyReport(req.deviceId, entry);
  res.status(201).json({ ok: true });
});

// GET /api/history?limit=90
// Mengembalikan daftar laporan harian milik device ini, terbaru dulu.
router.get('/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 90, 365);
  const entries = listDailyReports(req.deviceId, limit);
  res.json({ entries });
});

// DELETE /api/history/:date
router.delete('/history/:date', (req, res) => {
  if (!DATE_RE.test(req.params.date)) {
    return res.status(400).json({ error: 'Format tanggal harus YYYY-MM-DD.' });
  }
  const deleted = deleteDailyReport(req.deviceId, req.params.date);
  if (!deleted) return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
  res.json({ ok: true });
});

module.exports = router;
