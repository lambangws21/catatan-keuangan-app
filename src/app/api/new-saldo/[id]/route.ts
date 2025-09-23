import { NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

// Handler untuk PUT (Mengedit saldo)
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; // ✅ await dulu
    const body = await request.json();
    const { tanggal, keterangan, jumlah } = body;

    if (!tanggal || !keterangan || typeof jumlah !== 'number' || isNaN(jumlah)) {
      return NextResponse.json(
        { error: 'Data tidak valid. Pastikan semua field (tanggal, keterangan, jumlah) terisi dengan benar.' },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const docRef = db.collection('saldo').doc(id);

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan.' }, { status: 404 });
    }

    await docRef.update({
      tanggal: new Date(tanggal),
      keterangan,
      jumlah: Number(jumlah),
    });

    return NextResponse.json({ id, message: 'Saldo berhasil diperbarui' }, { status: 200 });
  } catch (error) {
    console.error(`Error saat mengupdate saldo:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handler untuk DELETE (Menghapus saldo)
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; // ✅ wajib await
    const db = admin.firestore();
    await db.collection('saldo').doc(id).delete();
    return NextResponse.json({ id, message: 'Saldo berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error(`Error saat menghapus saldo:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
