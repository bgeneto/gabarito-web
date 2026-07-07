import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  Clipboard,
  Download,
  FileSpreadsheet,
  Lock,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { navigateTo } from "../App";
import { useModal } from "../components/ModalProvider";

interface Submission {
  id: string;
  student_name: string;
  student_identifier: string;
  submitted_at: number;
  total_score: number;
}

interface ExamItem {
  id: string;
  question_number: number;
  sub_label: string | null;
  points: number;
  answer_type: string;
  answer_config: {
    accepted: string[];
  };
}

interface ExamData {
  id: string;
  title: string;
  public_code: string;
  status: "open" | "closed";
  created_at: number;
  closed_at: number | null;
  items: ExamItem[];
  submissions: Submission[];
}

export default function TeacherDashboard({
  adminToken,
}: {
  adminToken: string;
}) {
  const { alert, confirm } = useModal();
  const [data, setData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchDashboardData = async (silent = false) => {
    try {
      const response = await fetch(`/api/admin/exams/${adminToken}`);
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Erro ao buscar dados do painel.");
      }
      setData(resData);
    } catch (err: any) {
      if (!silent) {
        setError(err.message || "Erro ao carregar dados. Verifique o token.");
      } else {
        console.error("Erro na atualização em segundo plano:", err);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [adminToken]);

  useEffect(() => {
    if (!data || data.status !== "open") return;

    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [adminToken, data?.status]);

  const handleCloseExam = async () => {
    if (!data) return;
    const hasConfirmed = await confirm(
      "Tem certeza que deseja encerrar a prova? Uma vez encerrada, novos envios de alunos serão bloqueados e os resultados individuais serão liberados.",
      {
        title: "Encerrar Prova",
        severity: "danger",
        confirmText: "Encerrar",
        cancelText: "Cancelar",
      },
    );
    if (!hasConfirmed) {
      return;
    }

    setCloseLoading(true);
    try {
      const response = await fetch(`/api/admin/exams/${adminToken}/close`, {
        method: "POST",
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Erro ao encerrar a prova.");
      }

      // Atualiza estado local
      setData({
        ...data,
        status: "closed",
        closed_at: resData.closed_at,
      });
    } catch (err: any) {
      await alert(err.message || "Houve um erro ao encerrar a prova.", {
        title: "Erro ao Encerrar Prova",
        severity: "danger",
      });
    } finally {
      setCloseLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.public_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const sanitizeCsvField = (value: string): string => {
    // Previne injeção de fórmulas em planilhas removendo caracteres de início de fórmula
    const sanitized = value.replace(/^[\t\r\n=@+\-]+/, "");
    // Escapa aspas duplas e envolve o campo em aspas duplas
    return `"${sanitized.replace(/"/g, '""')}"`;
  };

  const exportCSV = () => {
    if (!data || data.submissions.length === 0) return;

    // Cabeçalhos do CSV
    const headers = [
      "Nome do Aluno",
      "Matricula",
      "Data de Envio",
      "Nota Final",
    ];

    // Linhas
    const rows = data.submissions.map((sub) => [
      sanitizeCsvField(sub.student_name),
      sanitizeCsvField(sub.student_identifier),
      sanitizeCsvField(new Date(sub.submitted_at).toLocaleString("pt-BR")),
      sub.total_score.toFixed(1),
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `gabarito_web_${data.public_code}_resultados.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 text-sm">
          Carregando painel administrativo...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="w-14 h-14 bg-rose-950/80 border border-rose-900/30 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold">Erro de Acesso</h2>
        <p className="text-sm text-slate-400">
          {error || "Não foi possível carregar os dados desta prova."}
        </p>
        <button
          onClick={() => navigateTo("/")}
          className="px-5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-850 cursor-pointer"
        >
          Voltar para Home
        </button>
      </div>
    );
  }

  // Estatísticas Rápidas
  const totalSubmissions = data.submissions.length;
  const maxPoints = data.items.reduce((acc, curr) => acc + curr.points, 0);

  return (
    <div className="space-y-6">
      {/* Header do Painel */}
      <div className="glass-panel border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${data.status === "open" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
            ></span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Prova {data.status === "open" ? "Ativa" : "Encerrada"}
            </span>
          </div>
          <h1 className="text-2xl font-black">{data.title}</h1>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 font-mono">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Criada em: {new Date(data.created_at).toLocaleDateString("pt-BR")}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Código: {data.public_code}
            </span>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {copiedCode ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Clipboard className="w-3.5 h-3.5" />
            )}
            Código Público
          </button>

          {data.status === "open" ? (
            <button
              onClick={handleCloseExam}
              disabled={closeLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Encerrar Prova
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-4 py-2 bg-rose-950/20 border border-rose-900/30 rounded-xl text-xs font-bold text-rose-300 font-mono select-none">
              <Lock className="w-3.5 h-3.5" />
              Encerrada
            </span>
          )}
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Alunos Respondeu */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/50 border border-cyan-800/30 flex items-center justify-center">
            <Users className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Submissões
            </span>
            <span className="text-2xl font-black">{totalSubmissions}</span>
          </div>
        </div>

        {/* Valor Total */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-950/50 border border-blue-800/30 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Valor da Prova
            </span>
            <span className="text-2xl font-black text-blue-400">
              {maxPoints.toFixed(1)}{" "}
              <span className="text-xs text-slate-500 font-normal">pts</span>
            </span>
          </div>
        </div>

        {/* Média da Turma (Cálculo Dinâmico) */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-950/50 border border-emerald-800/30 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Média da Turma
            </span>
            <span className="text-2xl font-black text-emerald-400">
              {totalSubmissions > 0
                ? (
                    data.submissions.reduce(
                      (acc, curr) => acc + curr.total_score,
                      0,
                    ) / totalSubmissions
                  ).toFixed(1)
                : "0.0"}
              <span className="text-xs text-slate-500 font-normal"> pts</span>
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Alunos e Notas */}
      <div className="glass-panel border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">
            Submissões Recebidas
          </h3>
          {totalSubmissions > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Exportar Planilha (CSV)
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 font-bold text-xs uppercase">
                <th className="py-3 px-4">Nome do Aluno</th>
                <th className="py-3 px-4">Matrícula</th>
                <th className="py-3 px-4">Enviado em</th>
                <th className="py-3 px-4 text-center">Nota Final</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {data.submissions.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-slate-900/50 hover:bg-slate-900/20 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-bold text-slate-200">
                    {sub.student_name}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                    {sub.student_identifier}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-xs">
                    {new Date(sub.submitted_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-extrabold text-slate-200 bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-lg">
                      {sub.total_score.toFixed(1)} / {maxPoints.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => navigateTo(`/submissao/${sub.id}`)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer"
                    >
                      Ver Detalhes
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </td>
                </tr>
              ))}
              {totalSubmissions === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-slate-600 italic"
                  >
                    Aguardando primeiros alunos enviarem respostas...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista do Gabarito Configurado */}
      <div className="glass-panel border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">
          Questões e Gabarito Configurado
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.items.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900/55 border border-slate-850 rounded-xl p-3.5 flex items-start justify-between"
            >
              <div>
                <span className="font-bold text-sm block">
                  Questão {item.question_number}
                  {item.sub_label && (
                    <span className="text-cyan-400 uppercase">
                      {item.sub_label}
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-500 block uppercase font-mono mt-0.5">
                  Tipo:{" "}
                  {item.answer_type === "choice"
                    ? "Múltipla Escolha"
                    : item.answer_type === "true_false"
                      ? "Verd. ou Falso"
                      : "Texto Exato"}
                </span>

                {/* Accepted answers */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.answer_config.accepted.map((val, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        item.answer_type === "choice"
                          ? "bg-cyan-950 text-cyan-400 border border-cyan-800/35"
                          : item.answer_type === "true_false"
                            ? "bg-blue-950 text-blue-400 border border-blue-800/35"
                            : "bg-slate-800 text-slate-300 border border-slate-700/30"
                      }`}
                    >
                      {val}
                    </span>
                  ))}
                </div>
              </div>

              <span className="text-xs font-bold text-slate-400 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-md">
                {item.points.toFixed(1)} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
