import { NextRequest, NextResponse } from "next/server";
import { db, watchlist, sources } from "@/lib/db/client";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const { sourceId, enabled } = await request.json();

    if (!sourceId || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Missing sourceId or enabled" },
        { status: 400 }
      );
    }

    // Verify source exists
    const source = await db
      .select()
      .from(sources)
      .where(eq(sources.id, sourceId))
      .limit(1);

    if (source.length === 0) {
      return NextResponse.json(
        { error: "Source not found" },
        { status: 404 }
      );
    }

    // Check if already in watchlist
    const existing = await db
      .select()
      .from(watchlist)
      .where(
        and(
          eq(watchlist.fid, auth.fid),
          eq(watchlist.sourceId, sourceId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing entry
      await db
        .update(watchlist)
        .set({ enabled, updatedAt: new Date() })
        .where(eq(watchlist.id, existing[0].id));
    } else if (enabled) {
      // Create new entry only if enabling
      await db.insert(watchlist).values({
        fid: auth.fid,
        sourceId,
        enabled: true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Failed to update watchlist:", error);
    return NextResponse.json(
      { error: "Failed to update watchlist" },
      { status: 500 }
    );
  }
}
