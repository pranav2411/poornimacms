"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import RoomComplaints from "@/components/RoomComplaints";
import StepForm from "@/components/StepForm";
import { Button } from "@/components/ui/button";
import { createComplaint, getCategories, getComplaints } from "@/lib/api";
import type { Complaint } from "@/lib/types";
import { cn } from "@/lib/utils";

const steps = ["Room verification", "Complaint details", "Review & submit"];

export default function NewComplaintPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [room, setRoom] = useState("");
  const [showRoomPanel, setShowRoomPanel] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  const roomComplaints = useMemo(
    () => complaints.filter((item) => item.room === room && item.status !== "Closed"),
    [complaints, room]
  );

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      try {
        const data = await getCategories();
        if (!isMounted) return;
        setCategories(data);
        setCategory((prev) => prev || data[0] || "");
      } catch {
        if (!isMounted) return;
        setCategories([]);
      }
    };

    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!room) {
      setShowRoomPanel(false);
      return;
    }
    const timeout = window.setTimeout(() => {
      setShowRoomPanel(true);
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [room]);

  useEffect(() => {
    if (!room) {
      setComplaints([]);
      return;
    }

    let isMounted = true;

    const loadComplaints = async () => {
      try {
        const data = await getComplaints();
        if (isMounted) setComplaints(data);
      } catch {
        if (isMounted) setComplaints([]);
      }
    };

    loadComplaints();
    return () => {
      isMounted = false;
    };
  }, [room]);

  const handleSubmit = async () => {
    if (!room || !category || !title || !description) return;
    setIsSubmitting(true);
    try {
      await createComplaint({
        room,
        category,
        title,
        description,
        priority,
      });
      setIsSubmitting(false);
      setCurrentStep(0);
      setRoom("");
      setTitle("");
      setDescription("");
      setPriority("Medium");
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell
      role="faculty"
      title="New Complaint"
      subtitle="Tell us what needs attention"
      userName="Dr. Aditi Sharma"
      avatarUrl="/user-no-av.png"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <GlassCard className="p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              New complaint
            </p>
            <h1 className="text-2xl font-semibold text-heading">
              Tell us what needs attention
            </h1>
          </div>

          <StepForm steps={steps} currentStep={currentStep}>
            {currentStep === 0 && (
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium text-heading">Room number</label>
                  <input
                    value={room}
                    onChange={(event) => setRoom(event.target.value.toUpperCase())}
                    placeholder="A-204"
                    className="mt-2 h-12 w-full rounded-2xl border border-border bg-surface/70 px-4 font-mono text-heading outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div className="rounded-2xl border border-pending/40 bg-pending/15 p-4 text-sm text-body">
                  These complaints are already registered for this room -- please check before submitting
                </div>
                <RoomComplaints complaints={roomComplaints} expanded={showRoomPanel} />
                <div className="flex justify-end">
                  <GlassButton
                    label="My issue is different, continue ->"
                    onClick={() => setCurrentStep(1)}
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-heading">Category</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categories.map((item) => (
                      <Button
                        key={item}
                        type="button"
                        onClick={() => setCategory(item)}
                        className={cn(
                          "border-border bg-surface text-body hover:bg-transparent hover:text-body",
                          category === item &&
                            "border-accent bg-accent text-surface hover:bg-transparent hover:text-accent"
                        )}
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-heading">Title</label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Short issue title"
                    className="mt-2 h-12 w-full rounded-2xl border border-border bg-surface/70 px-4 text-heading outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-heading">Description</label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Provide a quick overview so the vendor can respond faster."
                    className="mt-2 min-h-[120px] w-full rounded-2xl border border-border bg-surface/70 px-4 py-3 text-heading outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-heading">Optional photo</label>
                  <div className="mt-2 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/60 px-4 py-8 text-sm text-muted">
                    Drag and drop an image here or click to upload
                    <input type="file" className="mt-3 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-heading">Priority</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Low", "Medium", "High"].map((item) => (
                      <Button
                        key={item}
                        type="button"
                        onClick={() => setPriority(item)}
                        className={cn(
                          "border-border bg-surface text-body hover:bg-transparent hover:text-body",
                          item === priority &&
                            item === "Low" &&
                            "border-fixed bg-fixed text-surface hover:bg-transparent hover:text-fixed",
                          item === priority &&
                            item === "Medium" &&
                            "border-pending bg-pending text-surface hover:bg-transparent hover:text-pending",
                          item === priority &&
                            item === "High" &&
                            "border-accent bg-accent text-surface hover:bg-transparent hover:text-accent"
                        )}
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(0)}
                    size="sm"
                    className="border-border bg-surface text-heading hover:bg-transparent hover:text-heading"
                  >
                    Back
                  </Button>
                  <GlassButton
                    label="Continue"
                    onClick={() => setCurrentStep(2)}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid gap-4">
                <GlassCard className="p-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Room</span>
                      <span className="font-mono text-heading">{room || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Category</span>
                      <span className="text-heading">{category}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Priority</span>
                      <span className="text-heading">{priority}</span>
                    </div>
                    <div>
                      <p className="text-muted">Title</p>
                      <p className="text-heading">{title || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted">Description</p>
                      <p className="text-heading">{description || "-"}</p>
                    </div>
                  </div>
                </GlassCard>
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    size="sm"
                    className="border-border bg-surface text-heading hover:bg-transparent hover:text-heading"
                  >
                    Back
                  </Button>
                  <GlassButton
                    label={isSubmitting ? "Submitting..." : "Submit complaint"}
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </StepForm>
        </GlassCard>
      </div>
    </DashboardShell>
  );
}
