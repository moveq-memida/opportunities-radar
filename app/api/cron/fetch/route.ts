import { NextRequest, NextResponse } from "next/server";
import { db, sources, snapshots, diffs, digests } from "@/lib/db/client";
import { eq, desc } from "drizzle-orm";
import { fetchSource } from "@/lib/fetcher";
import { generateDiff } from "@/lib/differ";
import { scoreChanges } from "@/lib/scorer";
import { summarizeChanges } from "@/lib/llm/provider";
import { isAdmin, verifyAuth } from "@/lib/auth";

// Vercel Cron authorization
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify Vercel Cron authorization
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runFetchJob();
}

export async function POST(request: NextRequest) {
  // Manual trigger requires admin auth
  try {
    const auth = await verifyAuth(request);
    if (!isAdmin(auth.fid)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runFetchJob();
}

async function runFetchJob() {
  try {
    const enabledSources = await db
      .select()
      .from(sources)
      .where(eq(sources.enabled, true));

    let processed = 0;
    let errors = 0;

    for (const source of enabledSources) {
      try {
        // Fetch content
        const fetchResult = await fetchSource(source);

        // Get previous snapshot
        const prevSnapshots = await db
          .select()
          .from(snapshots)
          .where(eq(snapshots.sourceId, source.id))
          .orderBy(desc(snapshots.fetchedAt))
          .limit(1);

        const prevSnapshot = prevSnapshots[0];

        // Check if content changed
        if (prevSnapshot && prevSnapshot.contentHash === fetchResult.contentHash) {
          // No changes, just update lastFetchedAt
          await db
            .update(sources)
            .set({ lastFetchedAt: new Date() })
            .where(eq(sources.id, source.id));
          continue;
        }

        // Save new snapshot
        const [newSnapshot] = await db
          .insert(snapshots)
          .values({
            sourceId: source.id,
            contentHash: fetchResult.contentHash,
            rawContent: fetchResult.content,
          })
          .returning();

        // Generate diff if we have a previous snapshot
        if (prevSnapshot) {
          const diffResult = generateDiff(
            prevSnapshot.rawContent,
            fetchResult.content
          );

          if (diffResult.hasChanges) {
            // Save diff
            const [newDiff] = await db
              .insert(diffs)
              .values({
                snapshotId: newSnapshot.id,
                prevSnapshotId: prevSnapshot.id,
                patch: diffResult.patch,
              })
              .returning();

            // Score the changes
            const scoreResult = scoreChanges(
              source,
              diffResult,
              fetchResult.content
            );

            // Generate summary
            const summary = await summarizeChanges(source, diffResult);

            // Create digest
            await db.insert(digests).values({
              diffId: newDiff.id,
              sourceId: source.id,
              title: summary.title,
              bullets: summary.bullets,
              action: summary.action || scoreResult.action,
              deadline: scoreResult.deadline,
              tags: scoreResult.tags,
              score: scoreResult.score,
            });
          }
        }

        // Update source lastFetchedAt
        await db
          .update(sources)
          .set({ lastFetchedAt: new Date() })
          .where(eq(sources.id, source.id));

        processed++;
      } catch (error) {
        console.error(`Failed to process source ${source.name}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
      total: enabledSources.length,
    });
  } catch (error) {
    console.error("Cron fetch job failed:", error);
    return NextResponse.json(
      { error: "Fetch job failed" },
      { status: 500 }
    );
  }
}
