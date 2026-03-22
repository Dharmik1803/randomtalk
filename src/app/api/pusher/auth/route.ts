import { pusherServer } from "@/lib/pusher";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.formData();
    const socketId = body.get("socket_id") as string;
    const channelName = body.get("channel_name") as string;

    const authResponse = pusherServer.authenticate(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (err) {
    console.error("Pusher Auth Error:", err);
    return new NextResponse("Unauthorized", { status: 403 });
  }
}
