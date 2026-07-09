import type { ExamItemWithStats } from "../../types/examStats";
import { questionLabel } from "../../utils/examFormat";

interface QuestionDifficultyTableProps {
  items: ExamItemWithStats[];
  hideGabaritoOnMobile?: boolean;
  title?: string;
}

export function QuestionDifficultyTable({
  items,
  hideGabaritoOnMobile = false,
  title = "Questões e dificuldade",
}: QuestionDifficultyTableProps) {
  return (
    <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h2 className="font-bold text-slate-100">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <th className="p-3 font-bold">Questão</th>
              <th className="p-3 font-bold">Tipo</th>
              <th
                className={`p-3 font-bold ${hideGabaritoOnMobile ? "hidden sm:table-cell" : ""}`}
              >
                Gabarito
              </th>
              <th className="p-3 font-bold text-right">Pts</th>
              <th className="p-3 font-bold">Acerto</th>
              <th className="p-3 font-bold text-right">Pts perdidos</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-slate-800/50 hover:bg-slate-900/50"
              >
                <td className="p-3 font-mono text-slate-200">
                  {questionLabel(item.question_number, item.sub_label)}
                </td>
                <td className="p-3 text-slate-400 text-xs">
                  {item.answer_type}
                </td>
                <td
                  className={`p-3 text-slate-400 text-xs max-w-[150px] truncate ${hideGabaritoOnMobile ? "hidden sm:table-cell" : ""}`}
                >
                  {item.answer_type === "numerical"
                    ? (item.answer_config.expected_label ?? "—")
                    : (item.answer_config.accepted ?? []).join(", ")}
                </td>
                <td className="p-3 text-right text-slate-300">{item.points}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden max-w-[80px]">
                      <div
                        className={`h-full rounded-full ${
                          item.stats.correct_rate_percent >= 70
                            ? "bg-emerald-500"
                            : item.stats.correct_rate_percent >= 40
                              ? "bg-amber-500"
                              : "bg-rose-500"
                        }`}
                        style={{
                          width: `${item.stats.correct_rate_percent}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-10">
                      {item.stats.correct_rate_percent}%
                    </span>
                  </div>
                </td>
                <td className="p-3 text-right text-slate-400">
                  {item.stats.points_lost}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
