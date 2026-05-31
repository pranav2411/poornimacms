"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notifications as notificationData } from "@/lib/mockData";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(notificationData);
  const unreadCount = notifications.length;

  const handleMarkAllRead = () => {
    setNotifications([]);
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
        <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-border bg-surface/90 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Updates
            </p>
            <Button
              type="button"
              onClick={handleMarkAllRead}
              disabled={notifications.length === 0}
              size="xs"
              className="border-accent bg-accent text-white hover:bg-transparent hover:text-accent disabled:border-border disabled:bg-border disabled:text-muted"
            >
              Mark all read
            </Button>
          </div>
          {notifications.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No updates yet.</p>
          ) : (
            <div className="mt-3 grid gap-3">
              {notifications.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/60 bg-surface/70 p-3">
                  <p className="text-sm font-medium text-heading">{item.title}</p>
                  <p className="text-xs text-muted">{item.timestamp}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
