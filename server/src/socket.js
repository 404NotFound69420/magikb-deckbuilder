import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { getMatchState, playCard, endTurn, attack } from "./game/engine.js";

function authSocket(socket) {
  const token = socket.handshake.auth?.token;
  if (!token) throw new Error("Missing token");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded; // {id, username}
}

export function setupSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN, methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    let user = null;
    try {
      user = authSocket(socket);
    } catch {
      socket.disconnect(true);
      return;
    }

    socket.on("match:joinRoom", async ({ matchId }) => {
      socket.join(matchId);
      const state = await getMatchState(matchId);
      socket.emit("match:state", { state });
    });

    // optional helper if you want to force-sync
    socket.on("match:sync", async ({ matchId }) => {
      try {
        const state = await getMatchState(matchId);
        io.to(matchId).emit("match:state", { state });
      } catch (e) {
        socket.emit("match:error", { error: String(e.message || e) });
      }
    });

    socket.on("match:playCard", async ({ matchId, handIndex }) => {
      try {
        const state = await playCard(matchId, user.id, handIndex);
        io.to(matchId).emit("match:state", { state });
      } catch (e) {
        socket.emit("match:error", { error: String(e.message || e) });
      }
    });

    // ✅ FIX: accept target + pass it into engine.attack(...)
    socket.on("match:attack", async ({ matchId, attackerIndex, target }) => {
      try {
        const state = await attack(matchId, user.id, attackerIndex, target);
        io.to(matchId).emit("match:state", { state });
      } catch (e) {
        socket.emit("match:error", { error: String(e.message || e) });
      }
    });

    socket.on("match:endTurn", async ({ matchId }) => {
      try {
        const state = await endTurn(matchId, user.id);
        io.to(matchId).emit("match:state", { state });
      } catch (e) {
        socket.emit("match:error", { error: String(e.message || e) });
      }
    });
  });

  return io;
}
