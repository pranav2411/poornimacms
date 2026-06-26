"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { registerFCMToken } from "@/lib/api";
import { useToast } from "@/lib/toast";

const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APPID;
const messagingSenderId =
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID ||
  (appId ? appId.split(":")[1] : undefined);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_APIKEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTHDOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECTID,
  appId: appId,
  messagingSenderId: messagingSenderId,
};

// --------------------------------------------------------------------------
// Permission-prompt banner
// Shown when:
//   • permission === "default"  → ask the user to allow
//   • permission === "denied"   → tell them to enable from Chrome settings
// --------------------------------------------------------------------------
function NotificationPermissionBanner({
  status,
  onAllow,
  onDismiss,
}: {
  status: "default" | "denied";
  onAllow: () => void;
  onDismiss: () => void;
}) {
  const isDenied = status === "denied";

  return (
    <div
      role="alertdialog"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "1.25rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "min(92vw, 26rem)",
        borderRadius: "1rem",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(18,18,28,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        padding: "1rem 1.125rem",
        display: "flex",
        gap: "0.75rem",
        alignItems: "flex-start",
      }}
    >
      {/* Bell icon */}
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          marginTop: "0.1rem",
          fontSize: "1.25rem",
          lineHeight: 1,
        }}
      >
        🔔
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "#f1f1f1",
            lineHeight: 1.4,
          }}
        >
          {isDenied ? "Notifications are blocked" : "Enable push notifications"}
        </p>
        <p
          style={{
            margin: "0.25rem 0 0",
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.5,
          }}
        >
          {isDenied
            ? "To receive alerts, open Chrome's Site Settings → Notifications and set Poornima CMS to Allow."
            : "Get instant alerts for complaints, SOS events, and assignments — even when the tab is closed."}
        </p>

        {!isDenied && (
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginTop: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={onAllow}
              style={{
                padding: "0.375rem 0.875rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "hsl(var(--accent, 258 78% 65%))",
                color: "#fff",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              Allow notifications
            </button>
            <button
              onClick={onDismiss}
              style={{
                padding: "0.375rem 0.875rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.75rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Not now
            </button>
          </div>
        )}

        {isDenied && (
          <button
            onClick={onDismiss}
            style={{
              marginTop: "0.625rem",
              padding: "0.375rem 0.875rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.75rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Got it
          </button>
        )}
      </div>

      {/* Close × */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.35)",
          cursor: "pointer",
          padding: "0",
          lineHeight: 1,
          fontSize: "1rem",
          marginTop: "0.05rem",
        }}
      >
        ✕
      </button>
    </div>
  );
}

// --------------------------------------------------------------------------
// Main FCMHandler
// --------------------------------------------------------------------------
export default function FCMHandler() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const isRegisteredRef = useRef<string | null>(null);

  // "default" = not yet asked, "denied" = blocked, null = granted or not applicable
  const [bannerStatus, setBannerStatus] = useState<"default" | "denied" | null>(null);
  const bannerDismissedRef = useRef(false);

  // On mount, check current permission state and show banner if needed
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      bannerDismissedRef.current
    )
      return;

    const perm = Notification.permission;
    if (perm === "default") setBannerStatus("default");
    else if (perm === "denied") setBannerStatus("denied");
  }, []);

  const dismissBanner = () => {
    bannerDismissedRef.current = true;
    setBannerStatus(null);
  };

  // Called when user clicks "Allow notifications" in the banner
  const handleAllowClick = async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      dismissBanner();
      // Show native notification to verify immediately
      if ("Notification" in window) {
        const title = "Notifications Enabled!";
        const options = {
          body: "You will now receive alerts from Poornima CMS.",
          icon: "/PCElogo.png",
          badge: "/PCElogo.png",
        };

        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready
            .then((registration) => {
              registration.showNotification(title, options);
            })
            .catch(() => {
              new Notification(title, options);
            });
        } else {
          new Notification(title, options);
        }
      }
      // Trigger FCM setup now that we have permission
      setupFCMRef.current?.();
    } else if (permission === "denied") {
      setBannerStatus("denied");
    }
  };

  // Store setupFCM so we can call it after the user grants permission
  const setupFCMRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    if (isRegisteredRef.current === session.user.id) return;

    let unsubscribe: (() => void) | undefined;

    const setupFCM = async () => {
      try {
        if (
          typeof window === "undefined" ||
          !("serviceWorker" in navigator) ||
          !("Notification" in window) ||
          !("PushManager" in window)
        ) {
          console.warn("FCM: Push notifications are not supported in this browser.");
          return;
        }

        // If permission not granted, the banner will handle asking — bail out here
        if (Notification.permission !== "granted") {
          return;
        }

        const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        const swRegistration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          { scope: "/" }
        );

        const vapidKey = (process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || process.env.NEXT_PUBLIC_FIREBASE_VAPIDKEY)?.trim();
        if (!vapidKey) {
          console.warn("FCM: NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing.");
          return;
        }

        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: swRegistration,
        });

        if (token) {
          const cachedToken = localStorage.getItem(`fcm_token_${session.user.id}`);
          if (cachedToken !== token) {
            await registerFCMToken(session.user.id, token);
            localStorage.setItem(`fcm_token_${session.user.id}`, token);
          }
          isRegisteredRef.current = session.user.id;
        } else {
          console.warn("FCM: No registration token returned.");
        }

        // Foreground message handler
        unsubscribe = onMessage(messaging, (payload) => {
          const title = payload.notification?.title || "Poornima CMS Alert";
          const body = payload.notification?.body || "";
          const link =
            (payload.data as Record<string, string> | undefined)?.link ||
            (payload.fcmOptions as { link?: string } | undefined)?.link ||
            "/";

          // 1. Always show a native Chrome notification (works on desktop + Android)
          //    The service worker handles *background* messages; this covers *foreground*.
          if (Notification.permission === "granted") {
            const n = new Notification(title, {
              body,
              icon: "/PCElogo.png",
              badge: "/PCElogo.png",
              tag: "poornima-cms-fg",
              // Vibrate pattern for Android (Chrome 45+)
              // @ts-expect-error – vibrate is non-standard but supported
              vibrate: [200, 100, 200],
            });
            n.onclick = () => {
              window.focus();
              if (link && link !== "/") window.location.href = link;
              n.close();
            };
          }

          // 2. Also show the in-app toast
          addToast({
            title,
            description: body,
            variant:
              title.includes("SOS") || title.includes("Cancelled")
                ? "destructive"
                : "default",
          });
        });
      } catch (error) {
        console.error("FCM: Initialization error:", error);
      }
    };

    // Keep a ref so the banner's "Allow" button can trigger it
    setupFCMRef.current = setupFCM;
    setupFCM();

    return () => {
      unsubscribe?.();
    };
  }, [session?.user?.id, addToast]);

  if (!bannerStatus || bannerDismissedRef.current) return null;

  return (
    <NotificationPermissionBanner
      status={bannerStatus}
      onAllow={handleAllowClick}
      onDismiss={dismissBanner}
    />
  );
}