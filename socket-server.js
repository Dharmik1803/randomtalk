const { createServer } = require("http");
const { Server } = require("socket.io");

const port = parseInt(process.env.PORT || "3001", 10);
const corsOrigin = process.env.CORS_ORIGIN || "*";

// In-memory queues for matchmaking
const queue = { video: [], text: [] };
const activeRooms = new Map();

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Video Chat Socket Server is running\n");
});

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  socket.on("find_match", (data) => {
    const mode = data?.mode || "video";
    console.log(`[Socket] User finding match (${mode}): ${socket.id}`);
    
    const targetQueue = queue[mode];

    if (targetQueue.length > 0) {
      const peer = targetQueue.shift();
      if (peer.id === socket.id) {
        targetQueue.push(peer);
        return;
      }

      const roomId = `room_${peer.id}_${socket.id}`;
      socket.join(roomId);
      peer.join(roomId);
      activeRooms.set(roomId, [socket.id, peer.id]);

      io.to(roomId).emit("match_found", { roomId, peerId: socket.id }); 
      io.to(peer.id).emit("match_info", { isInitiator: true, peerId: socket.id, roomId, mode });
      io.to(socket.id).emit("match_info", { isInitiator: false, peerId: peer.id, roomId, mode });
    } else {
      targetQueue.push(socket);
      socket.emit("waiting_for_match", { message: "Waiting for a partner..." });
    }
  });

  socket.on("offer", (data) => { socket.to(data.roomId).emit("offer", data.offer); });
  socket.on("answer", (data) => { socket.to(data.roomId).emit("answer", data.answer); });
  socket.on("ice_candidate", (data) => { socket.to(data.roomId).emit("ice_candidate", data.candidate); });
  socket.on("message", (data) => { socket.to(data.roomId).emit("message", data.message); });

  socket.on("next", (data) => {
    if (data?.roomId) {
      socket.to(data.roomId).emit("peer_disconnected");
      socket.leave(data.roomId);
      const peers = activeRooms.get(data.roomId);
      if (peers) {
        peers.forEach(id => {
          const s = io.sockets.sockets.get(id);
          if (s) s.leave(data.roomId);
        });
        activeRooms.delete(data.roomId);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
    const vidIndex = queue.video.findIndex((s) => s.id === socket.id);
    if (vidIndex !== -1) queue.video.splice(vidIndex, 1);
    const txtIndex = queue.text.findIndex((s) => s.id === socket.id);
    if (txtIndex !== -1) queue.text.splice(txtIndex, 1);
    
    for (const [roomId, peers] of activeRooms.entries()) {
      if (peers.includes(socket.id)) {
        socket.to(roomId).emit("peer_disconnected");
        activeRooms.delete(roomId);
      }
    }
  });
});

httpServer.listen(port, () => {
  console.log(`> Socket Server ready on port ${port}`);
  console.log(`> CORS Origin restricted to: ${corsOrigin}`);
});
