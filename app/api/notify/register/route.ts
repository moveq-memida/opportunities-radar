import { NextRequest, NextResponse } from "next/server";
import { db, notificationTokens } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { verifyAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const { token, url } = await request.json();

    if (!token || !url) {
      return NextResponse.json(
        { error: "Missing token or url" },
        { status: 400 }
      );
    }

    // Check if user already has a token
    const existing = await db
      .select()
      .from(notificationTokens)
      .where(eq(notificationTokens.fid, auth.fid))
      .limit(1);

    if (existing.length > 0) {
      // Update existing token
      await db
        .update(notificationTokens)
        .set({
          token,
          url,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(notificationTokens.id, existing[0].id));
    } else {
      // Create new token
      await db.insert(notificationTokens).values({
        fid: auth.fid,
        appFid: process.env.APP_FID || "",
        token,
        url,
        active: true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Failed to register notification token:", error);
    return NextResponse.json(
      { error: "Failed to register token" },
      { status: 500 }
    );
  }
}
