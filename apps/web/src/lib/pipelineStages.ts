import {
  Brain,
  Database,
  Eraser,
  FlaskConical,
  GitCompareArrows,
  LayoutDashboard,
  Lightbulb,
  ListTree,
  Microscope,
  Radar,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";

export const PIPELINE_STAGES = [
  { key: "understanding_intent", label: "Understanding Intent", icon: Brain },
  { key: "reading_data", label: "Reading Data", icon: Database },
  { key: "cleaning_data", label: "Cleaning Data", icon: Eraser },
  { key: "feature_selection", label: "Feature Engineering", icon: Wand2 },
  { key: "correlation_discovery", label: "Correlation Discovery", icon: Radar },
  { key: "model_selection", label: "Model Selection", icon: ListTree },
  { key: "training", label: "Model Training", icon: FlaskConical },
  { key: "evaluation", label: "Model Evaluation", icon: Microscope },
  { key: "decision_generation", label: "Decision Generation", icon: Lightbulb },
  { key: "business_simulation", label: "Business Simulation", icon: Target },
  { key: "scenario_testing", label: "Scenario Testing", icon: GitCompareArrows },
  { key: "final_recommendation", label: "Final Recommendation", icon: Sparkles },
  { key: "final_dashboard", label: "Dashboard Generation", icon: LayoutDashboard },
] as const;

export type StageKey = (typeof PIPELINE_STAGES)[number]["key"];
