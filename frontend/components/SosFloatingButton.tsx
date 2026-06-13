"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { triggerSosAlert } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Activity,
  AlertTriangle,
  X,
  ShieldAlert,
  MapPin,
  FileText,
  CheckCircle,
} from "lucide-react";

type EmergencyType = "fire" | "medical" | "other" | null;

export default function SosFloatingButton() {
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [emergencyType, setEmergencyType] = useState<EmergencyType>(null);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  
  // Hold-to-confirm state
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { data: session } = useSession();
  const [userId, setUserId] = useState("system");

  // Fetch logged-in user UUID
  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id);
    } else if (typeof window !== "undefined") {
      const rawUser = localStorage.getItem("poornima-user");
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          if (parsed.id) {
            setUserId(parsed.id);
          }
        } catch {
          // ignore
        }
      }
    }
  }, [session]);

  // Handle Hold Progress timer
  useEffect(() => {
    if (isHolding && !isSubmitting && !isSuccess) {
      const startTime = Date.now();
      holdIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / 3000) * 100, 100);
        setProgress(newProgress);
        
        if (elapsed >= 3000) {
          setIsHolding(false);
          if (holdIntervalRef.current) {
            clearInterval(holdIntervalRef.current);
          }
          handleTriggerSos();
        }
      }, 30);
    } else {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
      setProgress(0);
    }

    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, [isHolding]);

  const handleTriggerSos = async () => {
    if (!emergencyType) return;
    setIsSubmitting(true);
    try {
      await triggerSosAlert({
        triggeredBy: userId,
        emergencyType,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      });

      setIsSuccess(true);
      addToast({
        title: "SOS Alert Sent",
        description: `Your ${emergencyType.toUpperCase()} emergency alert has been broadcasted.`,
        variant: "destructive",
      });
      
      // Auto close success screen after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (error) {
      addToast({
        title: "Failed to send SOS",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset state
    setEmergencyType(null);
    setLocation("");
    setDescription("");
    setIsAcknowledged(false);
    setProgress(0);
    setIsHolding(false);
    setIsSubmitting(false);
    setIsSuccess(false);
  };

  // Button triggers on Mouse Down / Touch Start
  const startHolding = () => {
    if (emergencyType && isAcknowledged && !isSubmitting && !isSuccess) {
      setIsHolding(true);
    }
  };

  const stopHolding = () => {
    setIsHolding(false);
  };

  return (
    <>
      {/* Floating Glowing SOS Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Trigger SOS Emergency"
        className="fixed bottom-5 right-5 z-30 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_25px_rgba(220,38,38,0.5)] border border-red-500 hover:shadow-[0_0_35px_rgba(220,38,38,0.8)] hover:scale-105 active:scale-95 transition-all duration-300 sm:bottom-8 sm:right-8 group"
      >
        <div className="absolute inset-0 -z-10 rounded-full bg-red-500/30 scale-100 group-hover:animate-ping opacity-75" />
        <span className="font-bold text-sm tracking-wider uppercase">SOS</span>
      </button>

      {/* SOS Dialog Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-3xl border border-red-500/25 bg-slate-950/90 p-6 shadow-2xl backdrop-blur-xl text-slate-100"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4 gap-3">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-red-500">
                  <ShieldAlert className="h-6 w-6 animate-pulse" />
                  EMERGENCY SOS ALERT
                </h2>
                {!isSubmitting && !isSuccess && (
                  <button
                    onClick={handleClose}
                    className="rounded-full p-1.5 hover:bg-white/10 text-slate-400 hover:text-slate-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {isSuccess ? (
                /* Success Screen */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-10 text-center"
                >
                  <CheckCircle className="h-20 w-20 text-emerald-500 animate-bounce mb-4" />
                  <h3 className="text-2xl font-bold text-slate-100">SOS ALERT SENT</h3>
                  <p className="mt-2 text-sm text-slate-400 max-w-xs">
                    An app-wide notification has been dispatched. Responders and admins have been alerted.
                  </p>
                </motion.div>
              ) : (
                /* SOS Form steps */
                <div className="mt-5 space-y-5">
                  {/* Step 1: Intent Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      1. Select Emergency Type *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Fire Option */}
                      <button
                        type="button"
                        onClick={() => setEmergencyType("fire")}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          emergencyType === "fire"
                            ? "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <Flame className="h-8 w-8 mb-1" />
                        <span className="text-xs font-medium">Fire</span>
                      </button>

                      {/* Medical Option */}
                      <button
                        type="button"
                        onClick={() => setEmergencyType("medical")}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          emergencyType === "medical"
                            ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <Activity className="h-8 w-8 mb-1" />
                        <span className="text-xs font-medium">Medical</span>
                      </button>

                      {/* Other Option */}
                      <button
                        type="button"
                        onClick={() => setEmergencyType("other")}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          emergencyType === "other"
                            ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <AlertTriangle className="h-8 w-8 mb-1" />
                        <span className="text-xs font-medium">Other</span>
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Location and Description */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        2. Location (optional)
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. A-Block Chemistry Lab, 2nd Floor"
                        className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-slate-200 outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        3. Description / Details (optional)
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the emergency details..."
                        className="w-full min-h-[80px] py-2.5 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-slate-200 outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500/50 resize-none"
                      />
                    </div>
                  </div>

                  {/* Step 3: Explicit Acknowledgment Checkbox */}
                  <label className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-950/20 p-4 text-xs text-red-200 hover:bg-red-950/30 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAcknowledged}
                      onChange={(e) => setIsAcknowledged(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-red-500/40 bg-slate-900 text-red-600 focus:ring-0 focus:ring-offset-0"
                    />
                    <div>
                      <span className="font-semibold block mb-0.5">Safety Declaration</span>
                      I confirm this is a real emergency requiring immediate assistance. I understand that false triggers are strictly tracked and subject to disciplinary action.
                    </div>
                  </label>

                  {/* Step 4: Hold-to-Confirm Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={!emergencyType || !isAcknowledged || isSubmitting}
                      onMouseDown={startHolding}
                      onMouseUp={stopHolding}
                      onMouseLeave={stopHolding}
                      onTouchStart={startHolding}
                      onTouchEnd={stopHolding}
                      className={`relative overflow-hidden w-full h-14 rounded-2xl font-bold tracking-wider select-none outline-none transition-all duration-200 ${
                        emergencyType && isAcknowledged && !isSubmitting
                          ? "bg-gradient-to-r from-red-600 to-rose-600 text-white cursor-pointer hover:brightness-110 active:scale-[0.99] shadow-md shadow-red-600/10"
                          : "bg-white/5 border border-white/5 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      {/* Hold progress bar background */}
                      {emergencyType && isAcknowledged && !isSubmitting && (
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-red-800 transition-all duration-75 pointer-events-none"
                          style={{ width: `${progress}%` }}
                        />
                      )}

                      {/* Display content */}
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isSubmitting ? (
                          <>
                            <span className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                            Broadcasting Alert...
                          </>
                        ) : isHolding ? (
                          `HOLDING... ${(3 - (progress / 100) * 3).toFixed(1)}s`
                        ) : (
                          "Press & Hold to Send SOS (3s)"
                        )}
                      </span>
                    </button>
                    {emergencyType && isAcknowledged && !isHolding && !isSubmitting && (
                      <p className="text-center text-[10px] text-slate-500 mt-2">
                        Note: Tap is disabled. You must press and hold for 3 seconds to trigger the alarm.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
