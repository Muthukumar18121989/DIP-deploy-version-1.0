const FOCUS_COLUMNS = [
  "revenue",
  "unit_price",
  "quantity",
  "marketing_spend",
  "discount_pct",
  "inventory_level",
  "competitor_price_index",
  "customer_satisfaction",
];

function cellColor(value: number | null): string {
  if (value === null) return "var(--color-surface)";
  const t = Math.min(1, Math.abs(value));
  const color = value >= 0 ? "230, 103, 103" : "57, 135, 229"; // red / blue rgb
  return `rgba(${color}, ${0.12 + t * 0.7})`;
}

export function CorrelationHeatmap({ correlation }: { correlation: Record<string, Record<string, number | null>> }) {
  const cols = FOCUS_COLUMNS.filter((c) => c in correlation);
  if (cols.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="w-28" />
            {cols.map((c) => (
              <th key={c} className="min-w-[64px] px-1 pb-1 text-center font-medium text-foreground-subtle">
                {c.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map((rowKey) => (
            <tr key={rowKey}>
              <td className="pr-2 text-right font-medium text-foreground-muted">{rowKey.replace(/_/g, " ")}</td>
              {cols.map((colKey) => {
                const value = correlation[rowKey]?.[colKey] ?? null;
                return (
                  <td
                    key={colKey}
                    className="rounded-md py-2 text-center tabular-nums text-foreground"
                    style={{ background: cellColor(value) }}
                    title={`${rowKey} vs ${colKey}: ${value ?? "n/a"}`}
                  >
                    {value !== null ? value.toFixed(2) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
