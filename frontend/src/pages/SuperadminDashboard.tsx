import {
  Activity,
  BookOpen,
  ChevronRight,
  Download,
  Eye,
  FileText,
  LogOut,
  RefreshCw,
  Search,
  Shield,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { navigateTo } from "../App";
import { superadminJson } from "../utils/superadminApi";
import { clearSuperadminToken } from "../utils/superadminSession";

interface Overview {
  generated_at: number;
  exams: {
    total: number;
    open: number;
    closed: number;
    created_last_7d: number;
    created_last_30d: number;
  };
  submissions: {
    total: number;
    last_7d: number;
    last_30d: number;
    unique_students: number;
  };
  items: { total: number; avg_per_exam: number };
  scores: { global_avg_percent: number; exams_with_submissions: number };
  access: {
    api_requests_last_7d: number;
    page_views_last_7d: number;
    unique_visitors_last_7d: number;
    top_routes: { route_category: string; count: number }[];
    error_rate_7d_percent: number;
  };
  timeline: {
    exams_by_day: { date: string; count: number }[];
    submissions_by_day: { date: string; count: number }[];
    page_views_by_day: { date: string; count: number }[];
  };
}

interface ExamRow {
  id: string;
  title: string;
  public_code: string;
  status: "open" | "closed";
  created_at: number;
  closed_at: number | null;
  item_count: number;
  max_score: number;
  submission_count: number;
  score_stats: {
    avg: number;
    min: number;
    max: number;
    avg_percent: number;
  } | null;
  last_submission_at: number | null;
  access_stats: {
    page_views: number;
    api_requests: number;
    unique_visitors: number;
  };
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

function MiniBarChart({
  data,
  color,
}: {
  data: { date: string; count: number }[];
  color: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-16">
      {data.slice(-14).map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${d.count}`}
          className={`flex-1 rounded-t ${color} opacity-80 hover:opacity-100 transition-opacity`}
          style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
        />
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="glass-panel rounded-xl p-4 border border-slate-800">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
          {label}
        </p>
        <Icon className="w-4 h-4 text-amber-400/70" />
      </div>
      <p className="text-2xl font-extrabold text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function SuperadminDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">(
    "all",
  );
  const [sort, setSort] = useState("created_at");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchData = useCallback(
    async (silent = false) => {
      try {
        const params = new URLSearchParams({
          page: String(pagination.page),
          limit: String(pagination.limit),
          status: statusFilter,
          sort,
          order: "desc",
        });
        if (search) params.set("q", search);

        const [ov, ex] = await Promise.all([
          superadminJson<Overview>("/api/superadmin/overview"),
          superadminJson<{ exams: ExamRow[]; pagination: typeof pagination }>(
            `/api/superadmin/exams?${params}`,
          ),
        ]);

        setOverview(ov);
        setExams(ex.exams);
        setPagination(ex.pagination);
        setError("");
      } catch (err: any) {
        if (!silent) setError(err.message || "Erro ao carregar dados.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [pagination.page, pagination.limit, statusFilter, sort, search],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleLogout = () => {
    clearSuperadminToken();
    navigateTo("/superadmin");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const exportCsv = () => {
    const header =
      "Título,Código,Status,Criada em,Questões,Pontuação máx.,Submissões,Média %,Última atividade,Page views\n";
    const rows = exams
      .map((e) =>
        [
          `"${e.title.replace(/"/g, '""')}"`,
          e.public_code,
          e.status,
          formatDate(e.created_at),
          e.item_count,
          e.max_score,
          e.submission_count,
          e.score_stats?.avg_percent ?? "",
          e.last_submission_at ? formatDate(e.last_submission_at) : "",
          e.access_stats.page_views,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gabarito-provas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="text-center py-12">
        <p className="text-rose-400 mb-4">{error}</p>
        <button
          onClick={() => navigateTo("/superadmin")}
          className="text-amber-400 hover:underline text-sm"
        >
          Voltar ao login
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Somente leitura
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100">
            Painel Superadmin
          </h1>
          {overview && (
            <p className="text-xs text-slate-500 mt-1">
              Atualizado em {formatDate(overview.generated_at)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-rose-400 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>

      {overview && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Provas"
              value={overview.exams.total}
              sub={`${overview.exams.open} abertas · ${overview.exams.closed} encerradas`}
              icon={BookOpen}
            />
            <KpiCard
              label="Submissões"
              value={overview.submissions.total}
              sub={`${overview.submissions.last_7d} nos últimos 7 dias`}
              icon={FileText}
            />
            <KpiCard
              label="Alunos únicos"
              value={overview.submissions.unique_students}
              sub={`Média global: ${overview.scores.global_avg_percent}%`}
              icon={Users}
            />
            <KpiCard
              label="Tráfego (7d)"
              value={overview.access.page_views_last_7d}
              sub={`${overview.access.unique_visitors_last_7d} visitantes · ${overview.access.error_rate_7d_percent}% erros API`}
              icon={Activity}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel rounded-xl p-4 border border-slate-800">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3">
                Provas criadas (14d)
              </p>
              <MiniBarChart
                data={overview.timeline.exams_by_day}
                color="bg-amber-500"
              />
            </div>
            <div className="glass-panel rounded-xl p-4 border border-slate-800">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3">
                Submissões (14d)
              </p>
              <MiniBarChart
                data={overview.timeline.submissions_by_day}
                color="bg-cyan-500"
              />
            </div>
            <div className="glass-panel rounded-xl p-4 border border-slate-800">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3">
                Page views (14d)
              </p>
              <MiniBarChart
                data={overview.timeline.page_views_by_day}
                color="bg-violet-500"
              />
            </div>
          </div>

          {overview.access.top_routes.length > 0 && (
            <div className="glass-panel rounded-xl p-4 border border-slate-800">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3">
                Rotas mais acessadas (7d)
              </p>
              <div className="flex flex-wrap gap-2">
                {overview.access.top_routes.map((r) => (
                  <span
                    key={r.route_category}
                    className="text-xs px-2 py-1 rounded-lg bg-slate-800 text-slate-300"
                  >
                    {r.route_category}:{" "}
                    <strong className="text-amber-400">{r.count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <h2 className="font-bold text-slate-100">
            Todas as provas ({pagination.total})
          </h2>
          <div className="flex flex-wrap gap-2">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar título ou código..."
                  className="pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 w-48"
                />
              </div>
            </form>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="py-2 px-3 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200"
            >
              <option value="all">Todos status</option>
              <option value="open">Abertas</option>
              <option value="closed">Encerradas</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="py-2 px-3 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200"
            >
              <option value="created_at">Mais recentes</option>
              <option value="last_activity">Última atividade</option>
              <option value="submissions">Mais submissões</option>
              <option value="title">Título A-Z</option>
            </select>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 text-sm"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="p-3 font-bold">Prova</th>
                <th className="p-3 font-bold">Status</th>
                <th className="p-3 font-bold">Criada</th>
                <th className="p-3 font-bold text-right">Itens</th>
                <th className="p-3 font-bold text-right">Pts máx</th>
                <th className="p-3 font-bold text-right">Subs</th>
                <th className="p-3 font-bold text-right">Média</th>
                <th className="p-3 font-bold text-right">Views</th>
                <th className="p-3 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {exams.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Nenhuma prova encontrada.
                  </td>
                </tr>
              ) : (
                exams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="border-b border-slate-800/50 hover:bg-slate-900/50"
                  >
                    <td className="p-3">
                      <p className="font-medium text-slate-200 truncate max-w-[200px]">
                        {exam.title}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {exam.public_code}
                      </p>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          exam.status === "open"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {exam.status === "open" ? "Aberta" : "Encerrada"}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-xs whitespace-nowrap">
                      {formatDate(exam.created_at)}
                    </td>
                    <td className="p-3 text-right text-slate-300">
                      {exam.item_count}
                    </td>
                    <td className="p-3 text-right text-slate-300">
                      {exam.max_score}
                    </td>
                    <td className="p-3 text-right text-slate-300">
                      {exam.submission_count}
                    </td>
                    <td className="p-3 text-right text-slate-300">
                      {exam.score_stats
                        ? `${exam.score_stats.avg_percent}%`
                        : "—"}
                    </td>
                    <td className="p-3 text-right text-slate-400">
                      <span className="flex items-center justify-end gap-1">
                        <Eye className="w-3 h-3" />
                        {exam.access_stats.page_views}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() =>
                          navigateTo(`/superadmin/prova/${exam.id}`)
                        }
                        className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs font-semibold"
                      >
                        Detalhes
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.total_pages > 1 && (
          <div className="p-4 border-t border-slate-800 flex justify-between items-center text-sm text-slate-400">
            <span>
              Página {pagination.page} de {pagination.total_pages} (
              {pagination.total} provas)
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
                className="px-3 py-1 rounded border border-slate-700 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                disabled={pagination.page >= pagination.total_pages}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
                className="px-3 py-1 rounded border border-slate-700 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
