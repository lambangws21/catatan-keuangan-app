import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

const extractStoragePath = (downloadUrl?: string) => {
  if (!downloadUrl) return null;
  const match = downloadUrl.match(/\/o\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const normalizeFileUrls = (fileUrls: unknown, fileUrl?: unknown) => {
  const urls = Array.isArray(fileUrls)
    ? fileUrls.filter((url): url is string => typeof url === "string" && url.trim() !== "")
    : [];

  if (typeof fileUrl === "string" && fileUrl.trim() !== "" && !urls.includes(fileUrl)) {
    urls.unshift(fileUrl);
  }

  return Array.from(new Set(urls));
};

export async function POST(request: Request) {
  try {
    const { id, photoUrl } = await request.json();
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
    const bucket = admin.storage().bucket();
    const existingUrls = normalizeFileUrls(data?.fileUrls, data?.fileUrl);
    if (existingUrls.length === 0) {
      return NextResponse.json({ message: "Foto transaksi sudah kosong", remaining: [] });
    }

    const targets =
      typeof photoUrl === "string" && photoUrl.trim() !== ""
        ? existingUrls.filter((url) => url === photoUrl)
        : existingUrls;

    if (targets.length === 0 && typeof photoUrl === "string") {
      return NextResponse.json(
        { error: "Foto yang dipilih tidak ditemukan di transaksi ini" },
        { status: 404 }
      );
    }

    await Promise.all(
      targets.map(async (url) => {
        const storagePath = extractStoragePath(url);
        if (!storagePath) return;
        await bucket.file(storagePath).delete().catch(() => undefined);
      })
    );

    const remaining =
      typeof photoUrl === "string" && photoUrl.trim() !== ""
        ? existingUrls.filter((url) => url !== photoUrl)
        : [];

    await docRef.update({
      fileUrls: remaining,
      fileUrl: remaining[0] || "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      message: targets.length > 1 ? "Semua foto transaksi dihapus" : "Foto transaksi dihapus",
      remaining,
    });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json({ error: "Gagal menghapus foto" }, { status: 500 });
  }
}
