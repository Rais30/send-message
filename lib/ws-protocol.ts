// Protokol WebSocket antara client dan server (dibagikan keduanya).
// Server otoritatif: id, username, timestamp selalu dibuat server.

// Client → server
export interface ClientMsg {
  t: "msg";
  text: string;
}

// Server → client
export interface ServerMsg {
  t: "msg";
  id: string;
  username: string;
  text: string;
  timestamp: number;
}

export interface ServerPresence {
  t: "presence";
  users: string[];
}

export interface ServerSys {
  t: "sys";
  id: string;
  kind: "join" | "leave";
  username: string;
  timestamp: number;
}

export type ServerEvent = ServerMsg | ServerPresence | ServerSys;

export function encode(event: ServerEvent | ClientMsg): string {
  return JSON.stringify(event);
}

// Parse aman: kembalikan null jika bukan JSON valid.
export function decode<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
