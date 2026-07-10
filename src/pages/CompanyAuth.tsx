import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { Mail, Lock, Building2, ArrowRight, Loader2, Eye, EyeOff, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const CompanyAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [website, setWebsite] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      // Check if this user has a company profile
      supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            navigate("/company/dashboard", { replace: true });
          }
        });
    }
  }, [user, isLoading, navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) newErrors.password = passwordResult.error.errors[0].message;
    if (!isLogin) {
      if (!companyName.trim()) newErrors.companyName = "Company name is required";
      if (!industry) newErrors.industry = "Please select an industry";
      if (!companySize) newErrors.companySize = "Please select company size";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
          return;
        }
        // After sign in, check company profile exists
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: company } = await supabase
            .from("companies")
            .select("id")
            .eq("user_id", currentUser.id)
            .maybeSingle();
          if (!company) {
            toast({ title: "Not a company account", description: "No company profile found for this account.", variant: "destructive" });
            await supabase.auth.signOut();
            return;
          }
        }
        toast({ title: "Welcome back!", description: "Signed in to your company account." });
        navigate("/company/dashboard");
      } else {
        const { error } = await signUp(email, password, companyName);
        if (error) {
          toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
          return;
        }
        // Create company profile after signup
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          const { error: companyError } = await supabase.from("companies").insert({
            user_id: newUser.id,
            name: companyName.trim(),
            industry,
            size: companySize,
            website: website.trim() || null,
          });
          if (companyError) {
            console.error("Company profile error:", companyError);
          }
        }
        toast({
          title: "Company account created!",
          description: "Please check your email to verify your account.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const industries = [
    "Technology", "Finance", "Healthcare", "Education", "Manufacturing",
    "Retail", "Media", "Consulting", "Government", "Other"
  ];

  const sizes = [
    { value: "1-10", label: "1-10 employees" },
    { value: "11-50", label: "11-50 employees" },
    { value: "51-200", label: "51-200 employees" },
    { value: "201-500", label: "201-500 employees" },
    { value: "501-1000", label: "501-1000 employees" },
    { value: "1000+", label: "1000+ employees" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEO
        title="Company Sign In — Path4U"
        description="Sign in to your Path4U company account to post jobs and manage candidates."
        canonical="https://path4u.lovable.app/company/auth"
        ogUrl="https://path4u.lovable.app/company/auth"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Path4U</span>
            <span className="text-xs font-medium bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
              For Companies
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isLogin ? "Company Sign In" : "Register Your Company"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin
              ? "Access your hiring dashboard"
              : "Start posting jobs and finding talent"}
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="companyName"
                      placeholder="Acme Corp"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={`pl-10 ${errors.companyName ? "border-destructive" : ""}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.companyName && <p className="text-sm text-destructive">{errors.companyName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger className={errors.industry ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((i) => (
                          <SelectItem key={i} value={i}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.industry && <p className="text-sm text-destructive">{errors.industry}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Company Size</Label>
                    <Select value={companySize} onValueChange={setCompanySize}>
                      <SelectTrigger className={errors.companySize ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {sizes.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.companySize && <p className="text-sm text-destructive">{errors.companySize}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website (optional)</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="website"
                      placeholder="https://example.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="pl-10"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="hr@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Register Company"}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-muted-foreground">
              {isLogin ? "Don't have a company account?" : "Already registered?"}
              <button
                onClick={() => { setIsLogin(!isLogin); setErrors({}); }}
                className="ml-2 text-secondary hover:underline font-medium"
                disabled={isSubmitting}
              >
                {isLogin ? "Register" : "Sign In"}
              </button>
            </p>
            <Link to="/auth" className="block text-sm text-muted-foreground hover:text-foreground">
              Looking for a candidate account? Sign in here →
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CompanyAuth;
