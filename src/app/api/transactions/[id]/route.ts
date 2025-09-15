import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

interface TransactionData {
  date: string;
  description: string;
  amount: number;
  type: string;
}

// ----------------- GET (Ambil transaksi by id) -----------------
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = admin.firestore();
    const doc = await db.collection("transactions").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ id, ...doc.data() }, { status: 200 });
  } catch (error) {
    console.error("GET /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil transaksi" },
      { status: 500 }
    );
  }
}

// ----------------- PUT (Update transaksi) -----------------
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body: TransactionData = await request.json();

    if (!body.date || !body.description || isNaN(body.amount)) {
      return NextResponse.json(
        { error: "Field wajib diisi dengan benar" },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    await db.collection("transactions").doc(id).update({
      date: new Date(body.date),
      description: body.description,
      amount: body.amount,
      type: body.type,
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { message: "Transaksi berhasil diperbarui", id },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui transaksi" },
      { status: 500 }
    );
  }
}

// ----------------- DELETE (Hapus transaksi) -----------------
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = admin.firestore();
    await db.collection("transactions").doc(id).delete();

    return NextResponse.json(
      { message: "Transaksi berhasil dihapus", id },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus transaksi" },
      { status: 500 }
    );
  }
}
