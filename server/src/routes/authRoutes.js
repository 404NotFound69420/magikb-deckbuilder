import express from "express";
import bcrypt from "bcrypt";
import { query } from "../db.js";
import { signJwt } from "../auth.js";
import { registerSchema, loginSchema } from "../validators.js";

export const authRoutes = express.Router();

authRoutes.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const { username, email, password } = parsed.data;
  const password_hash = await bcrypt.hash(password, 12); // salted hash

  try {
    const result = await query(
      "INSERT INTO users(username,email,password_hash) VALUES ($1,$2,$3) RETURNING id, username, email",
      [username, email, password_hash]
    );
    const user = result.rows[0];
    const token = signJwt({ id: user.id, username: user.username });
    res.json({ user, token });
  } catch (e) {
    const msg = (""+e).includes("unique") ? "Username or email already used" : "Register failed";
    res.status(400).json({ error: msg });
  }
});

authRoutes.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const { email, password } = parsed.data;
  const result = await query("SELECT id, username, email, password_hash FROM users WHERE email=$1", [email]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signJwt({ id: user.id, username: user.username });
  res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
});
