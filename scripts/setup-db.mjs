// Applies db/schema.sql to the database in DATABASE_URL (Render Postgres).
// Usage: npm run db:setup
//
// Loads env from .env.local then .env (without overriding real env vars),
// so it works both locally and in CI without extra dependencies.

import { readFileSync } from "node:fs";
import pg from "pg";

const { Client } = pg;

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

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error(
    "✗ DATABASE_URL is not set. Copy .env.example to .env.local and fill it in."
  );
  process.exit(1);
}

function sslConfig(cs) {
  if (/sslmode=disable/.test(cs)) return false;
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(cs)) return false;
  return { rejectUnauthorized: false };
}

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const statements = schema
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

const client = new Client({ connectionString, ssl: sslConfig(connectionString) });

try {
  await client.connect();
  for (const stmt of statements) {
    await client.query(stmt);
    const firstMeaningful =
      stmt.split("\n").find((l) => l.trim() && !l.trim().startsWith("--")) ?? "";
    console.log("✓", firstMeaningful.trim().slice(0, 70));
  }
  console.log("\nDatabase schema applied successfully.");
} catch (err) {
  console.error("✗ Failed to apply schema:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
