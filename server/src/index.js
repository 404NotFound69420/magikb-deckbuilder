import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";

import { authRoutes } from "./routes/authRoutes.js";
import { cardRoutes } from "./routes/cardRoutes.js";
import { deckRoutes } from "./routes/deckRoutes.js";
import { matchRoutes } from "./routes/matchRoutes.js";
import { setupSockets } from "./socket.js";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/decks", deckRoutes);
app.use("/api/matches", matchRoutes);

const server = http.createServer(app);
setupSockets(server);

const port = process.env.PORT || 5174;
server.listen(port, () => console.log(`Server listening on ${port}`));
