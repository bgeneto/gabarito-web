import { FileSpreadsheet, Trophy, Users } from "lucide-react";
import type { ExamKpiData } from "../../types/examStats";

interface ExamKpiGridProps {
  data: ExamKpiData;
  variant?: "teacher" | "compact";
}

export function ExamKpiGrid({ data, variant = "compact" }: ExamKpiGridProps) {
  if (variant === "teacher") {
    const avgDisplay =
      data.score_stats != null
        ? `${data.score_stats.avg.toFixed(1)} pts (${data.score_stats.avg_percent}%)`
        : "0.0 pts";

    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-800/30 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Submissões
            </span>
            <span className="text-xl font-black">{data.submission_count}</span>
          </div>
        </div>

        <div className="glass-panel border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-950/50 border border-blue-800/30 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Valor da Prova
            </span>
            <span className="text-xl font-black text-blue-400">
              {data.max_score.toFixed(1)}
              <span className="text-xs text-slate-500 font-normal ml-1">
                pts
              </span>
            </span>
          </div>
        </div>

        <div className="glass-panel border border-slate-800 rounded-2xl p-4 flex items-center gap-3 col-span-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-800/30 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Média da Turma
            </span>
            <span className="text-xl font-black text-emerald-400">
              {data.submission_count > 0 ? avgDisplay : "—"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Questões", value: data.item_count ?? "—" },
    { label: "Pontuação máx.", value: data.max_score },
    { label: "Submissões", value: data.submission_count },
    {
      label: "Média",
      value: data.score_stats ? `${data.score_stats.avg_percent}%` : "—",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="glass-panel rounded-xl p-4 border border-slate-800"
        >
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            {card.label}
          </p>
          <p className="text-xl font-extrabold text-slate-100 mt-1">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
