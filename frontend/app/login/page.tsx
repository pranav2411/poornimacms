"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-[#f4f6fb] bg-center bg-repeat px-6 py-12"
      style={{ backgroundImage: "url('/cmsbg.png')", backgroundSize: "480px" }}
    >
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10 flex w-full max-w-6xl flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_36px_96px_rgba(15,23,42,0.4)] lg:min-h-[620px] lg:flex-row">
        <div className="order-2 flex w-full flex-col justify-center px-10 py-12 lg:order-2 lg:w-1/2 lg:px-14">
          <div className="flex items-center gap-3 text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ede9fe] text-lg font-semibold">
              P
            </span>
            <span className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              Poornima CMS
            </span>
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-slate-900 lg:text-4xl">
            Welcome back to Poornima Complaint Management System
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
            Keep campus complaints moving with the quickest possible resolution.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/faculty")}
            className="mt-10 inline-flex w-full items-center justify-center gap-3 rounded-full border border-black bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
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
            Login with Google
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
  );
}
