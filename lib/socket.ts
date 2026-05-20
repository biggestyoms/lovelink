import { Server as SocketServer } from "socket.io";
import { NextApiResponse } from "next";
import { Server as NetServer } from "http";

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & { io?: SocketServer };
  };
};

let io: SocketServer;

export function getIO(res: NextApiResponseWithSocket): SocketServer {
  if (!res.socket.server.io) {
    io = new SocketServer(res.socket.server, {
      path: "/api/socketio",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("client connected:", socket.id);

      socket.on("join-room", ({ room, name }) => {
        socket.join(room);
        socket.data.name = name;
        socket.data.room = room;
        socket.to(room).emit("user-joined", { name });
        console.log(`${name} joined room: ${room}`);
      });

      // Text chat
      socket.on("message", ({ room, text, name, id, timestamp }) => {
        socket.to(room).emit("message", { text, name, id, timestamp });
      });

      // Typing indicator
      socket.on("typing", ({ room, name, isTyping }) => {
        socket.to(room).emit("typing", { name, isTyping });
      });

      // WebRTC signaling
      socket.on("vc-offer", ({ room, offer }) => {
        socket.to(room).emit("vc-offer", { offer });
      });

      socket.on("vc-answer", ({ room, answer }) => {
        socket.to(room).emit("vc-answer", { answer });
      });

      socket.on("vc-ice", ({ room, candidate }) => {
        socket.to(room).emit("vc-ice", { candidate });
      });

      socket.on("vc-end", ({ room }) => {
        socket.to(room).emit("vc-end");
      });

      socket.on("disconnect", () => {
        const { room, name } = socket.data;
        if (room && name) {
          io.to(room).emit("user-left", { name });
        }
        console.log("client disconnected:", socket.id);
      });
    });

    res.socket.server.io = io;
  }
  return res.socket.server.io;
}
