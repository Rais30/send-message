"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { validateMessage, validateUsername } from "@/lib/validation";
import type { ChatMessage, RoomItem } from "@/lib/types";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import OnlineUsers from "@/components/OnlineUsers";

const SEND_COOLDOWN_MS = 300;

type Status = "connecting" | "online" | "error";

export default function ChatRoom({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [items, setItems] = useState<RoomItem[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentAt = useRef(0);

  // Ambil username dari sessionStorage; tanpa itu kembali ke halaman join
  useEffect(() => {
    const stored = sessionStorage.getItem("sm:username");
    const name = stored ? validateUsername(stored) : null;
    if (!name) {
      router.replace("/");
      return;
    }
    setUsername(name);
  }, [router]);

  useEffect(() => {
    if (!username) return;
    if (!isSupabaseConfigured()) {
      setStatus("error");
      return;
    }

    const supabase = getSupabase();
    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: `${username}#${crypto.randomUUID().slice(0, 8)}` },
      },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const msg = payload as ChatMessage;
        const text = typeof msg.text === "string" ? validateMessage(msg.text) : null;
        const name =
          typeof msg.username === "string" ? validateUsername(msg.username) : null;
        if (!text || !name) return; // abaikan payload tidak valid dari peer
        setItems((prev) => [
          ...prev,
          {
            type: "message",
            id: String(msg.id ?? crypto.randomUUID()),
            username: name,
            text,
            timestamp: Number(msg.timestamp) || Date.now(),
          },
        ]);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ username: string }>();
        const names = Object.values(state)
          .flat()
          .map((p) => p.username)
          .filter(Boolean);
        setOnlineUsers([...new Set(names)].sort());
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        for (const p of newPresences as unknown as { username?: string }[]) {
          const name = p.username;
          if (!name || name === username) continue;
          setItems((prev) => [
            ...prev,
            {
              type: "system",
              id: crypto.randomUUID(),
              kind: "join",
              username: name,
              timestamp: Date.now(),
            },
          ]);
        }
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        for (const p of leftPresences as unknown as { username?: string }[]) {
          const name = p.username;
          if (!name) continue;
          setItems((prev) => [
            ...prev,
            {
              type: "system",
              id: crypto.randomUUID(),
              kind: "leave",
              username: name,
              timestamp: Date.now(),
            },
          ]);
        }
      })
      .subscribe(async (state) => {
        if (state === "SUBSCRIBED") {
          setStatus("online");
          await channel.track({ username, joinedAt: Date.now() });
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
          setStatus("error");
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomId, username]);

  const sendMessage = useCallback(
    (raw: string): boolean => {
      const channel = channelRef.current;
      const text = validateMessage(raw);
      if (!channel || !username || !text) return false;

      const now = Date.now();
      if (now - lastSentAt.current < SEND_COOLDOWN_MS) return false;
      lastSentAt.current = now;

      channel.send({
        type: "broadcast",
        event: "message",
        payload: {
          id: crypto.randomUUID(),
          username,
          text,
          timestamp: now,
        } satisfies ChatMessage,
      });
      return true;
    },
    [username]
  );

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard tidak tersedia (http non-secure) — abaikan
    }
  }

  if (!username) return null;

  return (
    <div className="flex h-dvh flex-col">
      <header className="pt-safe border-b border-line bg-surface px-4 pb-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            <button
              onClick={copyRoomId}
              title="Salin kode room"
              className="group inline-flex items-center gap-2 rounded-lg px-1 py-0.5 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="font-code text-lg font-bold tracking-[0.25em]">
                {roomId}
              </span>
              <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted transition group-hover:border-accent group-hover:text-accent">
                {copied ? "tersalin ✓" : "salin"}
              </span>
            </button>
            <p className="truncate text-xs text-muted">
              {status === "online" && `masuk sebagai ${username}`}
              {status === "connecting" && "menghubungkan…"}
              {status === "error" &&
                "koneksi gagal — periksa konfigurasi Supabase"}
            </p>
          </div>
          <OnlineUsers users={onlineUsers} self={username} status={status} />
        </div>
      </header>

      <MessageList items={items} self={username} />

      <MessageInput onSend={sendMessage} disabled={status !== "online"} />
    </div>
  );
}
