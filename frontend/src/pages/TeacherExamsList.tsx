import { useState, useEffect } from "react";
import {
  Plus,
  Link as LinkIcon,
  Copy,
  Check,
  Users,
  Award,
  Calendar,
  AlertCircle,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { navigateTo } from "../App";
import { setAdminSession } from "../utils/adminSession";
import { exchangeAdminToken } from "../utils/adminApi";
import { useModal } from "../components/ModalProvider";

interface UserExam {
  id: string;
  title: string;
  public_code: string;
  admin_token: string | null;
  status: "open" | "closed";
  created_at: number;
  closed_at: number | null;
  submission_count: number;
  max_score: number;
  score_stats: {
    avg: number;
    min: number;
    max: number;
    avg_percent: number;
  } | null;
}

export default function TeacherExamsList() {
  const {
    sessionToken,
    user,
    isAuthenticated,
    isLoading: authLoading,
    claimExam,
  } = useAuth();
  const { alert } = useModal();
  const [exams, setExams] = useState<UserExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal para vincular prova existente
  const [claimTokenInput, setClaimTokenInput] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [showClaimModal, setShowClaimModal] = useState(false);

  const fetchExams = async () => {
    if (!sessionToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user/exams", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error("Não foi possível carregar a lista de provas.");
      }
      const data = await res.json();
      setExams(data.exams || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao buscar provas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigateTo("/entrar?redirect=/minhas-provas");
      return;
    }
    if (sessionToken) {
      fetchExams();
    }
  }, [sessionToken, authLoading, isAuthenticated]);

  const handleCopyLink = (publicCode: string) => {
    const url = `${window.location.origin}/prova/${publicCode}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(publicCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleManageExam = async (adminToken: string | null) => {
    if (!adminToken) {
      await alert(
        "Esta prova não possui um token administrativo registrado diretamente. Utilize a chave administrativa para acessá-la.",
        {
          title: "Atenção",
          severity: "warning",
        },
      );
      return;
    }
    try {
      const session = await exchangeAdminToken(adminToken);
      setAdminSession(session.session_token);
      navigateTo("/admin");
    } catch (err: unknown) {
      await alert(
        err instanceof Error
          ? err.message
          : "Não foi possível iniciar a sessão administrativa.",
        {
          title: "Erro ao abrir painel",
          severity: "danger",
        },
      );
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError("");
    const token = claimTokenInput.trim();
    if (!token) {
      setClaimError("Informe o token administrativo (ex: adm_A7K9QF).");
      return;
    }

    setClaimLoading(true);
    try {
      const result = await claimExam(token);
      setShowClaimModal(false);
      setClaimTokenInput("");
      await fetchExams();
      await alert(
        result.message || "Prova vinculada à sua conta com sucesso!",
        {
          title: "Sucesso!",
          severity: "info",
        },
      );
    } catch (err: unknown) {
      setClaimError(
        err instanceof Error
          ? err.message
          : "Não foi possível vincular esta prova.",
      );
    } finally {
      setClaimLoading(false);
    }
  };

  if (authLoading || (loading && exams.length === 0)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Carregando suas provas...</p>
      </div>
    );
  }

  const totalSubmissions = exams.reduce(
    (acc, curr) => acc + curr.submission_count,
    0,
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-100 flex items-center gap-2">
            <span>Minhas Provas</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400 font-semibold">
              Professor
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gabaritos e avaliações associados ao e-mail{" "}
            <strong className="text-slate-200">{user?.email}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowClaimModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Vincular por Token</span>
          </button>

          <button
            onClick={() => navigateTo("/criar-prova")}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova Prova</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">
              {exams.length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Provas Criadas
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">
              {totalSubmissions}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Respostas Recebidas
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">
              {exams.filter((e) => e.status === "open").length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Provas Abertas
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Provas */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl flex items-center gap-2.5 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {exams.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
            <ClipboardList className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-200">
              Nenhuma prova associada ainda
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Você ainda não criou provas enquanto estava logado. Crie uma nova
              prova ou vincule uma prova criada anteriormente pelo seu token de
              administração.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => navigateTo("/criar-prova")}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md transition-all cursor-pointer"
            >
              Criar Primeira Prova
            </button>
            <button
              onClick={() => setShowClaimModal(true)}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            >
              Vincular Prova Existente
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => {
            const isClosed = exam.status === "closed";
            return (
              <div
                key={exam.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {exam.title}
                    </h2>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        isClosed
                          ? "bg-slate-900 border-slate-700 text-slate-400"
                          : "bg-emerald-950/80 border-emerald-700/60 text-emerald-400"
                      }`}
                    >
                      {isClosed ? "Encerrada" : "Aberta"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1 font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                      {exam.public_code}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      {exam.submission_count} submissões
                    </span>
                    {exam.score_stats && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        Média: {exam.score_stats.avg} / {exam.max_score} (
                        {exam.score_stats.avg_percent}%)
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(exam.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleCopyLink(exam.public_code)}
                    title="Copiar link da prova para alunos"
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {copiedCode === exam.public_code ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => handleManageExam(exam.admin_token)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-cyan-600 border border-slate-700 hover:border-cyan-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>Gerenciar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Vincular Prova Existente por Token */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-700 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <LinkIcon className="w-4 h-4 text-cyan-400" />
                Vincular Prova Existente
              </h3>
              <button
                onClick={() => setShowClaimModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Criou uma prova anonimamente no passado? Insira o{" "}
              <strong>Token Administrativo</strong> (ex:{" "}
              <code className="text-cyan-300">adm_A7K9QF</code>) para
              adicioná-la permanentemente ao seu painel.
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
                  Token Administrativo da Prova
                </label>
                <input
                  type="text"
                  value={claimTokenInput}
                  onChange={(e) => setClaimTokenInput(e.target.value)}
                  placeholder="adm_XXXXXX"
                  disabled={claimLoading}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
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
                  {claimLoading ? "Vinculando..." : "Vincular Prova"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
