"use client";

import { useEffect, useState, useCallback } from "react";
import { useMiniKit, useQuickAuth } from "@coinbase/onchainkit/minikit";
import {
  AppShell,
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardMeta,
  Badge,
  Toggle,
  Skeleton,
  useToast,
} from "@/components";
import { categoryLabels, categoryVariants, SourceCategory } from "@/lib/sources";
import styles from "./sources.module.css";

interface SourceItem {
  id: string;
  name: string;
  type: string;
  url: string;
  category: SourceCategory;
  enabled: boolean;
  watched: boolean;
  lastFetchedAt: string | null;
}

export default function SourcesPage() {
  const { setMiniAppReady, isMiniAppReady } = useMiniKit();
  const { showToast } = useToast();
  const { data: authData } = useQuickAuth<{ userFid: string }>("/api/auth");

  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  useEffect(() => {
    async function fetchSources() {
      try {
        const res = await fetch("/api/sources");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setSources(data.sources || []);
      } catch {
        showToast("Failed to load sources", "error");
      } finally {
        setLoading(false);
      }
    }
    fetchSources();
  }, [showToast]);

  const toggleWatch = useCallback(
    async (sourceId: string, watched: boolean) => {
      if (!authData?.userFid) {
        showToast("Please sign in to watch sources", "warning");
        return;
      }

      setUpdating(sourceId);

      try {
        const res = await fetch("/api/watch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId, enabled: !watched }),
        });

        if (!res.ok) throw new Error("Failed to update");

        setSources((prev) =>
          prev.map((s) =>
            s.id === sourceId ? { ...s, watched: !watched } : s
          )
        );

        showToast(
          watched ? "Removed from watchlist" : "Added to watchlist",
          "success"
        );
      } catch {
        showToast("Failed to update watchlist", "error");
      } finally {
        setUpdating(null);
      }
    },
    [authData, showToast]
  );

  const groupedSources = sources.reduce(
    (acc, source) => {
      const category = source.category as SourceCategory;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(source);
      return acc;
    },
    {} as Record<SourceCategory, SourceItem[]>
  );

  return (
    <AppShell>
      <PageHeader
        title="Sources"
        subtitle="Monitor ecosystem updates"
      />

      {loading ? (
        <div className={styles.list}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.skeletonCard}>
              <Skeleton variant="title" width="60%" />
              <Skeleton width="40%" />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.sections}>
          {(Object.keys(categoryLabels) as SourceCategory[]).map((category) => {
            const categorySources = groupedSources[category];
            if (!categorySources?.length) return null;

            return (
              <section key={category} className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <Badge variant={categoryVariants[category]}>
                    {categoryLabels[category]}
                  </Badge>
                </h2>
                <div className={styles.list}>
                  {categorySources.map((source) => (
                    <Card key={source.id}>
                      <div className={styles.sourceRow}>
                        <div className={styles.sourceInfo}>
                          <CardTitle>{source.name}</CardTitle>
                          <CardMeta>
                            <span className={styles.sourceType}>
                              {source.type.toUpperCase()}
                            </span>
                            {source.lastFetchedAt && (
                              <span>
                                Updated{" "}
                                {formatTimeAgo(source.lastFetchedAt)}
                              </span>
                            )}
                          </CardMeta>
                        </div>
                        <Toggle
                          checked={source.watched}
                          onChange={() =>
                            toggleWatch(source.id, source.watched)
                          }
                          disabled={updating === source.id}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
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

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
