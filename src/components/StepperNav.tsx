import { ChevronRight } from "lucide-react";
import { useAppFlow, type FlowStage } from "@/contexts/AppFlowContext";
import { cn } from "@/lib/utils";

interface Step {
  key: FlowStage;
  label: string;
  enabled: boolean;
}

const StepperNav = () => {
  const flow = useAppFlow();
  if (!flow) return null;
  const { stage, setStage, hasResume, hasQuestions } = flow;

  const steps: Step[] = [
    { key: "upload", label: "Scan", enabled: true },
    { key: "assessment", label: "Syllabus", enabled: hasResume },
    { key: "assessment", label: "Evaluate", enabled: hasQuestions },
    { key: "results", label: "Results", enabled: stage === "results" || stage === "dashboard" },
  ];

  return (
    <div className="hidden lg:flex items-center gap-2">
      {steps.map((s, i) => {
        const active = stage === s.key && (i !== 3 || stage === "results");
        return (
          <div key={s.label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!s.enabled}
              onClick={() => s.enabled && setStage(s.key)}
              className={cn(
                "flex items-center gap-2 text-sm font-bold transition-all px-4 py-2 rounded-full border-2",
                active
                  ? "border-foreground text-primary bg-muted/50 shadow-sm"
                  : "border-transparent text-muted-foreground hover:bg-muted/50",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
              )}
            >
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-colors",
                  active ? "bg-primary" : s.enabled ? "bg-primary/60" : "bg-muted-foreground/30"
                )}
              />
              {s.label}
            </button>
            {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
          </div>
        );
      })}
    </div>
  );
};

export default StepperNav;
