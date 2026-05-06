import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

const KLAIM_STATUS = ["Belum diajukan", "Diajukan", "Dibayar"] as const;
type KlaimStatus = (typeof KLAIM_STATUS)[number];

const normalizeKlaimStatus = (value: unknown): KlaimStatus => {
  if (typeof value !== "string") return "Belum diajukan";
  const normalized = value.trim();
  if (KLAIM_STATUS.includes(normalized as KlaimStatus)) {
    return normalized as KlaimStatus;
  }
  return "Belum diajukan";
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

const extractStoragePath = (downloadUrl?: string) => {
  if (!downloadUrl) return null;
  const match = downloadUrl.match(/\/o\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

// 🔹 Helper ambil ID dari params
async function getId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return id;
}

// ----------------- GET (Ambil transaksi by id) -----------------
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await getId(context);
    const db = admin.firestore();
    const doc = await db.collection("transactions").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    const data = doc.data();
    const fileUrls = normalizeFileUrls(data?.fileUrls, data?.fileUrl);
    return NextResponse.json(
      {
        id,
        ...data,
        tanggal: data?.tanggal?.toDate
          ? data.tanggal.toDate().toISOString().split("T")[0]
          : data?.tanggal,
        fileUrls,
        fileUrl: fileUrls[0] || null,
        klaimStatus: normalizeKlaimStatus(data?.klaimStatus),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil transaksi" },
      { status: 500 }
    );
  }
}

// ----------------- PUT (Update transaksi) -----------------
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await getId(context);
    const rawBody = await request.json();
    const normalizedFileUrls = normalizeFileUrls(rawBody.fileUrls, rawBody.fileUrl);
    const normalizedKlaimStatus = normalizeKlaimStatus(rawBody.klaimStatus);

    // auto-convert jumlah ke number
    const body = {
      tanggal: rawBody.tanggal,
      jenisBiaya: rawBody.jenisBiaya,
      keterangan: rawBody.keterangan,
      jumlah: Number(rawBody.jumlah),
      klaim: typeof rawBody.klaim === "string" ? rawBody.klaim : "",
      klaimStatus: normalizedKlaimStatus,
      fileUrls: normalizedFileUrls,
      fileUrl: normalizedFileUrls[0] || null,
      sumberBiaya: rawBody.sumberBiaya || null,
    };

    // Validasi field
    if (!body.tanggal || !body.jenisBiaya || !body.keterangan || isNaN(body.jumlah)) {
      return NextResponse.json(
        { error: "Field wajib diisi dengan benar (tanggal, jenisBiaya, keterangan, jumlah)" },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const docRef = db.collection("transactions").doc(id);

    // cek dokumen ada
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    // update data
    await docRef.update({
      tanggal: new Date(body.tanggal),
      jenisBiaya: body.jenisBiaya,
      keterangan: body.keterangan,
      jumlah: body.jumlah,
      klaim: body.klaim,
      klaimStatus: body.klaimStatus,
      fileUrls: body.fileUrls,
      fileUrl: body.fileUrl,
      sumberBiaya: body.sumberBiaya,
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { message: "Transaksi berhasil diperbarui", id },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui transaksi" },
      { status: 500 }
    );
  }
}

// ----------------- DELETE (Hapus transaksi) -----------------
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await getId(context);
    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    const docRef = db.collection("transactions").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    const data = docSnap.data();
    const fileUrls = normalizeFileUrls(data?.fileUrls, data?.fileUrl);
    await Promise.all(
      fileUrls.map(async (url) => {
        const storagePath = extractStoragePath(url);
        if (!storagePath) return;
        await bucket.file(storagePath).delete().catch(() => undefined);
      })
    );

    await docRef.delete();

    return NextResponse.json(
      { message: "Transaksi berhasil dihapus", id },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus transaksi" },
      { status: 500 }
    );
  }
}
