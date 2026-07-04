export const ROOM_ID_LENGTH = 6;
export const ROOM_ID_PATTERN = /^[A-Z0-9]{4,10}$/;
export const USERNAME_PATTERN = /^[a-zA-Z0-9 _.-]{2,20}$/;
export const MAX_MESSAGE_LENGTH = 1000;

const ROOM_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa I/O/0/1 agar tidak ambigu

export function generateRoomId(): string {
  const bytes = new Uint8Array(ROOM_ID_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ROOM_ID_CHARS[b % ROOM_ID_CHARS.length]).join("");
}

export function normalizeRoomId(input: string): string {
  return input.trim().toUpperCase();
}

export function validateRoomId(input: string): string | null {
  const roomId = normalizeRoomId(input);
  return ROOM_ID_PATTERN.test(roomId) ? roomId : null;
}

export function validateUsername(input: string): string | null {
  const username = input.trim().replace(/\s+/g, " ");
  return USERNAME_PATTERN.test(username) ? username : null;
}

export function validateMessage(input: string): string | null {
  const text = input.trim();
  if (text.length === 0 || text.length > MAX_MESSAGE_LENGTH) return null;
  return text;
}
