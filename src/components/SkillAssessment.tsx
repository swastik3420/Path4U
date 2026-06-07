import { useState, useEffect } from "react";
import { ChevronRight, Clock, Brain, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { generateQuestions, type ParsedResume, type Question } from "@/lib/api/career";
import { useToast } from "@/components/ui/use-toast";
import AILoadingOverlay from "@/components/AILoadingOverlay";

interface SkillAssessmentProps {
  onComplete: (results: { skill: string; score: number; level: string }[]) => void;
  parsedResume: ParsedResume;
  questionCount?: number;
}

const SkillAssessment = ({ onComplete, parsedResume, questionCount }: SkillAssessmentProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadQuestions();
  }, [parsedResume]);

  const loadQuestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Generating questions for skills:', parsedResume.skills);
      const result = await generateQuestions(parsedResume.skills, parsedResume.experienceLevel, questionCount);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to generate questions');
      }

      console.log('Generated questions:', result.data);
      setQuestions(result.data);
      setIsLoading(false);

      toast({
        title: "Questions Ready!",
        description: `${result.data.length} personalized questions generated based on your resume.`,
      });
    } catch (err) {
      console.error('Error loading questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
      setIsLoading(false);

      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to generate questions',
        variant: "destructive",
      });
    }
  };

  const question = questions[currentQuestion];
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  const handleAnswerSelect = (index: number) => {
    if (showFeedback) return;
    setSelectedAnswer(index);
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;

    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);
    setShowFeedback(true);

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else {
        // Calculate results
        const skillScores: Record<string, { correct: number; total: number }> = {};
        questions.forEach((q, i) => {
          if (!skillScores[q.skill]) {
            skillScores[q.skill] = { correct: 0, total: 0 };
          }
          skillScores[q.skill].total++;
          if (newAnswers[i] === q.correctAnswer) {
            skillScores[q.skill].correct++;
          }
        });

        const results = Object.entries(skillScores).map(([skill, { correct, total }]) => {
          const score = Math.round((correct / total) * 100);
          let level = "Beginner";
          if (score >= 80) level = "Expert";
          else if (score >= 60) level = "Intermediate";
          else if (score >= 40) level = "Developing";
          return { skill, score, level };
        });

        onComplete(results);
      }
    }, 1500);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Basic": return "bg-success/20 text-success";
      case "Intermediate": return "bg-warning/20 text-warning";
      case "Advanced": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <AILoadingOverlay
        isLoading
        title="Locking Syllabus & Generating Evaluation..."
        messages={[
          "Locking Syllabus & Generating Evaluation...",
          "Mapping technical domains to proficiency tiers...",
          "Calibrating MCQ difficulty based on resume context...",
          "Fine-tuning distractor options for precision...",
          "Readying the Path4U evaluation engine...",
        ]}
      />
    );
  }

  // Error state
  if (error || questions.length === 0) {
    return (
      <section className="py-20 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-2xl shadow-lg p-12"
            >
              <div className="w-20 h-20 bg-destructive/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Failed to Generate Questions
              </h3>
              <p className="text-muted-foreground mb-6">
                {error || 'No questions were generated. Please try again.'}
              </p>
              <Button variant="hero" onClick={loadQuestions}>
                Try Again
              </Button>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 min-h-screen">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Brain className="w-5 h-5" />
                <span>Question {currentQuestion + 1} of {questions.length}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span>Skill Assessment</span>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card rounded-2xl shadow-lg p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(question.difficulty)}`}>
                  {question.difficulty}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{question.skill}</span>
              </div>

              <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-8">
                {question.question}
              </h3>

              <div className="space-y-4 mb-8">
                {question.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = showFeedback && index === question.correctAnswer;
                  const isWrong = showFeedback && isSelected && index !== question.correctAnswer;

                  return (
                    <motion.button
                      key={index}
                      whileHover={!showFeedback ? { scale: 1.01 } : {}}
                      whileTap={!showFeedback ? { scale: 0.99 } : {}}
                      onClick={() => handleAnswerSelect(index)}
                      className={`
                        w-full p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-4
                        ${isCorrect 
                          ? "bg-success/20 border-2 border-success" 
                          : isWrong 
                            ? "bg-destructive/20 border-2 border-destructive"
                            : isSelected 
                              ? "bg-secondary/20 border-2 border-secondary" 
                              : "bg-muted hover:bg-muted/80 border-2 border-transparent"
                        }
                      `}
                    >
                      <span className={`
                        w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium
                        ${isCorrect 
                          ? "bg-success text-success-foreground" 
                          : isWrong 
                            ? "bg-destructive text-destructive-foreground"
                            : isSelected 
                              ? "bg-secondary text-secondary-foreground" 
                              : "bg-card text-foreground"
                        }
                      `}>
                        {isCorrect ? <CheckCircle className="w-5 h-5" /> : String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-foreground flex-1">{option}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Show explanation after feedback */}
              {showFeedback && question.explanation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-secondary/10 rounded-xl border border-secondary/20"
                >
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Explanation:</span> {question.explanation}
                  </p>
                </motion.div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="hero"
                  size="lg"
                  onClick={handleNext}
                  disabled={selectedAnswer === null || showFeedback}
                >
                  {currentQuestion < questions.length - 1 ? "Next Question" : "See Results"}
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default SkillAssessment;
