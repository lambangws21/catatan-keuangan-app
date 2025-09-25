import { NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

/**
 * Handler API untuk metode HTTP GET.
 * Mengambil semua data dari koleksi 'operations'.
 * CATATAN: Versi ini tidak aman dan mengambil semua data dari semua pengguna.
 */
export async function GET() {
  try {
    const db = admin.firestore();
    const operationsSnapshot = await db
      .collection('operations') 
      .orderBy('date', 'desc') // Menggunakan 'date' sesuai struktur data operasi
      .get();
    
    const operationsData = operationsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Konversi Timestamp Firestore ke format string YYYY-MM-DD
        date: data.date.toDate().toISOString().split('T')[0],
      };
    });

    return NextResponse.json(operationsData, { status: 200 });

  } catch (error) {
    console.error('Error fetching operations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Handler API untuk metode HTTP POST.
 * Menambahkan data operasi baru tanpa verifikasi pengguna.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Gunakan field yang sesuai dengan data 'operations'
    const { date, dokter, tindakanOperasi, rumahSakit, jumlah, klaim } = body;

    // Validasi field yang wajib diisi
    if (!date || !dokter || !tindakanOperasi || !rumahSakit || jumlah === undefined) {
      return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 });
    }

    const db = admin.firestore();
    const docRef = await db.collection('operations').add({
      date: new Date(date), 
      dokter,
      tindakanOperasi,
      rumahSakit,
      jumlah: Number(jumlah),
      klaim,
      timestamp: new Date(),
    });

    return NextResponse.json({ message: 'Data operasi berhasil ditambahkan', id: docRef.id }, { status: 201 });

  } catch (error) {
    console.error('Error adding operation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

