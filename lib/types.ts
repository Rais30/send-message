export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: number;
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
