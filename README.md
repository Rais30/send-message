# Send Message

Chat room realtime tanpa penyimpanan pesan. Buat room, bagikan kodenya, mengobrol seketika — tutup room, percakapan lenyap. Installable sebagai PWA.

**Stack**: Next.js 15 (App Router) · Tailwind CSS 4 · Supabase Realtime (Broadcast + Presence) · PWA

## Cara Kerja

1. Masukkan nama → **Buat room** (kode 6 karakter) atau **Masuk** dengan kode
2. Bagikan kode room ke teman
3. Pesan dikirim via WebSocket (Supabase Broadcast) — tidak pernah menyentuh database

## Setup Lokal

```bash
npm install
cp .env.local.example .env.local   # isi dari dashboard Supabase
npm run dev
```

Env var yang dibutuhkan (dari [supabase.com](https://supabase.com) → Project Settings → API):

| Variabel | Isi |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

> Tidak perlu membuat tabel apa pun — hanya fitur Realtime yang dipakai.

## Deploy ke Vercel

1. Import repo ini di [vercel.com/new](https://vercel.com/new)
2. Tambahkan kedua env var di atas pada Project Settings → Environment Variables
3. Deploy

## Skrip

```bash
npm run dev     # development server
npm run build   # production build
npm run icons   # regenerate ikon PWA
```
