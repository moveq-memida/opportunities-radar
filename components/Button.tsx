"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";
import styles from "@/app/styles/components/button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "small" | "default" | "large";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "default",
  fullWidth = false,
  iconOnly = false,
  loading = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    size !== "default" ? styles[size] : "",
    fullWidth ? styles.fullWidth : "",
    iconOnly ? styles.iconOnly : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ animation: "spin 1s linear infinite" }}
        >
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
      ) : (
        children
      )}
    </button>
  );
}
