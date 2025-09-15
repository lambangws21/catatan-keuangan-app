import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

// Definisi tipe params agar tidak pakai "any"
interface Params {
  params: {
    id: string;
  };
}

// Handler untuk PUT (update saldo)
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = params;
    const body = await request.json();
    const { tanggal, keterangan, jumlah } = body;

    if (!tanggal || !keterangan || jumlah === undefined) {
      return NextResponse.json(
        { error: "Field untuk update tidak boleh kosong" },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const docRef = db.collection("saldo").doc(id);

    await docRef.update({
      tanggal: new Date(tanggal),
      keterangan,
      jumlah: Number(jumlah),
    });

    return NextResponse.json(
      { id, message: "Saldo berhasil diperbarui" },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error saat mengupdate saldo:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Handler untuk DELETE (hapus saldo)
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = params;
    const db = admin.firestore();
    await db.collection("saldo").doc(id).delete();

    return NextResponse.json(
      { id, message: "Saldo berhasil dihapus" },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error saat menghapus saldo:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
