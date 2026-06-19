import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Loader2, Save, User, Plus, Trash2, FileText, GraduationCap, Award, Upload, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Certification {
  id: string;
  name: string;
  issuing_organization: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
  file_url: string | null;
}

interface Education {
  id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  grade: string | null;
  description: string | null;
}

const ProfileSettings = () => {
  const { user, profile, isLoading, updateProfile } = useAuth();
  const { reduceMotion, toggleReduceMotion } = useReduceMotion();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Certifications state
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [showAddCert, setShowAddCert] = useState(false);
  const [certName, setCertName] = useState("");
  const [certOrg, setCertOrg] = useState("");
  const [certIssueDate, setCertIssueDate] = useState("");
  const [certExpiryDate, setCertExpiryDate] = useState("");
  const [certCredId, setCertCredId] = useState("");
  const [certCredUrl, setCertCredUrl] = useState("");
  const [certFile, setCertFile] = useState<File | null>(null);
  const [savingCert, setSavingCert] = useState(false);
  const certFileRef = useRef<HTMLInputElement>(null);

  // Education state
  const [education, setEducation] = useState<Education[]>([]);
  const [showAddEdu, setShowAddEdu] = useState(false);
  const [eduInstitution, setEduInstitution] = useState("");
  const [eduDegree, setEduDegree] = useState("");
  const [eduField, setEduField] = useState("");
  const [eduStartDate, setEduStartDate] = useState("");
  const [eduEndDate, setEduEndDate] = useState("");
  const [eduGrade, setEduGrade] = useState("");
  const [eduDesc, setEduDesc] = useState("");
  const [savingEdu, setSavingEdu] = useState(false);

  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();
    if (!trimmedName) e.fullName = "Full name is required.";
    else if (trimmedName.length < 2) e.fullName = "Name must be at least 2 characters.";
    if (trimmedUsername && !usernameRegex.test(trimmedUsername)) e.username = "3-30 characters, letters, numbers, and underscores only.";
    if (bio.length > 500) e.bio = "Bio must be 500 characters or fewer.";
    return e;
  }, [fullName, username, bio]);

  const hasErrors = Object.keys(errors).length > 0;

  if (profile && !initialized) {
    setFullName(profile.full_name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setInitialized(true);
  }

  useEffect(() => {
    if (user) {
      fetchCertifications();
      fetchEducation();
    }
  }, [user]);

  const fetchCertifications = async () => {
    if (!user) return;
    const { data } = await supabase.from("certifications").select("*").eq("user_id", user.id).order("issue_date", { ascending: false });
    setCertifications(data || []);
  };

  const fetchEducation = async () => {
    if (!user) return;
    const { data } = await supabase.from("education").select("*").eq("user_id", user.id).order("start_date", { ascending: false });
    setEducation(data || []);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Avatar must be under 2MB.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (hasErrors) {
      toast({ title: "Fix errors", description: "Please correct the highlighted fields.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await updateProfile({
        full_name: fullName.trim() || null,
        username: username.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl || null,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCertification = async () => {
    if (!certName.trim()) {
      toast({ title: "Missing name", description: "Certification name is required.", variant: "destructive" });
      return;
    }
    setSavingCert(true);
    try {
      let fileUrl: string | null = null;
      if (certFile) {
        const ext = certFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("certificates").upload(path, certFile);
        if (uploadErr) {
          toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
          return;
        }
        // Store the storage path (not a public URL) — bucket is private; we generate signed URLs on demand.
        fileUrl = path;
      }

      const { error } = await supabase.from("certifications").insert({
        user_id: user.id,
        name: certName.trim(),
        issuing_organization: certOrg.trim() || null,
        issue_date: certIssueDate || null,
        expiry_date: certExpiryDate || null,
        credential_id: certCredId.trim() || null,
        credential_url: certCredUrl.trim() || null,
        file_url: fileUrl,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Certification added!" });
      setShowAddCert(false);
      setCertName(""); setCertOrg(""); setCertIssueDate(""); setCertExpiryDate("");
      setCertCredId(""); setCertCredUrl(""); setCertFile(null);
      fetchCertifications();
    } finally {
      setSavingCert(false);
    }
  };

  const deleteCertification = async (id: string) => {
    await supabase.from("certifications").delete().eq("id", id);
    toast({ title: "Certification removed" });
    fetchCertifications();
  };

  const handleAddEducation = async () => {
    if (!eduInstitution.trim()) {
      toast({ title: "Missing institution", description: "Institution name is required.", variant: "destructive" });
      return;
    }
    setSavingEdu(true);
    try {
      const { error } = await supabase.from("education").insert({
        user_id: user.id,
        institution: eduInstitution.trim(),
        degree: eduDegree.trim() || null,
        field_of_study: eduField.trim() || null,
        start_date: eduStartDate || null,
        end_date: eduEndDate || null,
        grade: eduGrade.trim() || null,
        description: eduDesc.trim() || null,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Education added!" });
      setShowAddEdu(false);
      setEduInstitution(""); setEduDegree(""); setEduField(""); setEduStartDate("");
      setEduEndDate(""); setEduGrade(""); setEduDesc("");
      fetchEducation();
    } finally {
      setSavingEdu(false);
    }
  };

  const deleteEducation = async (id: string) => {
    await supabase.from("education").delete().eq("id", id);
    toast({ title: "Education removed" });
    fetchEducation();
  };

  const initials = (fullName || user.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto space-y-8"
      >
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information</p>
        </div>

        {/* Basic Info Card */}
        <div className="bg-card rounded-2xl shadow-lg p-8 space-y-8">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Camera className="w-6 h-6 text-white" />}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <p className="text-sm text-muted-foreground">Click to upload a new photo</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className={`pl-10 ${errors.fullName ? "border-destructive focus-visible:ring-destructive" : ""}`} maxLength={100} />
              </div>
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className={`pl-10 ${errors.username ? "border-destructive focus-visible:ring-destructive" : ""}`} maxLength={30} />
              </div>
              {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={4} maxLength={500} />
              <p className={`text-xs text-right ${errors.bio ? "text-destructive" : "text-muted-foreground"}`}>{bio.length}/500</p>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email || ""} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
            </div>
          </div>

          <Button variant="hero" size="lg" className="w-full" onClick={handleSave} disabled={isSaving || hasErrors}>
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
          </Button>
        </div>

        {/* Certifications Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Certifications
            </CardTitle>
            <Dialog open={showAddCert} onOpenChange={setShowAddCert}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1"><Plus className="w-4 h-4" /> Add</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add Certification</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div><Label>Certification Name *</Label><Input placeholder="AWS Solutions Architect" value={certName} onChange={(e) => setCertName(e.target.value)} /></div>
                  <div><Label>Issuing Organization</Label><Input placeholder="Amazon Web Services" value={certOrg} onChange={(e) => setCertOrg(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Issue Date</Label><Input type="date" value={certIssueDate} onChange={(e) => setCertIssueDate(e.target.value)} /></div>
                    <div><Label>Expiry Date</Label><Input type="date" value={certExpiryDate} onChange={(e) => setCertExpiryDate(e.target.value)} /></div>
                  </div>
                  <div><Label>Credential ID</Label><Input placeholder="ABC123XYZ" value={certCredId} onChange={(e) => setCertCredId(e.target.value)} /></div>
                  <div><Label>Credential URL</Label><Input placeholder="https://verify.example.com/..." value={certCredUrl} onChange={(e) => setCertCredUrl(e.target.value)} /></div>
                  <div>
                    <Label>Upload Certificate (PDF)</Label>
                    <div
                      className="mt-1 border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => certFileRef.current?.click()}
                    >
                      {certFile ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                          <FileText className="w-4 h-4 text-primary" />
                          {certFile.name}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          <Upload className="w-5 h-5 mx-auto mb-1" />
                          Click to upload PDF
                        </div>
                      )}
                      <input ref={certFileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setCertFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <Button onClick={handleAddCertification} disabled={savingCert} className="w-full">
                    {savingCert ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Certification"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {certifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No certifications added yet.</p>
            ) : (
              <div className="space-y-3">
                {certifications.map((cert) => (
                  <div key={cert.id} className="flex items-start justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{cert.name}</p>
                      {cert.issuing_organization && <p className="text-xs text-muted-foreground">{cert.issuing_organization}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {cert.issue_date && <Badge variant="outline" className="text-xs">{cert.issue_date}</Badge>}
                        {cert.file_url && (
                          <button
                            type="button"
                            onClick={async () => {
                              // Migrate legacy public URLs: extract storage path if needed
                              const raw = cert.file_url!;
                              const path = raw.includes("/certificates/")
                                ? raw.split("/certificates/")[1].split("?")[0]
                                : raw;
                              const { data, error } = await supabase.storage
                                .from("certificates")
                                .createSignedUrl(path, 3600);
                              if (error || !data?.signedUrl) {
                                toast({ title: "Unable to open file", description: error?.message ?? "Try again later.", variant: "destructive" });
                                return;
                              }
                              window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                            }}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" /> View PDF
                          </button>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0" onClick={() => deleteCertification(cert.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Education Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Education
            </CardTitle>
            <Dialog open={showAddEdu} onOpenChange={setShowAddEdu}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1"><Plus className="w-4 h-4" /> Add</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add Education</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div><Label>Institution *</Label><Input placeholder="MIT" value={eduInstitution} onChange={(e) => setEduInstitution(e.target.value)} /></div>
                  <div><Label>Degree</Label><Input placeholder="Bachelor of Science" value={eduDegree} onChange={(e) => setEduDegree(e.target.value)} /></div>
                  <div><Label>Field of Study</Label><Input placeholder="Computer Science" value={eduField} onChange={(e) => setEduField(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Start Date</Label><Input type="date" value={eduStartDate} onChange={(e) => setEduStartDate(e.target.value)} /></div>
                    <div><Label>End Date</Label><Input type="date" value={eduEndDate} onChange={(e) => setEduEndDate(e.target.value)} /></div>
                  </div>
                  <div><Label>Grade / GPA</Label><Input placeholder="3.8 / 4.0" value={eduGrade} onChange={(e) => setEduGrade(e.target.value)} /></div>
                  <div><Label>Description</Label><Textarea placeholder="Activities, honors, relevant coursework..." rows={3} value={eduDesc} onChange={(e) => setEduDesc(e.target.value)} /></div>
                  <Button onClick={handleAddEducation} disabled={savingEdu} className="w-full">
                    {savingEdu ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Education"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {education.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No education added yet.</p>
            ) : (
              <div className="space-y-3">
                {education.map((edu) => (
                  <div key={edu.id} className="flex items-start justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{edu.institution}</p>
                      {(edu.degree || edu.field_of_study) && (
                        <p className="text-xs text-muted-foreground">
                          {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {edu.start_date && (
                          <Badge variant="outline" className="text-xs">
                            {edu.start_date} – {edu.end_date || "Present"}
                          </Badge>
                        )}
                        {edu.grade && <Badge variant="secondary" className="text-xs">GPA: {edu.grade}</Badge>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0" onClick={() => deleteEducation(edu.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ProfileSettings;
