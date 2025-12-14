# Arcane Deckbuilder (Final Project Starter)

This is a full-stack starter for a **deck builder + simple turn-based duel** web app.

It satisfies the project requirements:
- Database + server + front-end
- User signup/login with **hashed + salted passwords** (bcrypt)
- Hosted-ready configuration
- Optional "A-grade" real-time match updates using Socket.IO

## Stack
- Server: Node.js + Express + PostgreSQL + Socket.IO
- Client: React (Vite)

---

## Quick Start (Local)

### 1) Create Postgres DB
Create a Postgres database (local or Supabase) and copy the connection string.

Example local:
- DB name: `arcane`
- user: `postgres`
- password: `postgres`

### 2) Server
```bash
cd server
cp .env.example .env
# set DATABASE_URL + JWT_SECRET in .env
npm install
npm run db:reset
npm run dev
```

### 3) Client
```bash
cd client
cp .env.example .env
# set VITE_API_URL=http://localhost:5174
npm install
npm run dev
```

Open the client URL shown by Vite.

---

## Deploy (fast path)
- Server: Render (Web Service)
- DB: Supabase (Postgres)
- Client: Vercel

See `DEPLOY.md`.

---

## Demo checklist
1) Register 2 users
2) Build a 30-card deck
3) Create lobby with a match code
4) Join match from second user
5) Play a few turns live
