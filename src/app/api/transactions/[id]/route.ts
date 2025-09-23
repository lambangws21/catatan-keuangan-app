import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

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
    return NextResponse.json(
      {
        id,
        ...data,
        tanggal: data?.tanggal?.toDate
          ? data.tanggal.toDate().toISOString().split("T")[0]
          : data?.tanggal,
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

    // auto-convert jumlah ke number
    const body = {
      tanggal: rawBody.tanggal,
      jenisBiaya: rawBody.jenisBiaya,
      keterangan: rawBody.keterangan,
      jumlah: Number(rawBody.jumlah),
      klaim: rawBody.klaim || null,
      fileUrl: rawBody.fileUrl || null,
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
      fileUrl: body.fileUrl,
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

    const docRef = db.collection("transactions").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

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
