import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log("[API] Incoming match request...");
  try {
    if (!redis) {
      console.error("[API] Redis client NOT initialized. Check REDIS_URL.");
      return NextResponse.json({ 
        error: "REDIS_URL is missing or invalid. Please set it in your deployment settings." 
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
      await redis.lrem(queueKey, 0, peerId);
    } catch (e) {
      console.warn("[API] Redis lrem failed (non-critical):", e);
    }

    // Try to pop a waiting peer
    console.log(`[API] Checking queue: ${queueKey}`);
    const matchedPeerId = await redis.lpop<string>(queueKey);

    if (matchedPeerId && matchedPeerId !== peerId) {
      console.log(`[API] Match FOUND! ${peerId} + ${matchedPeerId}`);
      return NextResponse.json({ 
        match: true, 
        peerId: matchedPeerId,
      });
    }

    // No match found, add current user to the queue
    console.log(`[API] No match. Adding ${peerId} to queue...`);
    await redis.rpush(queueKey, peerId);
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
