"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { registerFCMToken } from "@/lib/api";
import { useToast } from "@/lib/toast";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export default function FCMHandler() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const isRegisteredRef = useRef<string | null>(null);

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

        if (Notification.permission === "default") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            console.log("FCM: Push notification permission denied by user.");
            return;
          }
        } else if (Notification.permission === "denied") {
          console.log("FCM: Push notification permission previously denied.");
          return;
        }

        const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        const swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
          scope: "/",
        });
        console.log("FCM: Service worker registered successfully on scope:", swRegistration.scope);

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.warn("FCM: NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing in env vars.");
          return;
        }

        const token = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: swRegistration,
        });

        if (token) {
          console.log("FCM: Registration token obtained:", token);
          
          const cachedToken = localStorage.getItem(`fcm_token_${session.user.id}`);
          if (cachedToken !== token) {
            await registerFCMToken(session.user.id, token);
            localStorage.setItem(`fcm_token_${session.user.id}`, token);
          }
          
          isRegisteredRef.current = session.user.id;
        } else {
          console.warn("FCM: No registration token returned by Firebase.");
        }

        unsubscribe = onMessage(messaging, (payload) => {
          console.log("FCM: Foreground message received:", payload);
          
          const title = payload.notification?.title || "Poornima CMS Alert";
          const body = payload.notification?.body || "";
          
          addToast({
            title: title,
            description: body,
            variant: title.includes("SOS") || title.includes("Cancelled") ? "destructive" : "default"
          });

          if (document.hidden) {
            new Notification(title, {
              body: body,
              icon: "/favicon.ico",
            });
          }
        });

      } catch (error) {
        console.error("FCM: Error initializing and registering notifications:", error);
      }
    };

    setupFCM();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [session?.user?.id, addToast]);

  return null;
}
