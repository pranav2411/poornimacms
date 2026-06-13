import { cn } from "@/lib/utils";

const steps = ["Reported", "Assigned", "In Progress", "Fixed", "Closed"];

export default function ComplaintTimeline({
  activeStep,
  isClosedDirectly = false,
}: {
  activeStep: number;
  isClosedDirectly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {steps.map((step, index) => {
        const isComplete = index < activeStep;
        const isActive = index === activeStep;
        
        // Strikethrough logic for closed directly: steps 1, 2, 3 are strikethroughed
        const isStrikethrough = isClosedDirectly && index >= 1 && index <= 3;

        return (
          <div key={step} className="flex items-start gap-3">
            <div
              className={cn(
                "mt-1 h-3 w-3 rounded-full border",
                isComplete && !isStrikethrough && "bg-fixed border-fixed",
                isActive && "bg-primary border-primary",
                (isStrikethrough || (!isComplete && !isActive)) && "bg-surface border-border"
              )}
            />
            <div>
              <p
                className={cn(
                  "text-sm font-medium",
                  isStrikethrough && "line-through text-muted/60",
                  !isStrikethrough && isActive && "text-primary",
                  !isStrikethrough && isComplete && "text-fixed",
                  !isStrikethrough && !isComplete && !isActive && "text-muted"
                )}
              >
                {step}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
