"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMiniKit, useComposeCast, useOpenUrl } from "@coinbase/onchainkit/minikit";
import {
  AppShell,
  Badge,
  Button,
  Skeleton,
} from "@/components";
import { categoryLabels, categoryVariants, SourceCategory } from "@/lib/sources";
import styles from "./digest.module.css";

interface DigestDetail {
  id: string;
  title: string;
  bullets: string[];
  action?: string;
  deadline?: string;
  score: number;
  tags: string[];
  sourceName: string;
  sourceCategory: SourceCategory;
  sourceUrl: string;
  createdAt: string;
  patch?: string;
}

export default function DigestPage() {
  const params = useParams();
  const router = useRouter();
  const { setMiniAppReady, isMiniAppReady } = useMiniKit();
  const { composeCast } = useComposeCast();
  const openUrl = useOpenUrl();

  const [digest, setDigest] = useState<DigestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  useEffect(() => {
    async function fetchDigest() {
      try {
        const res = await fetch(`/api/digests/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Digest not found");
          } else {
            throw new Error("Failed to fetch");
          }
          return;
        }
        const data = await res.json();
        setDigest(data.digest);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchDigest();
  }, [params.id]);

  const handleShare = async () => {
    if (!digest) return;

    const text = `${digest.title}\n\n${digest.bullets.map((b) => `• ${b}`).join("\n")}\n\nvia Opportunities Radar`;

    try {
      await composeCast({
        text,
        embeds: [digest.sourceUrl],
      });
    } catch (err) {
      console.error("Failed to compose cast:", err);
    }
  };

  const handleOpenSource = async () => {
    if (digest?.sourceUrl) {
      await openUrl(digest.sourceUrl);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className={styles.container}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.back()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className={styles.content}>
            <Skeleton variant="title" />
            <Skeleton width="60%" />
            <div style={{ marginTop: "var(--spacing-lg)" }}>
              <Skeleton width="100%" />
              <Skeleton width="90%" />
              <Skeleton width="85%" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !digest) {
    return (
      <AppShell>
        <div className={styles.container}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.back()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className={styles.empty}>
            <p>{error || "Digest not found"}</p>
            <Button onClick={() => router.push("/")}>Go Home</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.container}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.back()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className={styles.content}>
          <div className={styles.meta}>
            <Badge variant={categoryVariants[digest.sourceCategory]}>
              {categoryLabels[digest.sourceCategory]}
            </Badge>
            <span className={styles.source}>{digest.sourceName}</span>
            <span className={styles.date}>
              {formatDate(digest.createdAt)}
            </span>
          </div>

          <h1 className={styles.title}>{digest.title}</h1>

          {digest.score >= 70 && (
            <div className={styles.hotBadge}>
              <Badge variant="warning">High Priority</Badge>
            </div>
          )}

          <ul className={styles.bullets}>
            {digest.bullets.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>

          {digest.deadline && (
            <div className={styles.deadline}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              <span>Deadline: {formatDate(digest.deadline)}</span>
            </div>
          )}

          {digest.tags.length > 0 && (
            <div className={styles.tags}>
              {digest.tags.map((tag) => (
                <Badge key={tag} variant="default" size="small">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className={styles.actions}>
            {digest.action && (
              <Button onClick={handleOpenSource} fullWidth>
                {digest.action}
              </Button>
            )}
            <Button variant="secondary" onClick={handleShare} fullWidth>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="16"
                height="16"
              >
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16,6 12,2 8,6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share on Farcaster
            </Button>
            <Button variant="ghost" onClick={handleOpenSource} fullWidth>
              View Source
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
