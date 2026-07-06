import { useState } from "react";
import { navigateTo } from "../App";
import {
  GraduationCap,
  Trophy,
  ShieldAlert,
  Key,
  ClipboardList,
} from "lucide-react";

export default function Home() {
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [publicCode, setPublicCode] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [error, setError] = useState("");

  const handleStudentAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const code = publicCode.trim().toUpperCase();
    if (!code) {
      setError("Por favor, insira o código da prova.");
      return;
    }
    // Redireciona para a prova
    navigateTo(`/prova/${code}`);
  };

  const handleTeacherAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const token = adminToken.trim();
    if (!token) {
      setError("Por favor, insira o token administrativo.");
      return;
    }
    // Redireciona para o painel
    navigateTo(`/admin/${token}`);
  };

  return (
    <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full py-6">
      {/* Intro */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black tracking-tight mb-3">
          Correção online de provas
        </h1>
        <p className="text-slate-400 text-sm">
          Sem cadastros complicados. Digite seu código de prova ou gerencie seus
          gabaritos de forma 100% online.
        </p>
      </div>

      {/* Role Selection */}
      {role === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card Aluno */}
          <button
            onClick={() => setRole("student")}
            className="group flex flex-col items-center justify-center p-8 rounded-2xl glass-panel border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/60 transition-all text-center cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors"></div>
            <div className="w-14 h-14 bg-cyan-950/80 border border-cyan-800/50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="font-bold text-lg mb-1 group-hover:text-cyan-400 transition-colors">
              Sou Aluno
            </h3>
            <p className="text-xs text-slate-500 max-w-[180px]">
              Responder gabarito e consultar notas de provas finalizadas.
            </p>
          </button>

          {/* Card Professor */}
          <button
            onClick={() => setRole("teacher")}
            className="group flex flex-col items-center justify-center p-8 rounded-2xl glass-panel border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/60 transition-all text-center cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
            <div className="w-14 h-14 bg-blue-950/80 border border-blue-800/50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ClipboardList className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="font-bold text-lg mb-1 group-hover:text-blue-400 transition-colors">
              Sou Professor
            </h3>
            <p className="text-xs text-slate-500 max-w-[180px]">
              Criar gabaritos oficiais, emitir QR codes e monitorar notas.
            </p>
          </button>
        </div>
      )}

      {/* Aluno View */}
      {role === "student" && (
        <div className="glass-panel border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <button
            onClick={() => setRole(null)}
            className="text-xs text-slate-400 hover:text-slate-200 mb-4 inline-block"
          >
            ← Voltar para seleção
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-800/30 flex items-center justify-center">
              <Key className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Acesso do Estudante</h2>
              <p className="text-xs text-slate-500">
                Insira o código fornecido pelo professor
              </p>
            </div>
          </div>

          <form onSubmit={handleStudentAccess} className="space-y-4">
            <div>
              <label
                htmlFor="publicCode"
                className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider"
              >
                Código Público da Prova
              </label>
              <input
                id="publicCode"
                type="text"
                placeholder="Ex: G26-DNEM9G"
                value={publicCode}
                onChange={(e) => setPublicCode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-slate-100 placeholder:text-slate-600 uppercase tracking-widest text-center font-mono font-bold"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/10 cursor-pointer"
            >
              Acessar Gabarito
            </button>
          </form>
        </div>
      )}

      {/* Professor View */}
      {role === "teacher" && (
        <div className="space-y-6">
          <div className="glass-panel border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <button
              onClick={() => setRole(null)}
              className="text-xs text-slate-400 hover:text-slate-200 mb-4 inline-block"
            >
              ← Voltar para seleção
            </button>

            <div className="text-center mb-6">
              <h2 className="font-extrabold text-xl mb-1">
                Área Administrativa
              </h2>
              <p className="text-xs text-slate-500">
                Crie novos gabaritos ou monitore as provas ativas.
              </p>
            </div>

            <button
              onClick={() => navigateTo("/criar-prova")}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/15 mb-6 flex items-center justify-center gap-2 cursor-pointer"
            >
              Criar Novo Gabarito
            </button>

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-slate-900"></div>
              <span className="flex-shrink mx-4 text-slate-600 text-[10px] uppercase font-bold tracking-widest">
                Ou acesse uma prova existente
              </span>
              <div className="flex-grow border-t border-slate-900"></div>
            </div>

            <form onSubmit={handleTeacherAccess} className="space-y-4 mt-4">
              <div>
                <label
                  htmlFor="adminToken"
                  className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider"
                >
                  Token Administrativo
                </label>
                <input
                  id="adminToken"
                  type="text"
                  placeholder="Ex: adm_A7K9QF"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-slate-100 placeholder:text-slate-600 font-mono text-center text-xs"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold rounded-xl text-sm transition-all cursor-pointer"
              >
                Acessar Painel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
