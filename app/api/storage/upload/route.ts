import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const bucket = (form.get("bucket") as string) || "attachments";
    const path = (form.get("path") as string) || `${Date.now()}-${file?.name}`;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const admin = createAdminClient();
    const buffer = await file.arrayBuffer();

    const { data, error } = await admin.storage.from(bucket).upload(path, new Blob([buffer]), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
