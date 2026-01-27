import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";
import { TableUiConfig, sanitizeTableUiConfig } from "@/lib/ui-config";

const getBearerToken = (req: Request) => {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
};

export async function POST(req: Request) {
  const adminToken = process.env.UI_CONFIG_ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json(
      { error: "UI_CONFIG_ADMIN_TOKEN belum diset di server." },
      { status: 501 }
    );
  }

  const token = getBearerToken(req);
  if (!token || token !== adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let patch: Partial<TableUiConfig>;
  try {
    patch = (await req.json()) as Partial<TableUiConfig>;
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  try {
    const db = admin.firestore();
    const ref = db.collection("uiConfig").doc("table");
    const snap = await ref.get();
    const existing = snap.exists ? (snap.data() as Record<string, unknown>) : {};

    const merged = sanitizeTableUiConfig({
      ...(existing as Partial<TableUiConfig>),
      ...(patch || {}),
    });

    await ref.set(merged, { merge: true });

    return NextResponse.json({ ok: true, config: merged }, { status: 200 });
  } catch (error) {
    console.error("[UI_CONFIG_TABLE_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Gagal menyimpan konfigurasi tabel." },
      { status: 500 }
    );
  }
}

