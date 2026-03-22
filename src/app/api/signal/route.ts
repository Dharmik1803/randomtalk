import { pusherServer } from "@/lib/pusher";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { targetId, type, data, roomId } = await req.json();

    if (!targetId || !type) {
      return new NextResponse("Missing parameters", { status: 400 });
    }

    await pusherServer.trigger(`private-user-${targetId}`, type, {
      data,
      roomId,
      from: targetId, // Simplified for this MVP
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Signal Error:", err);
    return new NextResponse("Error", { status: 500 });
  }
}
