# Deploy guide (Render + Supabase + Vercel)

## 1) Supabase (DB)
1. Create a project
2. Copy the **Connection string** (URI)
3. In Supabase SQL editor, run the schema:
   - `server/sql/schema.sql`
   - then `server/sql/seed_cards.sql`

## 2) Render (Server)
1. Create new Web Service from your Git repo
2. Root directory: `server`
3. Build command: `npm install`
4. Start command: `npm start`
5. Environment variables:
   - `DATABASE_URL` = your Supabase connection string
   - `JWT_SECRET` = a long random string
   - `CLIENT_ORIGIN` = your Vercel URL (or http://localhost:5173 locally)

Render will expose a public URL like: `https://your-service.onrender.com`

## 3) Vercel (Client)
1. Import repo into Vercel
2. Set Root directory: `client`
3. Add env var:
   - `VITE_API_URL` = Render server URL
4. Deploy
