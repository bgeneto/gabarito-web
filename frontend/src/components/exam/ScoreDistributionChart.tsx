import { BarChart3 } from "lucide-react";
import type { ScoreBucket } from "../../types/examStats";

interface ScoreDistributionChartProps {
  buckets: ScoreBucket[];
  submissionCount: number;
  emptyMessage?: string;
}

export function ScoreDistributionChart({
  buckets,
  submissionCount,
  emptyMessage = "Aguardando submissões para gerar estatísticas.",
}: ScoreDistributionChartProps) {
  if (submissionCount === 0) {
    return (
      <div className="glass-panel rounded-xl p-4 border border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            Distribuição de notas
          </p>
        </div>
        <p className="text-sm text-slate-500 italic text-center py-8">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const maxBucket = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="glass-panel rounded-xl p-4 border border-slate-800">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-amber-400" />
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
          Distribuição de notas
        </p>
      </div>
      <div className="flex gap-2 mb-1.5">
        {buckets.map((b) => (
          <span
            key={b.label}
            className="flex-1 text-center text-xs font-semibold text-slate-300 tabular-nums"
          >
            {b.count}
          </span>
        ))}
      </div>
      <div
        className="flex items-end gap-2 h-32 rounded-lg bg-slate-900/50 px-2 py-2 border border-slate-800/60"
        role="img"
        aria-label="Histograma da distribuição de notas por faixa percentual"
      >
        {buckets.map((b) => {
          const barHeight =
            b.count > 0 ? Math.max((b.count / maxBucket) * 100, 6) : 0;
          return (
            <div
              key={b.label}
              title={`${b.label}: ${b.count} aluno${b.count === 1 ? "" : "s"}`}
              className="group flex-1 flex flex-col justify-end h-full min-w-0"
            >
              <div
                className="w-full rounded-t bg-gradient-to-t from-amber-600 to-amber-400/90 opacity-90 group-hover:opacity-100 transition-opacity"
                style={{ height: `${barHeight}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        {buckets.map((b) => (
          <span
            key={b.label}
            className="flex-1 text-center text-[10px] text-slate-500 min-w-0"
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
