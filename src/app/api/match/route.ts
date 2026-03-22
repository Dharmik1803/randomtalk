import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log("[API] Incoming match request...");
  try {
    if (!redis) {
      return NextResponse.json({ 
        error: `Redis is not configured properly. Please check your REDIS_URL in environment variables.` 
      }, { status: 503 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[API] Failed to parse request JSON body");
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { peerId, mode = "video" } = body;
    console.log(`[API] Matching peerId: ${peerId} for mode: ${mode}`);

    if (!peerId) {
      console.error("[API] Missing peerId in request");
      return NextResponse.json({ error: "Missing peerId" }, { status: 400 });
    }

    const queueKey = `queue:${mode}`;
    
    // Remove self from queue in case of stale entry
    console.log(`[API] Cleaning up stale entries for ${peerId}`);
    try {
      await redis.lRem(queueKey, 0, peerId);
    } catch (e) {
      console.warn("[API] Redis lRem failed (non-critical):", e);
    }

    // Try to pop a waiting peer
    console.log(`[API] Checking queue: ${queueKey}`);
    const matchedPeerId = await redis.lPop(queueKey);

    if (matchedPeerId && matchedPeerId !== peerId) {
      console.log(`[API] Match FOUND! ${peerId} + ${matchedPeerId}`);
      return NextResponse.json({ 
        match: true, 
        peerId: matchedPeerId,
      });
    }

    // No match found, add current user to the queue
    console.log(`[API] No match. Adding ${peerId} to queue...`);
    await redis.rPush(queueKey, peerId);
    await redis.expire(queueKey, 10); // Short 10s TTL for fast cleanup

    return NextResponse.json({ 
      match: false, 
      message: "Waiting for a partner..." 
    });
  } catch (err: any) {
    console.error("[API] CRITICAL ERROR:", err.message);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: err.message 
    }, { status: 500 });
  }
}
