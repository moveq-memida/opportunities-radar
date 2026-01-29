"use client";

import { useEffect, useState, useCallback } from "react";
import { useMiniKit, useQuickAuth } from "@coinbase/onchainkit/minikit";
import {
  AppShell,
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Toggle,
  useToast,
} from "@/components";
import { isAdmin } from "@/lib/auth";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const { setMiniAppReady, isMiniAppReady, context } = useMiniKit();
  const { showToast } = useToast();
  const { data: authData, isLoading: authLoading } = useQuickAuth<{
    userFid: string;
  }>("/api/auth");

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [triggeringFetch, setTriggeringFetch] = useState(false);

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  useEffect(() => {
    if (authData?.userFid) {
      // Check notification status
      checkNotificationStatus();
      // Check admin status
      setIsAdminUser(isAdmin(authData.userFid));
    }
  }, [authData]);

  const checkNotificationStatus = async () => {
    // Check if we have a stored notification token
    try {
      const res = await fetch("/api/notify/status");
      if (res.ok) {
        const data = await res.json();
        setNotificationsEnabled(data.enabled);
      }
    } catch {
      // Ignore errors
    }
  };

  const handleToggleNotifications = useCallback(async () => {
    // Notifications are managed via webhook - user adds/removes the mini app
    // This toggle just updates user preference on our server
    setLoading(true);

    try {
      if (notificationsEnabled) {
        await fetch("/api/notify/disable", { method: "POST" });
        setNotificationsEnabled(false);
        showToast("Notifications disabled", "success");
      } else {
        // Check if notification details are available
        if (context?.client?.notificationDetails) {
          await fetch("/api/notify/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: context.client.notificationDetails.token,
              url: context.client.notificationDetails.url,
            }),
          });
          setNotificationsEnabled(true);
          showToast("Notifications enabled", "success");
        } else {
          showToast("Add this app to enable notifications", "warning");
        }
      }
    } catch (err) {
      console.error("Failed to toggle notifications:", err);
      showToast("Failed to update notifications", "error");
    } finally {
      setLoading(false);
    }
  }, [notificationsEnabled, context, showToast]);

  const handleManualFetch = useCallback(async () => {
    setTriggeringFetch(true);
    try {
      const res = await fetch("/api/cron/fetch", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        showToast(`Fetched ${data.processed || 0} sources`, "success");
      } else {
        throw new Error("Failed to trigger fetch");
      }
    } catch {
      showToast("Failed to trigger fetch", "error");
    } finally {
      setTriggeringFetch(false);
    }
  }, [showToast]);

  const user = context?.user;

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        subtitle="Manage your preferences"
      />

      <div className={styles.sections}>
        {/* Account Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <Card>
            {authLoading ? (
              <CardContent>
                <p className={styles.loadingText}>Loading...</p>
              </CardContent>
            ) : user ? (
              <div className={styles.userInfo}>
                {user.pfpUrl && (
                  <img
                    src={user.pfpUrl}
                    alt={user.displayName || user.username || "User"}
                    className={styles.avatar}
                  />
                )}
                <div className={styles.userDetails}>
                  <p className={styles.userName}>
                    {user.displayName || user.username}
                  </p>
                  <p className={styles.userFid}>FID: {user.fid}</p>
                </div>
              </div>
            ) : (
              <CardContent>
                <p className={styles.notSignedIn}>
                  Sign in to manage your settings
                </p>
              </CardContent>
            )}
          </Card>
        </section>

        {/* Notifications Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Notifications</h2>
          <Card>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <CardTitle>Push Notifications</CardTitle>
                <p className={styles.settingDescription}>
                  Get notified about important updates
                </p>
              </div>
              <Toggle
                checked={notificationsEnabled}
                onChange={handleToggleNotifications}
                disabled={loading || !user}
              />
            </div>
          </Card>
        </section>

        {/* Admin Section */}
        {isAdminUser && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Admin</h2>
            <Card>
              <CardHeader>
                <CardTitle>Manual Fetch</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={styles.settingDescription}>
                  Trigger a manual fetch of all sources
                </p>
                <Button
                  onClick={handleManualFetch}
                  loading={triggeringFetch}
                  disabled={triggeringFetch}
                  variant="secondary"
                  fullWidth
                  style={{ marginTop: "var(--spacing-md)" }}
                >
                  Fetch Now
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* About Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>About</h2>
          <Card>
            <CardContent>
              <p className={styles.aboutText}>
                Opportunities Radar helps you stay on top of Base and Farcaster
                ecosystem updates, grants, and opportunities.
              </p>
              <p className={styles.version}>Version 1.0.0</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
