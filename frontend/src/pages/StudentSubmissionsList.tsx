import { useState, useEffect } from "react";
import {
  Receipt,
  Link as LinkIcon,
  Award,
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { navigateTo } from "../App";
import { useModal } from "../components/ModalProvider";

interface UserSubmission {
  id: string;
  exam_id: string;
  exam_title: string;
  exam_public_code: string;
  exam_status: "open" | "closed";
  student_name: string;
  student_identifier: string;
  submitted_at: number;
  total_score: number | null;
  max_score: number | null;
}

export default function StudentSubmissionsList() {
  const {
    sessionToken,
    user,
    isAuthenticated,
    isLoading: authLoading,
    claimSubmission,
  } = useAuth();
  const { alert } = useModal();
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal de resgate por comprovante
  const [claimReceiptInput, setClaimReceiptInput] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [showClaimModal, setShowClaimModal] = useState(false);

  const fetchSubmissions = async () => {
    if (!sessionToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user/submissions", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error("Não foi possível carregar suas submissões.");
      }
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erro ao buscar submissões.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigateTo("/entrar?redirect=/meus-resultados");
      return;
    }
    if (sessionToken) {
      fetchSubmissions();
    }
  }, [sessionToken, authLoading, isAuthenticated]);

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError("");
    const code = claimReceiptInput.trim().toUpperCase();
    if (!code) {
      setClaimError("Informe o código do comprovante (ex: A7K9QF).");
      return;
    }

    setClaimLoading(true);
    try {
      const result = await claimSubmission(code);
      setShowClaimModal(false);
      setClaimReceiptInput("");
      await fetchSubmissions();
      await alert(result.message || "Submissão vinculada ao seu histórico!", {
        title: "Sucesso!",
        severity: "info",
      });
    } catch (err: unknown) {
      setClaimError(
        err instanceof Error
          ? err.message
          : "Não foi possível vincular esta submissão.",
      );
    } finally {
      setClaimLoading(false);
    }
  };

  if (authLoading || (loading && submissions.length === 0)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Carregando seus resultados...</p>
      </div>
    );
  }

  const closedCount = submissions.filter(
    (s) => s.exam_status === "closed",
  ).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-100 flex items-center gap-2">
            <span>Meus Resultados</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-800 text-blue-400 font-semibold">
              Aluno
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Histórico de avaliações e gabaritos associados a{" "}
            <strong className="text-slate-200">{user?.email}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowClaimModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Vincular por Comprovante</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">
              {submissions.length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Avaliações Realizadas
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">
              {closedCount}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Notas Divulgadas
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl flex items-center gap-2.5 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
            <Receipt className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-200">
              Nenhuma submissão no seu histórico
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Você ainda não enviou respostas enquanto estava conectado. Se você
              já fez uma avaliação antes, pode vinculá-la usando o código de
              comprovante de 6 caracteres.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => navigateTo("/")}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md transition-all cursor-pointer"
            >
              Responder uma Avaliação
            </button>
            <button
              onClick={() => setShowClaimModal(true)}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            >
              Vincular por Comprovante
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => {
            const isClosed = sub.exam_status === "closed";
            return (
              <div
                key={sub.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {sub.exam_title}
                    </h2>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        isClosed
                          ? "bg-emerald-950/80 border-emerald-700/60 text-emerald-400"
                          : "bg-amber-950/60 border-amber-800/50 text-amber-300"
                      }`}
                    >
                      {isClosed ? "Nota Disponível" : "Avaliação Aberta"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1 font-mono font-semibold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Comprovante:{" "}
                      <strong className="text-cyan-400">{sub.id}</strong>
                    </span>
                    <span className="text-slate-400">
                      Matrícula:{" "}
                      <strong className="text-slate-200">
                        {sub.student_identifier}
                      </strong>
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(sub.submitted_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  {isClosed &&
                  sub.total_score !== null &&
                  sub.max_score !== null ? (
                    <div className="text-right">
                      <div className="text-xl font-black text-cyan-400">
                        {sub.total_score}{" "}
                        <span className="text-xs text-slate-400">
                          / {sub.max_score}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Nota Final
                      </div>
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="text-xs text-amber-300/90 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Aguardando encerramento
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => navigateTo(`/submissao/${sub.id}`)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-cyan-600 border border-slate-700 hover:border-cyan-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>Ver Detalhes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Vincular Submissão por Comprovante */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-700 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <Receipt className="w-4 h-4 text-cyan-400" />
                Vincular Submissão Anterior
              </h3>
              <button
                onClick={() => setShowClaimModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enviou uma avaliação anonimamente? Insira o{" "}
              <strong>Código do Comprovante</strong> de 6 caracteres (ex:{" "}
              <code className="text-cyan-300">A7K9QF</code>) para salvá-la no
              seu histórico permanente.
            </p>

            {claimError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{claimError}</span>
              </div>
            )}

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Código do Comprovante
                </label>
                <input
                  type="text"
                  value={claimReceiptInput}
                  onChange={(e) =>
                    setClaimReceiptInput(e.target.value.toUpperCase())
                  }
                  placeholder="Ex: A7K9QF"
                  maxLength={6}
                  disabled={claimLoading}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono tracking-widest text-center"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={claimLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {claimLoading ? "Vinculando..." : "Vincular Submissão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
