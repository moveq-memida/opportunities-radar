"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import {
  AppShell,
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardMeta,
  CardContent,
  Badge,
  Skeleton,
} from "@/components";
import { categoryLabels, categoryVariants, SourceCategory } from "@/lib/sources";
import styles from "./styles/home.module.css";

interface DigestItem {
  id: string;
  title: string;
  bullets: string[];
  action?: string;
  score: number;
  tags: string[];
  sourceName: string;
  sourceCategory: SourceCategory;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const { setMiniAppReady, isMiniAppReady } = useMiniKit();
  const [digests, setDigests] = useState<DigestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  useEffect(() => {
    async function fetchDigests() {
      try {
        const res = await fetch("/api/digests");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setDigests(data.digests || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchDigests();
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Updates"
        subtitle="Latest ecosystem opportunities"
      />

      {loading ? (
        <div className={styles.list}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonCard}>
              <Skeleton variant="title" />
              <Skeleton width="100%" />
              <Skeleton width="80%" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.empty}>
          <p>{error}</p>
        </div>
      ) : digests.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p>No updates yet</p>
          <span>Check back later for new opportunities</span>
        </div>
      ) : (
        <div className={styles.list}>
          {digests.map((digest) => (
            <Card
              key={digest.id}
              onClick={() => router.push(`/d/${digest.id}`)}
            >
              <CardHeader>
                <CardTitle>{digest.title}</CardTitle>
                {digest.score >= 70 && (
                  <Badge variant="warning" size="small">
                    Hot
                  </Badge>
                )}
              </CardHeader>
              <CardMeta>
                <Badge
                  variant={categoryVariants[digest.sourceCategory]}
                  size="small"
                >
                  {categoryLabels[digest.sourceCategory]}
                </Badge>
                <span>{digest.sourceName}</span>
                <span>{formatTimeAgo(digest.createdAt)}</span>
              </CardMeta>
              <CardContent>
                <ul className={styles.bullets}>
                  {digest.bullets.slice(0, 2).map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
