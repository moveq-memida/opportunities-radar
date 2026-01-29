"use client";

import { ReactNode } from "react";
import styles from "@/app/styles/components/card.module.css";

interface CardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function Card({ children, onClick, className = "" }: CardProps) {
  const classes = [
    styles.card,
    onClick ? styles.cardClickable : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {children}
      </button>
    );
  }

  return <div className={classes}>{children}</div>;
}

export function CardHeader({ children }: { children: ReactNode }) {
  return <div className={styles.cardHeader}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className={styles.cardTitle}>{children}</h3>;
}

export function CardMeta({ children }: { children: ReactNode }) {
  return <div className={styles.cardMeta}>{children}</div>;
}

export function CardContent({ children }: { children: ReactNode }) {
  return <div className={styles.cardContent}>{children}</div>;
}

export function CardFooter({ children }: { children: ReactNode }) {
  return <div className={styles.cardFooter}>{children}</div>;
}
