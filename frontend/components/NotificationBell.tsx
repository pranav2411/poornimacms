"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { getNotifications, deleteNotification } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useSession } from "next-auth/react";
import type { NotificationItem } from "@/lib/types";

export default function NotificationBell() {
  const { addToast } = useToast();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const processedNotificationsRef = useRef<Set<string>>(new Set());

  const unreadNotifications = notifications.filter((item) => !readIds.has(item.id));
  const unreadCount = unreadNotifications.length;

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const data = await getNotifications(10, userId);
        if (!isMounted) return;

        const isFirstLoad = processedNotificationsRef.current.size === 0;

        data.forEach((item) => {
          const hasNotBeenProcessed = !processedNotificationsRef.current.has(item.id);

          if (hasNotBeenProcessed) {
            processedNotificationsRef.current.add(item.id);
            if (!isFirstLoad) {
              const isSos = item.title.startsWith("🚨 SOS");

              // 1. Trigger screen toast
              addToast({
                title: item.title,
                description: isSos
                  ? "App-wide emergency alert triggered."
                  : "New system update received.",
                variant: isSos ? "destructive" : "default",
              });
            }
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
  }, [addToast, userId]);

  const handleMarkAllRead = async () => {
    // Delete all current notifications on backend
    const deletePromises = notifications.map((n) => deleteNotification(n.id));
    try {
      await Promise.all(deletePromises);
    } catch (err) {
      console.error("Failed to delete all notifications", err);
    }
    const ids = new Set(notifications.map((n) => n.id));
    setReadIds(ids);
    setNotifications([]);
  };

  const handleDismissNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
  };

  const handleTestPopup = () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Notifications are not supported in this browser.");
      return;
    }

    const showNotification = () => {
      const title = "Test Notification";
      const options = {
        body: "This is a test pop-up notification from Chrome for Poornima CMS!",
        icon: "/PCElogo.png",
        badge: "/PCElogo.png",
        vibrate: [200, 100, 200],
      };

      if ("serviceWorker" in navigator && "showNotification" in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.getRegistration()
          .then((registration) => {
            if (registration && registration.showNotification) {
              registration.showNotification(title, options);
            } else {
              new Notification(title, options);
            }
          })
          .catch((err) => {
            console.warn("FCM: Error getting registration, falling back:", err);
            new Notification(title, options);
          });
      } else {
        new Notification(title, options);
      }
    };

    if (Notification.permission === "granted") {
      showNotification();
    } else {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          showNotification();
        } else {
          alert("Notification permission was denied. Please allow notifications in Chrome settings.");
        }
      });
    }
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
        <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-80 max-w-80 rounded-2xl border border-border bg-surface/90 p-4 shadow-lg z-50">
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
            <div className="mt-3 grid gap-3 max-h-60 overflow-y-auto">
              {unreadNotifications.map((item) => (
                <div key={item.id} className="relative rounded-xl border border-border/60 bg-surface/70 p-3 pr-8">
                  <p className="text-sm font-medium text-heading">{item.title}</p>
                  <p className="text-xs text-muted">{formatDateTime(item.timestamp)}</p>
                  <button
                    onClick={(e) => handleDismissNotification(item.id, e)}
                    className="absolute right-2 top-2 text-muted hover:text-heading transition-colors"
                    aria-label="Dismiss"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 border-t border-border/60 pt-3 flex justify-end">
            <button
              onClick={handleTestPopup}
              type="button"
              className="text-[0.7rem] font-medium text-muted hover:text-heading flex items-center gap-1 transition-colors"
            >
              🔔 Test Chrome Pop-up
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
