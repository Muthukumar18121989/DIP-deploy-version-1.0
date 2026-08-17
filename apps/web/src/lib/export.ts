import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import PptxGenJS from "pptxgenjs";
import { toPng } from "html-to-image";
import type { DashboardData, Strategy } from "./types";
import { formatCurrency } from "./utils";

export function exportStrategyToPdf(strategy: Strategy, useCaseName: string) {
  const doc = new jsPDF();
  const margin = 14;
  let y = 18;

  doc.setFontSize(16);
  doc.text(strategy.title, margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`${useCaseName} — generated ${new Date(strategy.created_at).toLocaleString()}`, margin, y);
  doc.setTextColor(0);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Confidence", `${strategy.confidence_pct}%`],
      ["Predicted Revenue Impact", `${strategy.predicted_revenue_delta_pct.toFixed(1)}% (${formatCurrency(strategy.predicted_revenue_delta)})`],
      ["Risk", strategy.risk],
      ["Estimated Cost", formatCurrency(strategy.estimated_cost)],
      ["Estimated ROI", strategy.estimated_roi !== null ? `${strategy.estimated_roi}x` : "—"],
      ["Implementation Difficulty", strategy.implementation_difficulty],
      ["Timeline", strategy.timeline],
      ["Lifecycle Status", strategy.lifecycle_status],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [124, 108, 246] },
  });

  const afterMetrics = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.text("Methodology", margin, afterMetrics);
  doc.setFontSize(9);
  const methodologyLines = doc.splitTextToSize(strategy.methodology, 180);
  doc.text(methodologyLines, margin, afterMetrics + 6);

  let y2 = afterMetrics + 6 + methodologyLines.length * 5 + 8;
  if (strategy.pros.length) {
    doc.setFontSize(11);
    doc.text("Pros", margin, y2);
    y2 += 6;
    doc.setFontSize(9);
    for (const pro of strategy.pros) {
      const lines = doc.splitTextToSize(`• ${pro}`, 180);
      doc.text(lines, margin, y2);
      y2 += lines.length * 5;
    }
  }
  if (strategy.cons.length) {
    y2 += 4;
    doc.setFontSize(11);
    doc.text("Cons", margin, y2);
    y2 += 6;
    doc.setFontSize(9);
    for (const con of strategy.cons) {
      const lines = doc.splitTextToSize(`• ${con}`, 180);
      doc.text(lines, margin, y2);
      y2 += lines.length * 5;
    }
  }

  doc.save(`${strategy.title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export function exportDashboardToPdf(dashboard: DashboardData, useCaseName: string) {
  const doc = new jsPDF();
  const margin = 14;
  let y = 18;

  doc.setFontSize(16);
  doc.text(`${useCaseName} — Executive Summary`, margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);
  doc.setTextColor(0);
  y += 8;

  if (dashboard.top_decision) {
    doc.setFontSize(11);
    doc.text("Top Recommendation", margin, y);
    y += 6;
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(
      `${dashboard.top_decision.title} — projected ${dashboard.top_decision.predicted_revenue_delta_pct.toFixed(1)}% revenue impact with ${dashboard.top_decision.confidence_pct}% model confidence.`,
      180
    );
    doc.text(lines, margin, y);
    y += lines.length * 5 + 6;
  }

  autoTable(doc, {
    startY: y,
    head: [["KPI", "Value"]],
    body: [
      ["Total Revenue", formatCurrency(dashboard.kpis.total_revenue)],
      ["Total Orders", dashboard.kpis.total_orders.toLocaleString()],
      ["Avg Order Value", formatCurrency(dashboard.kpis.avg_order_value)],
      ["Stockout Rate", `${dashboard.kpis.stockout_rate_pct}%`],
      ["Churn Rate", `${dashboard.kpis.churn_rate_pct}%`],
      ["Data Quality Score", `${dashboard.kpis.data_quality_score}/100`],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [124, 108, 246] },
  });

  const afterKpi = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  autoTable(doc, {
    startY: afterKpi,
    head: [["Region", "Revenue"]],
    body: Object.entries(dashboard.revenue_by_region)
      .sort((a, b) => b[1] - a[1])
      .map(([region, revenue]) => [region, formatCurrency(revenue)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [124, 108, 246] },
  });

  doc.save(`${useCaseName.replace(/\s+/g, "-").toLowerCase()}-summary.pdf`);
}

export async function exportDashboardToExcel(dashboard: DashboardData, useCaseName: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Decision Intelligence Platform";
  workbook.created = new Date();

  const kpiSheet = workbook.addWorksheet("KPIs");
  kpiSheet.columns = [
    { header: "Metric", key: "metric", width: 24 },
    { header: "Value", key: "value", width: 18 },
  ];
  kpiSheet.addRows([
    { metric: "Total Revenue", value: dashboard.kpis.total_revenue },
    { metric: "Total Orders", value: dashboard.kpis.total_orders },
    { metric: "Avg Order Value", value: dashboard.kpis.avg_order_value },
    { metric: "Stockout Rate (%)", value: dashboard.kpis.stockout_rate_pct },
    { metric: "Churn Rate (%)", value: dashboard.kpis.churn_rate_pct },
    { metric: "Data Quality Score", value: dashboard.kpis.data_quality_score },
  ]);
  kpiSheet.getRow(1).font = { bold: true };

  const regionSheet = workbook.addWorksheet("Revenue by Region");
  regionSheet.columns = [
    { header: "Region", key: "region", width: 22 },
    { header: "Revenue", key: "revenue", width: 18 },
  ];
  regionSheet.addRows(
    Object.entries(dashboard.revenue_by_region)
      .sort((a, b) => b[1] - a[1])
      .map(([region, revenue]) => ({ region, revenue }))
  );
  regionSheet.getRow(1).font = { bold: true };

  const categorySheet = workbook.addWorksheet("Revenue by Category");
  categorySheet.columns = [
    { header: "Category", key: "category", width: 22 },
    { header: "Revenue", key: "revenue", width: 18 },
  ];
  categorySheet.addRows(
    Object.entries(dashboard.revenue_by_category)
      .sort((a, b) => b[1] - a[1])
      .map(([category, revenue]) => ({ category, revenue }))
  );
  categorySheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${useCaseName.replace(/\s+/g, "-").toLowerCase()}-summary.xlsx`);
}

export async function exportDashboardToPptx(dashboard: DashboardData, useCaseName: string) {
  const pres = new PptxGenJS();
  pres.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
  pres.layout = "WIDE";

  const titleSlide = pres.addSlide();
  titleSlide.background = { color: "08080C" };
  titleSlide.addText(useCaseName, { x: 0.6, y: 2.8, w: 12, h: 1, fontSize: 36, bold: true, color: "FFFFFF" });
  titleSlide.addText("Executive Summary — Decision Intelligence Platform", {
    x: 0.6, y: 3.7, w: 12, h: 0.5, fontSize: 16, color: "A3A3B2",
  });
  titleSlide.addText(new Date().toLocaleDateString(), { x: 0.6, y: 4.2, w: 12, h: 0.4, fontSize: 12, color: "6B6B78" });

  const kpiSlide = pres.addSlide();
  kpiSlide.background = { color: "08080C" };
  kpiSlide.addText("Key Performance Indicators", { x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 24, bold: true, color: "FFFFFF" });
  const kpiRows: [string, string][] = [
    ["Total Revenue", formatCurrency(dashboard.kpis.total_revenue)],
    ["Total Orders", dashboard.kpis.total_orders.toLocaleString()],
    ["Avg Order Value", formatCurrency(dashboard.kpis.avg_order_value)],
    ["Stockout Rate", `${dashboard.kpis.stockout_rate_pct}%`],
    ["Churn Rate", `${dashboard.kpis.churn_rate_pct}%`],
    ["Data Quality Score", `${dashboard.kpis.data_quality_score}/100`],
  ];
  kpiSlide.addTable(
    [
      [{ text: "Metric", options: { bold: true, color: "FFFFFF", fill: { color: "7C6CF6" } } }, { text: "Value", options: { bold: true, color: "FFFFFF", fill: { color: "7C6CF6" } } }],
      ...kpiRows.map(([metric, value]) => [
        { text: metric, options: { color: "F4F4F6" } },
        { text: value, options: { color: "F4F4F6" } },
      ]),
    ],
    { x: 0.5, y: 1.2, w: 8, colW: [4, 4], fontSize: 14, border: { type: "solid", color: "23232E", pt: 1 }, fill: { color: "121218" } }
  );

  if (dashboard.top_decision) {
    const decisionSlide = pres.addSlide();
    decisionSlide.background = { color: "08080C" };
    decisionSlide.addText("Top Recommendation", { x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 24, bold: true, color: "FFFFFF" });
    decisionSlide.addText(dashboard.top_decision.title, { x: 0.5, y: 1.3, w: 11, h: 0.6, fontSize: 20, color: "7C6CF6", bold: true });
    decisionSlide.addText(
      `Projected revenue impact: ${dashboard.top_decision.predicted_revenue_delta_pct.toFixed(1)}% (${formatCurrency(dashboard.top_decision.predicted_revenue_delta)})\n` +
        `Confidence: ${dashboard.top_decision.confidence_pct}%   Risk: ${dashboard.top_decision.risk}   Timeline: ${dashboard.top_decision.timeline}`,
      { x: 0.5, y: 2.1, w: 11, h: 1.2, fontSize: 14, color: "A3A3B2" }
    );
  }

  const regionSlide = pres.addSlide();
  regionSlide.background = { color: "08080C" };
  regionSlide.addText("Revenue by Region", { x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 24, bold: true, color: "FFFFFF" });
  const regionEntries = Object.entries(dashboard.revenue_by_region).sort((a, b) => b[1] - a[1]);
  regionSlide.addChart(pres.ChartType.bar, [
    { name: "Revenue", labels: regionEntries.map(([r]) => r), values: regionEntries.map(([, v]) => v) },
  ], { x: 0.5, y: 1.2, w: 11, h: 5.5, chartColors: ["7C6CF6"], showValue: false, catAxisLabelColor: "A3A3B2", valAxisLabelColor: "A3A3B2" });

  await pres.writeFile({ fileName: `${useCaseName.replace(/\s+/g, "-").toLowerCase()}-summary.pptx` });
}

export async function exportElementToPng(element: HTMLElement, filename: string) {
  const dataUrl = await toPng(element, {
    backgroundColor: "#08080c",
    pixelRatio: 2,
    filter: (node) => !(node instanceof HTMLElement && node.dataset?.exportExclude === "true"),
  });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
