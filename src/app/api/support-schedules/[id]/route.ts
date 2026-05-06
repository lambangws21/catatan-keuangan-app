import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

type SupportSchedulePayload = {
  date: string;
  time?: string;
  operasi: string;
  operator: string;
  rumahSakit: string;
  status?: string;
  fotoPreOpUrl?: string | null;
  fotoPostOpUrl?: string | null;
  note?: string | null;
};

const toFirestoreDate = (date: string) => new Date(`${date}T12:00:00.000Z`);

async function getId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return id;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await getId(context);
    const db = admin.firestore();
    const doc = await db.collection("supportSchedules").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Agenda tidak ditemukan." },
        { status: 404 }
      );
    }

    const data = doc.data();
    return NextResponse.json(
      {
        id,
        date:
          data?.date ||
          (data?.tanggal?.toDate
            ? data.tanggal.toDate().toISOString().split("T")[0]
            : ""),
        time: data?.time || "",
        operasi: data?.operasi || "",
        operator: data?.operator || "",
        rumahSakit: data?.rumahSakit || "",
        status: data?.status || "Jadwal Baru",
        fotoPreOpUrl: data?.fotoPreOpUrl || null,
        fotoPostOpUrl: data?.fotoPostOpUrl || null,
        note: data?.note || "",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/support-schedules/[id] error:", error);
    return NextResponse.json({ error: "Gagal mengambil agenda." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await getId(context);
    const body = (await request.json()) as SupportSchedulePayload;
    const {
      date,
      time = "",
      operasi,
      operator,
      rumahSakit,
      status = "Jadwal Baru",
      fotoPreOpUrl = null,
      fotoPostOpUrl = null,
      note = "",
    } = body;

    if (!date || !operasi || !operator || !rumahSakit) {
      return NextResponse.json(
        {
          error:
            "Field wajib: tanggal, operasi, operator, dan lokasi rumah sakit.",
        },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const docRef = db.collection("supportSchedules").doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        { error: "Agenda tidak ditemukan." },
        { status: 404 }
      );
    }

    await docRef.update({
      date,
      tanggal: toFirestoreDate(date),
      time,
      operasi,
      operator,
      rumahSakit,
      status,
      fotoPreOpUrl,
      fotoPostOpUrl,
      note,
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { message: "Agenda berhasil diperbarui.", id },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/support-schedules/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui agenda." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await getId(context);
    const db = admin.firestore();
    const docRef = db.collection("supportSchedules").doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        { error: "Agenda tidak ditemukan." },
        { status: 404 }
      );
    }

    await docRef.delete();
    return NextResponse.json({ message: "Agenda berhasil dihapus.", id }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/support-schedules/[id] error:", error);
    return NextResponse.json({ error: "Gagal menghapus agenda." }, { status: 500 });
  }
}
