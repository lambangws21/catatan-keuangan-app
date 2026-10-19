import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import admin from "@/lib/firebase/admin";
import { normalizeStoredKlaimStatus } from "@/lib/transactions";

type ExcelTransactionRow = {
  DATE?: unknown;
  "JENIS BIAYA"?: unknown;
  KETERANGAN?: unknown;
  JUMLAH?: unknown;
  "KLAIM OLEH"?: unknown;
};

type ParsedTransaction = {
  tanggal: string;
  jenisBiaya: string;
  keterangan: string;
  jumlah: number;
  klaim: string;
  sumberBiaya: "deposit";
  importKey: string;
};

const normalizeText = (value: unknown) => String(value ?? "").trim();

const toIsoDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }

  const text = normalizeText(value).replace(/\/+/g, "/");
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return null;

  let first = Number(match[1]);
  let second = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += year < 70 ? 2000 : 1900;

  if (first > 12) {
    [first, second] = [second, first];
  }

  const candidate = new Date(Date.UTC(year, first - 1, second));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== first - 1 ||
    candidate.getUTCDate() !== second
  ) {
    return null;
  }

  return candidate.toISOString().split("T")[0];
};

const toAmount = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const digits = normalizeText(value).replace(/[^\d-]/g, "");
  const amount = Number(digits);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const buildImportKey = (tx: Omit<ParsedTransaction, "importKey">) =>
  [
    "excel-transaction-v1",
    tx.tanggal,
    tx.jenisBiaya.toLowerCase(),
    tx.keterangan.toLowerCase(),
    tx.jumlah,
    tx.klaim.toLowerCase(),
    tx.sumberBiaya,
  ].join("|");

const parseRows = (rows: ExcelTransactionRow[]) => {
  const transactions: ParsedTransaction[] = [];
  const errors: Array<{ row: number; reason: string }> = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const tanggal = toIsoDate(row.DATE);
    const jenisBiaya = normalizeText(row["JENIS BIAYA"]);
    const keterangan = normalizeText(row.KETERANGAN);
    const jumlah = toAmount(row.JUMLAH);
    const klaim = normalizeText(row["KLAIM OLEH"]) || "";

    if (!tanggal) {
      errors.push({ row: rowNumber, reason: "Tanggal tidak valid" });
      return;
    }
    if (!jenisBiaya) {
      errors.push({ row: rowNumber, reason: "Jenis biaya kosong" });
      return;
    }
    if (!keterangan) {
      errors.push({ row: rowNumber, reason: "Keterangan kosong" });
      return;
    }
    if (!jumlah) {
      errors.push({ row: rowNumber, reason: "Jumlah tidak valid" });
      return;
    }

    const transaction = {
      tanggal,
      jenisBiaya,
      keterangan,
      jumlah,
      klaim,
      sumberBiaya: "deposit" as const,
    };

    transactions.push({
      ...transaction,
      importKey: buildImportKey(transaction),
    });
  });

  return { transactions, errors };
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File Excel tidak valid" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      return NextResponse.json({ error: "Sheet Excel tidak ditemukan" }, { status: 400 });
    }

    const rows = XLSX.utils.sheet_to_json<ExcelTransactionRow>(sheet, {
      defval: null,
      raw: false,
    });
    const { transactions, errors } = parseRows(rows);

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada transaksi valid untuk di-import", errors },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const batch = db.batch();
    let inserted = 0;
    let skipped = 0;

    for (const tx of transactions) {
      const duplicate = await db
        .collection("transactions")
        .where("importKey", "==", tx.importKey)
        .limit(1)
        .get();

      if (!duplicate.empty) {
        skipped++;
        continue;
      }

      const docRef = db.collection("transactions").doc();
      const klaimStatus = normalizeStoredKlaimStatus(tx);

      batch.set(docRef, {
        tanggal: new Date(`${tx.tanggal}T00:00:00.000Z`),
        jenisBiaya: tx.jenisBiaya,
        keterangan: tx.keterangan,
        jumlah: tx.jumlah,
        klaim: tx.klaim,
        klaimStatus,
        sumberBiaya: tx.sumberBiaya,
        fileUrls: [],
        fileUrl: null,
        importKey: tx.importKey,
        importSource: "excel",
        createdAt: new Date(),
      });
      inserted++;
    }

    if (inserted > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      status: "success",
      totalRows: rows.length,
      inserted,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("TRANSACTION EXCEL IMPORT ERROR:", error);
    return NextResponse.json(
      { error: "Gagal import Excel transaksi" },
      { status: 500 }
    );
  }
}
