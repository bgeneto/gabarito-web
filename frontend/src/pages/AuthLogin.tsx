import { useEffect, useState } from "react";
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { navigateTo } from "../App";
import { getRedirectQueryParam } from "../utils/postLoginRedirect";

export default function AuthLogin() {
  const { requestMagicLink, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const pendingRedirect = getRedirectQueryParam();

  useEffect(() => {
    if (isAuthenticated && pendingRedirect) {
      navigateTo(pendingRedirect);
    }
  }, [isAuthenticated, pendingRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Por favor, informe um endereço de e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      await requestMagicLink(trimmed, pendingRedirect ?? undefined);
      setSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o link de acesso. Tente novamente mais tarde.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated && user) {
    if (pendingRedirect) {
      return (
        <div className="flex-1 flex flex-col justify-center items-center py-16">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-8 text-center">
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6">
          <div className="w-16 h-16 bg-cyan-950/80 border border-cyan-700/50 rounded-full flex items-center justify-center mx-auto text-cyan-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100">
              Você já está conectado
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Conectado como{" "}
              <strong className="text-slate-200">{user.email}</strong>
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => navigateTo("/conta")}
              className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
            >
              Continuar para minha conta
            </button>
            <button
              onClick={() => navigateTo("/minhas-provas")}
              className="w-full py-3 px-4 rounded-xl font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            >
              Minhas Provas (Professor)
            </button>
            <button
              onClick={() => navigateTo("/meus-resultados")}
              className="w-full py-3 px-4 rounded-xl font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            >
              Meus Resultados (Aluno)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-6">
      <button
        onClick={() => navigateTo("/")}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-6 transition-colors self-start cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para a página inicial
      </button>

      <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-cyan-950/60 border border-cyan-800/40 rounded-xl flex items-center justify-center mx-auto text-cyan-400 mb-3 shadow-inner">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100">
            Acesso sem senha
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Digite seu e-mail para receber um link mágico e acessar seu
            histórico de provas (professor) e envios (aluno).
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-950/40 border border-rose-800/50 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-4 space-y-4">
            <div className="p-4 bg-cyan-950/40 border border-cyan-800/50 rounded-xl text-left space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Link mágico enviado!
              </div>
              <p className="text-xs text-slate-300">
                Enviamos um link de login para{" "}
                <strong className="text-white">{email}</strong>.
              </p>
              <p className="text-xs text-slate-400">
                Abra sua caixa de entrada e clique no link para entrar
                instantaneamente (válido por 15 minutos).
              </p>
            </div>

            <button
              onClick={() => {
                setSuccess(false);
                setEmail("");
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Seu endereço de e-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={loading}
                autoFocus
                required
                className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/30 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enviando link...</span>
                </>
              ) : (
                <>
                  <span>Enviar link de acesso</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            Não é obrigatório criar conta para responder ou criar provas
            avulsas.
          </p>
        </div>
      </div>
    </div>
  );
}
