const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const estimateRoutes = require('./routes/estimate');
const historyRoutes = require('./routes/history');

const app = express();

app.use(express.json({ limit: '100kb' }));

app.use(cors({
  origin: config.allowedOrigins.includes('*') ? '*' : config.allowedOrigins
}));

// Rate limit global sederhana untuk melindungi API key dari penyalahgunaan/biaya tak terduga.
// Sesuaikan angkanya kalau user sudah banyak.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100,                 // maksimal 100 request / IP / 15 menit
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan, coba lagi beberapa saat lagi.' }
});
app.use(limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', estimateRoutes);
app.use('/api', historyRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
});

// Error handler terakhir, jaga-jaga kalau ada exception tak tertangani di route.
app.use((err, req, res, next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

app.listen(config.port, () => {
  console.log(`Kalori backend jalan di http://localhost:${config.port}`);
});
