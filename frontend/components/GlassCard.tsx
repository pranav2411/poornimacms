import { cn } from "@/lib/utils";

export default function GlassCard({
  className,
  children,
  glow,
  pulse,
}: {
  className?: string;
  children: React.ReactNode;
  glow?: boolean;
  pulse?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass-panel rounded-3xl",
        glow && "glass-edge-glow",
        pulse && "glass-pulse",
        className
      )}
    >
      {children}
    </div>
  );
}
