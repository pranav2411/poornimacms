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
      organizationId?: string | null;
      orgCode?: string | null;
      orgLogoUrl?: string | null;
      orgName?: string | null;
      orgBannerUrl?: string | null;
    } & DefaultSession["user"];
  }

  interface JWT {
    userId?: string;
    role?: "superadmin" | "admin" | "faculty" | "vendor" | null;
    status?: "pending" | "verified" | "denied";
    departmentId?: string | null;
    organizationId?: string | null;
    orgCode?: string | null;
    orgLogoUrl?: string | null;
    orgName?: string | null;
    orgBannerUrl?: string | null;
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

      // Enforce allowed email domains
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
          // Reject sign-in for unknown/uninvited users to enforce tenant boundaries.
          // They must register an organization first via the /register-org page.
          return false;
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
          .select("id, name, role, status, department_id, avatar_url, organization_id, organizations(code, logo_url, name, banner_url)")
          .eq("email", token.email)
          .single();

        if (!error && dbUser) {
          token.userId = dbUser.id;
          token.name = dbUser.name;
          token.picture = dbUser.avatar_url;
          token.role = dbUser.role === "super_admin" ? "superadmin" : dbUser.role;
          token.status = dbUser.status;
          token.departmentId = dbUser.department_id;
          token.organizationId = dbUser.organization_id;
          token.orgCode = (dbUser as any).organizations?.code || null;
          token.orgLogoUrl = (dbUser as any).organizations?.logo_url || null;
          token.orgName = (dbUser as any).organizations?.name || null;
          token.orgBannerUrl = (dbUser as any).organizations?.banner_url || null;
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
        session.user.organizationId = token.organizationId as string;
        session.user.orgCode = token.orgCode as string;
        session.user.orgLogoUrl = token.orgLogoUrl as string;
        session.user.orgName = token.orgName as string;
        session.user.orgBannerUrl = token.orgBannerUrl as string;
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
