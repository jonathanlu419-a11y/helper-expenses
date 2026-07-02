// Applies db/schema.sql to the database in POSTGRES_URL / DATABASE_URL.
// Usage: npm run db:setup
//
// Loads env from .env.local then .env (without overriding real env vars),
// so it works both locally and in CI without extra dependencies.

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadEnvFile(name) {
  try {
    const txt = readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* file optional */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "✗ POSTGRES_URL is not set. Copy .env.example to .env.local and fill it in."
  );
  process.exit(1);
}

const sql = neon(connectionString);

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const statements = schema
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

try {
  for (const stmt of statements) {
    await sql.query(stmt);
    const firstMeaningful =
      stmt.split("\n").find((l) => l.trim() && !l.trim().startsWith("--")) ?? "";
    console.log("✓", firstMeaningful.trim().slice(0, 70));
  }
  console.log("\nDatabase schema applied successfully.");
  process.exit(0);
} catch (err) {
  console.error("✗ Failed to apply schema:", err.message);
  process.exit(1);
}
