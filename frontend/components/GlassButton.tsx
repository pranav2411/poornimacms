import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GlassButton({
  label,
  className,
  onClick,
  disabled,
}: {
  label: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl border-primary bg-primary text-surface hover:bg-transparent hover:text-primary",
        disabled &&
          "border-border bg-border text-muted hover:bg-border hover:text-muted",
        className
      )}
    >
      {label}
    </Button>
  );
}
