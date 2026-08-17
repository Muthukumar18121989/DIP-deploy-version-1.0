import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { useUIStore } from "@/stores/useUIStore";
import Landing from "@/pages/Landing";
import UseCaseRepository from "@/pages/UseCaseRepository";
import NewUseCase from "@/pages/NewUseCase";
import DataSources from "@/pages/DataSources";
import ExperimentHistory from "@/pages/ExperimentHistory";
import PipelineView from "@/pages/PipelineView";
import DecisionEngine from "@/pages/DecisionEngine";
import StrategyDetail from "@/pages/StrategyDetail";
import StrategyCompare from "@/pages/StrategyCompare";
import ScenarioSandbox from "@/pages/ScenarioSandbox";
import Dashboard from "@/pages/Dashboard";
import Monitoring from "@/pages/Monitoring";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/AdminDashboard";

function App() {
  const themeMode = useUIStore((s) => s.themeMode);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  return (
    <>
      <CommandPalette />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Landing /></RequireAuth>} />
        <Route path="/use-cases" element={<RequireAuth><UseCaseRepository /></RequireAuth>} />
        <Route path="/use-cases/new" element={<RequireAuth><NewUseCase /></RequireAuth>} />
        <Route path="/use-cases/:id/data" element={<RequireAuth><DataSources /></RequireAuth>} />
        <Route path="/use-cases/:id/experiments" element={<RequireAuth><ExperimentHistory /></RequireAuth>} />
        <Route path="/use-cases/:id/pipeline" element={<RequireAuth><PipelineView /></RequireAuth>} />
        <Route path="/use-cases/:id/decisions" element={<RequireAuth><DecisionEngine /></RequireAuth>} />
        <Route path="/strategies/compare" element={<RequireAuth><StrategyCompare /></RequireAuth>} />
        <Route path="/strategies/:id" element={<RequireAuth><StrategyDetail /></RequireAuth>} />
        <Route path="/use-cases/:id/sandbox" element={<RequireAuth><ScenarioSandbox /></RequireAuth>} />
        <Route path="/use-cases/:id/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/use-cases/:id/monitoring" element={<RequireAuth><Monitoring /></RequireAuth>} />
        <Route path="/use-cases/:id/reports" element={<RequireAuth><Reports /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
      </Routes>
    </>
  );
}

export default App;
