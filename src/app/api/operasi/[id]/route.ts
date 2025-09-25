import { NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

// Handler untuk PUT (Mengedit data operasi)
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    // Sesuaikan dengan struktur data 'operations'
    const { date, dokter, tindakanOperasi, rumahSakit, jumlah, klaim } = body;

    // Sesuaikan validasi
    if (!date || !dokter || !tindakanOperasi || !rumahSakit || typeof jumlah !== 'number' || isNaN(jumlah)) {
      return NextResponse.json(
        { error: 'Data tidak valid. Pastikan semua field terisi dengan benar.' },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const docRef = db.collection('operations').doc(id);

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan.' }, { status: 404 });
    }

    // Sesuaikan field yang diupdate
    await docRef.update({
      date: new Date(date),
      dokter,
      tindakanOperasi,
      rumahSakit,
      jumlah: Number(jumlah),
      klaim,
    });

    return NextResponse.json({ id, message: 'Data operasi berhasil diperbarui' }, { status: 200 });
  } catch (error) {
    console.error(`Error saat mengupdate data operasi:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handler untuk DELETE (Menghapus data operasi)
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = admin.firestore();
    // Sesuaikan nama koleksi
    await db.collection('operations').doc(id).delete();
    return NextResponse.json({ id, message: 'Data operasi berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error(`Error saat menghapus data operasi:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

