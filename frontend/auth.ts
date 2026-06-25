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
        if (!credentials || !credentials.uid || !credentials.email) {
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
      if (!user.email) {
        return false;
      }

      // Enforce Poornima campus emails only
      if (!user.email.toLowerCase().endsWith("@poornima.org") && !user.email.toLowerCase().endsWith("@gmail.com")) {
        return false;
      }

      const supabase = createAdminClient();

      try {
        const { data: dbUser, error } = await supabase
          .from("users")
          .select("id, status, avatar_url")
          .eq("email", user.email)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Database query error in signIn callback:", error);
          return false;
        }

        if (!dbUser) {
          // INSERT new user with pending status and null role
          const { error: insertError } = await supabase.from("users").insert({
            email: user.email,
            name: user.name || "",
            avatar_url: user.image || "",
            role: null,
            status: "pending",
            is_verified: false,
            is_active: true,
          });

          if (insertError) {
            console.error("Failed to insert new user in signIn callback:", insertError);
            return false;
          }

          // Notify backend of new pending user so push notifications are dispatched to superadmins
          try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
            fetch(`${apiBase}/users/notify-pending`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: user.email,
                name: user.name || "",
              }),
            }).catch((err) => console.error("Failed to post notify-pending asynchronously:", err));
          } catch (e) {
            console.error("Failed to notify backend of pending user:", e);
          }

          return true;
        }

        if (dbUser.status === "denied") {
          return false; // block sign-in
        }

        // Update avatar_url if it has changed or is null
        if (user.image && dbUser.avatar_url !== user.image) {
          const { error: updateError } = await supabase
            .from("users")
            .update({ avatar_url: user.image })
            .eq("id", dbUser.id);
          if (updateError) {
            console.error("Failed to update user avatar_url in signIn callback:", updateError);
          }
        }

        return true; // allow sign-in
      } catch (err) {
        console.error("Unhandled error in signIn callback:", err);
        return false;
      }
    },

    async jwt({ token }) {
      const now = Date.now();
      const lastChecked = token.lastChecked as number | undefined;
      const cacheDuration = 10000; // 10 seconds cache

      if (token.email && (!token.userId || !lastChecked || now - lastChecked > cacheDuration)) {
        const supabase = createAdminClient();
        const { data: dbUser, error } = await supabase
          .from("users")
          .select("id, name, role, status, department_id, avatar_url")
          .eq("email", token.email)
          .single();

        if (!error && dbUser) {
          token.userId = dbUser.id;
          token.name = dbUser.name;
          token.picture = dbUser.avatar_url;
          token.role = dbUser.role === "super_admin" ? "superadmin" : dbUser.role;
          token.status = dbUser.status;
          token.departmentId = dbUser.department_id;
          token.lastChecked = now;
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
        if (token.name) session.user.name = token.name as string;
        if (token.picture) session.user.image = token.picture as string;
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
