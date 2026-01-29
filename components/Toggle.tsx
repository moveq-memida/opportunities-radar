"use client";

import { useId } from "react";
import styles from "@/app/styles/components/toggle.module.css";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  className = "",
}: ToggleProps) {
  const id = useId();

  const classes = [
    styles.toggle,
    disabled ? styles.toggleDisabled : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label htmlFor={id} className={classes}>
      <input
        id={id}
        type="checkbox"
        className={styles.toggleInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className={styles.toggleTrack} />
      <span className={styles.toggleKnob} />
      {label && <span className={styles.toggleLabel}>{label}</span>}
    </label>
  );
}
