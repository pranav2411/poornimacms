"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signOut } from "firebase/auth";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase";
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
  const [navOpen, setNavOpen] = useState(false);
  const [storedUser, setStoredUser] = useState<{
    name?: string;
    avatarUrl?: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rawUser = window.localStorage.getItem("poornima-user");
    if (!rawUser) return;

    try {
      const parsed = JSON.parse(rawUser) as {
        name?: string;
        avatarUrl?: string;
      };
      setStoredUser(parsed);
    } catch {
      setStoredUser(null);
    }
  }, []);

  const resolvedUserName = storedUser?.name?.trim() || userName;
  const resolvedAvatarUrl = storedUser?.avatarUrl?.trim() || avatarUrl;

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
    window.localStorage.removeItem("poornima-user");
    void signOut(getFirebaseAuth()).finally(() => {
      router.replace("/login");
    });
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
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <div className="hidden lg:flex">
        <Sidebar role={role} />
      </div>

      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%]">
            <Sidebar role={role} className="h-full w-full" />
            <Button
              type="button"
              onClick={() => setNavOpen(false)}
              size="icon-sm"
              aria-label="Close menu"
              className="absolute right-3 top-3 border-border bg-surface text-heading shadow"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12" />
                <path d="M6 18L18 6" />
              </svg>
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-border bg-surface/80 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
            <Button
              type="button"
              onClick={() => setNavOpen(true)}
              size="icon"
              aria-label="Open menu"
              className="lg:hidden border-border bg-surface text-heading"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
              </svg>
            </Button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Poornima College Of Engineering
              </p>
              <h1 className="text-xl font-semibold text-heading">{title}</h1>
              {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
            </div>
            <div className="absolute right-4 top-4 flex items-center gap-3 sm:right-6 sm:top-4 lg:right-8">
              <NotificationBell />
              <div className="relative" ref={menuRef}>
                <Button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={`Open user menu for ${resolvedUserName}`}
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex h-10 w-10 items-center justify-center gap-2 rounded-full border-border bg-surface p-0 text-heading hover:bg-transparent hover:text-heading sm:h-12 sm:w-auto sm:px-4"
                >
                  <div className="h-9 w-9 overflow-hidden rounded-full bg-border">
                    <Image
                      src={resolvedAvatarUrl}
                      alt={resolvedUserName}
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="hidden text-sm font-semibold sm:inline">
                    {resolvedUserName}
                  </span>
                  <svg
                    viewBox="0 0 20 20"
                    className="hidden h-4 w-4 text-muted sm:inline"
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
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
