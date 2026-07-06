"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ChatMessage, RoomItem } from "@/lib/types";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Warna nama konsisten per user (hash sederhana → hue)
function nameHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export default function MessageList({
  items,
  self,
  readMap,
  onReply,
}: {
  items: RoomItem[];
  self: string;
  readMap: Record<string, number>; // username → timestamp terakhir dibaca
  onReply: (msg: ChatMessage) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items.length]);

  // Lookup id → pesan untuk render kutipan balasan
  const byId = useMemo(() => {
    const m = new Map<string, ChatMessage>();
    for (const item of items) if (item.type === "message") m.set(item.id, item);
    return m;
  }, [items]);

  // Pesanku terakhir yang sudah dibaca minimal satu orang lain
  const lastReadMineId = useMemo(() => {
    const readTs = Object.values(readMap);
    if (readTs.length === 0) return null;
    const maxRead = Math.max(...readTs);
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.type === "message" && it.username === self && it.timestamp <= maxRead)
        return it.id;
    }
    return null;
  }, [items, readMap, self]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-2">
        {items.length === 0 && (
          <div className="mt-16 text-center text-sm text-muted">
            <p className="font-display text-base font-semibold text-ink">
              Room masih sunyi
            </p>
            <p className="mt-1">
              Bagikan kode room di atas, lalu mulai percakapan.
            </p>
          </div>
        )}

        {items.map((item) => {
          if (item.type === "system") {
            return (
              <p
                key={item.id}
                className="msg-in my-1 text-center text-xs text-muted"
              >
                {item.username} {item.kind === "join" ? "bergabung" : "keluar"}
              </p>
            );
          }

          const mine = item.username === self;
          const quoted = item.replyTo ? byId.get(item.replyTo) : undefined;
          return (
            <div
              key={item.id}
              className={`msg-in group flex items-end gap-1.5 ${
                mine ? "justify-end" : "justify-start"
              }`}
            >
              {mine && (
                <ReplyButton onClick={() => onReply(item)} align="right" />
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 sm:max-w-[65%] ${
                  mine
                    ? "rounded-br-md bg-accent text-on-accent"
                    : "rounded-bl-md border border-line bg-surface"
                }`}
              >
                {!mine && (
                  <p
                    className="mb-0.5 text-xs font-semibold"
                    style={{ color: `hsl(${nameHue(item.username)} 60% 45%)` }}
                  >
                    {item.username}
                  </p>
                )}
                {item.replyTo && (
                  <div
                    className={`mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs ${
                      mine
                        ? "border-on-accent/50 bg-on-accent/10 text-on-accent/85"
                        : "border-accent bg-accent-soft text-muted"
                    }`}
                  >
                    {quoted ? (
                      <>
                        <span className="font-semibold">{quoted.username}</span>
                        <p className="line-clamp-2 break-words">{quoted.text}</p>
                      </>
                    ) : (
                      <em>Pesan tidak tersedia</em>
                    )}
                  </div>
                )}
                <p className="text-[15px] leading-snug break-words whitespace-pre-wrap">
                  {item.text}
                </p>
                <p
                  className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
                    mine ? "text-on-accent/70" : "text-muted"
                  }`}
                >
                  {formatTime(item.timestamp)}
                  {mine && item.id === lastReadMineId && (
                    <span title="Telah dibaca" aria-label="Telah dibaca">
                      ✓✓
                    </span>
                  )}
                </p>
              </div>
              {!mine && (
                <ReplyButton onClick={() => onReply(item)} align="left" />
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function ReplyButton({
  onClick,
  align,
}: {
  onClick: () => void;
  align: "left" | "right";
}) {
  return (
    <button
      onClick={onClick}
      title="Balas pesan"
      aria-label="Balas pesan"
      className={`mb-1 shrink-0 rounded-full p-1 text-muted opacity-0 transition hover:bg-accent-soft hover:text-accent group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent ${
        align === "right" ? "order-first" : ""
      }`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="9 17 4 12 9 7" />
        <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
      </svg>
    </button>
  );
}
