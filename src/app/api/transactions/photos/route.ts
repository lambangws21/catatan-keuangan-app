import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

const extractStoragePath = (downloadUrl?: string) => {
  if (!downloadUrl) return null;
  const match = downloadUrl.match(/\/o\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

export async function POST(request: Request) {
  try {
    const { month, year } = await request.json();
    if (typeof month !== "number" || typeof year !== "number") {
      return NextResponse.json({ error: "Bulan dan tahun wajib diisi" }, { status: 400 });
    }

    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const snapshot = await db
      .collection("transactions")
      .where("tanggal", ">=", startDate)
      .where("tanggal", "<=", endDate)
      .get();

    const batch = db.batch();
    let deletedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data?.fileUrl) {
        const storagePath = extractStoragePath(data.fileUrl as string);
        if (storagePath) {
          await bucket.file(storagePath).delete().catch(() => undefined);
        }
        batch.update(doc.ref, {
          fileUrl: "",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        deletedCount += 1;
      }
    }

    if (deletedCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({ deletedCount });
  } catch (error) {
    console.error("Error deleting photo batch:", error);
    return NextResponse.json({ error: "Gagal menghapus foto" }, { status: 500 });
  }
}
