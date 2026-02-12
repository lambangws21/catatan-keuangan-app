export const MEALS_TYPE = "Meals Metting";

export type MealsPaymentSource = "deposit" | "mandiri" | "kantor";

export type TransactionLike = {
  jenisBiaya?: string | null;
  sumberBiaya?: string | null;
  jumlah?: number | string | null;
  tanggal?: string | null;
};

export function normalizeMealsPaymentSource(
  raw: unknown
): MealsPaymentSource | null {
  if (raw === "deposit" || raw === "mandiri" || raw === "kantor") return raw;
  if (typeof raw === "string") {
    const lower = raw.toLowerCase();
    if (lower === "personal" || lower === "pribadi") return "mandiri";
  }
  return null;
}

export function isReimbursement(tx: TransactionLike): boolean {
  return tx.jenisBiaya === MEALS_TYPE && normalizeMealsPaymentSource(tx.sumberBiaya) === "mandiri";
}

export function reimbursementTotal(transactions: TransactionLike[]): number {
  return transactions
    .filter((tx) => isReimbursement(tx))
    .reduce((sum, tx) => sum + Number(tx.jumlah || 0), 0);
}

export function isCountedAsExpense(tx: TransactionLike): boolean {
  if (tx.jenisBiaya !== MEALS_TYPE) return true;
  const src = normalizeMealsPaymentSource(tx.sumberBiaya) ?? "deposit";
  return src === "deposit";
}

export function sortByTanggalAsc<T extends { tanggal: string }>(a: T, b: T) {
  return a.tanggal.localeCompare(b.tanggal);
}
