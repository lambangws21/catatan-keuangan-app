// src/app/api/visit-dokter/route.ts

import { NextResponse } from 'next/server';
import { VisitData, VisitStatus } from '@/lib/dnd-kit'; // Menggunakan tipe dari dnd-kit
import admin from '@/lib/firebase/admin'; // Asumsi ini mengimpor Firestore Admin SDK

const VISIT_COLLECTION = 'visitDokter';
const VALID_STATUSES: VisitStatus[] = ['Terjadwal', 'Selesai', 'Dibatalkan'];

// --- HELPER: Mendapatkan orderIndex maksimum dalam satu kolom ---
const getMaxOrderIndex = async (status: VisitStatus): Promise<number> => {
    const db = admin.firestore();
    const snapshot = await db
        .collection(VISIT_COLLECTION)
        .where('status', '==', status)
        .orderBy('orderIndex', 'desc')
        .limit(1)
        .get();
        
    if (snapshot.empty) {
        return 0;
    }
    const maxOrder = snapshot.docs[0].data().orderIndex || 0;
    return maxOrder + 1;
}

// GET: Mengambil semua data kunjungan
export async function GET() {
  try {
    const db = admin.firestore();
    
    // Mengambil data dan mengurutkan berdasarkan status dan orderIndex
    const schedulesSnapshot = await db
      .collection(VISIT_COLLECTION)
      .orderBy('status', 'asc') 
      .orderBy('orderIndex', 'asc') 
      .get();
    
    const schedulesData: VisitData[] = schedulesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        namaDokter: data.namaDokter || '',
        rumahSakit: data.rumahSakit || '',
        note: data.note || '',
        status: data.status as VisitStatus,
        orderIndex: data.orderIndex || 0,
        waktuVisit: data.waktuVisit ? data.waktuVisit.toDate().toISOString() : new Date().toISOString(),
      } as VisitData;
    });

    return NextResponse.json(schedulesData, { status: 200 });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Menambahkan data kunjungan baru
export async function POST(request: Request) {
  try {
    const body: VisitData = await request.json(); 
    // Tidak mendestructuring orderIndex untuk menghindari warning ESLint
    const { namaDokter, rumahSakit, note, waktuVisit, status } = body; 
    const initialStatus = (status && VALID_STATUSES.includes(status)) ? status : 'Terjadwal';

    if (!namaDokter || !rumahSakit || !waktuVisit) {
      return NextResponse.json({ error: 'Field wajib diisi: Nama Dokter, Rumah Sakit, Waktu Visit.' }, { status: 400 });
    }

    const db = admin.firestore();
    
    // Hitung orderIndex baru
    const newOrderIndex = await getMaxOrderIndex(initialStatus as VisitStatus);

    // Tambahkan ke Firestore
    const docRef = await db.collection(VISIT_COLLECTION).add({
      namaDokter,
      rumahSakit,
      note: note || '',
      waktuVisit: new Date(waktuVisit), 
      status: initialStatus,
      orderIndex: newOrderIndex, 
      createdAt: new Date(), 
    });
    
    // Kembalikan data lengkap
    const newItem: VisitData = { 
        ...body, 
        id: docRef.id, 
        status: initialStatus, 
        orderIndex: newOrderIndex 
    };

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error adding schedule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Memperbarui status (DND antar kolom) ATAU order index (DND dalam kolom)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, orderUpdates } = body; 
    
    const db = admin.firestore();

    // 1. Logika Update Order Index (Batch Update untuk reordering dalam satu kolom)
    if (orderUpdates && Array.isArray(orderUpdates)) {
        const batch = db.batch();
        orderUpdates.forEach((update: {id: string, orderIndex: number}) => {
            const docRef = db.collection(VISIT_COLLECTION).doc(update.id);
            batch.update(docRef, { orderIndex: update.orderIndex });
        });
        await batch.commit();
        return NextResponse.json({ message: 'Order index batch updated successfully' });
    }
    
    // 2. Logika Update Status/Kolom (DND antar kolom)
    if (id && status) {
        const docRef = db.collection(VISIT_COLLECTION).doc(id);
        const newStatus = status as VisitStatus;
        
        if (!VALID_STATUSES.includes(newStatus)) {
             return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
        }

        // Hitung orderIndex baru (diletakkan paling akhir di kolom tujuan)
        const newOrderIndex = await getMaxOrderIndex(newStatus); 

        await docRef.update({
            status: newStatus,
            orderIndex: newOrderIndex,
        });

        return NextResponse.json({ id, status: newStatus, orderIndex: newOrderIndex });
    }
    
    return NextResponse.json({ error: 'Missing ID or Status/OrderUpdates in request' }, { status: 400 });

  } catch (error) {
    console.error('Error updating visit:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}