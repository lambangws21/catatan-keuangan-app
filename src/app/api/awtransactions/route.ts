import { NextRequest, NextResponse } from "next/server";
import { databases } from "@/lib/appwrite";

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE as string;
const COLLECTION_ID = "transactions";

// --- GET: ambil semua transaksi ---
export async function GET() {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTION_ID);
    return NextResponse.json(res.documents);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal ambil data" }, { status: 500 });
  }
}

// --- POST: tambah transaksi ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await databases.createDocument(
      DB_ID,
      COLLECTION_ID,
      "unique()",
      body
    );
    return NextResponse.json(res);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal tambah data" }, { status: 500 });
  }
}
