"use client";

import { ReactNode } from "react";
import styles from "@/app/styles/components/badge.module.css";

type BadgeVariant = "default" | "brand" | "success" | "warning" | "error";
type BadgeSize = "small" | "default" | "large";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "default",
  className = "",
}: BadgeProps) {
  const classes = [
    styles.badge,
    styles[variant],
    size !== "default" ? styles[size] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}
