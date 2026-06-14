import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "events";

type EventBody = {
  id?: string;
  title?: string;
  start?: string;
  end?: string;
  progress?: number;
  status?: string;
};

const serializeEvent = (
  doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
) => {
  const data = doc.data();

  return {
    id: doc.id,
    title: data.title ?? "",
    start: data.start?.toDate?.().toISOString?.() ?? data.start,
    end: data.end?.toDate?.().toISOString?.() ?? data.end ?? undefined,
    progress: data.progress ?? 0,
    status: data.status ?? "todo",
  };
};

const validateEvent = (body: EventBody) => {
  if (!body.title || !body.start) {
    return "Judul dan waktu mulai wajib diisi.";
  }

  const start = new Date(body.start);
  if (Number.isNaN(start.getTime())) {
    return "Waktu mulai tidak valid.";
  }

  if (body.end && Number.isNaN(new Date(body.end).getTime())) {
    return "Waktu selesai tidak valid.";
  }

  return null;
};

export async function GET() {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection(COLLECTION).orderBy("start", "desc").get();
    return NextResponse.json(snapshot.docs.map(serializeEvent), { status: 200 });
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EventBody;
    const validationError = validateEvent(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const db = admin.firestore();
    const docRef = await db.collection(COLLECTION).add({
      title: body.title,
      start: new Date(body.start as string),
      end: body.end ? new Date(body.end) : null,
      progress: Number(body.progress ?? 0),
      status: body.status ?? "todo",
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        id: docRef.id,
        title: body.title,
        start: body.start,
        end: body.end,
        progress: Number(body.progress ?? 0),
        status: body.status ?? "todo",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/events error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as EventBody;

    if (!body.id) {
      return NextResponse.json({ error: "ID event wajib diisi." }, { status: 400 });
    }

    const validationError = validateEvent(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const db = admin.firestore();
    const docRef = db.collection(COLLECTION).doc(body.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });
    }

    await docRef.update({
      title: body.title,
      start: new Date(body.start as string),
      end: body.end ? new Date(body.end) : null,
      progress: Number(body.progress ?? 0),
      status: body.status ?? "todo",
      updatedAt: new Date(),
    });

    return NextResponse.json({ ...body, progress: Number(body.progress ?? 0) }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/events error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = (await request.json()) as { id?: string };

    if (!id) {
      return NextResponse.json({ error: "ID event wajib diisi." }, { status: 400 });
    }

    const db = admin.firestore();
    const docRef = db.collection(COLLECTION).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ id, message: "Event berhasil dihapus" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/events error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
