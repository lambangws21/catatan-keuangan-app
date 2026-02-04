import { NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

const coerceHospitals = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input
      .map((v) => String(v ?? '').trim())
      .filter(Boolean)
      .slice(0, 3);
  }
  const s = String(input ?? '').trim();
  return s ? [s] : [];
};

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
        rumahSakit: coerceHospitals(data.rumahSakit),
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
    const { namaDokter } = body;
    const rumahSakit = coerceHospitals(body?.rumahSakit);

    if (!namaDokter || rumahSakit.length === 0) {
      return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 });
    }

    if (rumahSakit.length > 3) {
      return NextResponse.json({ error: 'Maksimal 3 rumah sakit.' }, { status: 400 });
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
