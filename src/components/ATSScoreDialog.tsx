import { useState, useCallback } from "react";
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle, XCircle, AlertTriangle, Sparkles, Download } from "lucide-react";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { extractResumeText } from "@/lib/api/career";
import { supabase } from "@/integrations/supabase/client";

interface ATSCategory {
  name: string;
  score: number;
  maxScore: number;
  status: "excellent" | "good" | "warning" | "poor";
  feedback: string;
}

interface ATSResult {
  overallScore: number;
  rating: "Excellent" | "Good" | "Fair" | "Poor";
  summary: string;
  categories: ATSCategory[];
  issues: string[];
  recommendations: string[];
  keywordMatches: { found: string[]; missing: string[] };
}

const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".md"];

interface ATSScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColor = (s: ATSCategory["status"]) =>
  s === "excellent" ? "text-success" : s === "good" ? "text-primary" : s === "warning" ? "text-yellow-500" : "text-destructive";

const StatusIcon = ({ status }: { status: ATSCategory["status"] }) => {
  const cls = `w-4 h-4 ${statusColor(status)}`;
  if (status === "excellent") return <CheckCircle2 className={cls} />;
  if (status === "good") return <CheckCircle2 className={cls} />;
  if (status === "warning") return <AlertTriangle className={cls} />;
  return <XCircle className={cls} />;
};

const scoreRingColor = (score: number) =>
  score >= 85 ? "stroke-success" : score >= 70 ? "stroke-primary" : score >= 50 ? "stroke-yellow-500" : "stroke-destructive";

const ATSScoreDialog = ({ open, onOpenChange }: ATSScoreDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<ATSResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setStatus("");
    setIsProcessing(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleDownloadPDF = () => {
    if (!result) return;
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
    };

    const writeWrapped = (text: string, size: number, style: "normal" | "bold" = "normal", lineGap = 4) => {
      pdf.setFont("helvetica", style);
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(text, contentWidth);
      lines.forEach((line: string) => {
        ensureSpace(size + lineGap);
        pdf.text(line, margin, y);
        y += size + lineGap;
      });
    };

    // Header
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageWidth, 80, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("ATS Score Report", margin, 40);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Path4U — ${new Date().toLocaleDateString()}`, margin, 60);
    if (file?.name) pdf.text(file.name, pageWidth - margin, 60, { align: "right" });

    pdf.setTextColor(20, 20, 20);
    y = 110;

    // Overall Score
    writeWrapped(`Overall Score: ${result.overallScore}/100 — ${result.rating}`, 16, "bold", 6);
    y += 4;
    writeWrapped(result.summary, 11, "normal", 4);
    y += 10;

    // Category Breakdown
    writeWrapped("Category Breakdown", 14, "bold", 6);
    result.categories.forEach((c) => {
      writeWrapped(`• ${c.name}: ${c.score}/${c.maxScore} (${c.status})`, 11, "bold", 3);
      writeWrapped(`   ${c.feedback}`, 10, "normal", 4);
    });
    y += 6;

    // Keywords
    if (result.keywordMatches.found.length || result.keywordMatches.missing.length) {
      writeWrapped("Keyword Analysis", 14, "bold", 6);
      if (result.keywordMatches.found.length) {
        writeWrapped(`Found: ${result.keywordMatches.found.join(", ")}`, 10, "normal", 4);
      }
      if (result.keywordMatches.missing.length) {
        writeWrapped(`Consider adding: ${result.keywordMatches.missing.join(", ")}`, 10, "normal", 4);
      }
      y += 6;
    }

    // Issues
    if (result.issues.length) {
      writeWrapped("What's Hurting Your Score", 14, "bold", 6);
      result.issues.forEach((i) => writeWrapped(`• ${i}`, 10, "normal", 4));
      y += 6;
    }

    // Recommendations
    if (result.recommendations.length) {
      writeWrapped("Recommendations", 14, "bold", 6);
      result.recommendations.forEach((r) => writeWrapped(`• ${r}`, 10, "normal", 4));
    }

    pdf.save(`ATS-Score-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };


  const isAccepted = (f: File) => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    return ACCEPTED_EXTENSIONS.includes(ext);
  };

  const process = async (f: File) => {
    setFile(f);
    setIsProcessing(true);
    setError(null);
    setResult(null);
    try {
      setStatus("Extracting text from your resume…");
      const text = await extractResumeText(f);

      setStatus("Running ATS compatibility checks…");
      const { data, error: fnError } = await supabase.functions.invoke("ats-score", {
        body: { resumeText: text },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Failed to score resume");

      setResult(data.data as ATSResult);
      setStatus("");
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to process resume";
      setError(msg);
      setIsProcessing(false);
      setStatus("");
      toast({ title: "ATS scan failed", description: msg, variant: "destructive" });
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && isAccepted(f)) process(f);
    else toast({ title: "Unsupported file", description: "Please upload a PDF, TXT, or MD file.", variant: "destructive" });
  }, []);

  const radius = 56;
  const circumference = 2 * Math.PI * radius;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-display">
            <Sparkles className="w-5 h-5 text-primary" />
            ATS Score Analyzer
          </DialogTitle>
          <DialogDescription>
            Upload your resume to see how well it parses through Applicant Tracking Systems used by Workday, Greenhouse, Lever, and Taleo.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!file && !result && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={onDrop}
              className={`relative border-2 border-dotted rounded-none p-10 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className="w-14 h-14 gradient-primary rounded-none flex items-center justify-center mx-auto mb-4">
                <Upload className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Drop your resume here</h3>
              <p className="text-sm text-muted-foreground mb-4">PDF, TXT, or MD — max 5MB</p>
              <input
                type="file"
                accept=".pdf,.txt,.md"
                onChange={(e) => e.target.files?.[0] && process(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="secondary">Choose File</Button>
            </motion.div>
          )}

          {isProcessing && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
              <p className="font-medium">{status}</p>
              <p className="text-sm text-muted-foreground mt-1">{file?.name}</p>
            </motion.div>
          )}

          {error && !isProcessing && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <p className="font-medium mb-4">{error}</p>
              <Button variant="outline" onClick={reset}>Try Another File</Button>
            </motion.div>
          )}

          {result && !isProcessing && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Score ring */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-card border border-border">
                <div className="relative">
                  <svg width="140" height="140" className="-rotate-90">
                    <circle cx="70" cy="70" r={radius} className="stroke-muted fill-none" strokeWidth="10" />
                    <motion.circle
                      cx="70" cy="70" r={radius}
                      className={`fill-none ${scoreRingColor(result.overallScore)}`}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: circumference - (circumference * result.overallScore) / 100 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold font-display">{result.overallScore}</span>
                    <span className="text-xs text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className={`text-xl font-semibold mb-1 ${
                    result.rating === "Excellent" ? "text-success"
                    : result.rating === "Good" ? "text-primary"
                    : result.rating === "Fair" ? "text-yellow-500"
                    : "text-destructive"
                  }`}>
                    {result.rating} ATS Compatibility
                  </div>
                  <p className="text-sm text-muted-foreground">{result.summary}</p>
                </div>
              </div>

              {/* Category breakdown */}
              <div>
                <h4 className="font-semibold mb-3">Category Breakdown</h4>
                <div className="space-y-3">
                  {result.categories.map((c) => {
                    const pct = Math.round((c.score / c.maxScore) * 100);
                    return (
                      <div key={c.name} className="p-3 rounded-lg bg-card border border-border">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={c.status} />
                            <span className="font-medium text-sm">{c.name}</span>
                          </div>
                          <span className={`text-sm font-semibold ${statusColor(c.status)}`}>
                            {c.score}/{c.maxScore}
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                        <p className="text-xs text-muted-foreground mt-1.5">{c.feedback}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Keywords */}
              {(result.keywordMatches.found.length > 0 || result.keywordMatches.missing.length > 0) && (
                <div>
                  <h4 className="font-semibold mb-3">Keyword Analysis</h4>
                  {result.keywordMatches.found.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-2">Found in your resume</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.keywordMatches.found.map((k, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-full bg-success/15 text-success text-xs font-medium">{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.keywordMatches.missing.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Consider adding</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.keywordMatches.missing.map((k, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 text-xs font-medium">{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Issues */}
              {result.issues.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-destructive" />
                    What's hurting your score
                  </h4>
                  <ul className="space-y-1.5">
                    {result.issues.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-destructive mt-1">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Recommendations
                  </h4>
                  <ul className="space-y-1.5">
                    {result.recommendations.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between gap-3 pt-2">
                <Button variant="outline" onClick={reset}>
                  <FileText className="w-4 h-4 mr-2" />
                  Scan Another Resume
                </Button>
                <Button variant="hero" onClick={() => handleClose(false)}>
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default ATSScoreDialog;
