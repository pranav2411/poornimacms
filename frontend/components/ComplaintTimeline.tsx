import { cn } from "@/lib/utils";

const steps = ["Reported", "Assigned", "In Progress", "Fixed", "Closed"];

export default function ComplaintTimeline({
  activeStep,
}: {
  activeStep: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      {steps.map((step, index) => {
        const isComplete = index < activeStep;
        const isActive = index === activeStep;
        return (
          <div key={step} className="flex items-start gap-3">
            <div
              className={cn(
                "mt-1 h-3 w-3 rounded-full border",
                isComplete && "bg-fixed border-fixed",
                isActive && "bg-primary border-primary",
                !isComplete && !isActive && "bg-surface border-border"
              )}
            />
            <div>
              <p
                className={cn(
                  "text-sm font-medium",
                  isActive && "text-primary",
                  isComplete && "text-fixed",
                  !isComplete && !isActive && "text-muted"
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
