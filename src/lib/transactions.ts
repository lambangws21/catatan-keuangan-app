export const MEALS_TYPE = "Meals Metting";

export type MealsPaymentSource = "deposit" | "mandiri" | "kantor";
export type KlaimStatus = "Belum diajukan" | "Diajukan" | "Dibayar";
export type KlaimDisplayStatus = KlaimStatus | "Tidak perlu klaim";

export type TransactionLike = {
  jenisBiaya?: string | null;
  sumberBiaya?: string | null;
  keterangan?: string | null;
  jumlah?: number | string | null;
  tanggal?: string | null;
  klaim?: string | null;
  klaimStatus?: string | null;
};

export type SaldoLike = {
  keterangan?: string | null;
  jumlah?: number | string | null;
};

export type CompanyGroupKey = "ZB" | "NM" | "OTHER";

export type GroupReimbursementSummary = Record<
  CompanyGroupKey,
  {
    saldoTotal: number;
    expenseTotal: number;
    reimbursementTotal: number;
  }
>;

export const KLAIM_STATUS_OPTIONS: KlaimStatus[] = [
  "Belum diajukan",
  "Diajukan",
  "Dibayar",
];

export const KLAIM_FILTER_STATUS_OPTIONS: KlaimDisplayStatus[] = [
  "Belum diajukan",
  "Diajukan",
  "Dibayar",
  "Tidak perlu klaim",
];

export function normalizeKlaimStatus(value?: string | null): KlaimStatus {
  if (!value) return "Belum diajukan";
  const normalized = value.trim();
  if (KLAIM_STATUS_OPTIONS.includes(normalized as KlaimStatus)) {
    return normalized as KlaimStatus;
  }
  return "Belum diajukan";
}

export function normalizeMealsPaymentSource(
  raw: unknown
): MealsPaymentSource | null {
  if (raw === "deposit" || raw === "mandiri" || raw === "kantor") return raw;
  if (typeof raw === "string") {
    const lower = raw.toLowerCase();
    if (lower === "deposit" || lower === "kas" || lower === "saldo") return "deposit";
    if (lower === "personal" || lower === "pribadi") return "mandiri";
    if (lower === "mandiri") return "mandiri";
    if (lower === "kantor" || lower === "office") return "kantor";
  }
  return null;
}

export function normalizeTransactionPaymentSource(
  tx: TransactionLike
): MealsPaymentSource | null {
  const source = normalizeMealsPaymentSource(tx.sumberBiaya);
  if (source) return source;
  if (tx.jenisBiaya === MEALS_TYPE) return "deposit";
  return null;
}

export function hasKlaimName(tx: TransactionLike): boolean {
  const value = String(tx.klaim ?? "").trim().toLowerCase();
  if (!value) return false;
  return !["tidak", "no", "none", "n/a", "na", "-"].includes(value);
}

export function isReimbursement(tx: TransactionLike): boolean {
  return normalizeTransactionPaymentSource(tx) === "mandiri" && hasKlaimName(tx);
}

export function isPendingReimbursement(tx: TransactionLike): boolean {
  return isReimbursement(tx) && normalizeKlaimStatus(tx.klaimStatus) !== "Dibayar";
}

export function isPaidReimbursement(tx: TransactionLike): boolean {
  return isReimbursement(tx) && normalizeKlaimStatus(tx.klaimStatus) === "Dibayar";
}

export function getKlaimDisplayStatus(tx: TransactionLike): KlaimDisplayStatus {
  if (!isReimbursement(tx)) return "Tidak perlu klaim";
  return normalizeKlaimStatus(tx.klaimStatus);
}

export function normalizeStoredKlaimStatus(tx: TransactionLike): KlaimStatus {
  if (!isReimbursement(tx)) return "Dibayar";
  return normalizeKlaimStatus(tx.klaimStatus);
}

export function canSubmitKlaim(tx: TransactionLike): boolean {
  return isReimbursement(tx) && normalizeKlaimStatus(tx.klaimStatus) === "Belum diajukan";
}

export function canMarkKlaimPaid(tx: TransactionLike): boolean {
  return isReimbursement(tx) && normalizeKlaimStatus(tx.klaimStatus) === "Diajukan";
}

export function isCountedAsExpense(tx: TransactionLike): boolean {
  return normalizeTransactionPaymentSource(tx) !== "mandiri";
}

export function reimbursementTotal(transactions: TransactionLike[]): number {
  return transactions
    .filter((tx) => isPendingReimbursement(tx))
    .reduce((sum, tx) => sum + Number(tx.jumlah || 0), 0);
}

function detectCompanyGroupFromText(text: string): CompanyGroupKey {
  const normalized = text.toLowerCase();
  if (/\bzb\b/.test(normalized) || /\bzimmer\b/.test(normalized) || /\bbiomet\b/.test(normalized)) {
    return "ZB";
  }
  if (/\bnm\b/.test(normalized) || /\bnormed\b/.test(normalized)) {
    return "NM";
  }
  return "OTHER";
}

function detectGroup(input: TransactionLike | SaldoLike): CompanyGroupKey {
  return detectCompanyGroupFromText(
    [
      "tanggal" in input ? input.tanggal : "",
      input.keterangan,
      "jenisBiaya" in input ? input.jenisBiaya : "",
      "klaim" in input ? input.klaim : "",
      "sumberBiaya" in input ? input.sumberBiaya : "",
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function groupReimbursementSummary(
  saldoData: SaldoLike[],
  transactions: TransactionLike[]
): GroupReimbursementSummary {
  const summary: GroupReimbursementSummary = {
    ZB: { saldoTotal: 0, expenseTotal: 0, reimbursementTotal: 0 },
    NM: { saldoTotal: 0, expenseTotal: 0, reimbursementTotal: 0 },
    OTHER: { saldoTotal: 0, expenseTotal: 0, reimbursementTotal: 0 },
  };

  saldoData.forEach((item) => {
    summary[detectGroup(item)].saldoTotal += Number(item.jumlah || 0);
  });

  transactions
    .filter((tx) => isCountedAsExpense(tx))
    .forEach((tx) => {
      summary[detectGroup(tx)].expenseTotal += Number(tx.jumlah || 0);
    });

  (["ZB", "NM", "OTHER"] as const).forEach((group) => {
    const deficit = summary[group].expenseTotal - summary[group].saldoTotal;
    summary[group].reimbursementTotal = Math.max(0, deficit);
  });

  return summary;
}

export function reimbursementTotalFromGroupBalance(
  saldoData: SaldoLike[],
  transactions: TransactionLike[]
): number {
  const summary = groupReimbursementSummary(saldoData, transactions);
  return summary.ZB.reimbursementTotal + summary.NM.reimbursementTotal;
}

export function sortByTanggalAsc<T extends { tanggal: string }>(a: T, b: T) {
  return a.tanggal.localeCompare(b.tanggal);
}
