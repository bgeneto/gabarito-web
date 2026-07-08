import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  Clipboard,
  Download,
  FileSpreadsheet,
  Lock,
  Pencil,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { navigateTo } from "../App";
import { useModal } from "../components/ModalProvider";
import { getAdminToken } from "../utils/adminSession";
import { ShieldAlert } from "lucide-react";

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
  answer_type: "choice" | "true_false" | "text_exact";
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

interface ItemEditDraft {
  points: number;
  answer_type: "choice" | "true_false" | "text_exact";
  accepted: string[];
  tempVariant: string;
}

export default function TeacherDashboard() {
  const { alert, confirm } = useModal();
  const [adminToken, setAdminToken] = useState<string | null>(getAdminToken);
  const [data, setData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [editingItem, setEditingItem] = useState<ExamItem | null>(null);
  const [editDraft, setEditDraft] = useState<ItemEditDraft | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    setAdminToken(getAdminToken());
  }, []);

  const fetchDashboardData = async (silent = false) => {
    if (!adminToken) return;

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
    if (!adminToken) return;
    fetchDashboardData();
  }, [adminToken]);

  useEffect(() => {
    if (!adminToken || !data || data.status !== "open") return;

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

  const openEditModal = (item: ExamItem) => {
    setEditingItem(item);
    setEditDraft({
      points: item.points,
      answer_type: item.answer_type,
      accepted: [...item.answer_config.accepted],
      tempVariant: "",
    });
  };

  const closeEditModal = () => {
    if (saveLoading) return;
    setEditingItem(null);
    setEditDraft(null);
  };

  const updateEditDraft = (fields: Partial<ItemEditDraft>) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      if (fields.answer_type && fields.answer_type !== prev.answer_type) {
        if (fields.answer_type === "choice") {
          updated.accepted = ["A"];
        } else if (fields.answer_type === "true_false") {
          updated.accepted = ["V"];
        } else {
          updated.accepted = [];
        }
      }
      return updated;
    });
  };

  const handleAddTextVariant = () => {
    if (!editDraft) return;
    const variant = editDraft.tempVariant.trim();
    if (!variant || editDraft.accepted.includes(variant)) return;
    updateEditDraft({
      accepted: [...editDraft.accepted, variant],
      tempVariant: "",
    });
  };

  const handleRemoveTextVariant = (index: number) => {
    if (!editDraft) return;
    updateEditDraft({
      accepted: editDraft.accepted.filter((_, i) => i !== index),
    });
  };

  const handleSaveItem = async () => {
    if (!data || !editingItem || !editDraft) return;

    if (editDraft.accepted.length === 0) {
      await alert("Adicione pelo menos uma resposta correta.", {
        title: "Gabarito incompleto",
        severity: "warning",
      });
      return;
    }

    const submissionCount = data.submissions.length;
    const confirmMessage =
      submissionCount > 0
        ? `Alterar o gabarito recalculará automaticamente as notas de ${submissionCount} aluno${submissionCount > 1 ? "s" : ""}. Esta ação não pode ser desfeita.`
        : "Deseja salvar as alterações neste item do gabarito?";

    const hasConfirmed = await confirm(confirmMessage, {
      title: "Confirmar alteração",
      severity: "warning",
      confirmText: "Salvar e recalcular",
      cancelText: "Cancelar",
    });
    if (!hasConfirmed) return;

    setSaveLoading(true);
    try {
      const response = await fetch(
        `/api/admin/exams/${adminToken}/items/${editingItem.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            points: editDraft.points,
            answer_type: editDraft.answer_type,
            answer_config: { accepted: editDraft.accepted },
          }),
        },
      );
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Erro ao salvar alterações.");
      }

      closeEditModal();
      await fetchDashboardData(true);

      const recalcCount = resData.recalculation?.submissions_updated ?? 0;
      const successMessage =
        recalcCount > 0
          ? `Gabarito atualizado. ${recalcCount} nota${recalcCount > 1 ? "s" : ""} recalculada${recalcCount > 1 ? "s" : ""}.`
          : resData.message || "Gabarito atualizado com sucesso.";

      await alert(successMessage, {
        title: "Gabarito atualizado",
        severity: "info",
      });
    } catch (err: any) {
      await alert(err.message || "Houve um erro ao salvar o gabarito.", {
        title: "Erro ao salvar",
        severity: "danger",
      });
    } finally {
      setSaveLoading(false);
    }
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

  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="w-14 h-14 bg-rose-950/80 border border-rose-900/30 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold">Sessão administrativa ausente</h2>
        <p className="text-sm text-slate-400">
          Informe o token administrativo na Home para acessar o painel da prova.
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
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Criada em: {new Date(data.created_at).toLocaleDateString("pt-BR")}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Código aluno:{" "}
              <span className="font-mono">{data.public_code}</span>
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
            <span className="flex items-center gap-1.5 px-4 py-2 bg-rose-950/20 border border-rose-900/30 rounded-xl text-xs font-bold text-rose-300 select-none">
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
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center whitespace-nowrap tabular-nums font-extrabold text-slate-200 bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-lg">
                      {sub.total_score.toFixed(1)}
                      <span className="mx-1 text-slate-500 font-normal">/</span>
                      {maxPoints.toFixed(1)}
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
              className="bg-slate-900/55 border border-slate-850 rounded-xl p-3.5 flex items-start justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <span className="font-bold text-sm block">
                  Questão {item.question_number}
                  {item.sub_label && (
                    <span className="ml-2 text-cyan-400 uppercase">
                      {item.sub_label}
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-500 block uppercase mt-0.5">
                  Tipo:{" "}
                  {item.answer_type === "choice"
                    ? "Múltipla Escolha"
                    : item.answer_type === "true_false"
                      ? "Verd. ou Falso"
                      : "Texto Exato"}
                </span>

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

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-xs font-bold text-slate-400 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-md">
                  {item.points.toFixed(1)} pts
                </span>
                <button
                  onClick={() => openEditModal(item)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-cyan-400 bg-slate-950 border border-slate-850 hover:border-cyan-800/40 rounded-md transition-colors cursor-pointer"
                  title="Editar gabarito"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingItem && editDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-300">
                  Editar Gabarito
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Questão {editingItem.question_number}
                  {editingItem.sub_label && (
                    <span className="ml-2 text-cyan-400 uppercase">
                      {editingItem.sub_label}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={closeEditModal}
                disabled={saveLoading}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                  Pontos
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={editDraft.points}
                  onChange={(e) =>
                    updateEditDraft({
                      points: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={saveLoading}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-sm text-center font-bold text-blue-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                  Tipo de Resposta
                </label>
                <select
                  value={editDraft.answer_type}
                  onChange={(e) =>
                    updateEditDraft({
                      answer_type: e.target
                        .value as ItemEditDraft["answer_type"],
                    })
                  }
                  disabled={saveLoading}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="choice">Múltipla Escolha</option>
                  <option value="true_false">Verdadeiro ou Falso (V/F)</option>
                  <option value="text_exact">Texto</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                  Gabarito Oficial
                </label>

                {editDraft.answer_type === "choice" && (
                  <div className="flex gap-1.5 justify-between">
                    {["A", "B", "C", "D", "E"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateEditDraft({ accepted: [option] })}
                        disabled={saveLoading}
                        className={`flex-1 py-1.5 rounded-lg border text-sm font-bold transition-all cursor-pointer disabled:opacity-40 ${
                          editDraft.accepted.includes(option)
                            ? "bg-cyan-500 text-slate-950 border-cyan-400"
                            : "bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-800"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {editDraft.answer_type === "true_false" && (
                  <div className="flex gap-2">
                    {["V", "F"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateEditDraft({ accepted: [option] })}
                        disabled={saveLoading}
                        className={`flex-1 py-1.5 rounded-lg border text-sm font-bold transition-all cursor-pointer disabled:opacity-40 ${
                          editDraft.accepted.includes(option)
                            ? "bg-blue-500 text-white border-blue-400"
                            : "bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-800"
                        }`}
                      >
                        {option === "V" ? "Verdadeiro (V)" : "Falso (F)"}
                      </button>
                    ))}
                  </div>
                )}

                {editDraft.answer_type === "text_exact" && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nova variação aceita..."
                        value={editDraft.tempVariant}
                        onChange={(e) =>
                          updateEditDraft({ tempVariant: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTextVariant();
                          }
                        }}
                        disabled={saveLoading}
                        className="flex-1 bg-slate-900 border border-slate-850 rounded-xl px-3 py-1.5 text-xs placeholder:text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={handleAddTextVariant}
                        disabled={saveLoading}
                        className="px-3 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40"
                      >
                        Adicionar
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {editDraft.accepted.map((val, variantIdx) => (
                        <span
                          key={variantIdx}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-850 border border-slate-800 text-[10px] text-slate-300 font-mono"
                        >
                          {val}
                          <button
                            type="button"
                            onClick={() => handleRemoveTextVariant(variantIdx)}
                            disabled={saveLoading}
                            className="text-slate-500 hover:text-rose-400 cursor-pointer disabled:opacity-40"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 p-5 border-t border-slate-800">
              <button
                onClick={closeEditModal}
                disabled={saveLoading}
                className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-850 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveItem}
                disabled={saveLoading}
                className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer disabled:opacity-60"
              >
                {saveLoading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
