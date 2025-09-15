import { NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

// Handler untuk GET (Mengambil semua data saldo)
export async function GET() {
  try {
    const db = admin.firestore();
    const saldoSnapshot = await db
      .collection('saldo') // Mengambil dari koleksi 'saldo'
      .orderBy('tanggal', 'desc')
      .get();
    
    const saldoData = saldoSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        tanggal: data.tanggal.toDate().toISOString().split('T')[0],
      };
    });

    return NextResponse.json(saldoData, { status: 200 });

  } catch (error) {
    console.error('Error fetching saldo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handler untuk POST (Menambahkan saldo baru)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, keterangan, jumlah } = body;

    if (!tanggal || !keterangan || jumlah === undefined) {
      return NextResponse.json({ error: 'Field wajib tidak boleh kosong' }, { status: 400 });
    }

    const db = admin.firestore();
    await db.collection('saldo').add({ // Menyimpan ke koleksi 'saldo'
      tanggal: new Date(tanggal), 
      keterangan,
      jumlah: Number(jumlah),
      createdAt: new Date(),
    });

    const responseData = { tanggal, keterangan, jumlah: Number(jumlah) };
    return NextResponse.json({ message: 'Saldo berhasil ditambahkan', data: responseData }, { status: 201 });

  } catch (error) {
    console.error('Error adding saldo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

