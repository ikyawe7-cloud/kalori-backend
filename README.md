# Kalori Backend

Backend proxy kecil untuk aplikasi **Kalkulator Energi Harian** (rencana: native Android/Kotlin).
Tugasnya dua:

1. **Menyembunyikan API key Claude** — app Android memanggil endpoint `/api/estimate-calories`
   di server ini, bukan langsung ke Anthropic. Key AI hanya ada di server, tidak pernah
   ikut terkirim ke device pengguna.
2. **Menyimpan riwayat kalori harian** per device, supaya data tidak hilang kalau app
   di-uninstall/ganti HP (opsional tapi direkomendasikan).

---

## 1. Menjalankan di lokal

```bash
cd kalori-backend
npm install
cp .env.example .env
# lalu edit .env, isi ANTHROPIC_API_KEY dengan key asli dari
# https://console.anthropic.com/settings/keys
npm start
```

Server jalan di `http://localhost:3000`. Cek dengan:

```bash
curl http://localhost:3000/health
# {"status":"ok","time":"..."}
```

## 2. Deploy ke Render (pakai Blueprint `render.yaml`)

Repo ini sudah menyertakan `render.yaml`, jadi deploy-nya tinggal:

1. Push seluruh folder `kalori-backend` (termasuk `render.yaml`, `.node-version`) ke GitHub.
2. Buka [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint**.
3. Connect ke repo GitHub kamu, Render otomatis baca `render.yaml`.
4. Saat diminta, isi environment variable `ANTHROPIC_API_KEY` dengan key asli dari
   [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
   (env var lain sudah terisi default dari `render.yaml`).
5. Klik **Deploy Blueprint**. Render akan otomatis: build (`npm ci`), jalankan (`npm start`),
   pasang persistent disk 1GB di `/var/data`, dan cek kesehatan lewat `/health`.

Kalau versi Node di `.node-version`/`render.yaml` (`22.22.2`) beda dari yang kamu pakai
waktu tes lokal, **samakan dulu** — jalankan `node -v` di komputermu dan ganti angkanya
di kedua file itu supaya versi lokal & Render identik.

### Troubleshooting: `npm install`/`npm ci` gagal di Render tapi sukses di lokal

Penyebab paling umum untuk kasus ini:

1. **`package-lock.json` belum ikut di-commit ke Git.** Tanpa lockfile, Render bisa resolve
   versi dependency (khususnya `better-sqlite3`, native module) yang berbeda dari yang kamu
   tes di lokal, lalu gagal compile di lingkungan Render. Pastikan file `package-lock.json`
   hasil `npm install` di lokalmu ikut ter-push ke GitHub (cek `.gitignore` — proyek ini
   sudah tidak meng-ignore file itu).
2. **Versi Node berbeda antara lokal dan Render**, sehingga tidak ada binary prebuilt untuk
   `better-sqlite3` dan Render terpaksa compile dari source (yang lebih rawan gagal).
   Fix: samakan `.node-version` dan `NODE_VERSION` di `render.yaml` dengan hasil `node -v` lokal.
3. Kalau masih gagal juga setelah dua fix di atas, coba lihat log build lengkap di tab
   **Logs** Render saat proses gagal — biasanya ada baris `gyp ERR!` yang menyebutkan
   modul apa yang gagal dan kenapa (misalnya `python not found`, `make: not found`, dll).
   Kirim baris errornya kalau butuh bantuan diagnosis lebih lanjut.

### Deploy manual (tanpa Blueprint), kalau lebih suka isi form sendiri

- **Build Command:** `npm ci`
- **Start Command:** `npm start`
- **Environment Variables:** `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `DATA_DIR=/var/data`, `NODE_VERSION` (samakan dgn lokal)
- **Disk:** mount path `/var/data`, minimal 1 GB (wajib plan Starter ke atas, tidak tersedia di plan Free)

Alternatif platform lain (Railway, Fly.io) juga bisa, tapi keduanya sudah tidak punya
free tier sejak awal 2026 (wajib kartu kredit sejak awal). Render dipilih di sini karena
masih ada opsi mulai gratis untuk testing sebelum upgrade ke plan berbayar.

## 3. Struktur proyek

```
kalori-backend/
├── src/
│   ├── server.js              # entry point, gabungkan semua route
│   ├── config.js              # baca environment variable
│   ├── db.js                  # setup SQLite (better-sqlite3)
│   ├── routes/
│   │   ├── estimate.js        # POST /api/estimate-calories
│   │   └── history.js         # GET/POST/DELETE /api/history
│   ├── services/
│   │   ├── claude.js          # panggil Claude API + retry backoff utk 429/529/503
│   │   └── historyService.js  # query database riwayat
│   └── middleware/
│       └── deviceAuth.js      # pemisah data per device (header X-Device-Id)
├── data/                      # file kalori.db (SQLite) dibuat otomatis di sini
├── .env.example
└── package.json
```

## 4. Dokumentasi API

### `POST /api/estimate-calories`
Body:
```json
{ "foodText": "nasi goreng, telur ceplok, es teh manis" }
```
Response sukses (makanan valid):
```json
{
  "items": [{ "name": "Nasi goreng", "kcal": 350 }, { "name": "Telur ceplok", "kcal": 90 }],
  "total": 440,
  "note": "Asumsi porsi sedang"
}
```
Response kalau teks bukan makanan:
```json
{ "notFood": true }
```

### `GET /api/history`
Header wajib: `X-Device-Id: <id unik device>`
Query opsional: `?limit=90`
Response:
```json
{ "entries": [ { "date": "2026-07-06", "target": 1800, "totalConsumed": 1750, "sessions": [...], "createdAt": 1751000000000 } ] }
```

### `POST /api/history`
Header wajib: `X-Device-Id`
Body:
```json
{
  "date": "2026-07-06",
  "target": 1800,
  "totalConsumed": 1750,
  "sessions": [
    { "key": "sarapan", "name": "Sarapan", "consumed": 400, "target": 450 }
  ]
}
```
Dipanggil app Android **setelah** WorkManager selesai menunggu 30 menit pasca sesi Makan Malam ditutup (lihat roadmap di bawah).

### `DELETE /api/history/:date`
Header wajib: `X-Device-Id`

---

## 5. Yang masih perlu dikerjakan (roadmap Android)

Backend ini sudah siap dipakai. Bagian yang **belum dibuat** dan jadi pekerjaan berikutnya:

### 5.1 Setup project Android
- [ ] Buat project Kotlin baru di Android Studio (Empty Activity, Jetpack Compose).
- [ ] Tambah dependency: Retrofit + OkHttp (network), Room (database lokal), WorkManager (tugas tertunda), Kotlin Coroutines.
- [ ] Simpan base URL backend (hasil deploy Railway/Render) di `BuildConfig` per build type (debug vs release), supaya gampang ganti tanpa ubah kode.

### 5.2 Port logika kalkulator
- [ ] Pindahkan rumus BMR/TDEE dari `calcBMR()` dan `calcDietTarget()` (di file HTML lama) ke Kotlin — murni fungsi matematika, gampang di-port apa adanya.
- [ ] Pindahkan konstanta `SESSIONS`, `ACTIVITY_LABELS`, `DEFICIT_LABELS`, `MIN_FLOOR` ke Kotlin object/enum.
- [ ] Bangun UI 3 step (gender → data tubuh → hasil) pakai Jetpack Compose, mengikuti alur yang sama seperti versi web.

### 5.3 Koneksi ke backend
- [ ] Buat Retrofit service dengan 1 endpoint: `estimateCalories(foodText): EstimateResult`.
- [ ] Tangani error network (timeout, no internet, 5xx) dengan pesan yang ramah — bukan cuma expose error mentah ke user.
- [ ] Generate & simpan `deviceId` unik sekali saat pertama app dibuka (misal `UUID.randomUUID()`), simpan di `SharedPreferences`/`DataStore`, kirim sebagai header `X-Device-Id` di setiap request ke `/api/history`.

### 5.4 Riwayat kalori harian
- [ ] Buat Room database + entity `DailyReportEntity` untuk cache riwayat secara lokal (biar tetap bisa dilihat walau offline).
- [ ] Setelah sesi Makan Malam ditutup: catat snapshot kalori hari itu, lalu jadwalkan **WorkManager one-time work request** dengan delay 30 menit (`OneTimeWorkRequestBuilder<FinalizeReportWorker>().setInitialDelay(30, TimeUnit.MINUTES)`).
- [ ] `FinalizeReportWorker` (saat 30 menit selesai): simpan entry ke Room lokal **dan** POST ke `/api/history` di backend (kalau ada internet; kalau gagal, retry pakai `WorkManager` built-in retry policy).
- [ ] Tambah `BroadcastReceiver` untuk `ACTION_BOOT_COMPLETED` — kalau HP restart sebelum 30 menit selesai, WorkManager Android sebenarnya sudah otomatis persist & reschedule sendiri (beda dengan `setTimeout` di JS yang hilang saat refresh), jadi ini sebagian besar "gratis" dibanding versi web.
- [ ] Layar "Riwayat": ambil dari Room dulu (langsung tampil), lalu refresh dari `GET /api/history` di background dan update kalau ada data baru dari device lain.

### 5.5 Reminder sesi makan
- [ ] Ganti `Notification` browser dengan `NotificationCompat` + notification channel khusus (misal `"meal_reminders"`).
- [ ] Jadwalkan reminder pakai `AlarmManager.setExactAndAllowWhileIdle()` (bukan WorkManager, karena ini perlu presisi jam tertentu, bukan delay relatif) untuk tiap sesi (sarapan/siang/camilan/malam).
- [ ] Reschedule alarm di `BroadcastReceiver` untuk `BOOT_COMPLETED`, karena alarm hilang saat HP restart.
- [ ] Minta izin notifikasi runtime (`POST_NOTIFICATIONS`) untuk Android 13+.

### 5.6 Keamanan & hardening sebelum rilis publik
- [ ] Ganti `X-Device-Id` apa adanya dengan skema yang lebih aman kalau app makin serius (misal Firebase Auth anonymous, atau signed token dari backend saat pertama install).
- [ ] Tambah HTTPS (otomatis kalau pakai Railway/Render/Fly.io — mereka kasih TLS gratis).
- [ ] Pertimbangkan menambah `certificate pinning` atau minimal pastikan traffic Android hanya lewat HTTPS, bukan HTTP.
- [ ] Naikkan/kecilkan angka rate limit di `server.js` sesuai jumlah user asli nanti.

### 5.7 Opsional / nice-to-have
- [ ] Endpoint `GET /api/history/export` untuk export riwayat sebagai CSV.
- [ ] Push notification server-side (Firebase Cloud Messaging) kalau nanti mau kirim reminder walau app benar-benar di-force-close & alarm lokal tidak reliable di sebagian custom ROM Android (misal beberapa merk HP Cina yang agresif mematikan background app).
- [ ] Dashboard admin kecil untuk lihat jumlah user aktif / device count (hati-hati privasi, cukup agregat saja, jangan expose isi makanan per user tanpa consent).

---

## 6. Catatan penting
- API key Claude **hanya** boleh ada di server ini (env var), tidak pernah dikirim ke Android app.
- Kalau nanti trafiknya besar, folder `data/` (SQLite) sebaiknya dipindah ke Postgres — SQLite cukup untuk MVP/testing tapi kurang ideal untuk banyak concurrent write.
