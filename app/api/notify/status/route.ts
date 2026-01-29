import { NextRequest, NextResponse } from "next/server";
import { db, notificationTokens } from "@/lib/db/client";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    const tokens = await db
      .select()
      .from(notificationTokens)
      .where(
        and(
          eq(notificationTokens.fid, auth.fid),
          eq(notificationTokens.active, true)
        )
      )
      .limit(1);

    return NextResponse.json({
      enabled: tokens.length > 0,
    });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
