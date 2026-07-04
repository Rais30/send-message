"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  generateRoomId,
  validateRoomId,
  validateUsername,
} from "@/lib/validation";

export default function JoinForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function enterRoom(targetRoomId: string) {
    const name = validateUsername(username);
    if (!name) {
      setError("Nama 2–20 karakter: huruf, angka, spasi, _ . -");
      return;
    }
    setBusy(true);
    sessionStorage.setItem("sm:username", name);
    router.push(`/room/${targetRoomId}`);
  }

  function handleCreate() {
    setError(null);
    enterRoom(generateRoomId());
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const id = validateRoomId(roomId);
    if (!id) {
      setError("Kode room 4–10 karakter huruf/angka.");
      return;
    }
    enterRoom(id);
  }

  return (
    <form
      onSubmit={handleJoin}
      className="rounded-2xl border border-line bg-surface p-5 shadow-[0_8px_30px_-12px_rgba(27,33,64,0.18)]"
    >
      <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
        Nama kamu
      </label>
      <input
        id="username"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="mis. Rais"
        maxLength={20}
        autoComplete="off"
        required
        className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
      />

      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={handleCreate}
          disabled={busy}
          className="w-full rounded-xl bg-accent px-4 py-3 font-display text-base font-semibold text-on-accent transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60"
        >
          Buat room baru
        </button>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          atau masuk dengan kode
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="KODE"
            maxLength={10}
            autoComplete="off"
            aria-label="Kode room"
            className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 py-3 font-code text-base tracking-[0.2em] uppercase outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-xl border border-accent px-5 py-3 font-display font-semibold text-accent transition hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60"
          >
            Masuk
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
