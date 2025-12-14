import "dotenv/config";
import fs from "fs";
import path from "path";
import { pool } from "../db.js";

async function runFile(rel) {
  const p = path.join(process.cwd(), rel);
  const sql = fs.readFileSync(p, "utf-8");
  await pool.query(sql);
}

(async () => {
  try {
    await runFile("sql/schema.sql");
    await runFile("sql/seed_cards.sql");
    console.log("DB reset complete.");
  } catch (e) {
    console.error("DB reset failed:", e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
