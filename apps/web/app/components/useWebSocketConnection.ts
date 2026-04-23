"use client";

import { useEffect, useRef } from "react";
import { getWebSocketUrl, type ServerMessage } from "./roomSocketConstants";

type Handlers = {
  onMessage: (message: ServerMessage) => void;
  onError: () => void;
  onClose: () => void;
};

export function useWebSocketConnection() {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  function isReady() {
    return socketRef.current?.readyState === WebSocket.OPEN;
  }

  function connect(message: Record<string, unknown>, handlers: Handlers, onOpen?: () => void) {
    socketRef.current?.close();
    const socket = new WebSocket(getWebSocketUrl());
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      onOpen?.();
      socket.send(JSON.stringify(message));
    });

    socket.addEventListener("message", (event) => {
      handlers.onMessage(JSON.parse(event.data) as ServerMessage);
    });

    socket.addEventListener("error", handlers.onError);
    socket.addEventListener("close", handlers.onClose);
  }

  function send(message: Record<string, unknown>) {
    socketRef.current?.send(JSON.stringify(message));
  }

  function close() {
    socketRef.current?.close();
    socketRef.current = null;
  }

  return {
    connect,
    send,
    close,
    isReady
  };
}
