"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { validateMessage, validateUsername } from "@/lib/validation";
import { decode, type ClientMsg, type ServerEvent } from "@/lib/ws-protocol";
import type { ChatMessage, RoomItem } from "@/lib/types";
import { removeRecentRoom, saveRecentRoom } from "@/lib/recent-rooms";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import OnlineUsers from "@/components/OnlineUsers";

const SEND_COOLDOWN_MS = 300;
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 8000;
const TYPING_RESEND_MS = 2000; // jangan spam event typing
const TYPING_EXPIRE_MS = 4000; // anggap berhenti mengetik jika tak ada sinyal

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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [readMap, setReadMap] = useState<Record<string, number>>({});
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [copied, setCopied] = useState(false);
  const [leaveModal, setLeaveModal] = useState(false);
  const [notifOn, setNotifOn] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const lastSentAt = useRef(0);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUser = useRef(false);
  const lastTypingSent = useRef(0);
  const typingOffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingExpiry = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const lastReadSent = useRef(0);
  const latestMsgTs = useRef(0);
  const notifOnRef = useRef(false);

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

  // Simpan kode room agar bisa masuk lagi (mis. browser HP tertutup)
  useEffect(() => {
    if (username) saveRecentRoom(roomId);
  }, [roomId, username]);

  useEffect(() => {
    setNotifOn(
      typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        localStorage.getItem("sm:notif") === "1"
    );
  }, []);
  useEffect(() => {
    notifOnRef.current = notifOn;
  }, [notifOn]);

  const sendRaw = useCallback((msg: ClientMsg) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  }, []);

  // Kirim tanda "sudah baca" untuk pesan terbaru (hanya saat tab terlihat)
  const sendRead = useCallback(() => {
    const ts = latestMsgTs.current;
    if (ts <= lastReadSent.current || document.visibilityState !== "visible")
      return;
    lastReadSent.current = ts;
    sendRaw({ t: "read", ts });
  }, [sendRaw]);

  useEffect(() => {
    if (!username) return;
    closedByUser.current = false;
    const expiryTimers = typingExpiry.current;

    function markTyping(user: string, on: boolean) {
      const timers = typingExpiry.current;
      const existing = timers.get(user);
      if (existing) clearTimeout(existing);
      if (on) {
        timers.set(
          user,
          setTimeout(() => {
            timers.delete(user);
            setTypingUsers((prev) => prev.filter((u) => u !== user));
          }, TYPING_EXPIRE_MS)
        );
        setTypingUsers((prev) => (prev.includes(user) ? prev : [...prev, user]));
      } else {
        timers.delete(user);
        setTypingUsers((prev) => prev.filter((u) => u !== user));
      }
    }

    function notify(msg: { username: string; text: string }) {
      if (
        !notifOnRef.current ||
        document.visibilityState === "visible" ||
        typeof Notification === "undefined" ||
        Notification.permission !== "granted"
      )
        return;
      try {
        new Notification(`${msg.username} · ${roomId}`, {
          body: msg.text,
          icon: "/icons/icon-192.png",
          tag: `sm-${roomId}`, // pesan baru menimpa notifikasi lama
        });
      } catch {
        // beberapa platform (Android) butuh SW registration — abaikan
      }
    }

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
          latestMsgTs.current = Math.max(latestMsgTs.current, msg.timestamp);
          markTyping(msg.username, false);
          if (msg.username !== username) {
            notify(msg);
            sendRead();
          }
          setItems((prev) => [
            ...prev,
            {
              type: "message",
              id: msg.id,
              username: msg.username,
              text: msg.text,
              timestamp: msg.timestamp,
              replyTo: msg.replyTo,
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
        } else if (msg.t === "typing") {
          if (msg.username !== username) markTyping(msg.username, msg.on);
        } else if (msg.t === "read") {
          if (msg.username !== username) {
            setReadMap((prev) =>
              (prev[msg.username] ?? 0) >= msg.ts
                ? prev
                : { ...prev, [msg.username]: msg.ts }
            );
          }
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

    function onVisible() {
      if (document.visibilityState === "visible") sendRead();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      closedByUser.current = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (typingOffTimer.current) clearTimeout(typingOffTimer.current);
      for (const t of expiryTimers.values()) clearTimeout(t);
      expiryTimers.clear();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [roomId, username, sendRaw, sendRead]);

  const handleTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current > TYPING_RESEND_MS) {
      lastTypingSent.current = now;
      sendRaw({ t: "typing", on: true });
    }
    if (typingOffTimer.current) clearTimeout(typingOffTimer.current);
    typingOffTimer.current = setTimeout(() => {
      sendRaw({ t: "typing", on: false });
      lastTypingSent.current = 0;
    }, TYPING_EXPIRE_MS - 1000);
  }, [sendRaw]);

  const sendMessage = useCallback(
    (raw: string): boolean => {
      const socket = socketRef.current;
      const text = validateMessage(raw);
      if (!socket || socket.readyState !== WebSocket.OPEN || !text) return false;

      const now = Date.now();
      if (now - lastSentAt.current < SEND_COOLDOWN_MS) return false;
      lastSentAt.current = now;

      sendRaw({
        t: "msg",
        text,
        ...(replyTarget ? { replyTo: replyTarget.id } : {}),
      });
      setReplyTarget(null);
      if (typingOffTimer.current) clearTimeout(typingOffTimer.current);
      lastTypingSent.current = 0;
      sendRaw({ t: "typing", on: false });
      return true;
    },
    [replyTarget, sendRaw]
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

  async function toggleNotif() {
    if (typeof Notification === "undefined") return;
    if (notifOn) {
      localStorage.setItem("sm:notif", "0");
      setNotifOn(false);
      return;
    }
    const perm =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    if (perm === "granted") {
      localStorage.setItem("sm:notif", "1");
      setNotifOn(true);
    }
  }

  function leaveRoom(forget: boolean) {
    if (forget) removeRecentRoom(roomId);
    router.push("/");
  }

  if (!username) return null;

  const othersTyping = typingUsers.filter((u) => u !== username);

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
              {status === "online" &&
                (othersTyping.length > 0
                  ? `${othersTyping.join(", ")} sedang mengetik…`
                  : `masuk sebagai ${username}`)}
              {status === "connecting" && "menghubungkan…"}
              {status === "error" && "koneksi gagal — mencoba lagi…"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <OnlineUsers users={onlineUsers} self={username} status={status} />
            <button
              onClick={toggleNotif}
              title={notifOn ? "Matikan notifikasi" : "Nyalakan notifikasi"}
              aria-label={notifOn ? "Matikan notifikasi" : "Nyalakan notifikasi"}
              aria-pressed={notifOn}
              className={`rounded-full border border-line p-2 transition hover:border-accent focus-visible:ring-2 focus-visible:ring-accent ${
                notifOn ? "text-accent" : "text-muted"
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                {!notifOn && <path d="M2 2 22 22" />}
              </svg>
            </button>
            <button
              onClick={() => setLeaveModal(true)}
              title="Keluar room"
              aria-label="Keluar room"
              className="rounded-full border border-line p-2 text-muted transition hover:border-danger hover:text-danger focus-visible:ring-2 focus-visible:ring-danger"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <MessageList
        items={items}
        self={username}
        readMap={readMap}
        onReply={setReplyTarget}
      />

      <MessageInput
        onSend={sendMessage}
        disabled={status !== "online"}
        onTyping={handleTyping}
        replyTarget={replyTarget}
        onCancelReply={() => setReplyTarget(null)}
      />

      {leaveModal && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-title"
          onClick={() => setLeaveModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="leave-title" className="font-display text-lg font-semibold">
              Keluar dari room?
            </h2>
            <p className="mt-1 text-sm text-muted">
              Kode <span className="font-code font-bold">{roomId}</span> tersimpan
              di daftar room. Simpan agar bisa masuk lagi nanti?
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => leaveRoom(false)}
                className="w-full rounded-xl bg-accent px-4 py-2.5 font-display font-semibold text-on-accent transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent"
              >
                Simpan & keluar
              </button>
              <button
                onClick={() => leaveRoom(true)}
                className="w-full rounded-xl border border-danger px-4 py-2.5 font-display font-semibold text-danger transition hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-danger"
              >
                Hapus kode & keluar
              </button>
              <button
                onClick={() => setLeaveModal(false)}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-muted transition hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
