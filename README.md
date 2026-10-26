# JOY STORE (versi server)

Toko produk digital dengan pembayaran QRIS, login admin, dan notifikasi order lewat Telegram.

## Jalankan di komputer
1. Pasang Node.js 20 atau lebih baru, lalu jalankan `npm install`.
2. Salin `.env.example` menjadi `.env`, lalu isi `ADMIN_PASSWORD` dan `SESSION_SECRET`.
3. Jalankan `npm run dev`. Toko ada di http://localhost:3000, halaman admin di http://localhost:3000/admin.

## Deploy (Railway atau Render)
1. Unggah folder ini ke repositori GitHub, lalu buat service baru dari repositori itu.
2. Isi environment variables sesuai `.env.example`.
3. Data disimpan di `db.json`. Tambahkan volume/disk permanen (misalnya di `/data`) dan set `DATA_DIR=/data`. Tanpa ini, data hilang setiap kali server di-redeploy.
4. Untuk domain sendiri, arahkan DNS ke service tersebut. Aktifkan HTTPS (otomatis di kedua platform).

## Notifikasi
- Telegram: buat bot lewat @BotFather, salin tokennya ke `TELEGRAM_BOT_TOKEN`. Kirim satu pesan ke bot, lalu buka `https://api.telegram.org/bot<TOKEN>/getUpdates` dan salin angka `chat.id` ke `TELEGRAM_CHAT_ID`.
- WhatsApp (opsional): daftar di Fonnte, isi `FONNTE_TOKEN` dan `ADMIN_WHATSAPP`.
- Dashboard admin juga memberi bunyi dan toast secara langsung selama halamannya terbuka.

## Catatan
- Kode QRIS bersifat statis, jadi pembayaran tetap dicek manual di aplikasi merchant sebelum menekan "Confirm payment and deliver".
- Penyimpanan JSON cocok untuk toko kecil. Kalau pesanan sudah ratusan per hari, pindahkan ke database seperti Postgres.
