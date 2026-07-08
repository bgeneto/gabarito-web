import { useState, useEffect } from "react";
import { navigateTo } from "../App";
import {
  Award,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Printer,
} from "lucide-react";
import SubmissionReportPrint from "../components/SubmissionReportPrint";
import {
  type AnswerDetail,
  exportSubmissionReportPdf,
  formatAcceptedAnswer,
  formatStudentAnswer,
} from "../utils/submissionReport";

interface SubmissionData {
  id: string;
  student_name: string;
  student_identifier: string;
  submitted_at: number;
  exam_title: string;
  status: "open" | "closed";
  total_score: number | null;
  answers?: AnswerDetail[];
  message?: string;
}

export default function StudentResult({
  submissionId,
}: {
  submissionId: string;
}) {
  const [data, setData] = useState<SubmissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchResult = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const response = await fetch(`/api/submissions/${submissionId}`);
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(
          resData.message || "Erro ao buscar resultado da submissão.",
        );
      }
      setData(resData);
    } catch (err: any) {
      setError(err.message || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResult();
  }, [submissionId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 text-sm">
          Buscando comprovante de envio...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="w-14 h-14 bg-rose-950/80 border border-rose-900/30 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold">Erro de Consulta</h2>
        <p className="text-sm text-slate-400">
          {error || "Não foi possível carregar os dados desta submissão."}
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

  // Se a prova ainda estiver aberta
  if (data.status === "open") {
    return (
      <div className="max-w-md mx-auto w-full space-y-6 py-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo("/")}
            className="back-nav-btn"
            aria-label="Voltar para Home"
          >
            <ArrowLeft />
          </button>
          <div>
            <h1 className="text-lg font-black truncate">{data.exam_title}</h1>
            <p className="text-[10px] text-slate-500 uppercase mt-0.5">
              Status: Prova Aberta
            </p>
          </div>
        </div>

        {/* Aguardando encerramento */}
        <div className="glass-panel border border-cyan-500/20 bg-cyan-950/5 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-cyan-950/80 border border-cyan-800/40 rounded-full flex items-center justify-center mx-auto">
            <RefreshCw
              className={`w-6 h-6 text-cyan-400 ${refreshing ? "animate-spin" : ""}`}
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-slate-200">
              Respostas Enviadas com Sucesso!
            </h2>
            <p className="text-xs text-slate-400 max-w-[280px] mx-auto">
              A nota e o gabarito detalhado estarão disponíveis assim que o
              professor encerrar a aplicação desta prova.
            </p>
          </div>
        </div>

        {/* Informações de Envio */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-5 space-y-3.5 text-xs text-slate-400">
          <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider text-center">
            Dados do Registro
          </span>
          <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-900">
            <p>
              <strong>Comprovante:</strong>{" "}
              <span className="text-cyan-400 font-mono">{data.id}</span>
            </p>
            <p>
              <strong>Aluno:</strong> {data.student_name}
            </p>
            <p>
              <strong>Matrícula:</strong>{" "}
              <span className="font-mono">{data.student_identifier}</span>
            </p>
            <p>
              <strong>Data de Envio:</strong>{" "}
              {new Date(data.submitted_at).toLocaleString("pt-BR")}
            </p>
          </div>

          <button
            onClick={() => fetchResult(true)}
            disabled={refreshing}
            className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Verificando..." : "Verificar se Prova Foi Encerrada"}
          </button>
        </div>
      </div>
    );
  }

  // Se a prova estiver encerrada (Resultado detalhado disponível)
  const maxPoints = data.answers
    ? data.answers.reduce((acc, curr) => acc + curr.points, 0)
    : 0;
  const score = data.total_score || 0;
  const percentScore = maxPoints > 0 ? (score / maxPoints) * 100 : 0;
  const reportData = {
    id: data.id,
    student_name: data.student_name,
    student_identifier: data.student_identifier,
    submitted_at: data.submitted_at,
    exam_title: data.exam_title,
    total_score: score,
    answers: data.answers!,
  };

  return (
    <div className="max-w-xl mx-auto w-full space-y-6 no-print">
      {data.answers && (
        <SubmissionReportPrint
          data={reportData}
          maxPoints={maxPoints}
          percentScore={percentScore}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigateTo("/")}
          className="back-nav-btn"
          aria-label="Voltar para Home"
        >
          <ArrowLeft />
        </button>
        <div>
          <h1 className="text-xl font-black truncate">{data.exam_title}</h1>
          <p className="text-[10px] text-slate-500 uppercase mt-0.5">
            Prova Encerrada • Nota Divulgada
          </p>
        </div>
      </div>

      {/* Placar de Notas */}
      <div className="glass-panel border border-slate-800 rounded-2xl p-6 text-center relative overflow-hidden flex flex-col items-center">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>

        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-4 block">
          Resultado Obtido
        </span>

        <div className="relative flex items-center justify-center w-28 h-28 rounded-full border-4 border-slate-850 mb-3 bg-slate-950">
          {/* Circulo de nota */}
          <div className="text-center">
            <span className="text-3xl font-black text-slate-100">
              {score.toFixed(1)}
            </span>
            <span className="text-slate-500 text-xs block border-t border-slate-900 mt-0.5 pt-0.5">
              / {maxPoints.toFixed(1)}
            </span>
          </div>
        </div>

        <h3 className="font-extrabold text-lg text-slate-200">
          {data.student_name}
        </h3>
        <p className="text-xs text-slate-400">
          Matrícula:{" "}
          <span className="font-mono">{data.student_identifier}</span>
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-850 text-xs text-slate-400 font-semibold">
            <Award className="w-4 h-4 text-yellow-400" />
            <span>
              Aproveitamento de <strong>{percentScore.toFixed(0)}%</strong>
            </span>
          </div>
          <button
            onClick={() => exportSubmissionReportPdf(reportData)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-xs text-cyan-300 font-bold hover:bg-cyan-950 transition-colors cursor-pointer"
            title="Salvar ou imprimir relatório em PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Lista de Correção de Itens */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">
          Correção Questão por Questão
        </h3>

        <div className="space-y-3">
          {data.answers?.map((ans, idx) => (
            <div
              key={idx}
              className={`glass-panel border rounded-2xl p-4.5 flex items-start gap-4 transition-all ${
                ans.isCorrect
                  ? "border-emerald-500/20 bg-emerald-950/2"
                  : "border-rose-500/20 bg-rose-950/2"
              }`}
            >
              {/* Icone */}
              <div className="shrink-0 mt-0.5">
                {ans.isCorrect ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-400" />
                )}
              </div>

              {/* Detalhes */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">
                    Questão {ans.questionNumber}
                    {ans.subLabel && (
                      <span className="ml-2 text-cyan-400 uppercase">
                        {ans.subLabel}
                      </span>
                    )}
                  </span>
                  <span
                    className={`inline-flex items-center whitespace-nowrap tabular-nums text-xs font-bold px-2 py-0.5 rounded ${
                      ans.isCorrect
                        ? "bg-emerald-950 text-emerald-400"
                        : "bg-rose-950/50 text-rose-400"
                    }`}
                  >
                    {ans.scoreAwarded.toFixed(1)}
                    <span className="mx-0.5 opacity-70">/</span>
                    {ans.points.toFixed(1)} pts
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-900/80">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Sua Resposta
                    </span>
                    <span
                      className={`font-semibold ${ans.isCorrect ? "text-emerald-400" : "text-rose-450"}`}
                    >
                      {formatStudentAnswer(ans.rawAnswer) === "Em branco" ? (
                        <em className="text-slate-700">Em Branco</em>
                      ) : (
                        ans.rawAnswer
                      )}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-900/80 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">
                        Gabarito
                      </span>
                      <span className="font-bold text-slate-300 font-mono">
                        {formatAcceptedAnswer(ans)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botões */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={() => exportSubmissionReportPdf(reportData)}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-cyan-950/60 border border-cyan-800/40 hover:bg-cyan-950 rounded-xl text-xs font-bold text-cyan-300 transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Exportar PDF
        </button>
        <button
          onClick={() => navigateTo("/")}
          className="px-6 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-200 transition-colors cursor-pointer"
        >
          Voltar para Tela Inicial
        </button>
      </div>
    </div>
  );
}
