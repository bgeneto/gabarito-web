import type { StudentPerformanceContext } from "../../types/examStats";
import {
  formatMetricNumber,
  formatMetricPercent,
} from "../../utils/normalDistribution";

interface PerformanceMetricsTableProps {
  context: StudentPerformanceContext;
}

export function PerformanceMetricsTable({
  context,
}: PerformanceMetricsTableProps) {
  const rows = [
    { label: "Sua nota", value: formatMetricPercent(context.student_percent) },
    {
      label: "Média da turma",
      value: formatMetricPercent(context.class_mean_percent),
    },
    {
      label: "Desvio padrão",
      value: formatMetricPercent(context.class_std_dev_percent),
    },
    { label: "Z-score", value: formatMetricNumber(context.z_score) },
    { label: "Percentil", value: formatMetricPercent(context.percentile) },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800 bg-slate-900/50">
            <th className="p-3 font-bold">Métrica</th>
            <th className="p-3 font-bold text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className="border-b border-slate-800/50 last:border-b-0"
            >
              <td className="p-3 text-slate-300">{row.label}</td>
              <td className="p-3 text-right font-bold text-slate-100 tabular-nums">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
