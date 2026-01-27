import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";
import { sanitizeTableUiConfig } from "@/lib/ui-config";

export async function GET() {
  try {
    const db = admin.firestore();
    const snap = await db.collection("uiConfig").doc("table").get();
    const config = sanitizeTableUiConfig(
      snap.exists ? (snap.data() as Record<string, unknown>) : undefined
    );

    return NextResponse.json(
      {
        config,
        source: snap.exists ? ("remote" as const) : ("default" as const),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[UI_CONFIG_TABLE_GET_ERROR]", error);
    const config = sanitizeTableUiConfig(undefined);
    return NextResponse.json(
      { config, source: "default" as const },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}

