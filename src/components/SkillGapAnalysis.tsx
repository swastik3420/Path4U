import { useState } from "react";
import { motion } from "framer-motion";
import { Target, Loader2, CheckCircle2, AlertCircle, Clock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import type { ParsedResume } from "@/lib/api/career";

interface SkillResult {
  skill: string;
  score: number;
  level: string;
}

interface GapAnalysis {
  readinessScore: number;
  estimatedMonths: number;
  summary: string;
  matchedSkills: { name: string; score: number }[];
  missingSkills: { name: string; priority: "high" | "medium" | "low"; estimatedWeeks: number; reason: string }[];
  recommendedPath: string[];
}

interface Props {
  results: SkillResult[];
  parsedResume?: ParsedResume | null;
}

const SUGGESTED_ROLES = [
  "Frontend Developer",
  "Full Stack Engineer",
  "Data Scientist",
  "AI/ML Engineer",
  "Product Manager",
  "DevOps Engineer",
];

const priorityStyle: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-secondary/10 text-secondary border-secondary/20",
};

const SkillGapAnalysis = ({ results, parsedResume }: Props) => {
  const { toast } = useToast();
  const [targetRole, setTargetRole] = useState("");
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyze = async (role: string) => {
    const target = role.trim();
    if (!target) {
      toast({ title: "Enter a target role", description: "Type or pick a role you want to aim for.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke("skill-gap-analysis", {
        body: {
          skills: results.map(r => ({ name: r.skill, score: r.score, level: r.level })),
          targetRole: target,
          experienceLevel: parsedResume?.experienceLevel || "Unknown",
        },
      });
      if (error) throw error;
      setAnalysis(data as GapAnalysis);
    } catch (err) {
      console.error("Skill gap error:", err);
      toast({ title: "Analysis failed", description: "Could not analyze the gap. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="bg-card rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center gap-3 mb-2">
        <Target className="w-6 h-6 text-secondary" />
        <h3 className="text-xl font-semibold text-foreground">Skill Gap Analysis</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Pick a role you're aiming for. We'll compare it against your current skills and estimate the time and learning path to close the gap.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <Input
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder="e.g. Senior Frontend Engineer"
          onKeyDown={(e) => e.key === "Enter" && analyze(targetRole)}
          className="flex-1"
        />
        <Button onClick={() => analyze(targetRole)} disabled={isLoading} variant="hero">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Analyze Gap
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {SUGGESTED_ROLES.map(r => (
          <button
            key={r}
            onClick={() => { setTargetRole(r); analyze(r); }}
            disabled={isLoading}
            className="text-xs px-3 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors disabled:opacity-50"
          >
            {r}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Analyzing your gap to {targetRole}...
        </div>
      )}

      {analysis && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Summary tiles */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-secondary/5 border border-secondary/10 rounded-xl p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Readiness</div>
              <div className="text-3xl font-bold text-secondary">{analysis.readinessScore}%</div>
            </div>
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Est. Time to Ready
              </div>
              <div className="text-3xl font-bold text-primary">
                {analysis.estimatedMonths} <span className="text-base font-medium">mo</span>
              </div>
            </div>
            <div className="bg-muted rounded-xl p-4 sm:col-span-1 col-span-1">
              <div className="text-xs text-muted-foreground mb-1">Overview</div>
              <p className="text-xs text-foreground leading-relaxed">{analysis.summary}</p>
            </div>
          </div>

          {/* Matched vs missing */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-foreground text-sm mb-3">
                <CheckCircle2 className="w-4 h-4 text-success" /> Skills You Have
              </h4>
              <div className="space-y-2">
                {analysis.matchedSkills.length === 0 && (
                  <p className="text-xs text-muted-foreground">No strong overlaps found yet.</p>
                )}
                {analysis.matchedSkills.map(s => (
                  <div key={s.name} className="flex items-center justify-between bg-success/5 border border-success/10 rounded-lg px-3 py-2">
                    <span className="text-sm text-foreground">{s.name}</span>
                    <span className="text-xs font-semibold text-success">{s.score}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="flex items-center gap-2 font-semibold text-foreground text-sm mb-3">
                <AlertCircle className="w-4 h-4 text-warning" /> Skills to Build
              </h4>
              <div className="space-y-2">
                {analysis.missingSkills.length === 0 && (
                  <p className="text-xs text-muted-foreground">You look well-covered for this role!</p>
                )}
                {analysis.missingSkills.map(s => (
                  <div key={s.name} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{s.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${priorityStyle[s.priority] || priorityStyle.medium}`}>
                        {s.priority}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{s.reason}</p>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> ~{s.estimatedWeeks} weeks
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended path */}
          {analysis.recommendedPath?.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-3">Recommended Path</h4>
              <ol className="space-y-2">
                {analysis.recommendedPath.map((step, i) => (
                  <li key={i} className="flex gap-3 items-start bg-muted/50 rounded-lg p-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm text-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="p-3 bg-secondary/5 rounded-lg border border-secondary/10 text-xs text-muted-foreground text-center">
            <ArrowRight className="w-3 h-3 inline mr-1" />
            Estimates assume ~10 focused learning hours per week. Adjust based on your availability.
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default SkillGapAnalysis;
