"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { getNotifications } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { NotificationItem } from "@/lib/types";

export default function NotificationBell() {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  
  const processedNotificationsRef = useRef<Set<string>>(new Set());

  const unreadNotifications = notifications.filter((item) => !readIds.has(item.id));
  const unreadCount = unreadNotifications.length;

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const data = await getNotifications(10);
        if (!isMounted) return;

        const isFirstLoad = processedNotificationsRef.current.size === 0;

        data.forEach((item) => {
          const isSos = item.title.startsWith("🚨 SOS");
          const hasNotBeenProcessed = !processedNotificationsRef.current.has(item.id);

          if (isSos && hasNotBeenProcessed) {
            processedNotificationsRef.current.add(item.id);
            if (!isFirstLoad) {
              // Trigger a high-priority destructive screen toast
              addToast({
                title: item.title,
                description: "App-wide emergency alert triggered. Look at the updates dashboard.",
                variant: "destructive",
              });
            }
          } else {
            processedNotificationsRef.current.add(item.id);
          }
        });

        setNotifications(data);
      } catch {
        if (isMounted) setNotifications([]);
      }
    };

    loadNotifications();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Poll for updates every 30 seconds when active
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadNotifications();
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [addToast]);

  const handleMarkAllRead = () => {
    const ids = new Set(notifications.map((n) => n.id));
    setReadIds(ids);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
        size="icon"
        className={cn(
          "relative rounded-full border-border bg-surface text-heading hover:bg-transparent hover:text-heading",
          "hover:border-accent/50"
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9a6 6 0 1 1 12 0v4l1.5 2H4.5L6 13z" />
          <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-80 max-w-80 rounded-2xl border border-border bg-surface/90 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Updates
            </p>
            <Button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadNotifications.length === 0}
              size="xs"
              className="border-accent bg-accent text-white hover:bg-transparent hover:text-accent disabled:border-border disabled:bg-border disabled:text-muted"
            >
              Mark all read
            </Button>
          </div>
          {unreadNotifications.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No updates yet.</p>
          ) : (
            <div className="mt-3 grid gap-3">
              {unreadNotifications.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/60 bg-surface/70 p-3">
                  <p className="text-sm font-medium text-heading">{item.title}</p>
                  <p className="text-xs text-muted">{formatDateTime(item.timestamp)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

