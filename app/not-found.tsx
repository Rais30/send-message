import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <h1 className="font-display text-3xl font-bold">Room tidak ditemukan</h1>
      <p className="mt-2 text-sm text-muted">
        Kode room tidak valid. Periksa lagi atau buat room baru.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-accent px-5 py-3 font-display font-semibold text-on-accent transition hover:brightness-110"
      >
        Ke halaman utama
      </Link>
    </main>
  );
}
