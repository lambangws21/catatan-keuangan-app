import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";
import { ImplantStockItem, ImplantedFirestoreStock } from "@/types/implant-stock";

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

    const data: ImplantStockItem[] = snapshot.docs.map((doc) => {
      const raw = doc.data() as ImplantedFirestoreStock;

      return {
        id: doc.id,

        // ✅ SESUAI DENGAN FIELD FIRESTORE
        no: Number(raw.no ?? 0),
        stockNo: String(raw.noStok ?? ""),          // ✅ FIX
        description: String(raw.deskripsi ?? ""),  // ✅ FIX
        batch: String(raw.batch ?? ""),
        qty: Number(raw.qty ?? 0),
        totalQty: Number(raw.totalQty ?? 0),
        used: Number(raw.terpakai ?? 0),           // ✅ FIX
        refill: Number(raw.refill ?? 0),
        note: String(raw.keterangan ?? ""),        // ✅ FIX
        createdAt: toIsoString(raw.createdAt),
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET implantStocks error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
