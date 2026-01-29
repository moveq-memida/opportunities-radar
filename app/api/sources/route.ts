import { NextRequest, NextResponse } from "next/server";
import { db, sources, watchlist } from "@/lib/db/client";
import { eq, and } from "drizzle-orm";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Try to get user FID for watchlist status
    let userFid: string | null = null;
    try {
      const auth = await verifyAuth(request);
      userFid = auth.fid;
    } catch {
      // Continue without auth
    }

    // Get all enabled sources
    const allSources = await db
      .select()
      .from(sources)
      .where(eq(sources.enabled, true))
      .orderBy(sources.category, sources.name);

    // Get user's watchlist if authenticated
    let watchedSourceIds = new Set<string>();
    if (userFid) {
      const userWatchlist = await db
        .select({ sourceId: watchlist.sourceId })
        .from(watchlist)
        .where(
          and(
            eq(watchlist.fid, userFid),
            eq(watchlist.enabled, true)
          )
        );
      watchedSourceIds = new Set(userWatchlist.map((w) => w.sourceId));
    }

    const result = allSources.map((source) => ({
      id: source.id,
      name: source.name,
      type: source.type,
      url: source.url,
      category: source.category,
      enabled: source.enabled,
      watched: watchedSourceIds.has(source.id),
      lastFetchedAt: source.lastFetchedAt?.toISOString() || null,
    }));

    return NextResponse.json({ sources: result });
  } catch (error) {
    console.error("Failed to fetch sources:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}
