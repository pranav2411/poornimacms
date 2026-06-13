"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { useToast } from "@/lib/toast";
import {
  MapPin,
  Tag,
  FileText,
  AlignLeft,
  Image as ImageIcon,
  AlertCircle,
  Zap,
  Droplet,
  Hammer,
  Laptop,
  Sparkles,
  HelpCircle,
  ChevronDown,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
} from "lucide-react";

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

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  Electrical: Zap,
  Plumbing: Droplet,
  Carpentry: Hammer,
  "IT/AV": Laptop,
  Housekeeping: Sparkles,
  Other: HelpCircle,
};

const PRIORITY_CONFIG: Record<
  string,
  { icon: React.ComponentType<any>; colorClass: string; activeClass: string }
> = {
  Low: {
    icon: ChevronDown,
    colorClass: "text-emerald-500",
    activeClass:
      "border-emerald-500 bg-emerald-500 text-surface hover:bg-transparent hover:text-emerald-500 shadow-md shadow-emerald-500/25",
  },
  Medium: {
    icon: AlertCircle,
    colorClass: "text-pending",
    activeClass:
      "border-pending bg-pending text-surface hover:bg-transparent hover:text-pending shadow-md shadow-pending/25",
  },
  High: {
    icon: AlertTriangle,
    colorClass: "text-red-500",
    activeClass:
      "border-red-500 bg-red-500 text-surface hover:bg-transparent hover:text-red-500 shadow-md shadow-red-500/25",
  },
};

export default function NewComplaintPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
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
  const [isCheckingRoom, setIsCheckingRoom] = useState(false);
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      setIsCheckingRoom(false);
      return;
    }

    let isMounted = true;
    setIsCheckingRoom(true);

    const loadComplaints = async () => {
      try {
        const data = await getComplaints({ location: room });
        if (isMounted) {
          setComplaints(data);
          setIsCheckingRoom(false);
        }
      } catch (error) {
        if (isMounted) {
          setComplaints([]);
          setIsCheckingRoom(false);
          addToast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to load room complaints check",
            variant: "destructive",
          });
        }
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
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setErrors({});
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFile(null);
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
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContinueFromStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!category) {
      newErrors.category = "Please select a category";
    }
    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters long";
    }
    if (!description.trim()) {
      newErrors.description = "Description is required";
    } else if (description.trim().length < 8) {
      newErrors.description = "Description must be at least 8 characters long";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast({
        title: "Validation Error",
        description: newErrors.category || newErrors.title || newErrors.description || "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setErrors({});
    setCurrentStep(2);
  };

  const handleViewDashboard = () => {
    router.push("/dashboard/faculty");
  };

  const handleSubmit = async () => {
    const departmentId = resolveDepartmentId(category);
    let createdBy = session?.user?.id || DEFAULT_CREATED_BY;
    if (createdBy === DEFAULT_CREATED_BY && typeof window !== "undefined") {
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
                  <label className="text-sm font-medium text-heading flex items-center gap-1.5">
                    <MapPin className="size-4 text-muted" /> Room number
                  </label>
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
                <RoomComplaints complaints={roomComplaints} expanded={showRoomPanel} isLoading={isCheckingRoom} />
                <div className="flex justify-end mt-4">
                  <GlassButton
                    onClick={() => setCurrentStep(1)}
                    disabled={!room.trim()}
                    className="h-12 min-w-[220px] flex items-center justify-center gap-2"
                  >
                    <span>My issue is different, continue</span>
                    <ArrowRight className="size-4" />
                  </GlassButton>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-heading flex items-center gap-1.5">
                    <Tag className="size-4 text-muted" /> Category <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categories.map((item) => {
                      const Icon = CATEGORY_ICONS[item] || HelpCircle;
                      const isSelected = category === item;
                      return (
                        <Button
                          key={item}
                          type="button"
                          onClick={() => setCategory(item)}
                          className={cn(
                            "flex items-center gap-2 justify-center border border-border bg-surface text-body hover:bg-surface/80 hover:text-body h-12 rounded-2xl transition-all duration-200",
                            isSelected &&
                              "border-accent bg-accent text-surface hover:bg-accent/90 hover:text-surface shadow-md shadow-accent/25"
                          )}
                        >
                          <Icon className={cn("size-4", !isSelected && "text-accent")} />
                          {item}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-heading flex items-center gap-1.5">
                    <FileText className="size-4 text-muted" /> Title <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      if (errors.title) {
                        setErrors((prev) => ({ ...prev, title: "" }));
                      }
                    }}
                    placeholder="Short issue title"
                    className={cn(
                      "mt-2 h-12 w-full rounded-2xl border bg-surface/70 px-4 text-heading outline-none transition focus:ring-2 focus:ring-accent/30",
                      errors.title ? "border-red-500 focus:border-red-500" : "border-border focus:border-accent"
                    )}
                  />
                  {errors.title && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.title}</span>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-heading flex items-center gap-1.5">
                    <AlignLeft className="size-4 text-muted" /> Description <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      if (errors.description) {
                        setErrors((prev) => ({ ...prev, description: "" }));
                      }
                    }}
                    placeholder="Provide a quick overview so the vendor can respond faster."
                    className={cn(
                      "mt-2 min-h-[120px] w-full rounded-2xl border bg-surface/70 px-4 py-3 text-heading outline-none transition focus:ring-2 focus:ring-accent/30",
                      errors.description ? "border-red-500 focus:border-red-500" : "border-border focus:border-accent"
                    )}
                  />
                  {errors.description && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.description}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-heading flex items-center gap-1.5">
                      <ImageIcon className="size-4 text-muted" /> Optional photo
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
                      "group mt-2 flex flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-sm text-muted cursor-pointer transition-all duration-200",
                      isDragging
                        ? "border-accent bg-accent/10 text-accent scale-[0.99]"
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
                      <div className="flex flex-col items-center gap-3">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-40 rounded-lg object-cover shadow-sm border border-border"
                        />
                        <p className="text-xs text-muted flex items-center gap-1">
                          <ImagePlus className="size-3.5" /> Click or drag to change image
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <ImagePlus className="size-8 text-muted/80 mb-3 group-hover:text-accent transition-colors duration-200" />
                        <span className="font-medium text-body">
                          Drag and drop an image here, or{" "}
                          <span className="text-accent hover:underline">click to upload</span>
                        </span>
                        <span className="text-xs text-muted mt-1">Supports PNG, JPG or GIF</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-heading flex items-center gap-1.5">
                    <AlertCircle className="size-4 text-muted" /> Priority
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Low", "Medium", "High"].map((item) => {
                      const conf = PRIORITY_CONFIG[item];
                      const Icon = conf.icon;
                      const isActive = item === priority;
                      return (
                        <Button
                          key={item}
                          type="button"
                          onClick={() => setPriority(item)}
                          className={cn(
                            "flex items-center gap-2 border-border bg-surface text-body hover:bg-surface/80 hover:text-body h-12 px-6 rounded-2xl transition-all duration-200",
                            isActive ? conf.activeClass : "hover:border-border hover:bg-surface/85"
                          )}
                        >
                          <Icon className={cn("size-4", !isActive && conf.colorClass)} />
                          {item}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 mt-6">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(0)}
                    className="h-12 min-w-[160px] rounded-2xl border border-border bg-surface text-heading hover:bg-surface/80 hover:text-heading flex items-center justify-center gap-2 transition-all duration-200"
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                  <GlassButton
                    onClick={handleContinueFromStep1}
                    className="h-12 min-w-[160px] flex items-center justify-center gap-2"
                  >
                    <span>Continue</span>
                    <ArrowRight className="size-4" />
                  </GlassButton>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid gap-4">
                <GlassCard className="p-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted flex items-center gap-1"><MapPin className="size-3.5" /> Room</span>
                      <span className="font-mono text-heading">{room || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted flex items-center gap-1"><Tag className="size-3.5" /> Category</span>
                      <span className="text-heading">{category}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted flex items-center gap-1"><AlertCircle className="size-3.5" /> Priority</span>
                      <span className="text-heading">{priority}</span>
                    </div>
                    <div>
                      <p className="text-muted flex items-center gap-1"><FileText className="size-3.5" /> Title</p>
                      <p className="text-heading font-medium mt-1">{title || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted flex items-center gap-1"><AlignLeft className="size-3.5" /> Description</p>
                      <p className="text-heading mt-1 whitespace-pre-wrap">{description || "-"}</p>
                    </div>
                    {imagePreview && (
                      <div>
                        <p className="text-muted flex items-center gap-1 mb-1"><ImageIcon className="size-3.5" /> Photo Attachment</p>
                        <img
                          src={imagePreview}
                          alt="Attached"
                          className="max-h-40 rounded-lg object-cover shadow-sm border border-border"
                        />
                      </div>
                    )}
                  </div>
                </GlassCard>
                <div className="flex items-center justify-between gap-4 mt-6">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="h-12 min-w-[160px] rounded-2xl border border-border bg-surface text-heading hover:bg-surface/80 hover:text-heading flex items-center justify-center gap-2 transition-all duration-200"
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                  <GlassButton
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="h-12 min-w-[160px] flex items-center justify-center gap-2"
                  >
                    <Check className="size-4" />
                    <span>{isSubmitting ? "Submitting..." : "Submit complaint"}</span>
                  </GlassButton>
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
