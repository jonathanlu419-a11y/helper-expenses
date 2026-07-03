import type { CashTransaction, Expense } from "./types";

// THE balance formula — one source of truth. Do not re-derive elsewhere.
//
//   balance = opening_balance
//           + SUM(cash where type = 'given')      // Mum → helper
//           - SUM(cash where type = 'collected')  // helper → Mum
//           - SUM(expenses)                        // spent out of the float
//
// A POSITIVE balance means the helper is currently holding Mum's money
// (owed back as future expenses or returned cash).

export function computeBalance(
  openingBalance: number,
  cash: CashTransaction[],
  expenses: Expense[]
): number {
  let bal = openingBalance;
  for (const c of cash) {
    if (c.type === "given") bal += c.amount;
    else bal -= c.amount; // 'collected'
  }
  for (const e of expenses) bal -= e.amount;
  return Math.round(bal * 100) / 100;
}

/** Sum of expense amounts (helper for day subtotals etc.). */
export function sumExpenses(expenses: Expense[]): number {
  return Math.round(expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100;
}
