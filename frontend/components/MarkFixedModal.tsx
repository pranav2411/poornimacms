"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { ImagePlus, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MarkFixedModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (remarks: string, image?: string) => Promise<void>;
}) {
  const [remarks, setRemarks] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(remarks.trim() || "Work completed", imagePreview || undefined);
      setRemarks("");
      setImagePreview(null);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-lg px-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-heading">
                    Mark as Fixed
                  </p>
                  <p className="text-sm text-muted">
                    Describe what was done to fix this issue.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={onClose}
                  size="icon-sm"
                  aria-label="Close"
                  className="border-red-500 bg-red-500 text-white hover:bg-transparent hover:text-red-500"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12" />
                    <path d="M6 18L18 6" />
                  </svg>
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Completion Notes
                  </label>
                  <textarea
                    required
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Describe the solution details..."
                    rows={3}
                    className="w-full rounded-2xl border border-border bg-surface/50 p-3 text-sm text-heading outline-none focus:border-primary focus:bg-surface resize-none transition-all duration-200"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                      Optional Fix Photo
                    </label>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-xs text-red-500 hover:text-red-600 transition font-medium"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                  <div
                    onClick={handleImageClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "group mt-2 flex flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-sm text-muted cursor-pointer transition-all duration-200",
                      isDragging
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-surface/60 hover:border-accent hover:bg-surface/85"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    {imagePreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={imagePreview}
                          alt="Fix Preview"
                          className="max-h-32 rounded-lg object-cover border border-border"
                        />
                        <p className="text-[11px] text-muted flex items-center gap-1">
                          <ImagePlus className="size-3.5" /> Click or drag to replace
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <ImagePlus className="size-6 text-muted/80 mb-2 group-hover:text-accent transition-colors duration-200" />
                        <span className="font-medium text-body text-xs">
                          Drag and drop an image, or{" "}
                          <span className="text-accent hover:underline">browse</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="rounded-full border border-border hover:bg-surface"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={submitting}
                    className="rounded-full border-primary text-primary hover:bg-primary hover:text-white transition-all duration-200"
                  >
                    {submitting ? "Saving..." : "Mark Resolved"}
                  </Button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
