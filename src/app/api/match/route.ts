import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { peerId, mode = "video" } = await req.json();
    if (!peerId) return NextResponse.json({ error: "Missing peerId" }, { status: 400 });

    const queueKey = `queue:${mode}`;
    
    // Remove self from queue in case of stale entry
    await redis.lrem(queueKey, 0, peerId);

    // Try to pop a waiting peer
    const matchedPeerId = await redis.lpop(queueKey);

    if (matchedPeerId && matchedPeerId !== peerId) {
      // Found a match!
      return NextResponse.json({ 
        match: true, 
        peerId: matchedPeerId,
      });
    }

    // No match found, add current user to the queue
    await redis.rpush(queueKey, peerId);
    await redis.expire(queueKey, 10); // Short 10s TTL for fast cleanup

    return NextResponse.json({ 
      match: false, 
      message: "Waiting for a partner..." 
    });
  } catch (err: any) {
    console.error("Match Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
