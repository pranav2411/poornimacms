"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { getRedirectResult, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase";
import { authenticateCredentials } from "./actions";
import {
  createUser,
  getUserByFirebaseUid,
  updateUserByFirebaseUid,
  getUserByEmail,
  updateUserById,
} from "@/lib/api";
import Logo from "@/components/Logo";

type LoginState = "idle" | "loading" | "error";

const roleToDashboard: Record<string, string> = {
  faculty: "/dashboard/faculty",
  vendor: "/dashboard/vendor",
  admin: "/dashboard/admin",
  superadmin: "/dashboard/superadmin",
  super_admin: "/dashboard/superadmin",
};

const isAllowedCampusEmail = (email: string | null | undefined) =>
  Boolean(email && (email.toLowerCase().endsWith("@poornima.org") || email.toLowerCase().endsWith("@gmail.com")));

const getGoogleProfile = (user: {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}) => ({
  name: user.displayName?.trim() || user.email || "",
  avatarUrl: user.photoURL?.trim() || "/user-no-av.png",
  email: user.email || "",
});

const storeUserProfile = (profile: {
  id: string;
  uid: string;
  email: string | null;
  name: string;
  role: string;
  avatarUrl?: string | null;
}) => {
  window.localStorage.setItem(
    "poornima-user",
    JSON.stringify({
      id: profile.id,
      uid: profile.uid,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      avatarUrl: profile.avatarUrl ?? "/user-no-av.png",
    })
  );
};

async function syncUserProfile(user: any) {
  const token = await user.getIdToken();
  const googleProfile = getGoogleProfile(user);
  let profile;

  try {
    profile = await getUserByFirebaseUid(user.uid, token);
  } catch (err) {
    if (err instanceof Error && err.message === "User not found") {
      // If not found by firebase uid, check if they were pre-created by email!
      if (googleProfile.email) {
        try {
          const preCreatedUser = await getUserByEmail(googleProfile.email, token);
          // If found by email, link their firebaseUid and set their name from Google
          profile = await updateUserById(preCreatedUser.id, {
            firebaseUid: user.uid,
            name: preCreatedUser.name || googleProfile.name,
            avatarUrl: preCreatedUser.avatarUrl || googleProfile.avatarUrl,
          }, token);
        } catch (emailErr) {
          if (emailErr instanceof Error && emailErr.message === "User not found") {
            // Not found by email either, proceed with creating a new user
            profile = await createUser({
              firebaseUid: user.uid,
              name: googleProfile.name,
              email: googleProfile.email,
              avatarUrl: googleProfile.avatarUrl,
              role: "faculty",
              isVerified: true,
              isActive: true,
            }, token);
          } else {
            throw emailErr;
          }
        }
      } else {
        // No email in profile, just create new user
        profile = await createUser({
          firebaseUid: user.uid,
          name: googleProfile.name,
          email: googleProfile.email,
          avatarUrl: googleProfile.avatarUrl,
          role: "faculty",
          isVerified: true,
          isActive: true,
        }, token);
      }
    } else {
      throw err;
    }
  }

  const needsRefresh =
    profile.name !== googleProfile.name ||
    profile.email !== googleProfile.email ||
    profile.avatarUrl !== googleProfile.avatarUrl ||
    !profile.firebaseUid;

  if (needsRefresh) {
    if (profile.firebaseUid) {
      profile = await updateUserByFirebaseUid(profile.firebaseUid, {
        name: googleProfile.name,
        email: googleProfile.email,
        avatarUrl: googleProfile.avatarUrl,
      }, token);
    } else {
      profile = await updateUserById(profile.id, {
        firebaseUid: user.uid,
        name: googleProfile.name,
        email: googleProfile.email,
        avatarUrl: googleProfile.avatarUrl,
      }, token);
    }
  }

  return {
    ...profile,
    name: profile.name || googleProfile.name || "User",
    role: profile.role || "faculty",
    email: profile.email || googleProfile.email || "",
    avatarUrl: googleProfile.avatarUrl,
  };
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoginState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setState("error");
      if (errorParam === "AccessDenied") {
        setMessage("Use your @poornima.org Google account to sign in, and ensure your account has not been denied.");
      } else {
        setMessage(`Sign-in failed: ${errorParam}`);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const finishRedirectLogin = async () => {
      try {
        const auth = getFirebaseAuth();
        const result = await getRedirectResult(auth);
        const user = result?.user ?? auth.currentUser;
        if (!user) return;

        setState("loading");

        if (!isAllowedCampusEmail(user.email)) {
          setState("error");
          setMessage("Use your @poornima.org Google account to sign in.");
          return;
        }

        const profile = await syncUserProfile(user);
        const target = roleToDashboard[profile.role] ?? "/dashboard/faculty";

        // Synchronize NextAuth session via Server Action
        const nextAuthResult = await authenticateCredentials({
          uid: user.uid,
          email: user.email as string,
          name: profile.name,
          image: profile.avatarUrl || user.photoURL || "",
        });

        if (nextAuthResult?.error) {
          console.error("NextAuth signin error:", nextAuthResult.error);
          await firebaseSignOut(auth);
          setState("error");
          setMessage(`Could not establish NextAuth session: ${nextAuthResult.error}`);
          return;
        }

        storeUserProfile({
          id: profile.id,
          uid: user.uid,
          email: user.email,
          name: profile.name,
          role: profile.role,
          avatarUrl: profile.avatarUrl,
        });

        window.location.replace(target);
      } catch (error) {
        if (
          error instanceof FirebaseError &&
          error.code === "auth/no-auth-event"
        ) {
          return;
        }

        // If it's a redirect error, let Next.js handle it; keep loading state active
        if (error instanceof Error && (error.message === "NEXT_REDIRECT" || error.message.includes("redirect"))) {
          return;
        }

        setState("error");
        setMessage(
          error instanceof Error ? error.message : "Could not finish sign in."
        );
      }
    };

    finishRedirectLogin();
  }, [router]);

  const handleGoogleLogin = async () => {
    setState("loading");
    setMessage(null);

    try {
      const auth = getFirebaseAuth();
      const googleProvider = getGoogleProvider();
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!isAllowedCampusEmail(user.email)) {
        await firebaseSignOut(auth);
        setState("error");
        setMessage("Use your @poornima.org Google account to sign in.");
        return;
      }

      const profile = await syncUserProfile(user);
      const target = roleToDashboard[profile.role] ?? "/dashboard/faculty";

      // Synchronize NextAuth session via Server Action
      const nextAuthResult = await authenticateCredentials({
        uid: user.uid,
        email: user.email as string,
        name: profile.name,
        image: profile.avatarUrl || user.photoURL || "",
      });

      if (nextAuthResult?.error) {
        console.error("NextAuth signin error:", nextAuthResult.error);
        await firebaseSignOut(auth);
        setState("error");
        setMessage(`Could not establish NextAuth session: ${nextAuthResult.error}`);
        return;
      }

      storeUserProfile({
        id: profile.id,
        uid: user.uid,
        email: user.email,
        name: profile.name,
        role: profile.role,
        avatarUrl: profile.avatarUrl,
      });

      window.location.replace(target);
    } catch (error) {
      if (error instanceof FirebaseError && error.code === "auth/popup-closed-by-user") {
        setState("idle");
        return;
      }

      // If it's a redirect error, let Next.js handle it; keep loading state active
      if (error instanceof Error && (error.message === "NEXT_REDIRECT" || error.message.includes("redirect"))) {
        return;
      }

      setState("error");
      setMessage(
        error instanceof Error ? error.message : "Google sign-in failed."
      );
    }
  };

  return (
    <>
      {state === "loading" && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f4f6fb]/80 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-accent" />
            <p className="text-sm font-semibold text-slate-800 animate-pulse">
              Signing you in...
            </p>
          </div>
        </div>
      )}
      <div
        className="relative flex min-h-screen items-center justify-center bg-[#f4f6fb] bg-center bg-repeat px-6 py-12"
        style={{ backgroundImage: "url('/cmsbg.png')", backgroundSize: "480px" }}
      >
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10 flex w-full max-w-6xl flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_36px_96px_rgba(15,23,42,0.4)] lg:min-h-[620px] lg:flex-row">
        <div className="order-2 flex w-full flex-col justify-center px-10 py-12 lg:order-2 lg:w-1/2 lg:px-14">
          <Logo />
          <h1 className="mt-6 text-3xl font-semibold text-slate-900 lg:text-4xl">
            Welcome back to Poornima Complaint Management System
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
            Keep campus complaints moving with the quickest possible resolution.
          </p>
          {message && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {message}
            </div>
          )}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={state === "loading"}
            className="mt-10 inline-flex w-full items-center justify-center gap-3 rounded-full border border-black bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
              <svg
                viewBox="0 0 48 48"
                aria-hidden="true"
                className="h-5 w-5"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.76 1.22 9.32 3.62l6.96-6.96C36.07 2.5 30.4 0 24 0 14.62 0 6.4 5.38 2.44 13.22l8.14 6.32C12.6 13.2 17.85 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.5 24.5c0-1.74-.16-3.4-.46-5H24v9.5h12.7c-.55 2.96-2.2 5.47-4.68 7.16l7.2 5.6c4.2-3.88 6.28-9.6 6.28-17.26z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.58 28.14a14.5 14.5 0 0 1-.76-4.64c0-1.6.27-3.14.76-4.64l-8.14-6.32A23.94 23.94 0 0 0 0 23.5c0 3.86.92 7.5 2.44 10.78l8.14-6.14z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.4 0 12.08-2.12 16.1-5.76l-7.2-5.6c-2 1.36-4.56 2.16-8.9 2.16-6.14 0-11.36-3.68-13.34-9.1l-8.14 6.14C6.4 42.62 14.62 48 24 48z"
                />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
            </span>
            {state === "loading" ? "Connecting to Google..." : "Login with Google"}
          </button>
          <p className="mt-6 text-xs text-slate-500">
            Only @poornima.org accounts are permitted.
          </p>
        </div>
        <div className="relative order-1 h-72 w-full lg:order-1 lg:h-auto lg:w-1/2">
          <Image
            src="/loginpage.png"
            alt="Students collaborating"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8 text-white">
            <p className="text-xl font-semibold leading-snug">
              Poornima College Of Engineering
            </p>
            <p className="mt-3 text-sm text-white/80">
              NAAC A+ (AUTONOMOUS)
            </p>
          </div>
        </div>
      </div>
    </div>
  </>
);
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4f6fb]">
          <div className="text-slate-500 font-semibold animate-pulse">Loading...</div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
