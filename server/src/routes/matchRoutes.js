import express from "express";
import { requireAuth } from "../auth.js";
import { query } from "../db.js";
import { createMatch, joinMatch, getMatchState } from "../game/engine.js";

export const matchRoutes = express.Router();
matchRoutes.use(requireAuth);

// Create match (lobby)
matchRoutes.post("/", async (req, res) => {
  const deckId = Number(req.body.deckId);
  if (!deckId) return res.status(400).json({ error: "deckId required" });

  try {
    const matchId = await createMatch(req.user.id, deckId);
    res.json({ matchId });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

// Join match (provide deckId)
matchRoutes.post("/:matchId/join", async (req, res) => {
  const deckId = Number(req.body.deckId);
  const matchId = req.params.matchId;

  try {
    const state = await joinMatch(req.user.id, matchId, deckId);
    res.json({ state });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

// Get current state
matchRoutes.get("/:matchId", async (req, res) => {
  try {
    const state = await getMatchState(req.params.matchId);
    res.json({ state });
  } catch (e) {
    res.status(404).json({ error: "Match not found" });
  }
});
