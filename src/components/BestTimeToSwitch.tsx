import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Loader2, RefreshCw, Sparkles } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceArea, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import type { ParsedResume } from "@/lib/api/career";

interface SkillResult { skill: string; score: number; level: string }
interface MonthPoint { month: string; hiringVolume: number; salaryLeverage: number; note?: string }
interface Window { startMonth: string; endMonth: string; reason: string }
interface SeasonalityResponse {
  location: string;
  roles: string[];
  months: MonthPoint[];
  optimalWindow?: Window;
  secondaryWindow?: Window;
}

interface Props {
  results: SkillResult[];
  parsedResume?: ParsedResume | null;
}

const MONTH_ORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const barColor = (v: number) => {
  if (v >= 80) return "#10b981";
  if (v >= 60) return "#06b6d4";
  if (v >= 40) return "#3b82f6";
  if (v >= 20) return "#a855f7";
  return "#94a3b8";
};

const BestTimeToSwitch = ({ results, parsedResume }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SeasonalityResponse | null>(null);
  const [location, setLocation] = useState("India");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rolesRes, error: rolesErr } = await supabase.functions.invoke("predict-job-roles", {
        body: {
          skills: results.map(r => ({ name: r.skill, score: r.score, level: r.level })),
          experienceLevel: parsedResume?.experienceLevel || "Unknown",
          industries: parsedResume?.industries || [],
          jobTitles: parsedResume?.jobTitles || [],
        },
      });
      if (rolesErr) throw rolesErr;

      const roleList: string[] = (rolesRes?.roles || []).slice(0, 6).map((r: any) => r.role);
      const merged = Array.from(new Set([...roleList, ...(parsedResume?.jobTitles || []).slice(0, 2)])).slice(0, 6);
      if (merged.length === 0) { setData(null); return; }

      const { data: res, error } = await supabase.functions.invoke("best-time-switch", {
        body: { roles: merged, location },
      });
      if (error) throw error;
      setData(res as SeasonalityResponse);
    } catch (err) {
      console.error("Seasonality error:", err);
      toast({
        title: "Couldn't load seasonality data",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const chartData = useMemo(() => {
    if (!data?.months) return [];
    const map = new Map(data.months.map(m => [m.month.slice(0,3), m]));
    return MONTH_ORDER.map(m => {
      const src = map.get(m) || { month: m, hiringVolume: 0, salaryLeverage: 0 };
      return { ...src, month: m };
    });
  }, [data]);

  const peakMonth = useMemo(() => {
    if (!chartData.length) return null;
    return chartData.reduce((a, b) => (b.hiringVolume > a.hiringVolume ? b : a));
  }, [chartData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-secondary" />
          <div>
            <h3 className="text-xl font-semibold text-foreground">Best Time to Switch</h3>
            <p className="text-xs text-muted-foreground">
              Hiring seasonality & salary leverage across the year
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onBlur={fetchData}
              placeholder="India, USA, Germany…"
              className="w-40"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Analyzing hiring seasonality…</span>
        </div>
      ) : chartData.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No seasonality data available.
        </p>
      ) : (
        <>
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="leverageGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                  label={{ value: "Hiring Volume", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
                  domain={[0, 100]}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                  label={{ value: "Salary Leverage", angle: 90, position: "insideRight", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
                        <div className="font-semibold mb-1">{label}</div>
                        <div>Hiring: <span className="font-medium">{p.hiringVolume}</span></div>
                        <div>Leverage: <span className="font-medium">{p.salaryLeverage}</span></div>
                        {p.note && <div className="text-muted-foreground mt-1 max-w-[200px]">{p.note}</div>}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />

                {data?.optimalWindow && (
                  <ReferenceArea
                    yAxisId="left"
                    x1={data.optimalWindow.startMonth.slice(0,3)}
                    x2={data.optimalWindow.endMonth.slice(0,3)}
                    fill="#10b981"
                    fillOpacity={0.12}
                    stroke="#10b981"
                    strokeOpacity={0.4}
                    label={{ value: "Optimal Window", position: "insideTop", fill: "#10b981", fontSize: 11 }}
                  />
                )}
                {data?.secondaryWindow && (
                  <ReferenceArea
                    yAxisId="left"
                    x1={data.secondaryWindow.startMonth.slice(0,3)}
                    x2={data.secondaryWindow.endMonth.slice(0,3)}
                    fill="#eab308"
                    fillOpacity={0.10}
                    stroke="#eab308"
                    strokeOpacity={0.4}
                    label={{ value: "Secondary", position: "insideBottom", fill: "#eab308", fontSize: 11 }}
                  />
                )}

                <Bar yAxisId="left" dataKey="hiringVolume" name="Hiring Volume" radius={[6,6,0,0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={barColor(entry.hiringVolume)} />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="salaryLeverage"
                  name="Salary Leverage"
                  stroke="url(#leverageGrad)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#f97316" }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-6">
            {data?.optimalWindow && (
              <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-success" />
                  <span className="font-semibold text-sm text-foreground">
                    Optimal: {data.optimalWindow.startMonth} → {data.optimalWindow.endMonth}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{data.optimalWindow.reason}</p>
              </div>
            )}
            {data?.secondaryWindow && (
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-warning" />
                  <span className="font-semibold text-sm text-foreground">
                    Secondary: {data.secondaryWindow.startMonth} → {data.secondaryWindow.endMonth}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{data.secondaryWindow.reason}</p>
              </div>
            )}
          </div>

          {peakMonth && (
            <p className="text-[11px] text-muted-foreground mt-4">
              Peak hiring month for your target roles in {data?.location || location}:{" "}
              <span className="font-semibold text-foreground">{peakMonth.month}</span>. Data
              aggregated from LinkedIn Workforce Reports, Naukri JobSpeak, Indeed Hiring Lab &
              Glassdoor Economic Research.
            </p>
          )}
        </>
      )}
    </motion.div>
  );
};

export default BestTimeToSwitch;
