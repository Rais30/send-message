// Daftar room yang pernah dimasuki — localStorage, client-only.
import type { RecentRoom } from "@/lib/types";
import { validateRoomId } from "@/lib/validation";

const KEY = "sm:recent-rooms";
const MAX = 10;

export function getRecentRooms(): RecentRoom[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter(
        (r): r is RecentRoom =>
          r && typeof r.id === "string" && validateRoomId(r.id) !== null
      )
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function saveRecentRoom(id: string): void {
  const list = getRecentRooms().filter((r) => r.id !== id);
  list.unshift({ id, lastJoined: Date.now() });
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // storage penuh/di-block — abaikan
  }
}

export function removeRecentRoom(id: string): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(getRecentRooms().filter((r) => r.id !== id))
    );
  } catch {
    // abaikan
  }
}

export function isRecentRoom(id: string): boolean {
  return getRecentRooms().some((r) => r.id === id);
}
