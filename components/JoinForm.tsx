"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  generateRoomId,
  validateRoomId,
  validateUsername,
} from "@/lib/validation";
import { getRecentRooms, removeRecentRoom } from "@/lib/recent-rooms";
import type { RecentRoom } from "@/lib/types";

export default function JoinForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<RecentRoom[]>([]);

  // localStorage hanya ada di client — isi setelah mount
  useEffect(() => {
    setRecent(getRecentRooms());
    const saved = localStorage.getItem("sm:last-username");
    if (saved) setUsername(saved);
  }, []);

  function enterRoom(targetRoomId: string) {
    const name = validateUsername(username);
    if (!name) {
      setError("Nama 2–20 karakter: huruf, angka, spasi, _ . -");
      return;
    }
    setBusy(true);
    sessionStorage.setItem("sm:username", name);
    localStorage.setItem("sm:last-username", name);
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

      {recent.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
            Room terakhir
          </p>
          <ul className="space-y-1.5">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    enterRoom(r.id);
                  }}
                  disabled={busy}
                  className="flex min-w-0 flex-1 items-center justify-between rounded-xl border border-line bg-bg px-4 py-2.5 text-left transition hover:border-accent focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
                >
                  <span className="font-code font-bold tracking-[0.2em]">
                    {r.id}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(r.lastJoined).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeRecentRoom(r.id);
                    setRecent(getRecentRooms());
                  }}
                  aria-label={`Hapus ${r.id} dari daftar`}
                  className="shrink-0 rounded-full p-2 text-muted transition hover:text-danger focus-visible:ring-2 focus-visible:ring-danger"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
