"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import RoomComplaints from "@/components/RoomComplaints";
import StepForm from "@/components/StepForm";
import SubmissionSuccessModal from "@/components/SubmissionSuccessModal";
import { Button } from "@/components/ui/button";
import { createComplaint, getCategories, getComplaints } from "@/lib/api";
import type { Complaint } from "@/lib/types";
import { cn } from "@/lib/utils";

const steps = ["Room verification", "Complaint details", "Review & submit"];

const DEFAULT_CREATED_BY = "system";
const CATEGORY_TO_DEPARTMENT_ID: Record<string, string> = {
  Electrical: "65d93176-b531-4b84-8d54-e6689de090f1",
  Plumbing: "ab125a61-9df4-43cf-b47d-7360c6487ffa",
  Carpentry: "599d6c33-8395-4722-9f0e-5f337b4df382",
  "IT/AV": "8f29204c-cc78-4000-9ce1-e90c10115e04",
  Housekeeping: "bc080624-a18e-4dd9-9fd2-b8a6889bae05",
  Other: "559f62c2-a3f7-476d-b95c-a22ae215aa0b",
};

const resolveDepartmentId = (selectedCategory: string) =>
  CATEGORY_TO_DEPARTMENT_ID[selectedCategory] || "559f62c2-a3f7-476d-b95c-a22ae215aa0b";

export default function NewComplaintPage() {
  const router = useRouter();
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
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

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

  const handleCloseSuccess = () => {
    setIsSuccessOpen(false);
    setSubmittedComplaint(null);
    setCurrentStep(0);
    setRoom("");
    setTitle("");
    setDescription("");
    setCategory(categories[0] || "");
    setPriority("Medium");
  };

  const handleViewDashboard = () => {
    router.push("/dashboard/faculty");
  };

  const handleSubmit = async () => {
    const departmentId = resolveDepartmentId(category);
    let createdBy = DEFAULT_CREATED_BY;
    if (typeof window !== "undefined") {
      const rawUser = window.localStorage.getItem("poornima-user");
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser) as { id?: string };
          if (parsed.id) {
            createdBy = parsed.id;
          }
        } catch {
          // ignore
        }
      }
    }
    if (!room || !category || !title || !description || !departmentId || !createdBy) return;
    setIsSubmitting(true);
    try {
      const res = await createComplaint({
        location: room,
        departmentId,
        title,
        description,
        priority: priority.toLowerCase(),
        createdBy,
      });
      setIsSubmitting(false);
      setSubmittedComplaint(res);
      setIsSuccessOpen(true);
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
      <SubmissionSuccessModal
        open={isSuccessOpen}
        complaint={submittedComplaint}
        onClose={handleCloseSuccess}
        onViewDashboard={handleViewDashboard}
      />
    </DashboardShell>
  );
}
