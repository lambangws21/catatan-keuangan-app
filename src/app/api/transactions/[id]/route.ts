import { NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

type RouteParams = {
  params: {
    id: string;
  };
};

// Fungsi bantuan untuk mengambil path file dari URL Firebase Storage
function getPathFromUrl(url: string): string | null {
  try {
    const urlObject = new URL(url);
    const decodedPath = decodeURIComponent(urlObject.pathname.split('/o/')[1].split('?')[0]);
    return decodedPath;
  } catch (error) {
    console.error("Gagal mem-parsing URL Storage:", error);
    return null;
  }
}

// Handler untuk PUT (Mengedit transaksi)
export async function PUT(request: Request, context: RouteParams) {
  try {
    const { id } = context.params;
    const body = await request.json();
    const { tanggal, jenisBiaya, keterangan, jumlah, klaim, fileUrl } = body;

    if (!tanggal || !jenisBiaya || !keterangan || !jumlah) {
      return NextResponse.json({ error: 'Field untuk update tidak boleh kosong' }, { status: 400 });
    }

    const db = admin.firestore();
    const docRef = db.collection('transactions').doc(id);

    await docRef.update({
      tanggal: new Date(tanggal),
      jenisBiaya,
      keterangan,
      jumlah: Number(jumlah),
      klaim,
      fileUrl: fileUrl || null,
    });

    return NextResponse.json({ id, message: 'Transaksi berhasil diperbarui' }, { status: 200 });
  } catch (error) {
    console.error(`Error saat mengupdate transaksi ${context.params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handler untuk DELETE (Menghapus transaksi DAN file di Storage)
export async function DELETE(request: Request, context: RouteParams) {
  const { id } = context.params;

  try {
    const db = admin.firestore();
    const docRef = db.collection('transactions').doc(id);

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 });
    }

    const data = docSnap.data();
    
    if (data?.fileUrl) {
      const filePath = getPathFromUrl(data.fileUrl);
      if (filePath) {
        try {
          // PERBAIKAN: Secara eksplisit tentukan nama bucket dari environment variable
          const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
          if (!bucketName) {
            throw new Error("FIREBASE_STORAGE_BUCKET environment variable not set.");
          }
          const bucket = admin.storage().bucket(bucketName);
          await bucket.file(filePath).delete();
          console.log(`File ${filePath} berhasil dihapus dari Storage.`);
        } catch (storageError) {
          console.error(`Gagal menghapus file dari Storage (mungkin sudah tidak ada):`, storageError);
        }
      }
    }

    await docRef.delete();

    return NextResponse.json({ id, message: 'Transaksi dan berkas terkait berhasil dihapus' }, { status: 200 });
  } catch (error) {
    console.error(`Error saat menghapus transaksi ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

