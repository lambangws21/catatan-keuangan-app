import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import admin from "@/lib/firebase/admin";

interface ExcelRow {
  NO: number | null;
  "No Stok": number | null;
  Deskripsi: string | null;
  Batch: string | null;
  Qty: number | null;
  "Total Qty": number | null;
  TERPAKAI: number | null;
  REFILL: number | null;
  "KET.": string | null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File tidak valid" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const data = XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
      defval: null,
    });

    const db = admin.firestore();
    let counter = 0;

    for (const row of data) {
        const qtyValue =
          typeof row.Qty === "number" && !isNaN(row.Qty)
            ? row.Qty
            : null; // ✅ UBAH undefined → null
      
        await db.collection("implantStocks").add({
          no: row.NO ?? null,
          noStok: row["No Stok"] ?? null,
          deskripsi: row.Deskripsi ?? null,
          batch: row.Batch ?? null,
          qty: qtyValue,
          totalQty: row["Total Qty"] ?? null,
          terpakai: row.TERPAKAI ?? null,
          refill: row.REFILL ?? null,
          keterangan: row["KET."] ?? null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      
        counter++;
      }
      
      

    return NextResponse.json({
      status: "success",
      total: counter,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json(
      { status: "error", message: "Gagal upload ke Firestore" },
      { status: 500 }
    );
  }
}
