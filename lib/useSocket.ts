"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

let globalSocket: Socket | null = null;

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!globalSocket) {
      // Initialize socket server first
      fetch("/api/socketio").then(() => {
        globalSocket = io({ path: "/api/socketio", addTrailingSlash: false });
        socketRef.current = globalSocket;
        globalSocket.on("connect", () => setConnected(true));
        globalSocket.on("disconnect", () => setConnected(false));
      });
    } else {
      socketRef.current = globalSocket;
      setConnected(globalSocket.connected);
    }

    return () => {
      // Don't disconnect on unmount, keep alive
    };
  }, []);

  return { socket: socketRef.current, connected };
}
