import JoinForm from "@/components/JoinForm";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-code text-[11px] tracking-widest text-muted uppercase">
            <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-signal" />
            saluran langsung
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Send Message
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Buat room, bagikan kodenya, mengobrol seketika.
            <br />
            Pesan tidak pernah disimpan — tutup room, percakapan lenyap.
          </p>
        </header>

        <JoinForm />
      </div>
    </main>
  );
}
