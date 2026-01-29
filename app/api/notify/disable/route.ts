import { NextRequest, NextResponse } from "next/server";
import { db, notificationTokens } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { verifyAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    await db
      .update(notificationTokens)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(notificationTokens.fid, auth.fid));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Failed to disable notifications:", error);
    return NextResponse.json(
      { error: "Failed to disable notifications" },
      { status: 500 }
    );
  }
}
