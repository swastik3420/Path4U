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

interface ExternalRoleLinks {
  role: string;
  probability: number;
  links: { source: string; url: string }[];
}

const AIJobSearch = ({ results, parsedResume }: AIJobSearchProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [externalLinks, setExternalLinks] = useState<ExternalRoleLinks[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [applyingTo, setApplyingTo] = useState<string | null>(null);

  const [currency, setCurrency] = useState<string>("INR");
  const [salaryRange, setSalaryRange] = useState<number[]>([0, 5000000]);
  const [workMode, setWorkMode] = useState<string>("all");
  const [experienceLevel, setExperienceLevel] = useState<string>("all");
  const [jobType, setJobType] = useState<string>("all");
  const [datePosted, setDatePosted] = useState<string>("all");
  const [companyType, setCompanyType] = useState<string>("all");

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
      // 1. Get probability-ranked job roles first so we can widen the live search
      //    across every likely role (not just the resume's most recent title).
      let predictedRoles: { role: string; probability: number }[] = [];
      try {
        const { data: rolesData } = await supabase.functions.invoke('predict-job-roles', {
          body: {
            skills: results.map(r => ({ name: r.skill, score: r.score, level: r.level })),
            experienceLevel: parsedResume?.experienceLevel || 'Unknown',
            industries: parsedResume?.industries || [],
            jobTitles: parsedResume?.jobTitles || [],
          }
        });
        if (Array.isArray(rolesData?.roles)) predictedRoles = rolesData.roles;
      } catch (e) {
        console.warn('predict-job-roles failed, falling back to resume titles:', e);
      }

      // Merge predicted roles (highest probability first) with resume titles,
      // deduped — sent to search-jobs so it fetches openings per role.
      const rankedRoleTitles = predictedRoles
        .slice()
        .sort((a, b) => b.probability - a.probability)
        .map(r => r.role);
      const mergedTitles = Array.from(new Set([
        ...rankedRoleTitles,
        ...(parsedResume?.jobTitles || []),
      ])).slice(0, 8);

      const { data, error } = await supabase.functions.invoke('search-jobs', {
        body: {
          skills: results.map(r => ({ name: r.skill, score: r.score, level: r.level })),
          experienceLevel: parsedResume?.experienceLevel || 'Unknown',
          jobTitles: mergedTitles,
          predictedRoles, // [{role, probability}]
          industries: parsedResume?.industries || [],
        }
      });
      if (error) throw error;
      if (data?.jobs) setJobs(data.jobs);
      if (Array.isArray(data?.externalSearchLinks)) setExternalLinks(data.externalSearchLinks);
    } catch (err) {
      console.error('Error searching jobs:', err);
      setJobs([]);
      setExternalLinks([]);
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
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const dateLimitDays: Record<string, number> = {
      "1": 1, "3": 3, "7": 7, "14": 14, "30": 30,
    };

    const norm = (s?: string) => (s || "").toLowerCase();

    const matchExperience = (job: JobListing) => {
      if (experienceLevel === "all") return true;
      const hay = `${norm(job.experienceLevel)} ${norm(job.title)}`;
      switch (experienceLevel) {
        case "intern": return /(intern|trainee)/.test(hay);
        case "entry": return /(entry|junior|fresher|graduate|associate)/.test(hay);
        case "mid": return /(mid|intermediate|\bii\b|\b2\b)/.test(hay) || (!/(intern|junior|senior|lead|principal|director)/.test(hay) && norm(job.experienceLevel).includes("mid"));
        case "senior": return /senior|\bsr\b|\biii\b/.test(hay);
        case "lead": return /(lead|principal|staff|architect|head|director)/.test(hay);
      }
      return true;
    };

    const matchJobType = (job: JobListing) => {
      if (jobType === "all") return true;
      const hay = `${norm(job.type)} ${norm(job.workMode)}`;
      switch (jobType) {
        case "full": return hay.includes("full");
        case "part": return hay.includes("part");
        case "contract": return /(contract|freelance|temporary)/.test(hay);
        case "internship": return /(intern|trainee)/.test(hay);
      }
      return true;
    };

    const matchDate = (job: JobListing) => {
      if (datePosted === "all") return true;
      if (!job.postedDate) return false;
      const limit = dateLimitDays[datePosted];
      const posted = new Date(job.postedDate).getTime();
      if (isNaN(posted)) {
        // Try relative strings like "2 days ago"
        const m = /(\d+)\s*(hour|day|week|month)/i.exec(job.postedDate);
        if (!m) return false;
        const n = parseInt(m[1]);
        const unit = m[2].toLowerCase();
        const days = unit.startsWith("hour") ? n / 24 : unit.startsWith("day") ? n : unit.startsWith("week") ? n * 7 : n * 30;
        return days <= limit;
      }
      return (now - posted) / dayMs <= limit;
    };

    const matchCompanyType = (job: JobListing) => {
      if (companyType === "all") return true;
      const hay = `${norm(job.company)} ${norm(job.source)}`;
      switch (companyType) {
        case "corporate": return /(corp|corporation|ltd|limited|inc\.?|plc)/.test(hay);
        case "foreign-mnc": return /(google|microsoft|amazon|meta|apple|oracle|ibm|adobe|salesforce|sap|cisco|intel|nvidia|deloitte|accenture|pwc|kpmg|ey|goldman|morgan|jpmorgan|citi|barclays|hsbc|uber|netflix|linkedin|stripe|atlassian|shopify|dell|hp\b|siemens|bosch|samsung|sony|philips)/.test(hay);
        case "indian-mnc": return /(tcs|tata|infosys|wipro|hcl|tech mahindra|mahindra|reliance|adani|larsen|l&t|mindtree|mphasis|persistent|birla|godrej|zoho|freshworks|paytm|flipkart|ola|swiggy|zomato|byju|razorpay|phonepe|mahindra)/.test(hay);
        case "startup": return /(startup|start-up|seed|series [a-e]|early stage)/.test(hay);
      }
      return true;
    };

    const matchSalary = (job: JobListing) => {
      const s = job.salary ?? job.salaryMin ?? job.salaryMax;
      if (s == null) return true; // don't hide jobs without salary data
      return s >= salaryRange[0] && s <= salaryRange[1];
    };

    return jobs.filter(job => {
      if (workMode !== "all") {
        const jobMode = norm(job.workMode || job.type);
        if (workMode === "remote" && !jobMode.includes("remote")) return false;
        if (workMode === "onsite" && !jobMode.includes("on-site") && !jobMode.includes("onsite") && !jobMode.includes("office")) return false;
        if (workMode === "wfh" && !jobMode.includes("home") && !jobMode.includes("wfh") && !jobMode.includes("hybrid")) return false;
      }
      return matchExperience(job) && matchJobType(job) && matchDate(job) && matchCompanyType(job) && matchSalary(job);
    });
  }, [jobs, salaryRange, workMode, currency, experienceLevel, jobType, datePosted, companyType]);

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
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Experience Level</label>
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="intern">Intern / Trainee</SelectItem>
                  <SelectItem value="entry">Entry-level</SelectItem>
                  <SelectItem value="mid">Mid-level</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="lead">Lead / Principal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Job Type</label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="full">Full-time</SelectItem>
                  <SelectItem value="part">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                <Clock className="w-3 h-3 inline mr-1" />Date Posted
              </label>
              <Select value={datePosted} onValueChange={setDatePosted}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Anytime</SelectItem>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="3">Last 3 days</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                <Building2 className="w-3 h-3 inline mr-1" />Company Type
              </label>
              <Select value={companyType} onValueChange={setCompanyType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="foreign-mnc">Foreign MNC</SelectItem>
                  <SelectItem value="indian-mnc">Indian MNC</SelectItem>
                  <SelectItem value="startup">Startup</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setWorkMode("all");
                setExperienceLevel("all");
                setJobType("all");
                setDatePosted("all");
                setCompanyType("all");
                setSalaryRange([0, salaryMax]);
              }}
            >
              Reset filters
            </Button>
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

      {externalLinks.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <h4 className="text-sm font-semibold text-foreground mb-1">
            Browse on other job boards
          </h4>
          <p className="text-xs text-muted-foreground mb-4">
            Curated searches on top sites for your highest-probability roles.
          </p>
          <div className="space-y-3">
            {externalLinks.map((r) => (
              <div key={r.role} className="p-3 bg-muted rounded-xl">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <span className="font-medium text-sm text-foreground">{r.role}</span>
                  {r.probability > 0 && (
                    <span className="px-2 py-0.5 bg-secondary/20 text-secondary rounded-md text-[10px] font-medium">
                      {Math.round(r.probability)}% match
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.links.map((l) => (
                    <a
                      key={l.source}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-card hover:bg-card/70 border border-border rounded-md text-xs text-foreground transition-colors"
                    >
                      {l.source}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AIJobSearch;
