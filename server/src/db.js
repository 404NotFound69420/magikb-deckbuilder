import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },

  // Optional but helps stability with poolers:
  keepAlive: true,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

// IMPORTANT: prevent server crash when Supabase drops a connection
pool.on("error", (err) => {
  console.error("Postgres pool error (non-fatal):", err.message);
  // Do NOT throw — let pg reconnect on next query
});

export function query(text, params) {
  return pool.query(text, params);
}

export { pool };
