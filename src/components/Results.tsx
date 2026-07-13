import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { TrendingUp, Award, ArrowRight, Save, Loader2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import type { ParsedResume } from "@/lib/api/career";
import SkillFingerprint from "@/components/SkillFingerprint";
import JobRoleProbability from "@/components/JobRoleProbability";
import AIJobSearch from "@/components/AIJobSearch";
import CareerRoadmap from "@/components/CareerRoadmap";
import SkillGapAnalysis from "@/components/SkillGapAnalysis";
import SalaryInsights from "@/components/SalaryInsights";
import BestTimeToSwitch from "@/components/BestTimeToSwitch";
import RecommendedSkills from "@/components/RecommendedSkills";

interface SkillResult {
  skill: string;
  score: number;
  level: string;
}

interface ResultsProps {
  results: SkillResult[];
  onRestart: () => void;
  parsedResume?: ParsedResume | null;
}

const Results = ({ results, onRestart, parsedResume }: ResultsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const overallScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);

  const saveResults = async () => {
    if (!user) {
      toast({
        title: "Sign in to save",
        description: "Create an account to save your assessment results.",
      });
      navigate("/auth");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('assessment_results')
        .insert([{
          user_id: user.id,
          skills: JSON.parse(JSON.stringify(parsedResume?.skills || [])),
          experience_level: parsedResume?.experienceLevel || null,
          summary: parsedResume?.summary || null,
          job_titles: parsedResume?.jobTitles || [],
          industries: parsedResume?.industries || [],
          assessment_scores: JSON.parse(JSON.stringify(results)),
        }]);

      if (error) throw error;

      setIsSaved(true);
      toast({
        title: "Results saved!",
        description: "Your assessment has been saved to your dashboard.",
      });
    } catch (err) {
      console.error('Error saving results:', err);
      toast({
        title: "Error",
        description: "Failed to save results. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-success";
    if (score >= 60) return "bg-warning";
    return "bg-destructive";
  };


  return (
    <section className="py-20 min-h-screen">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="pt-4">
            <Button variant="outline" size="sm" className="gap-2" onClick={onRestart}>
              <Home className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 gradient-primary rounded-2xl mb-6">
              <Award className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Your Career Assessment Results
            </h2>
            <p className="text-muted-foreground">
              Based on your resume and {results.length > 0 ? `${results.length}-skill` : ''} assessment, here's your complete profile
            </p>
          </motion.div>

          {/* Save Banner */}
          {!isSaved && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 mb-8 flex items-center justify-between flex-wrap gap-4"
            >
              <div>
                <h4 className="font-medium text-foreground">
                  {user ? "Save your results" : "Create an account to save your results"}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Track your career progress and access your assessment history anytime
                </p>
              </div>
              <Button variant="hero" onClick={saveResults} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {user ? "Save Results" : "Sign Up & Save"}
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {isSaved && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-success/10 border border-success/20 rounded-xl p-4 mb-8 flex items-center justify-between flex-wrap gap-4"
            >
              <div>
                <h4 className="font-medium text-foreground">Results saved successfully!</h4>
                <p className="text-sm text-muted-foreground">View all your assessments in your dashboard</p>
              </div>
              <Link to="/dashboard">
                <Button variant="success">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          )}

          {/* Row 1: Overall Score + Skill Fingerprint */}
          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            {/* Overall Score Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-card rounded-2xl shadow-lg p-6 text-center h-full">
                <h4 className="text-muted-foreground mb-4">Overall Score</h4>
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
                    <motion.circle
                      cx="64" cy="64" r="56" fill="none"
                      stroke="hsl(var(--secondary))" strokeWidth="12"
                      strokeDasharray={`${overallScore * 3.52} 352`}
                      initial={{ strokeDasharray: "0 352" }}
                      animate={{ strokeDasharray: `${overallScore * 3.52} 352` }}
                      transition={{ delay: 0.5, duration: 1 }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-foreground">{overallScore}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {overallScore >= 80 ? "Excellent! You're highly skilled" 
                    : overallScore >= 60 ? "Good foundation with room to grow"
                    : "Focus on building core skills"}
                </p>
                <div className="mt-4 text-xs text-muted-foreground">
                  {results.length} skills assessed • 30 questions
                </div>
              </div>
            </motion.div>

            {/* Skill Fingerprint - spans 2 columns */}
            <div className="lg:col-span-2">
              <SkillFingerprint results={results} />
            </div>
          </div>

          {/* Row 2: Skill Scores */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="bg-card rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-secondary" />
                <h3 className="text-xl font-semibold text-foreground">Skill Evaluation</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                {results.map((result, index) => (
                  <motion.div
                    key={result.skill}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-sm">{result.skill}</span>
                        <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">
                          {result.level}
                        </span>
                      </div>
                      <span className={`font-bold text-sm ${getScoreColor(result.score)}`}>
                        {result.score}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.score}%` }}
                        transition={{ delay: 0.5 + index * 0.05, duration: 0.6 }}
                        className={`h-full rounded-full ${getProgressColor(result.score)}`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Row 3: Job Role Probability */}
          <div className="mb-8">
            <JobRoleProbability results={results} parsedResume={parsedResume} />
          </div>

          {/* Row 4: AI Job Search with Filters */}
          <div className="mb-8">
            <AIJobSearch results={results} parsedResume={parsedResume} />
          </div>

          {/* Row 5: Career Roadmap */}
          <div className="mb-8">
            <CareerRoadmap results={results} parsedResume={parsedResume} />
          </div>

          {/* Row 5.5: Skill Gap Analysis */}
          <div className="mb-8">
            <SkillGapAnalysis results={results} parsedResume={parsedResume} />
          </div>

          {/* Row 5.6: Salary for Job Roles */}
          <div className="mb-8">
            <SalaryInsights results={results} parsedResume={parsedResume} />
          </div>

          {/* Row 5.7: Best Time to Switch */}
          <div className="mb-8">
            <BestTimeToSwitch results={results} parsedResume={parsedResume} />
          </div>


          {/* Row 6: Skills to Learn with Course Links */}
          <div className="mb-8">
            <RecommendedSkills results={results} />
          </div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex justify-center gap-4 mt-12"
          >
            <Button variant="hero-outline" size="lg" onClick={onRestart}>
              Take New Assessment
            </Button>
            {user && (
              <Link to="/dashboard">
                <Button variant="hero" size="lg">
                  View Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Results;
