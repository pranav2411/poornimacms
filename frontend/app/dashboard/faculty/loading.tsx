import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import { Skeleton } from "@/components/ui/Skeleton";

export default function FacultyDashboardLoading() {
  return (
    <DashboardShell
      role="faculty"
      title="Faculty Dashboard"
      subtitle="Complaint pulse across your rooms"
      userName="Dr. Aditi Sharma"
      avatarUrl="/user-no-av.png"
    >
      <div className="grid gap-8 animate-pulse">
        {/* Open Complaints Carousel Skeleton */}
        <GlassCard className="w-full p-6 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <Skeleton className="h-5 w-24" />
          </div>

          <div className="relative mx-auto flex items-center justify-center gap-6 overflow-hidden">
            {/* Left Card (less prominent) */}
            <div className="hidden md:block h-[460px] w-[300px] flex-none rounded-[2rem] border border-border/40 bg-surface/40 p-6">
              <Skeleton className="h-4 w-1/3 mb-4" />
              <Skeleton className="h-6 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-6" />
              <Skeleton className="h-24 w-full rounded-2xl mb-4" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>

            {/* Center Card (prominent) */}
            <div className="h-[460px] w-[380px] max-w-full flex-none rounded-[2rem] border border-border/80 bg-surface/70 p-6 shadow-md relative -translate-y-1">
              <Skeleton className="h-4 w-1/4 mb-4" />
              <Skeleton className="h-7 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-6" />
              <Skeleton className="h-28 w-full rounded-2xl mb-6" />
              <div className="flex gap-3">
                <Skeleton className="h-10 w-24 rounded-xl" />
                <Skeleton className="h-10 w-24 rounded-xl" />
              </div>
            </div>

            {/* Right Card (less prominent) */}
            <div className="hidden md:block h-[460px] w-[300px] flex-none rounded-[2rem] border border-border/40 bg-surface/40 p-6">
              <Skeleton className="h-4 w-1/3 mb-4" />
              <Skeleton className="h-6 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-6" />
              <Skeleton className="h-24 w-full rounded-2xl mb-4" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          </div>
        </GlassCard>

        {/* Stats Section Skeleton */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Pie Chart Card Skeleton */}
          <div className="glass-panel p-6 rounded-3xl min-h-[380px] flex flex-col justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="flex-1 flex items-center justify-center py-6">
              {/* Circular donut representation */}
              <div className="relative h-44 w-44 rounded-full border-[18px] border-muted-foreground/10 flex items-center justify-center">
                <div className="h-28 w-28 rounded-full bg-surface/30" />
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>

          {/* Bar Chart Card Skeleton */}
          <div className="glass-panel p-6 rounded-3xl min-h-[380px] flex flex-col justify-between">
            <Skeleton className="h-6 w-32" />
            <div className="flex-1 flex items-end justify-between gap-4 py-8 px-4">
              <Skeleton className="h-[40%] w-10 rounded-t-lg" />
              <Skeleton className="h-[75%] w-10 rounded-t-lg" />
              <Skeleton className="h-[55%] w-10 rounded-t-lg" />
              <Skeleton className="h-[90%] w-10 rounded-t-lg" />
            </div>
            <div className="flex justify-between px-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
