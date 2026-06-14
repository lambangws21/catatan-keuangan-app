import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "bookings";

type BookingBody = {
  id?: string;
  inviteeName?: string;
  inviteeEmail?: string;
  eventTitle?: string;
  start?: string;
};

const serializeBooking = (
  doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
) => {
  const data = doc.data();

  return {
    id: doc.id,
    inviteeName: data.inviteeName ?? "",
    inviteeEmail: data.inviteeEmail ?? "",
    eventTitle: data.eventTitle ?? "",
    start: data.start,
    createdAt: data.createdAt ?? null,
  };
};

const validateBooking = (body: BookingBody) => {
  if (!body.inviteeName || !body.inviteeEmail || !body.eventTitle || !body.start) {
    return "Semua field booking wajib diisi.";
  }

  const start = new Date(body.start);
  if (Number.isNaN(start.getTime())) {
    return "Tanggal booking tidak valid.";
  }

  return null;
};

export async function GET() {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection(COLLECTION).orderBy("start", "desc").get();
    return NextResponse.json(snapshot.docs.map(serializeBooking), { status: 200 });
  } catch (error) {
    console.error("GET /api/visitDokter error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BookingBody;
    const validationError = validateBooking(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const db = admin.firestore();
    const docRef = await db.collection(COLLECTION).add({
      inviteeName: body.inviteeName,
      inviteeEmail: body.inviteeEmail,
      eventTitle: body.eventTitle,
      start: new Date(body.start as string),
      createdAt: new Date(),
    });

    return NextResponse.json({ id: docRef.id, message: "Booking berhasil ditambahkan" }, { status: 201 });
  } catch (error) {
    console.error("POST /api/visitDokter error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as BookingBody;

    if (!body.id) {
      return NextResponse.json({ error: "ID booking wajib diisi." }, { status: 400 });
    }

    const validationError = validateBooking(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const db = admin.firestore();
    const docRef = db.collection(COLLECTION).doc(body.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Booking tidak ditemukan." }, { status: 404 });
    }

    await docRef.update({
      inviteeName: body.inviteeName,
      inviteeEmail: body.inviteeEmail,
      eventTitle: body.eventTitle,
      start: new Date(body.start as string),
      updatedAt: new Date(),
    });

    return NextResponse.json({ id: body.id, message: "Booking berhasil diperbarui" }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/visitDokter error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
