"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

export default function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isPending}
      className="flex items-center gap-2 border-border bg-surface text-heading hover:bg-surface/85"
    >
      <RefreshCw className={cn("h-4 w-4 text-heading", isPending && "animate-spin")} />
      <span className="hidden sm:inline">Refresh</span>
    </Button>
  );
}
