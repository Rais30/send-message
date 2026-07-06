export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: number;
  replyTo?: string;
}

// Room yang pernah dimasuki, disimpan di localStorage
export interface RecentRoom {
  id: string;
  lastJoined: number;
}

export interface SystemEvent {
  id: string;
  kind: "join" | "leave";
  username: string;
  timestamp: number;
}

export type RoomItem =
  | ({ type: "message" } & ChatMessage)
  | ({ type: "system" } & SystemEvent);
