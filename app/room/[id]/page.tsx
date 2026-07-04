import { notFound } from "next/navigation";
import ChatRoom from "@/components/ChatRoom";
import { validateRoomId } from "@/lib/validation";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roomId = validateRoomId(decodeURIComponent(id));
  if (!roomId) notFound();

  return <ChatRoom roomId={roomId} />;
}
