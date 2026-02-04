// import { NextResponse } from 'next/server';
// import admin from '@/lib/firebase/admin';


// // Handler untuk GET (Mengambil semua jadwal milik pengguna)
// export async function GET() {
//   try {
  
//     const db = admin.firestore();
//     const schedulesSnapshot = await db
//       .collection('visitDokter')
//       .orderBy('waktuVisit', 'desc')
//       .get();
    
//     const schedulesData = schedulesSnapshot.docs.map(doc => {
//       const data = doc.data();
//       return {
//         id: doc.id,
//         ...data,
//         // Konversi Timestamp Firestore ke format string ISO
//         waktuVisit: data.waktuVisit.toDate().toISOString(),
//       };
//     });

//     return NextResponse.json(schedulesData, { status: 200 });
//   } catch (error) {
//     console.error('Error fetching schedules:', error);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }

// // Handler untuk POST (Menambahkan jadwal baru)
// export async function POST(request: Request) {
//   try {
  
//     const body = await request.json();
//     const { namaDokter, rumahSakit, note, waktuVisit, status } = body;

//     if (!namaDokter || !rumahSakit || !note || !waktuVisit || !status) {
//       return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 });
//     }

//     const db = admin.firestore();
//     const docRef = await db.collection('visitDokter').add({
//       namaDokter,
//       rumahSakit,
//       note,
//       waktuVisit: new Date(waktuVisit), // Simpan sebagai Timestamp
//       status,
//       createdAt: new Date(), // Tambahkan timestamp pembuatan
//     });

//     return NextResponse.json({ message: 'Jadwal berhasil ditambahkan', id: docRef.id }, { status: 201 });
//   } catch (error) {
//     console.error('Error adding schedule:', error);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }

import { NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';
import { sendTelegramMessage } from '@/lib/telegram';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =======================
// GET - Ambil semua jadwal
// =======================
export async function GET() {
  try {
    const db = admin.firestore();

    const snapshot = await db
      .collection('visitDokter')
      .orderBy('waktuVisit', 'desc')
      .get();

    const schedulesData = snapshot.docs.map(doc => {
      const data = doc.data();

    return {
      id: doc.id,
      namaDokter: data.namaDokter,
      rumahSakit: data.rumahSakit,
      note: data.note,
      status: data.status,
      repeat: data.repeat || "once", // ✅ default sekali
      waktuVisit: data.waktuVisit.toDate().toISOString(),
      createdAt: data.createdAt?.toDate()?.toISOString() ?? null,
      perawat: data.perawat ?? null,
    };
  });

    return NextResponse.json(schedulesData, { status: 200 });

  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      namaDokter,
      rumahSakit,
      note,
      waktuVisit,
      status,
      repeat = "once",
      perawat = "",
    } = body;

    if (!namaDokter || !rumahSakit || !note || !waktuVisit || !status) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi.' },
        { status: 400 }
      );
    }

    const db = admin.firestore();

    const docRef = await db.collection('visitDokter').add({
      namaDokter,
      rumahSakit,
      note,
      waktuVisit: new Date(waktuVisit),
      status,
      repeat, // ✅ disimpan sebagai mode
      perawat,
      createdAt: new Date(),
    });

    if (process.env.TELEGRAM_VISIT_NOTIFY === "1") {
      const msg = [
        "📌 Jadwal Visit Baru",
        "",
        `Dokter: ${namaDokter}`,
        `RS: ${rumahSakit}`,
        `Perawat: ${perawat || "-"}`,
        `Waktu: ${new Date(waktuVisit).toISOString()}`,
        `Status: ${status}`,
        `Catatan: ${note || "-"}`,
      ].join("\n");
      const r = await sendTelegramMessage(msg);
      if (!r.ok) console.error("Telegram notify (create) gagal:", r.error);
    }

    return NextResponse.json({
      message: 'Jadwal berhasil ditambahkan',
      id: docRef.id
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding schedule:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
