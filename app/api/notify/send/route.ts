import { NextRequest, NextResponse } from "next/server";
import { db, notificationTokens, watchlist, digests, sources } from "@/lib/db/client";
import { eq, and, inArray } from "drizzle-orm";
import { isAdmin, verifyAuth } from "@/lib/auth";

interface NotificationPayload {
  digestId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Require admin auth
    const auth = await verifyAuth(request);
    if (!isAdmin(auth.fid)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { digestId }: NotificationPayload = await request.json();

    if (!digestId) {
      return NextResponse.json(
        { error: "Missing digestId" },
        { status: 400 }
      );
    }

    // Get the digest
    const digestResult = await db
      .select({
        id: digests.id,
        title: digests.title,
        sourceId: digests.sourceId,
        sourceName: sources.name,
      })
      .from(digests)
      .innerJoin(sources, eq(digests.sourceId, sources.id))
      .where(eq(digests.id, digestId))
      .limit(1);

    if (digestResult.length === 0) {
      return NextResponse.json(
        { error: "Digest not found" },
        { status: 404 }
      );
    }

    const digest = digestResult[0];

    // Get users watching this source with active notifications
    const watchers = await db
      .select({ fid: watchlist.fid })
      .from(watchlist)
      .where(
        and(
          eq(watchlist.sourceId, digest.sourceId),
          eq(watchlist.enabled, true)
        )
      );

    if (watchers.length === 0) {
      return NextResponse.json({ sent: 0, message: "No watchers" });
    }

    const watcherFids = watchers.map((w) => w.fid);

    // Get active notification tokens for these users
    const tokens = await db
      .select()
      .from(notificationTokens)
      .where(
        and(
          inArray(notificationTokens.fid, watcherFids),
          eq(notificationTokens.active, true)
        )
      );

    if (tokens.length === 0) {
      return NextResponse.json({ sent: 0, message: "No active tokens" });
    }

    // Send notifications
    let sent = 0;
    let failed = 0;

    for (const tokenData of tokens) {
      try {
        const response = await fetch(tokenData.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: tokenData.token,
            title: `${digest.sourceName} Update`,
            body: digest.title,
            targetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/d/${digest.id}`,
          }),
        });

        if (response.ok) {
          sent++;
        } else {
          // Token might be invalid, mark as inactive
          if (response.status === 404 || response.status === 410) {
            await db
              .update(notificationTokens)
              .set({ active: false, updatedAt: new Date() })
              .where(eq(notificationTokens.id, tokenData.id));
          }
          failed++;
        }
      } catch (error) {
        console.error(`Failed to send notification to ${tokenData.fid}:`, error);
        failed++;
      }
    }

    return NextResponse.json({
      sent,
      failed,
      total: tokens.length,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Failed to send notifications:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
