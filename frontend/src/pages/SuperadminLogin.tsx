import { Eye, EyeOff, Lock, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (hasSuperadminToken()) {
      navigateTo("/superadmin/painel");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = normalizeTokenInput(token);
    if (!cleanToken) {
      setError("Informe o token de superadmin.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/superadmin/session", {
        headers: { Authorization: `Bearer ${cleanToken}` },
      });

      let data: { message?: string } = {};
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
      if (response.status === 401) {
        const msg = data.message || "";
        if (msg.includes("ausente")) {
          setError(
            "O servidor não recebeu o token (header Authorization pode estar bloqueado pelo proxy reverso/Caddy).",
          );
        } else if (msg.includes("Acesso negado")) {
          setError(
            "Seu IP não está em SUPERADMIN_ALLOWED_IPS. Ajuste a variável ou remova a restrição.",
          );
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

      setSuperadminToken(cleanToken);
      navigateTo("/superadmin/painel");
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
              Token de acesso
            </label>
            <div className="relative">
              <textarea
                rows={2}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={`w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 font-mono text-xs resize-none break-all ${
                  showToken ? "" : "[-webkit-text-security:disc]"
                }`}
                placeholder="Cole o token completo do openssl rand -hex 32"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
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
            className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Entrar no painel"}
          </button>
        </form>
      </div>
    </div>
  );
}
