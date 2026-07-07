import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  ExternalLink,
  Eye,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { navigateTo } from "../App";
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
  score_stats: {
    avg: number;
    min: number;
    max: number;
    avg_percent: number;
  } | null;
  access_stats: {
    page_views: number;
    api_requests: number;
    unique_visitors: number;
  };
  items: {
    id: string;
    question_number: number;
    sub_label: string | null;
    points: number;
    answer_type: string;
    answer_config: { accepted: string[] };
    stats: {
      total_attempts: number;
      correct_rate_percent: number;
      points_lost: number;
      top_wrong_answers: { answer: string; count: number }[];
    };
  }[];
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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(ms / 60000)}min`;
}

function questionLabel(q: number, sub: string | null): string {
  return sub ? `Q${q}${sub.toUpperCase()}` : `Q${q}`;
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
          className="text-amber-400 hover:underline text-sm"
        >
          Voltar ao painel
        </button>
      </div>
    );
  }

  const maxBucket = Math.max(
    ...data.score_distribution.buckets.map((b) => b.count),
    1,
  );

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <button
          onClick={() => navigateTo("/superadmin/painel")}
          className="hover:text-amber-400 flex items-center gap-1"
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
              Somente leitura
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Questões", value: data.item_count },
          { label: "Pontuação máx.", value: data.max_score },
          { label: "Submissões", value: data.submission_count },
          {
            label: "Média",
            value: data.score_stats ? `${data.score_stats.avg_percent}%` : "—",
          },
        ].map((card) => (
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            Período
          </p>
          <p className="text-slate-300">
            Criada: {formatDate(data.created_at)}
          </p>
          {data.closed_at && (
            <p className="text-slate-300">
              Encerrada: {formatDate(data.closed_at)}
            </p>
          )}
          <p className="text-slate-400">
            Duração aberta: {formatDuration(data.duration_open_ms)}
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

      {data.submission_count > 0 && (
        <div className="glass-panel rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Distribuição de notas
            </p>
          </div>
          <div className="flex gap-2 mb-1.5">
            {data.score_distribution.buckets.map((b) => (
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
            {data.score_distribution.buckets.map((b) => {
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
            {data.score_distribution.buckets.map((b) => (
              <span
                key={b.label}
                className="flex-1 text-center text-[10px] text-slate-500 min-w-0"
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-bold text-slate-100">Questões e dificuldade</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="p-3 font-bold">Questão</th>
                <th className="p-3 font-bold">Tipo</th>
                <th className="p-3 font-bold">Gabarito</th>
                <th className="p-3 font-bold text-right">Pts</th>
                <th className="p-3 font-bold">Acerto</th>
                <th className="p-3 font-bold text-right">Pts perdidos</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
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
                  <td className="p-3 text-slate-400 text-xs max-w-[150px] truncate">
                    {item.answer_config.accepted.join(", ")}
                  </td>
                  <td className="p-3 text-right text-slate-300">
                    {item.points}
                  </td>
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
                      {formatDate(sub.submitted_at)}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-100">
                      {sub.total_score}
                    </td>
                    <td className="p-3">
                      <a
                        href={`/submissao/${sub.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs"
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
