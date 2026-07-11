import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import type { ParsedResume } from "@/lib/api/career";

interface SkillResult { skill: string; score: number; level: string }
interface SalaryRow { role: string; min: number; avg: number; max: number; source?: string }
interface SalaryResponse { currency: "INR" | "USD"; location: string; unit: string; salaries: SalaryRow[] }

interface Props {
  results: SkillResult[];
  parsedResume?: ParsedResume | null;
}

type Metric = "avg" | "max" | "min";
type SortDir = "desc" | "asc";
type Currency = "INR" | "USD";

// Gradient palette: low (cool) -> high (warm)
const PALETTE = ["#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#84cc16", "#eab308", "#f97316", "#ef4444"];
const colorForRank = (rank: number, total: number) => {
  if (total <= 1) return PALETTE[PALETTE.length - 1];
  const idx = Math.round((rank / (total - 1)) * (PALETTE.length - 1));
  return PALETTE[idx];
};

const formatMoney = (n: number, currency: Currency) => {
  if (currency === "INR") {
    if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
    if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)} L`;
    if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
    return `₹${n}`;
  }
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};

const SalaryInsights = ({ results, parsedResume }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SalaryResponse | null>(null);

  const [currency, setCurrency] = useState<Currency>("INR");
  const [location, setLocation] = useState("India");
  const [metric, setMetric] = useState<Metric>("avg");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      // 1. Predict top roles from the assessment
      const { data: rolesRes, error: rolesErr } = await supabase.functions.invoke("predict-job-roles", {
        body: {
          skills: results.map(r => ({ name: r.skill, score: r.score, level: r.level })),
          experienceLevel: parsedResume?.experienceLevel || "Unknown",
          industries: parsedResume?.industries || [],
          jobTitles: parsedResume?.jobTitles || [],
        },
      });
      if (rolesErr) throw rolesErr;

      const roleList: string[] = (rolesRes?.roles || [])
        .slice(0, 8)
        .map((r: any) => r.role);

      // Also include the user's own job titles for richer context
      const extra = (parsedResume?.jobTitles || []).slice(0, 3);
      const merged = Array.from(new Set([...roleList, ...extra])).slice(0, 10);

      if (merged.length === 0) {
        setData(null);
        return;
      }

      const { data: salaryRes, error: salaryErr } = await supabase.functions.invoke("salary-insights", {
        body: {
          roles: merged,
          location,
          currency,
          experienceLevel: parsedResume?.experienceLevel || "Mid-level",
        },
      });
      if (salaryErr) throw salaryErr;

      setData(salaryRes as SalaryResponse);
    } catch (err) {
      console.error("Salary insights error:", err);
      toast({
        title: "Couldn't load salary data",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, location]);

  const chartData = useMemo(() => {
    if (!data?.salaries) return [];
    const sorted = [...data.salaries].sort((a, b) => {
      const av = a[metric] ?? 0;
      const bv = b[metric] ?? 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return sorted.map((s, i) => ({
      ...s,
      color: colorForRank(sortDir === "desc" ? sorted.length - 1 - i : i, sorted.length),
    }));
  }, [data, metric, sortDir]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-secondary" />
          <div>
            <h3 className="text-xl font-semibold text-foreground">Salary for Job Roles</h3>
            <p className="text-xs text-muted-foreground">
              Estimates based on Glassdoor, LinkedIn, Levels.fyi, AmbitionBox & Naukri
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSalaries} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div>
          <Label className="text-xs text-muted-foreground">Currency</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">INR (₹)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Metric</Label>
          <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="avg">Avg Salary</SelectItem>
              <SelectItem value="max">Max Salary</SelectItem>
              <SelectItem value="min">Min Salary</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Sort</Label>
          <Select value={sortDir} onValueChange={(v) => setSortDir(v as SortDir)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Descending</SelectItem>
              <SelectItem value="asc">Ascending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Location</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={fetchSalaries}
            placeholder="India, Bengaluru, USA, Germany…"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Analyzing salary data…</span>
        </div>
      ) : chartData.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No salary data available. Try refreshing or changing filters.
        </p>
      ) : (
        <>
          <div className="w-full h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 10, bottom: 90 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="role"
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={80}
                  tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                  tickFormatter={(v) => formatMoney(v, currency)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                  formatter={(value: any, name: any) => [formatMoney(Number(value), currency), name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey={metric} name={`${metric.toUpperCase()} Salary`} radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="max"
                  name="Max Salary Trend"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="min"
                  name="Min Salary Trend"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend / table */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2">
            {chartData.map((row) => (
              <div
                key={row.role}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="truncate font-medium text-foreground">{row.role}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                  <span>Min {formatMoney(row.min, currency)}</span>
                  <span className="text-foreground font-semibold">
                    Avg {formatMoney(row.avg, currency)}
                  </span>
                  <span className="text-success">Max {formatMoney(row.max, currency)}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground mt-4 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Figures are annual gross estimates aggregated from public salary sources and may vary by
            company, city, and years of experience.
          </p>
        </>
      )}
    </motion.div>
  );
};

export default SalaryInsights;
