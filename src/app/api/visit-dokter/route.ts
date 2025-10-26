import { NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';


// Handler untuk GET (Mengambil semua jadwal milik pengguna)
export async function GET() {
  try {
  
    const db = admin.firestore();
    const schedulesSnapshot = await db
      .collection('visitDokter')
      .orderBy('waktuVisit', 'desc')
      .get();
    
    const schedulesData = schedulesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Konversi Timestamp Firestore ke format string ISO
        waktuVisit: data.waktuVisit.toDate().toISOString(),
      };
    });

    return NextResponse.json(schedulesData, { status: 200 });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handler untuk POST (Menambahkan jadwal baru)
export async function POST(request: Request) {
  try {
  
    const body = await request.json();
    const { namaDokter, rumahSakit, note, waktuVisit, status } = body;

    if (!namaDokter || !rumahSakit || !note || !waktuVisit || !status) {
      return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 });
    }

    const db = admin.firestore();
    const docRef = await db.collection('visitDokter').add({
      namaDokter,
      rumahSakit,
      note,
      waktuVisit: new Date(waktuVisit), // Simpan sebagai Timestamp
      status,
      createdAt: new Date(), // Tambahkan timestamp pembuatan
    });

    return NextResponse.json({ message: 'Jadwal berhasil ditambahkan', id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error('Error adding schedule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
