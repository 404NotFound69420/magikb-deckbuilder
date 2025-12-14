import express from "express";
import { query } from "../db.js";
import { requireAuth } from "../auth.js";
import { createDeckSchema, updateDeckCardsSchema } from "../validators.js";

export const deckRoutes = express.Router();
deckRoutes.use(requireAuth);

// list my decks
deckRoutes.get("/", async (req, res) => {
  const result = await query("SELECT id, name, created_at FROM decks WHERE user_id=$1 ORDER BY created_at DESC", [req.user.id]);
  res.json({ decks: result.rows });
});

// create deck
deckRoutes.post("/", async (req, res) => {
  const parsed = createDeckSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const result = await query("INSERT INTO decks(user_id,name) VALUES ($1,$2) RETURNING id, name", [req.user.id, parsed.data.name]);
  res.json({ deck: result.rows[0] });
});

// get deck + cards
deckRoutes.get("/:deckId", async (req, res) => {
  const deckId = Number(req.params.deckId);
  const deckRes = await query("SELECT id, name FROM decks WHERE id=$1 AND user_id=$2", [deckId, req.user.id]);
  if (deckRes.rowCount === 0) return res.status(404).json({ error: "Deck not found" });

  const cardsRes = await query(
    `SELECT dc.card_id as "cardId", dc.qty, c.name, c.type, c.cost, c.attack, c.health, c.effect_json
     FROM deck_cards dc
     JOIN cards c ON c.id = dc.card_id
     WHERE dc.deck_id=$1
     ORDER BY c.cost, c.name`,
    [deckId]
  );
  res.json({ deck: deckRes.rows[0], cards: cardsRes.rows });
});

// replace deck cards (enforce max 30 total)
deckRoutes.put("/:deckId/cards", async (req, res) => {
  const deckId = Number(req.params.deckId);

  const deckRes = await query("SELECT id FROM decks WHERE id=$1 AND user_id=$2", [deckId, req.user.id]);
  if (deckRes.rowCount === 0) return res.status(404).json({ error: "Deck not found" });

  const parsed = updateDeckCardsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const total = parsed.data.cards.reduce((s, x) => s + x.qty, 0);
  if (total > 30) return res.status(400).json({ error: "Deck cannot exceed 30 cards" });

  await query("DELETE FROM deck_cards WHERE deck_id=$1", [deckId]);

  for (const { cardId, qty } of parsed.data.cards) {
    if (qty === 0) continue;
    await query("INSERT INTO deck_cards(deck_id, card_id, qty) VALUES ($1,$2,$3)", [deckId, cardId, qty]);
  }

  res.json({ ok: true });
});
