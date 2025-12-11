export interface PriceItem {
    no: number;
    system: string;
    product: string;
    type: string;
    qty: number;
    hargaNett: number;
    hargaNettPPN: number;
    rumahSakit: string;
  }
  import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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

    let counter = 0;

    for (const row of data) {
        if (typeof row.Qty !== "number") continue; // ✅ SKIP BARIS RUSAK
      
        await addDoc(collection(db, "implantStocks"), {
          no: row.NO ?? null,
          noStok: row["No Stok"] ?? null,
          deskripsi: row.Deskripsi ?? null,
          batch: row.Batch ?? null,
          qty: row.Qty, // ✅ PASTI NUMBER
          totalQty: row["Total Qty"] ?? null,
          terpakai: row.TERPAKAI ?? null,
          refill: row.REFILL ?? null,
          keterangan: row["KET."] ?? null,
          createdAt: serverTimestamp(),
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
