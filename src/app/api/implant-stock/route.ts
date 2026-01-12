import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";
import {
  ImplantStockItem,
  ImplantedFirestoreStock,
} from "@/types/implant-stock";

const toIsoString = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return "";
};

export async function GET() {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection("implantStocks").get();

    const data: ImplantStockItem[] = [];

    snapshot.docs.forEach((doc) => {
      const raw = doc.data() as ImplantedFirestoreStock;

      // ✅ Skip data yang di soft delete
      if (raw.isDeleted === true) return;

      data.push({
        id: doc.id,

        // ✅ WAJIB ADA
        no: Number(raw.no ?? 0),

        stockNo: String(raw.noStok ?? ""),
        description: String(raw.deskripsi ?? ""),
        batch: String(raw.batch ?? ""),
        qty: Number(raw.qty ?? 0),
        refill: Number(raw.refill ?? 0),
        used: Number(raw.terpakai ?? 0),
        totalQty: Number(raw.totalQty ?? 0),
        note: String(raw.keterangan ?? ""),
        createdAt: toIsoString(raw.createdAt),
        updatedAt: toIsoString(raw.updatedAt),
      });
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET implantStocks error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
