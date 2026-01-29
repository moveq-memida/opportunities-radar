"use client";

import styles from "@/app/styles/components/skeleton.module.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: "text" | "title" | "card" | "circle" | "avatar";
  className?: string;
}

export function Skeleton({
  width,
  height,
  variant = "text",
  className = "",
}: SkeletonProps) {
  const variantClass =
    variant === "text"
      ? styles.skeletonText
      : variant === "title"
        ? styles.skeletonTitle
        : variant === "card"
          ? styles.skeletonCard
          : variant === "circle"
            ? styles.skeletonCircle
            : variant === "avatar"
              ? styles.skeletonAvatar
              : "";

  const classes = [styles.skeleton, variantClass, className]
    .filter(Boolean)
    .join(" ");

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return <div className={classes} style={style} />;
}

export function SkeletonCard() {
  return (
    <div style={{ padding: "var(--spacing-md)" }}>
      <Skeleton variant="title" />
      <Skeleton width="100%" />
      <Skeleton width="80%" />
      <Skeleton width="60%" />
    </div>
  );
}
