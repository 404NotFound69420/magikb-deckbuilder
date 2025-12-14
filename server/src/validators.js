import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3).max(24),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const createDeckSchema = z.object({
  name: z.string().min(1).max(50),
});

export const updateDeckCardsSchema = z.object({
  cards: z.array(z.object({
    cardId: z.number().int().positive(),
    qty: z.number().int().min(0).max(30),
  })),
});
