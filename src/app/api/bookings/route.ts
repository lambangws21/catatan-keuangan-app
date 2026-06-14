import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "bookings";

export async function DELETE(request: Request) {
  try {
    const { id } = (await request.json()) as { id?: string };

    if (!id) {
      return NextResponse.json({ error: "ID booking wajib diisi." }, { status: 400 });
    }

    const db = admin.firestore();
    const docRef = db.collection(COLLECTION).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Booking tidak ditemukan." }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ id, message: "Booking berhasil dihapus" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/bookings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
