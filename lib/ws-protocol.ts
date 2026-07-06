// Protokol WebSocket antara client dan server (dibagikan keduanya).
// Server otoritatif: id, username, timestamp selalu dibuat server.

// Client → server
export interface ClientChatMsg {
  t: "msg";
  text: string;
  replyTo?: string; // id pesan yang dibalas (lookup lokal di client)
}

export interface ClientTyping {
  t: "typing";
  on: boolean;
}

// "Sudah baca sampai timestamp ini"
export interface ClientRead {
  t: "read";
  ts: number;
}

export type ClientMsg = ClientChatMsg | ClientTyping | ClientRead;

// Server → client
export interface ServerMsg {
  t: "msg";
  id: string;
  username: string;
  text: string;
  timestamp: number;
  replyTo?: string;
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

export interface ServerTyping {
  t: "typing";
  username: string;
  on: boolean;
}

export interface ServerRead {
  t: "read";
  username: string;
  ts: number;
}

export type ServerEvent =
  | ServerMsg
  | ServerPresence
  | ServerSys
  | ServerTyping
  | ServerRead;

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
