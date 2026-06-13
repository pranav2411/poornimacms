"use client";

import { useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm-context";

type Vendor = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  category: string;
};

export default function VendorsDirectoryClient({
  initialVendors,
}: {
  initialVendors: Vendor[];
}) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const { addToast } = useToast();
  const confirm = useConfirm();

  const handleRemoveVendor = async (vendorId: string, name: string) => {
    const confirmed = await confirm({
      title: "Remove Vendor",
      description: `Are you sure you want to remove ${name} from the vendors list?`,
      confirmText: "Remove",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    // Optimistic UI update
    const previousVendors = [...vendors];
    setVendors((prev) => prev.filter((v) => v.id !== vendorId));

    try {
      const res = await fetch(`/api/users/${vendorId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove vendor");
      }

      addToast({
        title: "Vendor removed",
        description: `${name} has been removed successfully.`,
        variant: "default",
      });
    } catch (err) {
      setVendors(previousVendors);
      addToast({
        title: "Failed to remove vendor",
        description: err instanceof Error ? err.message : "Operation failed.",
        variant: "destructive",
      });
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-heading font-jakarta">Vendors</h2>
          <p className="text-sm text-muted">Approved service partners.</p>
        </div>
      </div>

      {vendors.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12">
          <p className="text-sm font-medium text-heading">No vendors found</p>
          <p className="text-xs text-muted">Create vendor accounts in User Management first.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface/70 p-4 hover:bg-surface transition-all duration-200"
            >
              <div>
                <p className="text-sm font-semibold text-heading">{vendor.name}</p>
                <p className="text-xs text-muted">
                  Category: <span className="font-medium text-heading">{vendor.category}</span>
                </p>
                <p className="text-xs text-muted mt-0.5">{vendor.email}</p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => handleRemoveVendor(vendor.id, vendor.name)}
                className="rounded-full border-amber-500 bg-amber-500 text-white hover:bg-transparent hover:text-amber-500"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
