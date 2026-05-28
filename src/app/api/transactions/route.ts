import { NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';
import { normalizeKlaimStatus, normalizeStoredKlaimStatus } from '@/lib/transactions';

const normalizeFileUrls = (fileUrls: unknown, fileUrl?: unknown) => {
  const urls = Array.isArray(fileUrls)
    ? fileUrls.filter((url): url is string => typeof url === "string" && url.trim() !== "")
    : [];

  if (typeof fileUrl === "string" && fileUrl.trim() !== "" && !urls.includes(fileUrl)) {
    urls.unshift(fileUrl);
  }

  return Array.from(new Set(urls));
};

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
      const fileUrls = normalizeFileUrls(data?.fileUrls, data?.fileUrl);
      return {
        id: doc.id,
        ...data,
        tanggal: data.tanggal.toDate().toISOString().split('T')[0],
        fileUrls,
        fileUrl: fileUrls[0] || null,
        klaimStatus: normalizeKlaimStatus(data?.klaimStatus),
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
    const {
      tanggal,
      jenisBiaya,
      keterangan,
      jumlah,
      klaim,
      fileUrl,
      fileUrls,
      sumberBiaya,
      klaimStatus,
    } = body;

    if (!tanggal || !jenisBiaya || !keterangan || !jumlah) {
      return NextResponse.json({ error: 'Field wajib tidak boleh kosong' }, { status: 400 });
    }

    const normalizedFileUrls = normalizeFileUrls(fileUrls, fileUrl);
    const normalizedKlaimStatus = normalizeStoredKlaimStatus({
      jenisBiaya,
      sumberBiaya,
      klaim,
      klaimStatus,
    });

    const db = admin.firestore();
    await db.collection('transactions').add({
      tanggal: new Date(tanggal), 
      jenisBiaya,
      keterangan,
      jumlah: Number(jumlah),
      klaim: typeof klaim === "string" ? klaim : "",
      klaimStatus: normalizedKlaimStatus,
      fileUrls: normalizedFileUrls,
      fileUrl: normalizedFileUrls[0] || null,
      sumberBiaya: sumberBiaya || null,
      createdAt: new Date(),
    });

    const responseData = {
      tanggal,
      jenisBiaya,
      keterangan,
      jumlah: Number(jumlah),
      klaim: typeof klaim === "string" ? klaim : "",
      klaimStatus: normalizedKlaimStatus,
      fileUrls: normalizedFileUrls,
      fileUrl: normalizedFileUrls[0] || null,
      sumberBiaya,
    };
    return NextResponse.json({ message: 'Transaksi berhasil ditambahkan', data: responseData }, { status: 201 });

  } catch (error) {
    console.error('Error adding transaction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
