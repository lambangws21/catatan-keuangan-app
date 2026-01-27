import { NextResponse, NextRequest } from 'next/server';
import admin from '@/lib/firebase/admin';

// Handler untuk PUT (Mengedit jadwal)
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; // ✅ Menggunakan await pada context.params
    const body = await request.json();
    const { namaDokter, rumahSakit, note, waktuVisit, status, perawat = "" } =
      body;

    if (!namaDokter || !rumahSakit || !note || !waktuVisit || !status) {
      return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 });
    }

    const db = admin.firestore();
    const docRef = db.collection('visitDokter').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan.' }, { status: 404 });
    }

    await docRef.update({
      namaDokter,
      rumahSakit,
      note,
      waktuVisit: new Date(waktuVisit),
      status,
      perawat,
    });

    return NextResponse.json({ id, message: 'Jadwal berhasil diperbarui' }, { status: 200 });
  } catch (error) {
    // Menyesuaikan gaya log error
    console.error(`Error saat mengupdate jadwal:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handler untuk DELETE (Menghapus jadwal)
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; // ✅ Menggunakan await pada context.params
    const db = admin.firestore();
    const docRef = db.collection('visitDokter').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan.' }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ id, message: 'Jadwal berhasil dihapus' }, { status: 200 });
  } catch (error) {
    // Menyesuaikan gaya log error
    console.error(`Error saat menghapus jadwal:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
