"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getOrganizationById, updateBranding } from "@/lib/api";

export default function BrandingSettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form Fields
  const [orgName, setOrgName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [orgCode, setOrgCode] = useState("");

  useEffect(() => {
    async function loadBranding() {
      const orgId = session?.user?.organizationId;
      if (!orgId) return;

      try {
        const org = await getOrganizationById(orgId);
        setOrgName(org.name);
        setOrgCode(org.code);
        setLogoUrl(org.logoUrl || "");
        setBannerUrl(org.bannerUrl || "");
      } catch (err: any) {
        console.error("Failed to load organization branding details:", err);
        setError("Could not load organization configurations.");
      } finally {
        setFetching(false);
      }
    }

    if (session?.user?.organizationId) {
      loadBranding();
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!orgName.trim() || orgName.trim().length < 3) {
      setError("Organization Name must be at least 3 characters");
      return;
    }

    setLoading(true);
    try {
      // 1. Call Backend API to patch branding
      await updateBranding({
        name: orgName.trim(),
        logoUrl: logoUrl.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
      });

      // 2. Refresh the next-auth session to update logo/banner across the UI
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          orgLogoUrl: logoUrl.trim() || null,
          orgBannerUrl: bannerUrl.trim() || null,
        }
      });

      setSuccess(true);
    } catch (err: any) {
      console.error("Failed to save branding details:", err);
      setError(err?.message || "An error occurred while updating branding configuration.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Branding Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Customize the application logo and title for your organization.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-rose-950/60 border border-rose-500/20 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-950/60 border border-emerald-500/20 text-emerald-300 text-sm">
            Branding settings updated successfully! Your changes will propagate across the portal immediately.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Org Code (Disabled) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Organization Short Code
            </label>
            <input
              type="text"
              disabled
              value={orgCode}
              className="w-full bg-slate-950/30 border border-white/5 rounded-lg px-4 py-3 text-slate-500 cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              The short code prefix is permanent and cannot be modified after registration.
            </p>
          </div>

          {/* Org Name */}
          <div>
            <label htmlFor="orgName" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Institution / Organization Name
            </label>
            <input
              id="orgName"
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Poornima College of Engineering"
              className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label htmlFor="logoUrl" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Custom Logo (Image URL)
            </label>
            <input
              id="logoUrl"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="e.g. https://domain.com/logo.png"
              className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Provide a valid link to a hosted image (PNG/JPG). Recommend dimensions of 120x120px with transparent background.
            </p>
          </div>

          {/* Banner URL */}
          <div>
            <label htmlFor="bannerUrl" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Custom Dashboard/Login Banner (Image URL)
            </label>
            <input
              id="bannerUrl"
              type="url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="e.g. https://domain.com/banner.png"
              className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Provide a link to a banner image (PNG/JPG). Displays on the login screen and sidebar footer.
            </p>
          </div>

          {/* Preview Panel */}
          <div className="flex gap-4">
            {logoUrl.trim() && (
              <div className="flex-1 p-4 rounded-lg bg-slate-950/40 border border-white/5 flex flex-col items-center gap-3">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Logo Preview</span>
                <img
                  src={logoUrl}
                  alt="Logo Preview"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/PCElogo.png";
                  }}
                  className="h-16 w-16 object-contain rounded border border-white/10 p-1"
                />
              </div>
            )}

            {bannerUrl.trim() && (
              <div className="flex-1 p-4 rounded-lg bg-slate-950/40 border border-white/5 flex flex-col items-center gap-3">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Banner Preview</span>
                <img
                  src={bannerUrl}
                  alt="Banner Preview"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/loginpage.png";
                  }}
                  className="h-16 w-full object-cover rounded border border-white/10"
                />
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-lg hover:shadow-indigo-500/10 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all duration-200"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              "Save Branding Configurations"
            )}
          </button>

        </form>
      </div>
    </div>
  );
}
