"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { validateMessage, validateUsername } from "@/lib/validation";
import { decode, type ClientMsg, type ServerEvent } from "@/lib/ws-protocol";
import type { RoomItem } from "@/lib/types";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import OnlineUsers from "@/components/OnlineUsers";

const SEND_COOLDOWN_MS = 300;
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 8000;

type Status = "connecting" | "online" | "error";

function wsUrl(roomId: string, username: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/ws/${roomId}?u=${encodeURIComponent(username)}`;
}

export default function ChatRoom({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [items, setItems] = useState<RoomItem[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const lastSentAt = useRef(0);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUser = useRef(false);

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
    closedByUser.current = false;

    function connect() {
      setStatus((prev) => (prev === "online" ? prev : "connecting"));
      const socket = new WebSocket(wsUrl(roomId, username!));
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempt.current = 0;
        setStatus("online");
      };

      socket.onmessage = (event) => {
        const msg = decode<ServerEvent>(String(event.data));
        if (!msg) return;

        if (msg.t === "msg") {
          setItems((prev) => [
            ...prev,
            {
              type: "message",
              id: msg.id,
              username: msg.username,
              text: msg.text,
              timestamp: msg.timestamp,
            },
          ]);
        } else if (msg.t === "presence") {
          setOnlineUsers(msg.users);
        } else if (msg.t === "sys") {
          setItems((prev) => [
            ...prev,
            {
              type: "system",
              id: msg.id,
              kind: msg.kind,
              username: msg.username,
              timestamp: msg.timestamp,
            },
          ]);
        }
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (closedByUser.current) return;
        setStatus("connecting");
        const delay = Math.min(
          RECONNECT_BASE_MS * 2 ** reconnectAttempt.current,
          RECONNECT_MAX_MS
        );
        reconnectAttempt.current += 1;
        reconnectTimer.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        setStatus((prev) => (prev === "online" ? prev : "error"));
      };
    }

    connect();

    return () => {
      closedByUser.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [roomId, username]);

  const sendMessage = useCallback((raw: string): boolean => {
    const socket = socketRef.current;
    const text = validateMessage(raw);
    if (!socket || socket.readyState !== WebSocket.OPEN || !text) return false;

    const now = Date.now();
    if (now - lastSentAt.current < SEND_COOLDOWN_MS) return false;
    lastSentAt.current = now;

    socket.send(JSON.stringify({ t: "msg", text } satisfies ClientMsg));
    return true;
  }, []);

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
              {status === "error" && "koneksi gagal — mencoba lagi…"}
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
