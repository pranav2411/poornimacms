"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function authenticateCredentials(payload: {
  uid: string;
  email: string;
  name: string;
  image: string;
}) {
  try {
    await signIn("credentials", {
      uid: payload.uid,
      email: payload.email,
      name: payload.name,
      image: payload.image,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: error.type };
    }

    console.error("NextAuth server-side authenticateCredentials error:", error);
    return { error: "Authentication failed" };
  }
}
