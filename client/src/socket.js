import { io } from "socket.io-client";
import { getToken } from "./api";

const API = import.meta.env.VITE_API_URL;

export function makeSocket() {
  return io(API, {
    auth: { token: getToken() },
    transports: ["websocket"]
  });
}
