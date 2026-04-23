"use client";

import type { RoomState } from "./roomGameReducer";

export type PendingAction = "create" | "join" | "reset" | null;

export type ServerMessage =
  | { type: "room_state"; payload: RoomState }
  | { type: "error"; payload: { message: string } }
  | { type: "system"; payload: { message: string } };

export const STATUS_CONNECTING = "連線中...";
export const STATUS_CONNECTED = "已連線";
export const STATUS_DISCONNECTED = "連線已關閉";

export const DUPLICATE_SELECTION_MESSAGE = "同一關只能選一個格子";
export const DUPLICATE_COLOR_MESSAGE = "這個顏色已被其他玩家選走";
export const PICK_COLOR_FIRST_MESSAGE = "請先選擇顏色";
export const ROOM_NOT_FOUND_MESSAGE = "找不到房間";
export const INVALID_PASSWORD_MESSAGE = "房間密碼錯誤";
export const CELL_OCCUPIED_MESSAGE = "這個格子已被其他玩家佔用";
export const ROOM_FULL_MESSAGE = "房間已滿";

export const TOAST_CREATING_ROOM = "正在建立房間...";
export const TOAST_JOINING_ROOM = "正在加入房間...";
export const TOAST_RESETTING_ROOM = "正在重置房間...";
export const TOAST_LEFT_ROOM = "已離開房間";
export const TOAST_COLOR_SAVED = "已更新顏色";
export const TOAST_COLOR_SELECTED = "已選擇顏色";
export const TOAST_SOCKET_ERROR = "WebSocket 連線失敗";

export function getWebSocketUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_WS_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.hostname}:8080`;
  }

  return "ws://localhost:8080";
}
