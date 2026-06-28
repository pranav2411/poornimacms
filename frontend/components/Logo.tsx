"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function LogoIcon({ className, size = 42 }: { className?: string; size?: number }) {
  const { data: session } = useSession();
  const logoSrc = session?.user?.orgLogoUrl || "/PCElogo.png";

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-transparent", className)}>
      <Image
        src={logoSrc}
        alt="Organization Logo"
        width={size}
        height={size}
        className="object-contain rounded"
        priority
      />
    </div>
  );
}

export default function Logo({ className }: LogoProps) {
  const { data: session } = useSession();
  const orgCode = session?.user?.orgCode || "Poornima";

  return (
    <div className={cn("flex items-center gap-3.5 select-none", className)}>
      <LogoIcon size={40} className="shrink-0" />
      <div className="flex flex-col leading-none">
        <span className="text-sm font-bold uppercase tracking-[0.24em] text-heading">
          {orgCode}
        </span>
        <span className="mt-1.5 text-[10px] font-bold tracking-[0.24em] text-muted uppercase">
          CMS
        </span>
      </div>
    </div>
  );
}
