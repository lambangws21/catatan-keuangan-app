import { NextResponse, NextRequest } from 'next/server';
import admin from '@/lib/firebase/admin';

// Handler untuk PUT (Mengedit dokter di list)
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; // ✅ Menggunakan await pada context.params
    const body = await request.json();
    const { namaDokter, rumahSakit } = body;

    // Validasi input
    if (!namaDokter || !rumahSakit) {
      return NextResponse.json({ error: 'Nama dokter dan rumah sakit wajib diisi.' }, { status: 400 });
    }

    const db = admin.firestore();
    const docRef = db.collection('listDokter').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan.' }, { status: 404 });
    }

    // Lakukan update
    await docRef.update({
      namaDokter,
      rumahSakit,
    });

    return NextResponse.json({ id, message: 'Dokter berhasil diperbarui' }, { status: 200 });
  } catch (error) {
    // Meniru gaya log error dari contoh Anda
    console.error(`Error saat mengupdate dokter:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handler untuk DELETE (Menghapus dokter dari list)
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; // ✅ Menggunakan await pada context.params
    const db = admin.firestore();
    
    const docRef = db.collection('listDokter').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan.' }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ id, message: 'Dokter berhasil dihapus' }, { status: 200 });
  } catch (error) {
    // Meniru gaya log error dari contoh Anda
    console.error(`Error saat menghapus dokter:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}