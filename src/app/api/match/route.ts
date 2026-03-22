import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { peerId, mode = "video" } = await req.json();
    if (!peerId) return NextResponse.json({ error: "Missing peerId" }, { status: 400 });

    const queueKey = `queue:${mode}`;
    
    // Try to pop a waiting peer
    const matchedPeerId = await redis.lpop(queueKey);

    if (matchedPeerId && matchedPeerId !== peerId) {
      // Found a match! Return the peerId
      return NextResponse.json({ 
        match: true, 
        peerId: matchedPeerId,
        isInitiator: true // Current user will initiate the call
      });
    }

    // No match found, add current user to the queue
    await redis.rpush(queueKey, peerId);
    await redis.expire(queueKey, 30); // 30s TTL for self-cleanup

    return NextResponse.json({ 
      match: false, 
      message: "Waiting for a partner..." 
    });
  } catch (err: any) {
    console.error("Match Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
