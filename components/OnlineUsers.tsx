"use client";

import { useState } from "react";

export default function OnlineUsers({
  users,
  self,
  status,
}: {
  users: string[];
  self: string;
  status: "connecting" | "online" | "error";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${users.length} orang online`}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-bg px-3 py-1.5 text-sm transition hover:border-accent focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            status === "online"
              ? "pulse-dot bg-signal"
              : status === "error"
                ? "bg-danger"
                : "bg-muted"
          }`}
        />
        <span className="font-code font-bold">{users.length}</span>
        <span className="hidden text-muted sm:inline">online</span>
      </button>

      {open && (
        <ul className="absolute right-0 z-10 mt-2 max-h-60 w-48 overflow-y-auto rounded-xl border border-line bg-surface p-2 shadow-lg">
          {users.length === 0 && (
            <li className="px-2 py-1 text-sm text-muted">Belum ada yang online</li>
          )}
          {users.map((u) => (
            <li
              key={u}
              className="truncate rounded-lg px-2 py-1 text-sm"
            >
              {u}
              {u === self && <span className="text-muted"> (kamu)</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
