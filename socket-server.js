const { createServer } = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const Redis = require("ioredis");

const port = parseInt(process.env.PORT || "3001", 10);
const corsOrigin = process.env.CORS_ORIGIN || "*";
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn("⚠️ REDIS_URL not found. Falling back to in-memory matching (not scalable).");
}

// Redis Clients
const pubClient = redisUrl ? new Redis(redisUrl) : null;
const subClient = pubClient ? pubClient.duplicate() : null;
const redis = pubClient ? pubClient.duplicate() : null;

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Video Chat Socket Server (Redis Scalable) is running\n");
});

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

if (pubClient && subClient) {
  io.adapter(createAdapter(pubClient, subClient));
  console.log("✅ Socket.IO Redis Adapter initialized.");
}

// In-memory fallback
const memoryQueue = { video: [], text: [] };

io.on("connection", (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  socket.on("find_match", async (data) => {
    const mode = data?.mode || "video";
    console.log(`[Socket] User finding match (${mode}): ${socket.id}`);
    
    if (redis) {
      const queueKey = `queue:${mode}`;
      // Try to pop a peer from the Redis queue
      const peerId = await redis.lpop(queueKey);

      if (peerId && peerId !== socket.id) {
        const roomId = `room_${peerId}_${socket.id}`;
        
        // Use io.to().socketsJoin() or just emit to both
        io.to(peerId).emit("match_info", { isInitiator: true, peerId: socket.id, roomId, mode });
        io.to(socket.id).emit("match_info", { isInitiator: false, peerId: peerId, roomId, mode });
        
        console.log(`[Redis] Match found! Room: ${roomId}`);
      } else {
        // Enqueue self
        await redis.rpush(queueKey, socket.id);
        await redis.expire(queueKey, 30); // 30s TTL
        socket.emit("waiting_for_match", { message: "Waiting for a partner..." });
      }
    } else {
      // Memory Fallback
      const targetQueue = memoryQueue[mode];
      if (targetQueue.length > 0) {
        const peer = targetQueue.shift();
        const roomId = `room_${peer.id}_${socket.id}`;
        io.to(peer.id).emit("match_info", { isInitiator: true, peerId: socket.id, roomId, mode });
        io.to(socket.id).emit("match_info", { isInitiator: false, peerId: peer.id, roomId, mode });
      } else {
        targetQueue.push(socket);
        socket.emit("waiting_for_match");
      }
    }
  });

  socket.on("offer", (data) => { socket.to(data.roomId).emit("offer", data.offer); });
  socket.on("answer", (data) => { socket.to(data.roomId).emit("answer", data.answer); });
  socket.on("ice_candidate", (data) => { socket.to(data.roomId).emit("ice_candidate", data.candidate); });
  socket.on("message", (data) => { socket.to(data.roomId).emit("message", data.message); });

  socket.on("next", async (data) => {
    if (data?.roomId) {
      socket.to(data.roomId).emit("peer_disconnected");
      // Optional: Cleanup logic
    }
  });

  socket.on("disconnect", async () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
    if (redis) {
      // Cleanup from Redis queues (Slow, but safe for MVP)
      await redis.lrem("queue:video", 0, socket.id);
      await redis.lrem("queue:text", 0, socket.id);
    } else {
      const vidIndex = memoryQueue.video.findIndex((s) => s.id === socket.id);
      if (vidIndex !== -1) memoryQueue.video.splice(vidIndex, 1);
    }
  });
});

httpServer.listen(port, () => {
  console.log(`> Scalable Socket Server ready on port ${port}`);
  console.log(`> CORS Origin restricted to: ${corsOrigin}`);
});
