import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initReduceMotion } from "./hooks/useReduceMotion";

initReduceMotion();

createRoot(document.getElementById("root")!).render(<App />);
