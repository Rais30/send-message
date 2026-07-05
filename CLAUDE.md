# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install     # runs `next-ws patch` automatically via the `prepare` script
npm run dev     # dev server — NEVER add --turbopack; next-ws patches the webpack path only
npm run build   # production build
npm start       # production server (port 3000, run behind a TLS reverse proxy)
npm run lint    # next lint
npm run icons   # regenerate PWA icons (scripts/generate-icons.mjs, uses sharp)
```

No test suite exists. Manual verification: open two tabs at `http://localhost:3000`, join the same room with different usernames, confirm messages flow both ways.

## Constraints

- **Requires a persistent Node process** — next-ws cannot run on Vercel/serverless. Deploys go to a VPS behind nginx/Caddy forwarding `Upgrade`/`Connection` headers (see README).
- **Turbopack is incompatible.** `next-ws patch` modifies Next.js's webpack server path; if WebSockets break after dependency changes, re-run `npx next-ws patch`.
- Messages are **ephemeral by design** — in-memory only, no database. Do not add persistence.
- UI copy and code comments are in Indonesian; keep that convention.

## Architecture

Realtime chat rooms over a single WebSocket endpoint, no storage.

**Server** — `app/api/ws/[room]/route.ts` exports `UPGRADE()` (next-ws convention) plus a `GET()` returning 426. All room state lives in a module-level `Map<roomId, Map<WebSocket, username>>`:
- The server is **authoritative**: username is locked at connection time (via `?u=` query param), and `id`/`timestamp` are stamped server-side — clients can never forge them.
- Connection is rejected (close 1008) unless room ID, username, and Origin all validate. Origin check: exact match against `ALLOWED_ORIGIN` env var if set, else same-host as the request (prevents cross-site WebSocket hijacking).
- Per-socket rate limit: 300 ms cooldown (`SEND_COOLDOWN_MS`), tracked in a `WeakMap`. The client mirrors the same cooldown in `ChatRoom.tsx` — keep the two constants in sync.
- Empty room → deleted from the Map entirely (ephemerality guarantee).
- Single-instance only; multi-VPS scaling would need next-ws's Redis pub/sub Adapter (marked `ponytail:` in the route).

**Protocol** — `lib/ws-protocol.ts` defines the shared message types (JSON over WS): client sends `{t:"msg", text}`; server broadcasts `ServerMsg` (`t:"msg"`), `ServerPresence` (`t:"presence"`, full sorted user list), and `ServerSys` (`t:"sys"`, join/leave). `decode()` is the safe-parse helper — always use it instead of raw `JSON.parse`.

**Validation** — `lib/validation.ts` is shared by client and server; both sides validate room IDs, usernames, and messages with the same functions. Room IDs are 6 chars from an ambiguity-free alphabet (no I/O/0/1), generated with `crypto.getRandomValues`.

**Client** — `components/ChatRoom.tsx` owns the WebSocket lifecycle: connects with username from `sessionStorage` (`sm:username`, redirect to `/` if missing), auto-reconnects with exponential backoff (500 ms → 8 s cap), and renders `MessageList`/`MessageInput`/`OnlineUsers`. `JoinForm.tsx` on `/` creates or joins rooms; `/room/[id]` renders the chat.

**PWA** — `app/manifest.ts` + hand-written `public/sw.js` (registered by `components/RegisterSW.tsx`). Security headers set in `next.config.ts`.
