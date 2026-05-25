import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? null;

  return NextResponse.json({ publicKey });
}
