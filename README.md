# Send Message

Chat room realtime tanpa penyimpanan pesan. Buat room, bagikan kodenya, mengobrol seketika — proses restart atau semua orang keluar, percakapan lenyap. Installable sebagai PWA.

**Stack**: Next.js 15 (App Router) · Tailwind CSS 4 · [next-ws](https://github.com/k0d13/next-ws) (WebSocket server sendiri, `ws`) · PWA

## Cara Kerja

1. Masukkan nama → **Buat room** (kode 6 karakter) atau **Masuk** dengan kode
2. Bagikan kode room ke teman
3. Pesan dikirim via WebSocket langsung ke server Next.js — disimpan hanya di memori proses, tidak pernah menyentuh database

Server otoritatif: username dikunci saat koneksi (tidak bisa dipalsukan per-pesan), `id`/`timestamp` dibuat server, ada validasi + rate-limit + cek Origin.

> ⚠️ **next-ws butuh server Node persisten** — tidak bisa di Vercel/serverless. Deploy ke VPS (atau host yang mengizinkan proses long-lived).

## Setup Lokal

```bash
npm install          # menjalankan `next-ws patch` otomatis (script prepare)
npm run dev          # JANGAN pakai --turbopack; next-ws mem-patch jalur webpack
```

Buka dua tab di `http://localhost:3000`, join room sama dengan username beda → pesan mengalir dua arah.

Env var (opsional): salin `.env.local.example` ke `.env.local`. Hanya `ALLOWED_ORIGIN` yang dipakai, dan hanya jika WebSocket diakses lintas domain.

## Deploy ke VPS

Butuh: VPS Node 20+, reverse proxy (nginx/Caddy) yang meneruskan header `Upgrade`/`Connection` untuk WebSocket, dan proses persisten.

```bash
git pull
npm ci               # menjalankan next-ws patch lagi via prepare
npm run build
npm start            # default port 3000
```

Jaga proses tetap hidup dengan **pm2** (`pm2 start "npm start" --name send-message`) atau unit **systemd**.

**Caddy** (TLS + WebSocket otomatis, `Caddyfile`):

```
chat.domainmu.com {
  reverse_proxy localhost:3000
}
```

Caddy meneruskan upgrade WebSocket dan mengurus HTTPS via Let's Encrypt otomatis. Set `ALLOWED_ORIGIN=https://chat.domainmu.com` jika perlu.

**nginx** (potongan penting):

```nginx
location / {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

## Skrip

```bash
npm run dev     # development server (tanpa turbopack)
npm run build   # production build
npm start       # production server (jalankan di balik reverse proxy TLS)
npm run icons   # regenerate ikon PWA
```
