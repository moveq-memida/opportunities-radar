import { NextRequest, NextResponse } from "next/server";
import { db, notificationTokens } from "@/lib/db/client";
import { eq, and } from "drizzle-orm";

interface WebhookEvent {
  event: string;
  data: {
    fid: string;
    notificationDetails?: {
      token: string;
      url: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const event: WebhookEvent = await request.json();

    switch (event.event) {
      case "notification_enabled": {
        const { fid, notificationDetails } = event.data;
        if (!notificationDetails) {
          return NextResponse.json(
            { error: "Missing notification details" },
            { status: 400 }
          );
        }

        // Check if token already exists
        const existing = await db
          .select()
          .from(notificationTokens)
          .where(eq(notificationTokens.fid, fid))
          .limit(1);

        if (existing.length > 0) {
          // Update existing token
          await db
            .update(notificationTokens)
            .set({
              token: notificationDetails.token,
              url: notificationDetails.url,
              active: true,
              updatedAt: new Date(),
            })
            .where(eq(notificationTokens.id, existing[0].id));
        } else {
          // Create new token
          await db.insert(notificationTokens).values({
            fid,
            appFid: process.env.APP_FID || "",
            token: notificationDetails.token,
            url: notificationDetails.url,
            active: true,
          });
        }

        return NextResponse.json({ success: true });
      }

      case "notification_disabled": {
        const { fid } = event.data;

        // Mark tokens as inactive
        await db
          .update(notificationTokens)
          .set({ active: false, updatedAt: new Date() })
          .where(eq(notificationTokens.fid, fid));

        return NextResponse.json({ success: true });
      }

      case "miniapp_removed": {
        const { fid } = event.data;

        // Deactivate all tokens for this user
        await db
          .update(notificationTokens)
          .set({ active: false, updatedAt: new Date() })
          .where(eq(notificationTokens.fid, fid));

        return NextResponse.json({ success: true });
      }

      default:
        // Unknown event, acknowledge anyway
        return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Return success to avoid retries for parsing errors
    return NextResponse.json({ success: true });
  }
}
