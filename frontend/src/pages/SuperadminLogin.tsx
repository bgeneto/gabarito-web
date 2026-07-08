import { Eye, EyeOff, Lock, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { navigateTo } from "../App";
import {
  hasSuperadminToken,
  setSuperadminToken,
} from "../utils/superadminSession";

function normalizeTokenInput(raw: string): string {
  let token = raw.trim();
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  return token;
}

export default function SuperadminLogin() {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submitInFlightRef = useRef(false);

  useEffect(() => {
    if (hasSuperadminToken()) {
      navigateTo("/superadmin/painel");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitInFlightRef.current || loading) return;

    const cleanToken = normalizeTokenInput(token);
    if (!cleanToken) {
      setError("Informe o token de superadmin.");
      return;
    }

    submitInFlightRef.current = true;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/superadmin/session", {
        headers: { Authorization: `Bearer ${cleanToken}` },
      });

      let data: {
        message?: string;
        expires_at?: number | null;
      } = {};
      try {
        data = await response.json();
      } catch {
        /* resposta sem JSON */
      }

      if (response.status === 404) {
        setError(
          "Área superadmin não está habilitada no servidor (SUPERADMIN_TOKEN ausente). Recrie o container da API após configurar o .env.",
        );
        return;
      }
      if (response.status === 429) {
        setError(
          data.message ||
            "Muitas tentativas de acesso. Aguarde um minuto e tente novamente.",
        );
        return;
      }
      if (response.status === 401) {
        const msg = data.message || "";
        if (msg.includes("ausente")) {
          setError(
            "O servidor não recebeu o token (header Authorization pode estar bloqueado pelo proxy reverso/Caddy).",
          );
        } else if (msg.includes("Acesso negado")) {
          setError("Acesso negado! Seu IP não é permitido.");
        } else {
          setError(
            `Token não confere com o configurado no servidor. Verifique se colou o token completo (${cleanToken.length} caracteres enviados).`,
          );
        }
        return;
      }
      if (!response.ok) {
        setError(data.message || "Não foi possível autenticar.");
        return;
      }

      setSuperadminToken(cleanToken, data.expires_at ?? null);
      navigateTo("/superadmin/painel");
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  };

  const cleanLen = normalizeTokenInput(token).length;

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="glass-panel rounded-2xl p-8 border border-amber-900/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Lock className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-amber-500/80 font-bold">
              Acesso restrito
            </p>
            <h1 className="text-xl font-extrabold text-slate-100">
              Superadmin
            </h1>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-6">
          Painel somente leitura para visualização global de provas e
          estatísticas de uso.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800/50 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          {/* Campo oculto ajuda gerenciadores de senha (ex.: Bitwarden) a associar o item */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            defaultValue="superadmin@gabaritoweb"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            readOnly
          />
          <div>
            <label
              htmlFor="superadmin-token"
              className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2"
            >
              Token de acesso
            </label>
            <div className="relative">
              <input
                id="superadmin-token"
                name="password"
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 font-mono text-xs"
                placeholder="Token do SUPERADMIN_TOKEN"
                autoComplete="current-password"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-600 mt-1">
              {cleanLen > 0
                ? `${cleanLen} caracteres (esperado: 64 para token hex)`
                : "Cole o valor exato de SUPERADMIN_TOKEN do .env de produção"}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verificando..." : "Entrar no painel"}
          </button>
        </form>
      </div>
    </div>
  );
}
