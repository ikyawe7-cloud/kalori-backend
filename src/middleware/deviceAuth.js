// Middleware sederhana: setiap request wajib menyertakan header X-Device-Id.
// Ini BUKAN autentikasi asli (siapa pun bisa mengaku device apa saja), hanya
// cara memisahkan data antar pengguna tanpa perlu sistem login dulu.
//
// Untuk versi produksi yang lebih aman, ganti dengan:
// - Firebase Auth / Anthropic-compatible auth, atau
// - Token JWT yang diterbitkan saat user pertama buka app,
// lalu verifikasi token itu di sini alih-alih percaya header apa adanya.

function deviceAuth(req, res, next) {
  const deviceId = req.header('X-Device-Id');
  if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
    return res.status(401).json({ error: 'Header X-Device-Id wajib diisi.' });
  }
  if (deviceId.length > 128) {
    return res.status(400).json({ error: 'X-Device-Id terlalu panjang.' });
  }
  req.deviceId = deviceId.trim();
  next();
}

module.exports = deviceAuth;
