"use client";

import { useState } from "react";
import { MAX_MESSAGE_LENGTH } from "@/lib/validation";

export default function MessageInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => boolean;
  disabled: boolean;
}) {
  const [text, setText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (onSend(text)) setText("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="pb-safe border-t border-line bg-surface px-4 pt-3"
    >
      <div className="mx-auto flex max-w-2xl items-end gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={disabled ? "Menunggu koneksi…" : "Tulis pesan…"}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={disabled}
          autoComplete="off"
          enterKeyHint="send"
          aria-label="Pesan"
          className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 py-3 text-[15px] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || text.trim().length === 0}
          aria-label="Kirim pesan"
          className="shrink-0 rounded-xl bg-accent p-3 text-on-accent transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-40"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4z" />
          </svg>
        </button>
      </div>
    </form>
  );
}
