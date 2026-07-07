require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[config] Environment variable ${name} belum diisi. Cek file .env kamu.`);
  }
  return value;
}

module.exports = {
  port: process.env.PORT || 3000,
  googleApiKey: required('GOOGLE_API_KEY'),
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()),
  // Folder tempat file database SQLite disimpan. Di lokal default ke folder ./data
  // di root proyek. Di Render (atau platform lain yang pakai persistent disk),
  // arahkan ini ke mount path disk-nya lewat env var DATA_DIR, misalnya "/var/data".
  dataDir: process.env.DATA_DIR || require('path').join(__dirname, '..', 'data')
};
