import { CheckCircle2 } from "lucide-react";
import type { PassingStats } from "../../types/examStats";

interface PassingRateCardProps {
  passingStats: PassingStats | null;
  submissionCount: number;
  maxScore: number;
}

export function PassingRateCard({
  passingStats,
  submissionCount,
  maxScore,
}: PassingRateCardProps) {
  if (submissionCount === 0 || !passingStats) {
    return (
      <div className="glass-panel border border-slate-800 rounded-2xl p-4">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
          Aprovação (corte 50%)
        </p>
        <p className="text-sm text-slate-500 italic text-center py-4">
          Aguardando submissões para calcular aprovação.
        </p>
      </div>
    );
  }

  const barColor =
    passingStats.pass_rate_percent >= 70
      ? "bg-emerald-500"
      : passingStats.pass_rate_percent >= 40
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="glass-panel border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
          Aprovação (corte {passingStats.cutoff_percent}%)
        </p>
      </div>

      <div className="flex items-baseline justify-between gap-2 mb-3">
        <p className="text-lg font-black text-slate-100">
          {passingStats.passed_count} / {submissionCount}{" "}
          <span className="text-sm font-bold text-slate-400">alunos</span>
        </p>
        <p className="text-lg font-black text-emerald-400 tabular-nums">
          {passingStats.pass_rate_percent.toFixed(1)}%
        </p>
      </div>

      <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${passingStats.pass_rate_percent}%` }}
        />
      </div>

      <p className="text-xs text-slate-500">
        Corte:{" "}
        <span className="text-slate-300 font-semibold">
          ≥ {passingStats.cutoff_score.toFixed(1)} pts
        </span>{" "}
        ({passingStats.cutoff_percent}% de {maxScore.toFixed(1)} pts)
      </p>
    </div>
  );
}
