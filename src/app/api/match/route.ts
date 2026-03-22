import { redis } from "@/lib/redis";
import { pusherServer } from "@/lib/pusher";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { socketId, mode } = await req.json();
    const queueKey = `queue:${mode || "video"}`;

    // Pop the first user from the Redis queue
    const peerSocketId = await redis.lpop(queueKey);

    if (peerSocketId && peerSocketId !== socketId) {
      const roomId = `room_${peerSocketId}_${socketId}`;
      
      // Notify both via Pusher
      await pusherServer.trigger(`private-user-${peerSocketId}`, "match_found", {
        roomId,
        isInitiator: true,
        peerId: socketId,
        mode
      });

      await pusherServer.trigger(`private-user-${socketId}`, "match_found", {
        roomId,
        isInitiator: false,
        peerId: peerSocketId,
        mode
      });

      return NextResponse.json({ status: "matched", roomId });
    } else {
      // Add this user to the queue
      await redis.rpush(queueKey, socketId);
      // Set expiration to 30 seconds to avoid stale queue
      await redis.expire(queueKey, 30);
      return NextResponse.json({ status: "waiting" });
    }
  } catch (err) {
    console.error("Matchmaking Error:", err);
    return new NextResponse("Error", { status: 500 });
  }
}
