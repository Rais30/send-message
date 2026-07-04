"use client";

import { useEffect, useRef } from "react";
import type { RoomItem } from "@/lib/types";

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
}: {
  items: RoomItem[];
  self: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items.length]);

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
          return (
            <div
              key={item.id}
              className={`msg-in flex ${mine ? "justify-end" : "justify-start"}`}
            >
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
                <p className="text-[15px] leading-snug break-words whitespace-pre-wrap">
                  {item.text}
                </p>
                <p
                  className={`mt-0.5 text-right text-[10px] ${
                    mine ? "text-on-accent/70" : "text-muted"
                  }`}
                >
                  {formatTime(item.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
