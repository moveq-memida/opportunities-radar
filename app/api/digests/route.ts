import { NextRequest, NextResponse } from "next/server";
import { db, digests, sources } from "@/lib/db/client";
import { desc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    const result = await db
      .select({
        id: digests.id,
        title: digests.title,
        bullets: digests.bullets,
        action: digests.action,
        score: digests.score,
        tags: digests.tags,
        createdAt: digests.createdAt,
        sourceName: sources.name,
        sourceCategory: sources.category,
      })
      .from(digests)
      .innerJoin(sources, eq(digests.sourceId, sources.id))
      .orderBy(desc(digests.score), desc(digests.createdAt))
      .limit(limit)
      .offset(offset);

    const formattedDigests = result.map((d) => ({
      id: d.id,
      title: d.title,
      bullets: d.bullets,
      action: d.action,
      score: d.score,
      tags: d.tags,
      sourceName: d.sourceName,
      sourceCategory: d.sourceCategory,
      createdAt: d.createdAt.toISOString(),
    }));

    return NextResponse.json({ digests: formattedDigests });
  } catch (error) {
    console.error("Failed to fetch digests:", error);
    return NextResponse.json(
      { error: "Failed to fetch digests" },
      { status: 500 }
    );
  }
}
