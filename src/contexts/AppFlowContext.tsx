import { createContext, useContext, useState, ReactNode } from "react";

export type FlowStage = "landing" | "upload" | "assessment" | "results" | "dashboard";

interface AppFlowState {
  stage: FlowStage;
  setStage: (s: FlowStage) => void;
  hasResume: boolean;
  setHasResume: (v: boolean) => void;
  hasQuestions: boolean;
  setHasQuestions: (v: boolean) => void;
}

const AppFlowContext = createContext<AppFlowState | null>(null);

export function AppFlowProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<FlowStage>("landing");
  const [hasResume, setHasResume] = useState(false);
  const [hasQuestions, setHasQuestions] = useState(false);
  return (
    <AppFlowContext.Provider value={{ stage, setStage, hasResume, setHasResume, hasQuestions, setHasQuestions }}>
      {children}
    </AppFlowContext.Provider>
  );
}

export function useAppFlow() {
  return useContext(AppFlowContext);
}
