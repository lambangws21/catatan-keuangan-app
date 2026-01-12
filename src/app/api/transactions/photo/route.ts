import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

const extractStoragePath = (downloadUrl?: string) => {
  if (!downloadUrl) return null;
  const match = downloadUrl.match(/\/o\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "ID transaksi tidak ditemukan" }, { status: 400 });
    }

    const db = admin.firestore();
    const docRef = db.collection("transactions").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Transaksi tidak ada" }, { status: 404 });
    }

    const data = doc.data();
    const fileUrl = data?.fileUrl;
    if (fileUrl) {
      const bucket = admin.storage().bucket();
      const storagePath = extractStoragePath(fileUrl as string);
      if (storagePath) {
        await bucket.file(storagePath).delete().catch(() => undefined);
      }
    }

    await docRef.update({
      fileUrl: "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ message: "Foto transaksi dihapus" });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json({ error: "Gagal menghapus foto" }, { status: 500 });
  }
}
