import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import {
  Building2, Plus, Briefcase, Users, BarChart3, Settings,
  LogOut, Loader2, Eye, Trash2, ToggleLeft, ToggleRight, MapPin, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
}

interface JobListing {
  id: string;
  title: string;
  description: string;
  location: string | null;
  job_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  skills_required: string[];
  experience_level: string | null;
  is_active: boolean;
  applications_count: number;
  views_count: number;
  created_at: string;
}

const CompanyDashboard = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewJob, setShowNewJob] = useState(false);
  const [saving, setSaving] = useState(false);

  // New job form
  const [jobTitle, setJobTitle] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobType, setJobType] = useState("full-time");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [expLevel, setExpLevel] = useState("");

  // Company edit
  const [editDesc, setEditDesc] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/company/auth", { replace: true });
      return;
    }
    if (user) fetchCompanyData();
  }, [user, authLoading]);

  const fetchCompanyData = async () => {
    if (!user) return;
    setLoading(true);
    const { data: companyData } = await supabase
      .from("companies")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!companyData) {
      navigate("/company/auth", { replace: true });
      return;
    }
    setCompany(companyData);
    setEditDesc(companyData.description || "");
    setEditWebsite(companyData.website || "");

    const { data: jobsData } = await supabase
      .from("job_listings")
      .select("*")
      .eq("company_id", companyData.id)
      .order("created_at", { ascending: false });

    setJobs(jobsData || []);
    setLoading(false);
  };

  const handleCreateJob = async () => {
    if (!company || !jobTitle.trim() || !jobDesc.trim()) {
      toast({ title: "Missing fields", description: "Title and description are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("job_listings").insert({
      company_id: company.id,
      title: jobTitle.trim(),
      description: jobDesc.trim(),
      location: jobLocation.trim() || null,
      job_type: jobType,
      salary_min: salaryMin ? parseInt(salaryMin) : null,
      salary_max: salaryMax ? parseInt(salaryMax) : null,
      skills_required: skillsInput.split(",").map((s) => s.trim()).filter(Boolean),
      experience_level: expLevel || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Job posted!", description: "Your listing is now live." });
    setShowNewJob(false);
    resetJobForm();
    fetchCompanyData();
  };

  const resetJobForm = () => {
    setJobTitle(""); setJobDesc(""); setJobLocation(""); setJobType("full-time");
    setSalaryMin(""); setSalaryMax(""); setSkillsInput(""); setExpLevel("");
  };

  const toggleJobActive = async (jobId: string, currentActive: boolean) => {
    await supabase.from("job_listings").update({ is_active: !currentActive }).eq("id", jobId);
    fetchCompanyData();
  };

  const deleteJob = async (jobId: string) => {
    await supabase.from("job_listings").delete().eq("id", jobId);
    toast({ title: "Job deleted" });
    fetchCompanyData();
  };

  const saveProfile = async () => {
    if (!company) return;
    setSavingProfile(true);
    await supabase.from("companies").update({
      description: editDesc.trim(),
      website: editWebsite.trim() || null,
    }).eq("id", company.id);
    setSavingProfile(false);
    toast({ title: "Profile updated" });
    fetchCompanyData();
  };

  const activeJobs = jobs.filter((j) => j.is_active);
  const totalApps = jobs.reduce((sum, j) => sum + j.applications_count, 0);
  const totalViews = jobs.reduce((sum, j) => sum + j.views_count, 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Company Dashboard — Path4U"
        description="Post jobs, track applications, manage candidates, and view analytics on Path4U."
        canonical="https://path4u.lovable.app/company/dashboard"
        ogUrl="https://path4u.lovable.app/company/dashboard"
      />
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">{company?.name}</h1>
              <p className="text-xs text-muted-foreground">{company?.industry} · {company?.size}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={async () => { await signOut(); navigate("/"); }} className="gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Jobs", value: activeJobs.length, icon: Briefcase, color: "text-primary" },
            { label: "Total Listings", value: jobs.length, icon: BarChart3, color: "text-secondary" },
            { label: "Applications", value: totalApps, icon: Users, color: "text-accent" },
            { label: "Total Views", value: totalViews, icon: Eye, color: "text-info" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="jobs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="jobs">Job Listings</TabsTrigger>
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
            <TabsTrigger value="profile">Company Profile</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">Your Job Listings</h2>
              <Dialog open={showNewJob} onOpenChange={setShowNewJob}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="w-4 h-4" /> Post New Job</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Create Job Listing</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div><Label>Job Title *</Label><Input placeholder="Senior Software Engineer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} /></div>
                    <div><Label>Description *</Label><Textarea placeholder="Describe the role..." rows={4} value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Location</Label><Input placeholder="Remote / NYC" value={jobLocation} onChange={(e) => setJobLocation(e.target.value)} /></div>
                      <div>
                        <Label>Job Type</Label>
                        <Select value={jobType} onValueChange={setJobType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["full-time", "part-time", "contract", "internship"].map((t) => (
                              <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Min Salary ($)</Label><Input type="number" placeholder="50000" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} /></div>
                      <div><Label>Max Salary ($)</Label><Input type="number" placeholder="80000" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} /></div>
                    </div>
                    <div><Label>Required Skills (comma separated)</Label><Input placeholder="React, TypeScript, Node.js" value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} /></div>
                    <div>
                      <Label>Experience Level</Label>
                      <Select value={expLevel} onValueChange={setExpLevel}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {["Entry", "Mid", "Senior", "Lead", "Executive"].map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateJob} disabled={saving} className="w-full">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish Job"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {jobs.length === 0 ? (
              <Card><CardContent className="p-12 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No job listings yet</h3>
                <p className="text-muted-foreground mb-4">Post your first job to start receiving applications.</p>
                <Button onClick={() => setShowNewJob(true)}><Plus className="w-4 h-4 mr-2" /> Post a Job</Button>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className={!job.is_active ? "opacity-60" : ""}>
                      <CardContent className="p-5 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
                            <Badge variant={job.is_active ? "default" : "secondary"}>
                              {job.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{job.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                            {job.job_type && <span className="capitalize">{job.job_type}</span>}
                            {job.salary_min && job.salary_max && (
                              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{job.salary_min.toLocaleString()}–{job.salary_max.toLocaleString()}</span>
                            )}
                            <span>{job.applications_count} applications</span>
                          </div>
                          {job.skills_required?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {job.skills_required.slice(0, 5).map((s) => (
                                <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => toggleJobActive(job.id, job.is_active)} title={job.is_active ? "Deactivate" : "Activate"} aria-label={job.is_active ? "Deactivate job listing" : "Activate job listing"}>
                            {job.is_active ? <ToggleRight className="w-4 h-4 text-secondary" /> : <ToggleLeft className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteJob(job.id)} className="text-destructive hover:text-destructive" aria-label="Delete job listing">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Candidates Tab */}
          <TabsContent value="candidates">
            <Card><CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Candidate applications will appear here</h3>
              <p className="text-muted-foreground">When users apply to your job listings, you'll see their profiles and assessment results here.</p>
            </CardContent></Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader><CardTitle>Company Profile</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Company Name</Label>
                  <Input value={company?.name || ""} disabled className="bg-muted" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Industry</Label><Input value={company?.industry || ""} disabled className="bg-muted" /></div>
                  <div><Label>Size</Label><Input value={company?.size || ""} disabled className="bg-muted" /></div>
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} placeholder="https://example.com" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} placeholder="Tell candidates about your company..." />
                </div>
                <Button onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Job Performance</CardTitle></CardHeader>
                <CardContent>
                  {jobs.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Post jobs to see analytics.</p>
                  ) : (
                    <div className="space-y-3">
                      {jobs.slice(0, 5).map((job) => (
                        <div key={job.id} className="flex items-center justify-between">
                          <span className="text-sm text-foreground truncate max-w-[200px]">{job.title}</span>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>{job.views_count} views</span>
                            <span>{job.applications_count} apps</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total listings</span><span className="font-medium text-foreground">{jobs.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Active listings</span><span className="font-medium text-foreground">{activeJobs.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total applications</span><span className="font-medium text-foreground">{totalApps}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Avg. views per job</span><span className="font-medium text-foreground">{jobs.length > 0 ? Math.round(totalViews / jobs.length) : 0}</span></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CompanyDashboard;
