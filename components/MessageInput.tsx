"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_MESSAGE_LENGTH } from "@/lib/validation";
import type { ChatMessage } from "@/lib/types";

export default function MessageInput({
  onSend,
  disabled,
  onTyping,
  replyTarget,
  onCancelReply,
}: {
  onSend: (text: string) => boolean;
  disabled: boolean;
  onTyping: () => void;
  replyTarget: ChatMessage | null;
  onCancelReply: () => void;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Fokuskan input saat memilih pesan untuk dibalas
  useEffect(() => {
    if (replyTarget) inputRef.current?.focus();
  }, [replyTarget]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (onSend(text)) setText("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="pb-safe border-t border-line bg-surface px-4 pt-3"
    >
      <div className="mx-auto max-w-2xl">
        {replyTarget && (
          <div className="mb-2 flex items-start gap-2 rounded-xl border-l-2 border-accent bg-accent-soft px-3 py-2 text-xs">
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-accent">
                Membalas {replyTarget.username}
              </span>
              <p className="line-clamp-2 break-words text-muted">
                {replyTarget.text}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              aria-label="Batalkan balasan"
              className="shrink-0 rounded-full p-1 text-muted transition hover:text-danger focus-visible:ring-2 focus-visible:ring-accent"
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
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.length > 0) onTyping();
            }}
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
      </div>
    </form>
  );
}
