import { useState } from "react";
import { navigateTo } from "../App";
import {
  GraduationCap,
  ShieldAlert,
  ClipboardList,
  Receipt,
  ArrowLeft,
  ArrowRight,
  User,
  PenLine,
} from "lucide-react";
import { setAdminSession } from "../utils/adminSession";
import { exchangeAdminToken } from "../utils/adminApi";
import { normalizeAdminToken } from "../utils/adminTokenUrl";
import { useAuth } from "../contexts/AuthContext";
import { buildLoginPath } from "../utils/postLoginRedirect";
import {
  formatPublicCode,
  validatePublicCode,
  formatReceiptCode,
  validateReceiptCode,
} from "../utils/codeFormatters";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [studentAction, setStudentAction] = useState<
    "submit" | "result" | null
  >(null);
  const [publicCode, setPublicCode] = useState("");
  const [receiptCode, setReceiptCode] = useState("");
  const [adminTokenInput, setAdminTokenInput] = useState("");
  const [examError, setExamError] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [teacherError, setTeacherError] = useState("");
  const [teacherLoading, setTeacherLoading] = useState(false);

  const handleStudentAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setExamError("");
    const code = publicCode.trim().toUpperCase();
    if (!code) {
      setExamError("Por favor, insira o código da avaliação.");
      return;
    }
    if (!validatePublicCode(code)) {
      setExamError(
        "Código de avaliação inválido. O formato deve ser GYY-XXXXXX (ex: G26-DNEM9G).",
      );
      return;
    }
    navigateTo(`/prova/${code}`);
  };

  const handleStudentReceiptAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setReceiptError("");
    const code = formatReceiptCode(receiptCode);
    if (!code) {
      setReceiptError("Por favor, insira o código do comprovante.");
      return;
    }
    if (!validateReceiptCode(code)) {
      setReceiptError("O comprovante deve ter 6 caracteres (ex: P9Z2JU).");
      return;
    }
    navigateTo(`/submissao/${code}`);
  };

  const handleTeacherAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError("");

    const token = normalizeAdminToken(adminTokenInput);
    if (!token) {
      setTeacherError(
        "Informe um token administrativo válido (ex: adm_A7K9QF).",
      );
      return;
    }

    setTeacherLoading(true);
    try {
      const session = await exchangeAdminToken(token);
      setAdminSession(session.session_token);
      navigateTo("/admin");
    } catch (err: unknown) {
      setTeacherError(
        err instanceof Error
          ? err.message
          : "Não foi possível validar o acesso administrativo.",
      );
    } finally {
      setTeacherLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full py-6">
      {/* Intro */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black tracking-tight mb-3">
          Correção online de avaliações
        </h1>
        <p className="text-slate-400 text-sm">
          Sem cadastros complicados. Digite o código da sua avaliação ou
          gerencie seus gabaritos de forma 100% online.
        </p>
      </div>

      {/* Banner de Usuário Autenticado */}
      {role === null && isAuthenticated && user && (
        <div className="mb-4 p-4 rounded-2xl glass-panel border border-cyan-800/40 bg-cyan-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <div className="w-8 h-8 rounded-full bg-cyan-900 border border-cyan-700/60 flex items-center justify-center text-cyan-300 font-bold text-xs shrink-0">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Olá, {user.name || user.email}
              </div>
              <div className="text-[11px] text-slate-400">
                Acesse seus históricos salvos
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
            <button
              onClick={() => navigateTo("/conta")}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-all cursor-pointer"
            >
              Minha conta
            </button>
            <button
              onClick={() => navigateTo("/minhas-provas")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            >
              Minhas Avaliações
            </button>
            <button
              onClick={() => navigateTo("/meus-resultados")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            >
              Meus Resultados
            </button>
          </div>
        </div>
      )}

      {/* Role Selection */}
      {role === null && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card Aluno */}
            <button
              onClick={() => {
                setRole("student");
                setStudentAction(null);
              }}
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
                Responder gabarito ou consultar nota com comprovante.
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

          {!isAuthenticated && (
            <div className="text-center mt-6">
              <button
                onClick={() => navigateTo(buildLoginPath())}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer group"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  Deseja salvar e ver seu histórico completo?{" "}
                  <strong className="underline underline-offset-2">
                    Fazer login
                  </strong>
                </span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Aluno View - Etapa 1: Seleção de Ação */}
      {role === "student" && studentAction === null && (
        <div className="glass-panel border border-slate-800 rounded-2xl p-6 relative overflow-hidden animate-fade-in">
          <button onClick={() => setRole(null)} className="back-link mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar para seleção
          </button>

          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-6 h-6 text-cyan-400" />
            </div>
            <h2 className="font-extrabold text-xl mb-1 text-slate-100">
              Área do Estudante
            </h2>
            <p className="text-xs text-slate-400">
              O que você deseja fazer agora?
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {/* Opção 1: Responder Avaliação */}
            <button
              onClick={() => {
                setStudentAction("submit");
                setExamError("");
              }}
              className="group p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all text-left flex items-center gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <PenLine className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-400 transition-colors flex items-center justify-between">
                  <span>Responder Avaliação</span>
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-cyan-400" />
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inserir o código da avaliação para preencher e enviar suas
                  respostas.
                </p>
              </div>
            </button>

            {/* Opção 2: Consultar Resultado */}
            <button
              onClick={() => {
                setStudentAction("result");
                setReceiptError("");
              }}
              className="group p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all text-left flex items-center gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Receipt className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors flex items-center justify-between">
                  <span>Consultar Resultado</span>
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-emerald-400" />
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verificar sua nota e gabarito utilizando o código de
                  comprovante.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Aluno View - Etapa 2A: Responder Avaliação */}
      {role === "student" && studentAction === "submit" && (
        <div className="glass-panel border border-slate-800 rounded-2xl p-6 relative overflow-hidden animate-fade-in">
          <button
            onClick={() => {
              setStudentAction(null);
              setExamError("");
            }}
            className="back-link mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para opções
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-800/30 flex items-center justify-center">
              <PenLine className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Responder Avaliação</h2>
              <p className="text-xs text-slate-500">
                Informe o código público da avaliação fornecido pelo professor
              </p>
            </div>
          </div>

          <form onSubmit={handleStudentAccess} className="space-y-4">
            <div>
              <label
                htmlFor="publicCode"
                className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider"
              >
                Código Público da Avaliação
              </label>
              <input
                id="publicCode"
                type="text"
                placeholder="Ex: G26-DNEM9G"
                value={publicCode}
                maxLength={10}
                onChange={(e) =>
                  setPublicCode(formatPublicCode(e.target.value))
                }
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-slate-100 placeholder:text-slate-600 uppercase tracking-widest text-center font-mono font-bold"
                required
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                O hífen é adicionado automaticamente enquanto você digita.
              </p>
            </div>

            {examError && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{examError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/10 cursor-pointer"
            >
              Acessar Avaliação
            </button>
          </form>
        </div>
      )}

      {/* Aluno View - Etapa 2B: Consultar Resultado */}
      {role === "student" && studentAction === "result" && (
        <div className="glass-panel border border-slate-800 rounded-2xl p-6 relative overflow-hidden animate-fade-in">
          <button
            onClick={() => {
              setStudentAction(null);
              setReceiptError("");
            }}
            className="back-link mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para opções
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-800/30 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Consultar Resultado</h2>
              <p className="text-xs text-slate-500">
                Informe o código de comprovante gerado no envio
              </p>
            </div>
          </div>

          <form onSubmit={handleStudentReceiptAccess} className="space-y-4">
            <div>
              <label
                htmlFor="receiptCode"
                className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider"
              >
                Comprovante de Submissão (6 caracteres)
              </label>
              <input
                id="receiptCode"
                type="text"
                placeholder="Ex: P9Z2JU"
                value={receiptCode}
                maxLength={6}
                onChange={(e) =>
                  setReceiptCode(formatReceiptCode(e.target.value))
                }
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-slate-100 placeholder:text-slate-600 uppercase tracking-widest text-center font-mono font-bold"
                required
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                Código de 6 letras/números exibido ao finalizar sua avaliação.
              </p>
            </div>

            {receiptError && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{receiptError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              Consultar Nota
            </button>
          </form>
        </div>
      )}

      {/* Professor View */}
      {role === "teacher" && (
        <div className="space-y-6">
          <div className="glass-panel border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <button onClick={() => setRole(null)} className="back-link mb-4">
              <ArrowLeft className="w-4 h-4" />
              Voltar para seleção
            </button>

            <div className="text-center mb-6">
              <h2 className="font-extrabold text-xl mb-1">Área do Professor</h2>
              <p className="text-xs text-slate-500">
                Crie novos gabaritos ou monitore as avaliações ativas.
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
                Ou acesse uma avaliação existente
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
                  value={adminTokenInput}
                  onChange={(e) => setAdminTokenInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-slate-100 placeholder:text-slate-600 font-mono text-center text-xs"
                  required
                />
              </div>

              {teacherError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{teacherError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={teacherLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {teacherLoading ? "Validando..." : "Acessar Painel"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
