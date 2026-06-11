"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function authenticateCredentials(payload: {
  uid: string;
  email: string;
  name: string;
  image: string;
  redirectTo: string;
}) {
  try {
    await signIn("credentials", {
      uid: payload.uid,
      email: payload.email,
      name: payload.name,
      image: payload.image,
      redirectTo: payload.redirectTo,
    });
    return { success: true };
  } catch (error) {
    // If it's a redirect, we must rethrow it so Next.js can perform the redirect
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    
    // Check for NextAuth Redirect error structure or class
    if (error instanceof Error && (error.constructor.name === "RedirectError" || error.message.includes("redirect"))) {
      throw error;
    }

    if (error instanceof AuthError) {
      return { error: error.type };
    }

    console.error("NextAuth server-side authenticateCredentials error:", error);
    return { error: "Authentication failed" };
  }
}
