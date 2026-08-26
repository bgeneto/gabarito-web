import { useEffect, useState, useRef } from "react";
import { CheckCircle2, AlertCircle, Sparkles, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { navigateTo } from "../App";
import { sanitizePostLoginPath } from "../utils/postLoginRedirect";

export default function AuthVerify() {
  const { verifyMagicLink } = useAuth();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const redirectTarget = urlParams.get("redirect");

    if (!token) {
      setStatus("error");
      setErrorMessage("Token de autenticação ausente ou inválido.");
      return;
    }

    verifyMagicLink(token)
      .then((res) => {
        setStatus("success");
        setTimeout(() => {
          navigateTo(
            sanitizePostLoginPath(redirectTarget) ||
              sanitizePostLoginPath(res.redirect_to) ||
              "/conta",
          );
        }, 1200);
      })
      .catch((err: unknown) => {
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Não foi possível validar este link de acesso.",
        );
      });
  }, [verifyMagicLink]);

  return (
    <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-8 text-center">
      <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl relative">
        {status === "verifying" && (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 bg-cyan-950/80 border border-cyan-800/40 rounded-full flex items-center justify-center mx-auto text-cyan-400">
              <div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            </div>
            <h1 className="text-xl font-black text-slate-100">
              Validando seu acesso...
            </h1>
            <p className="text-xs text-slate-400">
              Aguarde alguns segundos enquanto confirmamos seu link de
              segurança.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 py-4 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-950/80 border border-emerald-700/50 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-black text-slate-100 flex items-center justify-center gap-2">
              <span>Acesso confirmado!</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h1>
            <p className="text-xs text-slate-300">
              Você está autenticado no GabaritoWEB. Levando você ao destino
              certo...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-5 py-4">
            <div className="w-16 h-16 bg-rose-950/80 border border-rose-800/50 rounded-full flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100">
                Link inválido ou expirado
              </h1>
              <p className="text-xs text-rose-300 mt-1 max-w-xs mx-auto">
                {errorMessage}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => navigateTo("/entrar")}
                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-900/30 transition-all text-sm cursor-pointer"
              >
                Solicitar novo link de acesso
              </button>
              <button
                onClick={() => navigateTo("/")}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 py-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Ir para a página inicial
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
