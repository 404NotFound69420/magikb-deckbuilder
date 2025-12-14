import express from "express";
import { query } from "../db.js";

export const cardRoutes = express.Router();

cardRoutes.get("/", async (req, res) => {
  const result = await query("SELECT id, name, type, cost, attack, health, effect_json FROM cards ORDER BY cost, name");
  res.json({ cards: result.rows });
});
