"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/role-context";

export default function DashboardShell({
  role,
  title,
  subtitle,
  userName,
  avatarUrl,
  children,
}: {
  role: UserRole;
  title: string;
  subtitle?: string;
  userName: string;
  avatarUrl: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    router.push("/login");
  };

  const handleProfile = () => {
    setMenuOpen(false);
    router.push(`/dashboard/${role}`);
  };

  const handleHelp = () => {
    setMenuOpen(false);
    window.location.href = "mailto:support@poornima.org";
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/80 px-8 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Poornima College Of Engineering
            </p>
            <h1 className="text-xl font-semibold text-heading">{title}</h1>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="relative" ref={menuRef}>
              <Button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Open user menu for ${userName}`}
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-3 rounded-full border-border bg-surface text-heading hover:bg-transparent hover:text-heading"
              >
                <div className="h-9 w-9 overflow-hidden rounded-full bg-border">
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="text-sm font-semibold">{userName}</span>
                <svg
                  viewBox="0 0 20 20"
                  className="h-4 w-4 text-muted"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 8l4 4 4-4" />
                </svg>
              </Button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-3 w-52 rounded-2xl border border-border bg-surface/95 p-2 shadow-lg"
                >
                  <Button
                    type="button"
                    onClick={handleProfile}
                    size="sm"
                    className="w-full justify-start border-border bg-surface text-heading hover:bg-transparent hover:text-heading"
                    role="menuitem"
                  >
                    Profile
                  </Button>
                  <Button
                    type="button"
                    onClick={handleHelp}
                    size="sm"
                    className="mt-2 w-full justify-start border-border bg-surface text-heading hover:bg-transparent hover:text-heading"
                    role="menuitem"
                  >
                    Get help
                  </Button>
                  <div className="my-1 h-px bg-border" />
                  <Button
                    type="button"
                    onClick={handleLogout}
                    size="sm"
                    className="mt-2 w-full justify-start border-amber-500 bg-amber-500 text-surface hover:bg-transparent hover:text-amber-500"
                    role="menuitem"
                  >
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 px-8 py-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
