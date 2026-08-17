import { useState } from "react";
import { FileImage, FileSpreadsheet, FileText, Presentation } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { exportDashboardToExcel, exportDashboardToPdf, exportDashboardToPptx, exportElementToPng } from "@/lib/export";
import type { DashboardData } from "@/lib/types";

type ExportKind = "pdf" | "excel" | "pptx" | "png";

export function ExportMenu({
  dashboard,
  useCaseName,
  captureElementId,
}: {
  dashboard: DashboardData;
  useCaseName: string;
  captureElementId: string;
}) {
  const [exporting, setExporting] = useState<ExportKind | null>(null);

  async function run(kind: ExportKind, action: () => Promise<void> | void, successMessage: string) {
    setExporting(kind);
    try {
      await action();
      toast.success(successMessage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }

  async function handlePng() {
    const element = document.getElementById(captureElementId);
    if (!element) {
      toast.error("Nothing to capture yet");
      return;
    }
    await exportElementToPng(element, `${useCaseName.replace(/\s+/g, "-").toLowerCase()}-dashboard.png`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={() => run("pdf", () => exportDashboardToPdf(dashboard, useCaseName), "PDF exported")} disabled={exporting !== null}>
        <FileText className="size-3.5" /> {exporting === "pdf" ? "Exporting..." : "PDF"}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => run("excel", () => exportDashboardToExcel(dashboard, useCaseName), "Excel workbook exported")} disabled={exporting !== null}>
        <FileSpreadsheet className="size-3.5" /> {exporting === "excel" ? "Exporting..." : "Excel"}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => run("pptx", () => exportDashboardToPptx(dashboard, useCaseName), "PowerPoint exported")} disabled={exporting !== null}>
        <Presentation className="size-3.5" /> {exporting === "pptx" ? "Exporting..." : "PowerPoint"}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => run("png", handlePng, "Image exported")} disabled={exporting !== null}>
        <FileImage className="size-3.5" /> {exporting === "png" ? "Exporting..." : "Image"}
      </Button>
    </div>
  );
}
