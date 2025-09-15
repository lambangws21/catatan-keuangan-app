import { NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

// Handler untuk GET (Mengambil semua transaksi)
export async function GET() {
  try {
    const db = admin.firestore();
    const transactionsSnapshot = await db
      .collection('transactions')
      .orderBy('tanggal', 'desc')
      .get();
    
    const transactions = transactionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        tanggal: data.tanggal.toDate().toISOString().split('T')[0],
      };
    });

    return NextResponse.json(transactions, { status: 200 });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handler untuk POST (Menambahkan transaksi baru)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // PERBAIKAN 1: Baca 'fileUrl' dari body request
    const { tanggal, jenisBiaya, keterangan, jumlah, klaim, fileUrl } = body;

    if (!tanggal || !jenisBiaya || !keterangan || !jumlah) {
      return NextResponse.json({ error: 'Field wajib tidak boleh kosong' }, { status: 400 });
    }

    const db = admin.firestore();
    await db.collection('transactions').add({
      tanggal: new Date(tanggal), 
      jenisBiaya,
      keterangan,
      jumlah: Number(jumlah),
      klaim,
      fileUrl: fileUrl || null, // Simpan URL, atau null jika tidak ada
      createdAt: new Date(),
    });

    // Mengembalikan data yang baru dibuat agar bisa langsung digunakan jika perlu
    const responseData = { tanggal, jenisBiaya, keterangan, jumlah: Number(jumlah), klaim, fileUrl };
    return NextResponse.json({ message: 'Transaksi berhasil ditambahkan', data: responseData }, { status: 201 });

  } catch (error) {
    console.error('Error adding transaction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
