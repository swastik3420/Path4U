import { useState, useCallback } from "react";
import { Upload, FileText, X, CheckCircle, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { parseResume, extractResumeText, type ParsedResume } from "@/lib/api/career";
import { useToast } from "@/components/ui/use-toast";
import AILoadingOverlay from "@/components/AILoadingOverlay";

interface ResumeUploadProps {
  onFileUploaded: (file: File) => void;
  onStartAssessment: (mode: "demo" | "full") => void;
  onResumeAnalyzed?: (data: ParsedResume) => void;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
];

const ACCEPTED_EXTENSIONS = ['.pdf', '.txt', '.md'];

const ResumeUpload = ({ onFileUploaded, onStartAssessment, onResumeAnalyzed }: ResumeUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [excludedSkills, setExcludedSkills] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const isAcceptedFile = (f: File) => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    return ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_TYPES.includes(f.type);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isAcceptedFile(droppedFile)) {
      processFile(droppedFile);
    } else {
      toast({
        title: "Unsupported file",
        description: "Please upload a PDF or TXT file.",
        variant: "destructive",
      });
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setError(null);
    setProcessingStatus("Extracting text from your resume...");
    
    try {
      const resumeText = await extractResumeText(uploadedFile);
      console.log('Extracted resume text, length:', resumeText.length);
      
      setProcessingStatus("Analyzing skills and experience with AI...");
      
      const result = await parseResume(resumeText);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to analyze resume');
      }
      
      console.log('Resume parsed successfully:', result.data);
      setParsedData(result.data);
      setIsProcessing(false);
      setIsReady(true);
      setProcessingStatus("");
      onFileUploaded(uploadedFile);
      onResumeAnalyzed?.(result.data);
      
      toast({
        title: "Resume Analyzed!",
        description: `Found ${result.data.skills.length} skills. Ready to generate your personalized assessment.`,
      });
    } catch (err) {
      console.error('Error processing file:', err);
      setIsProcessing(false);
      setError(err instanceof Error ? err.message : 'Failed to process resume');
      setProcessingStatus("");
      
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to process resume',
        variant: "destructive",
      });
    }
  };

  const handleStart = (mode: "demo" | "full") => {
    if (parsedData && excludedSkills.size > 0) {
      const filtered = {
        ...parsedData,
        skills: parsedData.skills.filter((s) => !excludedSkills.has(s.name)),
      };
      if (filtered.skills.length === 0) {
        toast({
          title: "No skills selected",
          description: "Please keep at least one skill checked to start the assessment.",
          variant: "destructive",
        });
        return;
      }
      onResumeAnalyzed?.(filtered);
    }
    onStartAssessment(mode);
  };



  const removeFile = () => {
    setFile(null);
    setIsReady(false);
    setIsProcessing(false);
    setError(null);
    setParsedData(null);
    setProcessingStatus("");
  };

  return (
    <section id="upload" className="py-20">
      <AILoadingOverlay
        isLoading={isProcessing}
        title={processingStatus || "Scanning Resume for Keywords..."}
        messages={[
          "Scanning Resume for Keywords...",
          "Extracting core competencies...",
          "Identifying educational milestones...",
          "Parsing certifications and achievements...",
          "Structuring your professional digital twin...",
        ]}
      />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Upload Your Resume
          </h2>
          <p className="text-muted-foreground">
            Our AI will extract your skills and create a personalized assessment — works with any resume
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto"
        >
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dotted rounded-none p-12 text-center transition-all duration-300
              ${isDragging
                ? "border-secondary bg-secondary/10"
                : file
                  ? error ? "border-destructive bg-destructive/5" : "border-success bg-success/5"
                  : "border-border hover:border-secondary/50 bg-card"
              }
            `}
          >
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="w-16 h-16 gradient-primary rounded-none flex items-center justify-center mx-auto mb-6">
                    <Upload className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Drag & drop your resume
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Supports PDF and TXT files
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button variant="secondary">
                    Choose File
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        error ? 'bg-destructive/20' : isReady ? 'bg-success/20' : 'bg-secondary/20'
                      }`}>
                        {isProcessing ? (
                          <Loader2 className="w-6 h-6 text-secondary animate-spin" />
                        ) : isReady ? (
                          <CheckCircle className="w-6 h-6 text-success" />
                        ) : (
                          <FileText className="w-6 h-6 text-secondary" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground truncate max-w-[200px]">
                          {file.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isProcessing 
                            ? processingStatus || "Processing..." 
                            : isReady 
                              ? `${parsedData?.skills.length || 0} skills found` 
                              : error 
                                ? error 
                                : ""}
                        </p>
                      </div>
                    </div>
                    {!isProcessing && (
                      <button
                        onClick={removeFile}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {/* Skill preview after analysis */}
                  {isReady && parsedData && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 pt-6 border-t border-border"
                    >
                      <div className="flex flex-wrap gap-2 justify-center">
                        {(showAllSkills ? parsedData.skills : parsedData.skills.slice(0, 10)).map((skill, i) => {
                          const isExcluded = excludedSkills.has(skill.name);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() =>
                                setExcludedSkills((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(skill.name)) next.delete(skill.name);
                                  else next.add(skill.name);
                                  return next;
                                })
                              }
                              title={isExcluded ? "Click to include in assessment" : "Click to exclude from assessment"}
                              className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-all ${
                                isExcluded
                                  ? "bg-muted text-muted-foreground line-through opacity-60 hover:opacity-80"
                                  : "bg-secondary/15 text-secondary hover:bg-secondary/25"
                              }`}
                            >
                              <span
                                className={`inline-flex items-center justify-center w-4 h-4 rounded-full border ${
                                  isExcluded
                                    ? "border-muted-foreground/50"
                                    : "border-secondary/60 bg-secondary/20"
                                }`}
                              >
                                {isExcluded ? (
                                  <X className="w-3 h-3" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                              </span>
                              {skill.name}
                            </button>
                          );
                        })}
                        {parsedData.skills.length > 10 && (
                          <button
                            type="button"
                            onClick={() => setShowAllSkills((v) => !v)}
                            className="px-3 py-1 bg-muted text-muted-foreground hover:bg-muted/80 rounded-full text-sm transition-colors"
                          >
                            {showAllSkills ? "Show less" : `+${parsedData.skills.length - 10} more`}
                          </button>
                        )}
                      </div>
                      {parsedData.experienceLevel && (
                        <p className="text-sm text-muted-foreground mt-3">
                          Experience: <span className="text-foreground font-medium">{parsedData.experienceLevel}</span>
                        </p>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-center"
            >
              <Button variant="outline" onClick={removeFile}>
                Try Another File
              </Button>
            </motion.div>
          )}

          {isReady && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center space-y-3"
            >
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="hero" size="lg" className="rounded-none" onClick={() => handleStart("full")}>
                  Start Full Assessment (30 Q)
                </Button>
                <Button variant="outline" size="lg" className="rounded-none" onClick={() => handleStart("demo")}>
                  Try Demo Mode (5 Q)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Demo mode is a quick 5-question preview. Full assessment gives accurate skill scoring.
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Note: You can uncheck any skill in the box above for any skill you think are not immediately confident about, and it will not be asked in the questions.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default ResumeUpload;
