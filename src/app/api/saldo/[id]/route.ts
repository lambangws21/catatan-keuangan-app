import { NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

// Handler untuk PUT (Mengedit saldo)
// PERBAIKAN: Lakukan destructuring pada argumen kedua sesuai dengan pola Next.js
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params; // Sekarang 'id' bisa diakses langsung
    const body = await request.json();
    const { tanggal, keterangan, jumlah } = body;

    if (!tanggal || !keterangan || jumlah === undefined) {
      return NextResponse.json({ error: 'Field untuk update tidak boleh kosong' }, { status: 400 });
    }

    const db = admin.firestore();
    const docRef = db.collection('saldo').doc(id);

    await docRef.update({
      tanggal: new Date(tanggal),
      keterangan,
      jumlah: Number(jumlah),
    });

    return NextResponse.json({ id, message: 'Saldo berhasil diperbarui' }, { status: 200 });
  } catch (error) {
    // Akses 'id' melalui params untuk konsistensi
    console.error(`Error saat mengupdate saldo ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handler untuk DELETE (Menghapus saldo)
// PERBAIKAN: Terapkan perbaikan yang sama pada fungsi DELETE
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const db = admin.firestore();
    await db.collection('saldo').doc(id).delete();
    return NextResponse.json({ id, message: 'Saldo berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error(`Error saat menghapus saldo ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

