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

export async function GET() {
  try {
    const db = admin.firestore();
    const snapshot = await db
      .collection("supportSchedules")
      .orderBy("tanggal", "desc")
      .get();

    const schedules = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        date:
          data.date ||
          (data.tanggal?.toDate
            ? data.tanggal.toDate().toISOString().split("T")[0]
            : ""),
        time: data.time || "",
        operasi: data.operasi || "",
        operator: data.operator || "",
        rumahSakit: data.rumahSakit || "",
        status: data.status || "Jadwal Baru",
        fotoPreOpUrl: data.fotoPreOpUrl || null,
        fotoPostOpUrl: data.fotoPostOpUrl || null,
        note: data.note || "",
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
      };
    });

    return NextResponse.json(schedules, { status: 200 });
  } catch (error) {
    console.error("GET /api/support-schedules error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data penjadwalan." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
    const docRef = await db.collection("supportSchedules").add({
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
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { message: "Agenda teknikal support berhasil ditambahkan.", id: docRef.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/support-schedules error:", error);
    return NextResponse.json(
      { error: "Gagal menambahkan agenda." },
      { status: 500 }
    );
  }
}
