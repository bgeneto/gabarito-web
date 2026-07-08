import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { navigateTo } from "../App";
import { ExamKpiGrid } from "../components/exam/ExamKpiGrid";
import { QuestionDifficultyTable } from "../components/exam/QuestionDifficultyTable";
import { ScoreDistributionChart } from "../components/exam/ScoreDistributionChart";
import type { ExamItemWithStats, ScoreStats } from "../types/examStats";
import { formatExamDate, formatExamDuration } from "../utils/examFormat";
import { superadminJson } from "../utils/superadminApi";

interface ExamDetail {
  id: string;
  title: string;
  public_code: string;
  status: "open" | "closed";
  created_at: number;
  closed_at: number | null;
  duration_open_ms: number;
  item_count: number;
  max_score: number;
  submission_count: number;
  unique_students: number;
  score_stats: ScoreStats | null;
  access_stats: {
    page_views: number;
    api_requests: number;
    unique_visitors: number;
  };
  items: ExamItemWithStats[];
  submissions: {
    id: string;
    student_name: string;
    student_identifier: string;
    submitted_at: number;
    total_score: number;
  }[];
  score_distribution: {
    buckets: { label: string; count: number }[];
  };
  submission_timeline: { date: string; count: number }[];
}

export default function SuperadminExamDetail({ examId }: { examId: string }) {
  const [data, setData] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    superadminJson<ExamDetail>(`/api/superadmin/exams/${examId}`)
      .then(setData)
      .catch((err) => setError(err.message || "Erro ao carregar prova."))
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-rose-400 mb-4">{error || "Prova não encontrada."}</p>
        <button
          onClick={() => navigateTo("/superadmin/painel")}
          className="text-amber-400 hover:underline text-sm cursor-pointer"
        >
          Voltar ao painel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <button
          onClick={() => navigateTo("/superadmin/painel")}
          className="hover:text-amber-400 flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Painel
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-300 truncate">{data.title}</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Leitura + backup
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100">
            {data.title}
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            {data.public_code}
          </p>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full self-start ${
            data.status === "open"
              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
              : "bg-slate-800 text-slate-400 border border-slate-700"
          }`}
        >
          {data.status === "open" ? "Aberta" : "Encerrada"}
        </span>
      </div>

      <ExamKpiGrid
        variant="compact"
        data={{
          item_count: data.item_count,
          max_score: data.max_score,
          submission_count: data.submission_count,
          score_stats: data.score_stats,
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            Período
          </p>
          <p className="text-slate-300">
            Criada: {formatExamDate(data.created_at)}
          </p>
          {data.closed_at && (
            <p className="text-slate-300">
              Encerrada: {formatExamDate(data.closed_at)}
            </p>
          )}
          <p className="text-slate-400">
            Duração aberta: {formatExamDuration(data.duration_open_ms)}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            Acesso
          </p>
          <p className="text-slate-300 flex items-center gap-2">
            <Eye className="w-4 h-4 text-violet-400" />
            {data.access_stats.page_views} page views
          </p>
          <p className="text-slate-400">
            {data.access_stats.api_requests} requisições API ·{" "}
            {data.access_stats.unique_visitors} visitantes únicos
          </p>
        </div>
      </div>

      <ScoreDistributionChart
        buckets={data.score_distribution.buckets}
        submissionCount={data.submission_count}
      />

      <QuestionDifficultyTable items={data.items} />

      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-bold text-slate-100">
            Submissões ({data.submission_count})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="p-3 font-bold">Aluno</th>
                <th className="p-3 font-bold">Matrícula</th>
                <th className="p-3 font-bold">Enviado em</th>
                <th className="p-3 font-bold text-right">Nota</th>
                <th className="p-3 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {data.submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhuma submissão ainda.
                  </td>
                </tr>
              ) : (
                data.submissions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-slate-800/50 hover:bg-slate-900/50"
                  >
                    <td className="p-3 text-slate-200">{sub.student_name}</td>
                    <td className="p-3 text-slate-400 font-mono text-xs">
                      {sub.student_identifier}
                    </td>
                    <td className="p-3 text-slate-400 text-xs whitespace-nowrap">
                      {formatExamDate(sub.submitted_at)}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-100">
                      {sub.total_score}
                    </td>
                    <td className="p-3">
                      <a
                        href={`/submissao/${sub.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs cursor-pointer"
                      >
                        Ver
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
