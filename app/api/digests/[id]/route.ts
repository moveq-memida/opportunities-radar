import { NextRequest, NextResponse } from "next/server";
import { db, digests, sources, diffs } from "@/lib/db/client";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await db
      .select({
        id: digests.id,
        title: digests.title,
        bullets: digests.bullets,
        action: digests.action,
        deadline: digests.deadline,
        score: digests.score,
        tags: digests.tags,
        createdAt: digests.createdAt,
        sourceName: sources.name,
        sourceCategory: sources.category,
        sourceUrl: sources.url,
        patch: diffs.patch,
      })
      .from(digests)
      .innerJoin(sources, eq(digests.sourceId, sources.id))
      .leftJoin(diffs, eq(digests.diffId, diffs.id))
      .where(eq(digests.id, id))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Digest not found" },
        { status: 404 }
      );
    }

    const d = result[0];
    const digest = {
      id: d.id,
      title: d.title,
      bullets: d.bullets,
      action: d.action,
      deadline: d.deadline?.toISOString() || null,
      score: d.score,
      tags: d.tags,
      sourceName: d.sourceName,
      sourceCategory: d.sourceCategory,
      sourceUrl: d.sourceUrl,
      createdAt: d.createdAt.toISOString(),
      patch: d.patch,
    };

    return NextResponse.json({ digest });
  } catch (error) {
    console.error("Failed to fetch digest:", error);
    return NextResponse.json(
      { error: "Failed to fetch digest" },
      { status: 500 }
    );
  }
}
