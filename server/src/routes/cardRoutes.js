import express from "express";
import { query } from "../db.js";

export const cardRoutes = express.Router();

// GET all cards
cardRoutes.get("/", async (req, res) => {
  const result = await query(
    "SELECT id, name, type, cost, attack, health, effect_json FROM cards ORDER BY cost, name"
  );
  res.json({ cards: result.rows });
});

// GET one card by id
cardRoutes.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid card id" });

  const result = await query(
    "SELECT id, name, type, cost, attack, health, effect_json FROM cards WHERE id=$1",
    [id]
  );

  if (result.rowCount === 0) return res.status(404).json({ error: "Card not found" });
  res.json(result.rows[0]); // single card object
});
