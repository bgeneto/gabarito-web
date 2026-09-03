import { useEffect, useState } from "react";
import {
  ClipboardList,
  GraduationCap,
  ArrowRight,
  Link as LinkIcon,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { navigateTo } from "../App";
import { buildLoginPath } from "../utils/postLoginRedirect";

export default function AccountHub() {
  const {
    sessionToken,
    user,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();
  const [examCount, setExamCount] = useState<number | null>(null);
  const [submissionCount, setSubmissionCount] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigateTo(buildLoginPath("/conta"));
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!sessionToken) return;
    fetch("/api/user/overview", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setExamCount(Number(data.exam_count ?? 0));
        setSubmissionCount(Number(data.submission_count ?? 0));
      })
      .catch(() => {
        // Hub continua utilizável sem as contagens
      });
  }, [sessionToken]);

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-16">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full py-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black tracking-tight mb-2">Sua conta</h1>
        <p className="text-sm text-slate-400">
          Conectado como{" "}
          <strong className="text-slate-200">{user.email}</strong>
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Escolha o histórico que deseja abrir. A mesma conta serve para
          professor e aluno.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigateTo("/minhas-provas")}
          className="group flex flex-col items-start p-6 rounded-2xl glass-panel border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/60 transition-all text-left cursor-pointer"
        >
          <div className="w-12 h-12 bg-blue-950/80 border border-blue-800/50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <ClipboardList className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="font-bold text-lg group-hover:text-blue-400 transition-colors">
            Minhas Avaliações
          </h2>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            Gabaritos que você criou ou vinculou com o token administrativo.
          </p>
          <span className="text-[11px] font-semibold text-blue-300/90">
            {examCount == null
              ? "Abrir painel do professor"
              : examCount === 1
                ? "1 avaliação vinculada"
                : `${examCount} avaliações vinculadas`}
          </span>
        </button>

        <button
          onClick={() => navigateTo("/meus-resultados")}
          className="group flex flex-col items-start p-6 rounded-2xl glass-panel border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/60 transition-all text-left cursor-pointer"
        >
          <div className="w-12 h-12 bg-cyan-950/80 border border-cyan-800/50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="font-bold text-lg group-hover:text-cyan-400 transition-colors">
            Meus Resultados
          </h2>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            Envios que você fez logado ou vinculou pelo comprovante.
          </p>
          <span className="text-[11px] font-semibold text-cyan-300/90">
            {submissionCount == null
              ? "Abrir histórico do aluno"
              : submissionCount === 1
                ? "1 envio vinculado"
                : `${submissionCount} envios vinculados`}
          </span>
        </button>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
          Avaliações antigas: use Vincular por Token ou por Comprovante em cada
          lista.
        </span>
      </div>

      <button
        onClick={() => navigateTo("/")}
        className="mt-6 inline-flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
      >
        Ir para a página inicial
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
