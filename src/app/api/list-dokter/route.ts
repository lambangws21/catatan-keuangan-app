import { NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

// Handler untuk GET (Mengambil semua daftar dokter)
export async function GET() {
  try {
    const db = admin.firestore();
    const doctorsSnapshot = await db
      .collection('listDokter')
      .orderBy('namaDokter', 'asc') // Urutkan berdasarkan nama
      .get();
    
    const doctorsData = doctorsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        namaDokter: data.namaDokter,
        rumahSakit: data.rumahSakit,
      };
    });

    return NextResponse.json(doctorsData, { status: 200 });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handler untuk POST (Menambahkan dokter baru ke list)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { namaDokter, rumahSakit } = body;

    if (!namaDokter || !rumahSakit) {
      return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 });
    }

    const db = admin.firestore();
    // PERBAIKAN: Menyimpan ke 'listDokter' agar konsisten dengan GET
    const docRef = await db.collection('listDokter').add({
      namaDokter,
      rumahSakit,
      createdAt: new Date(),
    });

    return NextResponse.json({ message: 'Dokter berhasil ditambahkan', id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error('Error adding doctor:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
