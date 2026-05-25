import { useState, useEffect, useMemo } from "react";
import { isSafeUrl } from "@/lib/safeUrl";
import { motion } from "framer-motion";
import { Briefcase, MapPin, Clock, ExternalLink, Loader2, RefreshCw, Filter, DollarSign, Send, CheckCircle2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import type { ParsedResume } from "@/lib/api/career";

interface SkillResult {
  skill: string;
  score: number;
  level: string;
}

interface JobListing {
  title: string;
  company: string;
  location: string;
  type: string;
  match: number;
  url: string;
  source: string;
  postedDate?: string;
  salary?: number;
  salaryMin?: number;
  salaryMax?: number;
  workMode?: string;
  dbJobId?: string;
  isCompanyJob?: boolean;
  skillsRequired?: string[];
  experienceLevel?: string;
}

interface AIJobSearchProps {
  results: SkillResult[];
  parsedResume?: ParsedResume | null;
}

const AIJobSearch = ({ results, parsedResume }: AIJobSearchProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [applyingTo, setApplyingTo] = useState<string | null>(null);

  const [currency, setCurrency] = useState<string>("INR");
  const [salaryRange, setSalaryRange] = useState<number[]>([0, 5000000]);
  const [workMode, setWorkMode] = useState<string>("all");

  const salaryMax = currency === "INR" ? 5000000 : 250000;
  const salaryStep = currency === "INR" ? 100000 : 5000;

  useEffect(() => {
    setSalaryRange([0, salaryMax]);
  }, [currency, salaryMax]);

  useEffect(() => {
    searchJobs();
  }, [results, parsedResume]);

  // Load user's existing applications
  useEffect(() => {
    if (!user) return;
    const loadApplications = async () => {
      const { data } = await supabase
        .from('job_applications')
        .select('job_id')
        .eq('user_id', user.id);
      if (data) {
        setAppliedJobs(new Set(data.map(a => a.job_id)));
      }
    };
    loadApplications();
  }, [user]);

  const searchJobs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-jobs', {
        body: {
          skills: results.map(r => ({ name: r.skill, score: r.score, level: r.level })),
          experienceLevel: parsedResume?.experienceLevel || 'Unknown',
          jobTitles: parsedResume?.jobTitles || [],
          industries: parsedResume?.industries || [],
        }
      });
      if (error) throw error;
      if (data?.jobs) setJobs(data.jobs);
    } catch (err) {
      console.error('Error searching jobs:', err);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyToJob = async (job: JobListing) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to apply for jobs." });
      return;
    }
    if (!job.dbJobId) return;

    setApplyingTo(job.dbJobId);
    try {
      const { error } = await supabase
        .from('job_applications')
        .insert([{ user_id: user.id, job_id: job.dbJobId }]);

      if (error) {
        if (error.code === '23505') {
          toast({ title: "Already applied", description: "You've already applied to this position." });
        } else {
          throw error;
        }
      } else {
        setAppliedJobs(prev => new Set([...prev, job.dbJobId!]));
        toast({ title: "Application submitted!", description: `You applied to ${job.title} at ${job.company}.` });
      }
    } catch (err) {
      console.error('Error applying:', err);
      toast({ title: "Error", description: "Failed to submit application.", variant: "destructive" });
    } finally {
      setApplyingTo(null);
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (workMode !== "all") {
        const jobMode = (job.workMode || job.type || "").toLowerCase();
        if (workMode === "remote" && !jobMode.includes("remote")) return false;
        if (workMode === "onsite" && !jobMode.includes("on-site") && !jobMode.includes("onsite") && !jobMode.includes("office")) return false;
        if (workMode === "wfh" && !jobMode.includes("home") && !jobMode.includes("wfh") && !jobMode.includes("hybrid")) return false;
      }
      return true;
    });
  }, [jobs, salaryRange, workMode, currency]);

  const formatSalary = (val: number) => {
    if (currency === "INR") {
      if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
      return `₹${val.toLocaleString("en-IN")}`;
    }
    return `$${(val / 1000).toFixed(0)}K`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-card rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Briefcase className="w-6 h-6 text-secondary" />
          <h3 className="text-xl font-semibold text-foreground">AI-Powered Job Matches</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={showFilters ? "secondary" : "ghost"} size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-1" />
            Filters
          </Button>
          <Button variant="ghost" size="sm" onClick={searchJobs} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 p-4 bg-muted rounded-xl space-y-4"
        >
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                <DollarSign className="w-3 h-3 inline mr-1" />Salary Currency
              </label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ INR</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                <MapPin className="w-3 h-3 inline mr-1" />Work Location
              </label>
              <Select value={workMode} onValueChange={setWorkMode}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="wfh">Work from Home / Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Salary Range</label>
              <div className="pt-1">
                <Slider min={0} max={salaryMax} step={salaryStep} value={salaryRange} onValueChange={setSalaryRange} />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{formatSalary(salaryRange[0])}</span>
                  <span>{formatSalary(salaryRange[1])}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Finding matching jobs...</span>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No matching jobs found. Try adjusting filters or refreshing.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredJobs.map((job, index) => {
            const hasApplied = job.dbJobId ? appliedJobs.has(job.dbJobId) : false;
            const isApplying = applyingTo === job.dbJobId;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.08 }}
                className="p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-medium text-foreground truncate">{job.title}</h4>
                      {job.isCompanyJob && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-secondary text-secondary shrink-0">
                          <Building2 className="w-2.5 h-2.5 mr-0.5" />
                          Direct
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{job.company}</p>
                  </div>
                  <span className="px-2 py-1 bg-success/20 text-success rounded-md text-xs font-medium shrink-0 ml-2">
                    {job.match}%
                  </span>
                </div>

                {/* Skills tags for company jobs */}
                {job.isCompanyJob && job.skillsRequired && job.skillsRequired.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {job.skillsRequired.slice(0, 4).map((skill, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-card rounded text-[10px] text-muted-foreground">
                        {skill}
                      </span>
                    ))}
                    {job.skillsRequired.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">+{job.skillsRequired.length - 4}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mb-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />{job.type}
                  </span>
                  <span className="px-1.5 py-0.5 bg-card rounded text-[10px]">{job.source}</span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {job.isCompanyJob ? (
                    hasApplied ? (
                      <Button variant="ghost" size="sm" disabled className="w-full text-success">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Applied
                      </Button>
                    ) : (
                      <Button
                        variant="hero"
                        size="sm"
                        className="w-full"
                        onClick={() => applyToJob(job)}
                        disabled={isApplying}
                      >
                        {isApplying ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 mr-1" />
                            Apply Now
                          </>
                        )}
                      </Button>
                    )
                  ) : isSafeUrl(job.url) ? (
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        View on {job.source}
                      </Button>
                    </a>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Link unavailable
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default AIJobSearch;
