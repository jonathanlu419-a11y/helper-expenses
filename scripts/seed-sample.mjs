// Seeds realistic sample data: ~3 weeks of expenses across all 7 categories,
// a few cash transactions, and sensible opening_balance / first_activity_date.
// Idempotent: clears expenses + cash first, then inserts.
//
// Usage: npm run seed

import { readFileSync } from "node:fs";
import pg from "pg";
import { formatInTimeZone } from "date-fns-tz";

const { Client } = pg;
const APP_TZ = "Asia/Hong_Kong";

function loadEnvFile(name) {
  try {
    const txt = readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!(m[1] in process.env)) process.env[m[1]] = val;
    }
  } catch {
    /* optional */
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("✗ DATABASE_URL is not set.");
  process.exit(1);
}
function ssl(cs) {
  if (/sslmode=disable/.test(cs)) return false;
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(cs)) return false;
  return { rejectUnauthorized: false };
}

// HK "today" and a helper to make past dates.
const hkToday = formatInTimeZone(new Date(), APP_TZ, "yyyy-MM-dd");
function daysAgo(n) {
  const [y, m, d] = hkToday.split("-").map(Number);
  const dt = new Date(y, m - 1, d - n, 12);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

// [daysAgo, category, amount]
const expenseSpec = [
  [0, "vegetables", 18.5], [0, "meat", 42.0], [0, "transport", 6.0],
  [1, "fruits", 24.0], [1, "rice_noodles", 35.0],
  [2, "vegetables", 12.3], [2, "transport", 8.5], [2, "other_food", 15.0],
  [3, "meat", 55.0], [3, "household_cleaning", 28.0],
  [4, "vegetables", 9.8], [4, "fruits", 16.5],
  [5, "transport", 4.5], [5, "other_food", 22.0],
  [6, "meat", 38.0], [6, "vegetables", 14.2], [6, "rice_noodles", 12.0],
  [8, "household_cleaning", 45.0], [8, "transport", 6.0],
  [9, "fruits", 19.9], [9, "vegetables", 11.0],
  [10, "meat", 48.5], [10, "other_food", 8.75],
  [12, "vegetables", 13.6], [12, "transport", 7.0],
  [13, "rice_noodles", 28.0], [13, "fruits", 21.0],
  [15, "meat", 40.0], [15, "household_cleaning", 33.5], [15, "vegetables", 10.4],
  [17, "transport", 5.5], [17, "other_food", 18.0],
  [18, "vegetables", 15.75], [18, "fruits", 17.25],
  [20, "meat", 52.0], [20, "rice_noodles", 30.0], [20, "transport", 9.0],
];

// [daysAgo, type, amount, note] — Indonesian so the helper's page has no English
const cashSpec = [
  [20, "given", 800.0, "Modal awal"],
  [10, "given", 500.0, "Tambahan mingguan"],
  [4, "collected", 200.0, "Sisa dikembalikan"],
];

const OPENING_BALANCE = 500.0;
const FIRST_ACTIVITY = daysAgo(21);

const client = new Client({ connectionString, ssl: ssl(connectionString) });

try {
  await client.connect();
  await client.query("DELETE FROM expenses");
  await client.query("DELETE FROM cash_transactions");

  for (const [d, category, amount] of expenseSpec) {
    await client.query(
      `INSERT INTO expenses (category, amount, entry_date) VALUES ($1,$2,$3::date)`,
      [category, amount, daysAgo(d)]
    );
  }
  for (const [d, type, amount, note] of cashSpec) {
    await client.query(
      `INSERT INTO cash_transactions (type, amount, entry_date, note) VALUES ($1,$2,$3::date,$4)`,
      [type, amount, daysAgo(d), note]
    );
  }
  await client.query(
    `UPDATE settings SET opening_balance = $1, first_activity_date = $2::date, updated_at = now() WHERE id = 1`,
    [OPENING_BALANCE, FIRST_ACTIVITY]
  );

  // Report the expected balance so it can be sanity-checked against the UI.
  const spent = expenseSpec.reduce((s, e) => s + e[2], 0);
  const given = cashSpec.filter((c) => c[1] === "given").reduce((s, c) => s + c[2], 0);
  const collected = cashSpec.filter((c) => c[1] === "collected").reduce((s, c) => s + c[2], 0);
  const balance = OPENING_BALANCE + given - collected - spent;

  console.log(`Seeded ${expenseSpec.length} expenses and ${cashSpec.length} cash transactions.`);
  console.log(`opening=${OPENING_BALANCE.toFixed(2)} given=${given.toFixed(2)} collected=${collected.toFixed(2)} spent=${spent.toFixed(2)}`);
  console.log(`Expected balance = ${balance.toFixed(2)}`);
  console.log(`first_activity_date = ${FIRST_ACTIVITY}`);
} catch (err) {
  console.error("✗ Seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
