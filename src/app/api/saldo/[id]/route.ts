import { NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';


interface SaldoData {
  tanggal: string;
  keterangan: string;
  jumlah: number;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ sesuai dokumentasi: params harus di-await
    const { id } = await context.params;
    const body: SaldoData = await request.json();

    // Validasi sederhana
    if (!body || typeof body.jumlah !== "number") {
      return NextResponse.json(
        { error: "Field 'jumlah' wajib berupa number." },
        { status: 400 }
      );
    }

    // --- Simulasi update saldo ---
    const updatedSaldo = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { message: "Saldo berhasil diperbarui", data: updatedSaldo },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/saldo/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui saldo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; // ✅ params harus di-await
    const db = admin.firestore();
    await db.collection("saldo").doc(id).delete();

    return NextResponse.json(
      { message: "Saldo berhasil dihapus", id },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/saldo/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus saldo" },
      { status: 500 }
    );
  }
}
