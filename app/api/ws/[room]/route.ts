import type { WebSocket, WebSocketServer } from "ws";
import type { NextRequest } from "next/server";
import type { RouteContext } from "next-ws/server";
import { validateRoomId, validateUsername, validateMessage } from "@/lib/validation";
import { encode, decode, type ClientMsg, type ServerEvent } from "@/lib/ws-protocol";

const SEND_COOLDOWN_MS = 300;
const EVENT_COOLDOWN_MS = 150; // typing/read: cegah broadcast flood

// Endpoint ini hanya untuk upgrade WebSocket. GET HTTP biasa → 426.
export function GET() {
  return new Response("Upgrade Required", { status: 426 });
}

// Registry in-memory: room → (socket → username). Hidup selama proses berjalan.
// ponytail: single-instance. Scale multi-VPS butuh Adapter (Redis pub/sub) dari next-ws.
const rooms = new Map<string, Map<WebSocket, string>>();
const lastSentAt = new WeakMap<WebSocket, number>();
const lastEventAt = new WeakMap<WebSocket, number>();

function usersIn(roomId: string): string[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return [...new Set(room.values())].sort();
}

function broadcast(roomId: string, event: ServerEvent): void {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = encode(event);
  for (const peer of room.keys()) {
    if (peer.readyState === peer.OPEN) peer.send(data);
  }
}

// Cek Origin untuk cegah cross-site WebSocket hijacking.
function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false; // browser selalu kirim Origin untuk WS
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed) return origin === allowed;
  // Tanpa env: izinkan hanya jika host origin == host request (same-origin).
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export function UPGRADE(
  client: WebSocket,
  _server: WebSocketServer,
  request: NextRequest,
  context: RouteContext<"/api/ws/[room]">
) {
  const roomId = validateRoomId(String(context.params.room ?? ""));
  const username = validateUsername(request.nextUrl.searchParams.get("u") ?? "");

  if (!roomId || !username || !originAllowed(request)) {
    client.close(1008, "invalid");
    return;
  }

  let room = rooms.get(roomId);
  if (!room) {
    room = new Map();
    rooms.set(roomId, room);
  }
  room.set(client, username);

  // Kirim daftar user saat ini ke semua, umumkan join.
  broadcast(roomId, {
    t: "sys",
    id: crypto.randomUUID(),
    kind: "join",
    username,
    timestamp: Date.now(),
  });
  broadcast(roomId, { t: "presence", users: usersIn(roomId) });

  client.on("message", (raw, isBinary) => {
    // Tolak binary + frame besar sebelum parse (anti memory abuse)
    if (isBinary) return;
    const str = raw.toString();
    if (str.length > 8192) return;
    const parsed = decode<ClientMsg>(str);
    if (!parsed) return;

    if (parsed.t === "typing" || parsed.t === "read") {
      const now = Date.now();
      if (now - (lastEventAt.get(client) ?? 0) < EVENT_COOLDOWN_MS) return;
      lastEventAt.set(client, now);

      if (parsed.t === "typing") {
        broadcast(roomId, { t: "typing", username, on: parsed.on === true });
      } else {
        const ts = Number(parsed.ts);
        if (!Number.isFinite(ts)) return;
        // Clamp ke sekarang: cegah "sudah dibaca" untuk pesan masa depan
        broadcast(roomId, { t: "read", username, ts: Math.min(ts, now) });
      }
      return;
    }

    if (parsed.t !== "msg") return;
    const text = validateMessage(String(parsed.text ?? ""));
    if (!text) return;

    const now = Date.now();
    if (now - (lastSentAt.get(client) ?? 0) < SEND_COOLDOWN_MS) return;
    lastSentAt.set(client, now);

    // replyTo: hanya string pendek yang diteruskan; client lookup lokal.
    const replyTo =
      typeof parsed.replyTo === "string" && parsed.replyTo.length <= 64
        ? parsed.replyTo
        : undefined;

    // Server yang stamp id/username/timestamp — client tak bisa palsukan.
    broadcast(roomId, {
      t: "msg",
      id: crypto.randomUUID(),
      username,
      text,
      timestamp: now,
      ...(replyTo ? { replyTo } : {}),
    });
  });

  client.once("close", () => {
    const r = rooms.get(roomId);
    if (!r) return;
    r.delete(client);
    if (r.size === 0) {
      rooms.delete(roomId); // room kosong → lenyap total (ephemeral)
      return;
    }
    broadcast(roomId, {
      t: "sys",
      id: crypto.randomUUID(),
      kind: "leave",
      username,
      timestamp: Date.now(),
    });
    broadcast(roomId, { t: "presence", users: usersIn(roomId) });
  });
}
