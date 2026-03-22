import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// In-memory queues for MVP matchmaking
const queue = { video: [], text: [] };
const activeRooms = new Map();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // User wants to find a match
    socket.on("find_match", (data) => {
      const mode = data?.mode || "video";
      console.log(`[Socket] User finding match (${mode}): ${socket.id}`);
      
      const targetQueue = queue[mode];

      // If someone else is in queue, match them
      if (targetQueue.length > 0) {
        const peer = targetQueue.shift();
        
        // Prevent matching with self natively
        if (peer.id === socket.id) {
          targetQueue.push(peer);
          return;
        }

        const roomId = `room_${peer.id}_${socket.id}`;
        
        // Both join room
        socket.join(roomId);
        peer.join(roomId);
        
        activeRooms.set(roomId, [socket.id, peer.id]);

        // Notify both they found a match
        io.to(roomId).emit("match_found", { roomId, peerId: socket.id }); 
        io.to(peer.id).emit("match_info", { isInitiator: true, peerId: socket.id, roomId, mode });
        io.to(socket.id).emit("match_info", { isInitiator: false, peerId: peer.id, roomId, mode });

        console.log(`[Socket] Match found! Room: ${roomId}`);
      } else {
        // Enqueue user
        targetQueue.push(socket);
        socket.emit("waiting_for_match", { message: "Waiting for a partner..." });
      }
    });

    // WebRTC Signaling
    socket.on("offer", (data) => {
      socket.to(data.roomId).emit("offer", data.offer);
    });

    socket.on("answer", (data) => {
      socket.to(data.roomId).emit("answer", data.answer);
    });

    socket.on("ice_candidate", (data) => {
      socket.to(data.roomId).emit("ice_candidate", data.candidate);
    });

    // Text messaging relay
    socket.on("message", (data) => {
      socket.to(data.roomId).emit("message", data.message);
    });

    socket.on("next", (data) => {
      // Leave current room
      if (data?.roomId) {
        socket.to(data.roomId).emit("peer_disconnected");
        socket.leave(data.roomId);
        
        const peers = activeRooms.get(data.roomId);
        if (peers) {
          const remotePeerId = peers.find(id => id !== socket.id);
          if (remotePeerId) {
             const remoteSocket = io.sockets.sockets.get(remotePeerId);
             if (remoteSocket) remoteSocket.leave(data.roomId);
          }
          activeRooms.delete(data.roomId);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);
      // Remove from queues if present
      const vidIndex = queue.video.findIndex((s) => s.id === socket.id);
      if (vidIndex !== -1) queue.video.splice(vidIndex, 1);

      const txtIndex = queue.text.findIndex((s) => s.id === socket.id);
      if (txtIndex !== -1) queue.text.splice(txtIndex, 1);
      
      // Notify peers in active rooms
      for (const [roomId, peers] of activeRooms.entries()) {
        if (peers.includes(socket.id)) {
          socket.to(roomId).emit("peer_disconnected");
          activeRooms.delete(roomId);
        }
      }
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
