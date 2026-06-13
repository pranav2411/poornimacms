import NextAuth, { DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createAdminClient } from "@/lib/supabase/admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "superadmin" | "admin" | "faculty" | "vendor" | null;
      status: "pending" | "verified" | "denied";
      departmentId?: string | null;
    } & DefaultSession["user"];
  }

  interface JWT {
    userId?: string;
    role?: "superadmin" | "admin" | "faculty" | "vendor" | null;
    status?: "pending" | "verified" | "denied";
    departmentId?: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Firebase",
      credentials: {
        uid: { label: "UID", type: "text" },
        email: { label: "Email", type: "text" },
        name: { label: "Name", type: "text" },
        image: { label: "Image", type: "text" },
      },
      async authorize(credentials) {
        console.log("NextAuth authorize callback triggered. Credentials:", credentials);
        if (!credentials || !credentials.uid || !credentials.email) {
          console.log("Authorize failed: missing credentials.uid or credentials.email");
          return null;
        }
        return {
          id: credentials.uid as string,
          name: credentials.name as string,
          email: credentials.email as string,
          image: credentials.image as string,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, credentials }) {
      console.log("NextAuth signIn callback triggered. User:", user, "Credentials:", credentials);
      if (!user.email) {
        console.log("No email in user object");
        return false;
      }

      // Enforce Poornima campus emails only
      if (!user.email.toLowerCase().endsWith("@poornima.org")) {
        console.log("Email does not end with @poornima.org:", user.email);
        return false;
      }

      const supabase = createAdminClient();

      try {
        const { data: dbUser, error } = await supabase
          .from("users")
          .select("id, status")
          .eq("email", user.email)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Database query error in signIn callback:", error);
          return false;
        }

        if (!dbUser) {
          console.log("User not found in DB. Attempting to insert...");
          // INSERT new user with pending status and null role
          const { error: insertError } = await supabase.from("users").insert({
            email: user.email,
            name: user.name || "",
            image: user.image || "",
            role: null,
            status: "pending",
            is_verified: false,
            is_active: true,
          });

          if (insertError) {
            console.error("Failed to insert new user in signIn callback:", insertError);
            return false;
          }
          console.log("Successfully inserted new pending user.");
          return true;
        }

        console.log("Found DB user:", dbUser);
        if (dbUser.status === "denied") {
          console.log("User status is denied. Blocking sign-in.");
          return false; // block sign-in
        }

        console.log("Allowing sign-in for verified/pending user.");
        return true; // allow sign-in
      } catch (err) {
        console.error("Unhandled error in signIn callback:", err);
        return false;
      }
    },

    async jwt({ token }) {
      if (token.email) {
        const supabase = createAdminClient();
        const { data: dbUser, error } = await supabase
          .from("users")
          .select("id, role, status, department_id")
          .eq("email", token.email)
          .single();

        if (!error && dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.departmentId = dbUser.department_id;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as any;
        session.user.status = token.status as any;
        session.user.departmentId = token.departmentId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/unauthorized",
  },
  secret: process.env.AUTH_SECRET,
});
