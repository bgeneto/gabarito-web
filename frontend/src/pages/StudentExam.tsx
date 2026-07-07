import { useState, useEffect, useRef, useCallback } from "react";
import { navigateTo } from "../App";
import {
  ClipboardCheck,
  ShieldAlert,
  Award,
  FileQuestion,
  ArrowLeft,
  Copy,
  Check,
  Save,
  RotateCcw,
} from "lucide-react";
import { useModal } from "../components/ModalProvider";
import {
  loadDraft,
  saveDraft,
  clearDraft,
  mergeDraftWithExamItems,
  buildDraftFromForm,
  formatDraftSavedAt,
} from "../utils/examDraft";

interface ExamItem {
  id: string;
  questionNumber: number;
  subLabel: string | null;
  points: number;
  answerType: "choice" | "true_false" | "text_exact";
  position: number;
}

interface ExamPublicData {
  id: string;
  title: string;
  status: "open" | "closed";
  items: ExamItem[];
}

export default function StudentExam({ publicCode }: { publicCode: string }) {
  const { confirm } = useModal();
  const [exam, setExam] = useState<ExamPublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [studentName, setStudentName] = useState("");
  const [studentIdentifier, setStudentIdentifier] = useState("");
  const [answers, setAnswers] = useState<{ [itemId: string]: string }>({});

  // Receipt State
  const [receiptId, setReceiptId] = useState("");
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Draft persistence
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const formHydratedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistDraft = useCallback(
    (
      name: string,
      identifier: string,
      currentAnswers: Record<string, string>,
    ) => {
      if (!exam) return;

      const itemIds = exam.items.map((item) => item.id);
      const draft = buildDraftFromForm(
        publicCode,
        name,
        identifier,
        currentAnswers,
        itemIds,
      );
      saveDraft(draft);
      setDraftSavedAt(draft.savedAt);
    },
    [exam, publicCode],
  );

  const fetchExamData = async () => {
    try {
      const response = await fetch(`/api/exams/${publicCode}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erro ao buscar dados da prova.");
      }
      setExam(data);

      const draft = loadDraft(publicCode);
      if (draft) {
        const merged = mergeDraftWithExamItems(draft, data.items);
        setStudentName(merged.studentName);
        setStudentIdentifier(merged.studentIdentifier);
        setAnswers(merged.answers);
        setDraftRestored(merged.hasRestorableContent);
        setDraftSavedAt(draft.savedAt);
      } else {
        const initialAnswers: { [key: string]: string } = {};
        data.items.forEach((item: ExamItem) => {
          initialAnswers[item.id] = "";
        });
        setAnswers(initialAnswers);
        setDraftRestored(false);
        setDraftSavedAt(null);
      }

      formHydratedRef.current = true;
    } catch (err: any) {
      setError(err.message || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    formHydratedRef.current = false;
    setDraftRestored(false);
    setDraftSavedAt(null);
    fetchExamData();
  }, [publicCode]);

  useEffect(() => {
    if (!formHydratedRef.current || !exam || receiptId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      persistDraft(studentName, studentIdentifier, answers);
    }, 400);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    publicCode,
    studentName,
    studentIdentifier,
    answers,
    exam,
    receiptId,
    persistDraft,
  ]);

  useEffect(() => {
    const flushDraft = () => {
      if (!formHydratedRef.current || !exam || receiptId) return;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      persistDraft(studentName, studentIdentifier, answers);
    };

    window.addEventListener("pagehide", flushDraft);
    return () => window.removeEventListener("pagehide", flushDraft);
  }, [studentName, studentIdentifier, answers, exam, receiptId, persistDraft]);

  const handleUpdateAnswer = (itemId: string, val: string) => {
    setAnswers({
      ...answers,
      [itemId]: val,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!studentName.trim() || !studentIdentifier.trim()) {
      setError("Nome e Matrícula são obrigatórios para a submissão.");
      return;
    }

    // Verificar se todas as questões foram respondidas
    const unansweredCount = exam?.items.filter(
      (item) => !answers[item.id] || !answers[item.id].trim(),
    ).length;
    if (unansweredCount && unansweredCount > 0) {
      const hasConfirmed = await confirm(
        `Você deixou ${unansweredCount} questão(ões) em branco. Deseja enviar assim mesmo?`,
        {
          title: "Questões em Branco",
          severity: "warning",
          confirmText: "Enviar assim mesmo",
          cancelText: "Voltar e responder",
        },
      );
      if (!hasConfirmed) {
        return;
      }
    } else {
      const hasConfirmed = await confirm(
        "Tem certeza que deseja enviar suas respostas? O reenvio está bloqueado e você não poderá fazer edições.",
        {
          title: "Enviar Respostas",
          severity: "info",
          confirmText: "Sim, enviar",
          cancelText: "Cancelar",
        },
      );
      if (!hasConfirmed) {
        return;
      }
    }

    setSubmitting(true);
    const payload = {
      student_name: studentName.trim(),
      student_identifier: studentIdentifier.trim(),
      answers,
    };

    try {
      const response = await fetch(`/api/exams/${publicCode}/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erro ao submeter respostas.");
      }

      clearDraft(publicCode);
      setReceiptId(data.submission_id);
    } catch (err: any) {
      setError(err.message || "Houve um erro de rede ao enviar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyReceipt = () => {
    navigator.clipboard.writeText(receiptId);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 text-sm">
          Carregando estrutura da prova...
        </p>
      </div>
    );
  }

  if (error && !receiptId) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="w-14 h-14 bg-rose-950/80 border border-rose-900/30 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold">Não foi possível acessar a prova</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          onClick={() => navigateTo("/")}
          className="px-5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-850 cursor-pointer"
        >
          Voltar para Home
        </button>
      </div>
    );
  }

  if (exam && exam.status === "closed" && !receiptId) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="w-14 h-14 bg-rose-950/80 border border-rose-900/30 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold">Prova Encerrada</h2>
        <p className="text-sm text-slate-400">
          Esta prova já foi fechada pelo professor e não está mais aceitando
          submissões.
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

  // Tela de Sucesso
  if (receiptId && exam) {
    return (
      <div className="max-w-md mx-auto w-full space-y-6 animate-fade-in py-6">
        <div className="glass-panel border border-emerald-500/20 bg-emerald-950/5 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-emerald-950/80 border border-emerald-800/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-emerald-400">
            Respostas Enviadas!
          </h2>
          <p className="text-xs text-slate-400 mt-1.5">
            Suas respostas foram gravadas e autocorrigidas no servidor.
          </p>
        </div>

        {/* Comprovante */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-5 space-y-4 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
            Comprovante de Submissão
          </span>

          <div className="bg-slate-900 border border-slate-850 rounded-xl p-3.5 flex items-center justify-between">
            <span className="font-mono text-xs text-cyan-400 block truncate font-bold mr-2">
              {receiptId}
            </span>
            <button
              onClick={handleCopyReceipt}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              title="Copiar Comprovante"
            >
              {copiedReceipt ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-left text-xs text-slate-400 space-y-1.5">
            <p>
              <strong>Estudante:</strong> {studentName}
            </p>
            <p>
              <strong>Matrícula:</strong> {studentIdentifier}
            </p>
            <p>
              <strong>Prova:</strong> {exam.title}
            </p>
          </div>

          <p className="text-[10px] text-slate-500 italic">
            Guarde o código do comprovante. Quando o professor encerrar a prova,
            você poderá pesquisar sua nota final por ele.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigateTo(`/submissao/${receiptId}`)}
            className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Acompanhar Resultados
          </button>
          <button
            onClick={() => navigateTo("/")}
            className="flex-1 py-3 bg-slate-900 border border-slate-850 hover:bg-slate-850 rounded-xl text-xs text-slate-300 transition-colors cursor-pointer"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  const maxPoints = exam
    ? exam.items.reduce((acc, curr) => acc + curr.points, 0)
    : 0;

  return (
    <div className="max-w-xl mx-auto w-full space-y-6">
      {/* Header da Prova */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigateTo("/")}
          className="back-nav-btn"
          aria-label="Voltar para Home"
        >
          <ArrowLeft />
        </button>
        <div className="truncate">
          <h1 className="text-xl font-black truncate">{exam?.title}</h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">
            Prova Aberta • {exam?.items.length} itens • {maxPoints.toFixed(1)}{" "}
            pontos max
          </p>
        </div>
      </div>

      {draftRestored && draftSavedAt && (
        <div className="flex items-start gap-3 bg-cyan-950/30 border border-cyan-800/40 rounded-2xl p-4 text-xs text-cyan-200/90">
          <RotateCcw className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
          <p>
            Continuamos de onde você parou. Rascunho restaurado{" "}
            {formatDraftSavedAt(draftSavedAt)}.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação do Aluno */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">
            Identificação
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="studentName"
                className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase"
              >
                Seu Nome Completo
              </label>
              <input
                id="studentName"
                type="text"
                placeholder="Ex: João da Silva"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="studentIdentifier"
                className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase"
              >
                Sua Matrícula
              </label>
              <input
                id="studentIdentifier"
                type="text"
                placeholder="Ex: 202300412"
                value={studentIdentifier}
                onChange={(e) => setStudentIdentifier(e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed">
            Suas respostas são salvas automaticamente neste aparelho enquanto
            você preenche.
          </p>
        </div>

        {/* Questões */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">
            Registrar Respostas
          </h3>

          {exam?.items.map((item) => (
            <div
              key={item.id}
              className="glass-panel border border-slate-800 rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  <FileQuestion className="w-4 h-4 text-cyan-400" />
                  Questão {item.questionNumber}
                  {item.subLabel && (
                    <span className="text-cyan-400 uppercase">
                      {item.subLabel}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-md">
                  {item.points.toFixed(1)} pts
                </span>
              </div>

              {/* Input de Resposta baseado no tipo */}
              <div className="pt-1.5">
                {/* Múltipla Escolha */}
                {item.answerType === "choice" && (
                  <div className="flex gap-2 justify-between">
                    {["A", "B", "C", "D", "E"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleUpdateAnswer(item.id, option)}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                          answers[item.id] === option
                            ? "bg-cyan-500 text-slate-950 border-cyan-450 scale-102 shadow-md shadow-cyan-500/10"
                            : "bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-800"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {/* Verdadeiro ou Falso */}
                {item.answerType === "true_false" && (
                  <div className="flex gap-3">
                    {["V", "F"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          handleUpdateAnswer(
                            item.id,
                            option === "V" ? "verdadeiro" : "falso",
                          )
                        }
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                          (option === "V" &&
                            answers[item.id] === "verdadeiro") ||
                          (option === "F" && answers[item.id] === "falso")
                            ? "bg-blue-500 text-white border-blue-450 scale-102"
                            : "bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-800"
                        }`}
                      >
                        {option === "V" ? "Verd. (V)" : "Falso (F)"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Texto Exato */}
                {item.answerType === "text_exact" && (
                  <input
                    type="text"
                    placeholder="Digite sua resposta..."
                    value={answers[item.id] || ""}
                    onChange={(e) =>
                      handleUpdateAnswer(item.id, e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-cyan-500 font-semibold"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Painel de Confirmação */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 flex gap-3 text-xs text-slate-400">
          <Award className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-200 block mb-0.5">
              Envio Único e Definitivo
            </span>
            Ao clicar em enviar, suas respostas serão registradas e não poderão
            ser editadas. Certifique-se de preencher todos os itens.
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {draftSavedAt && (
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
            <Save className="w-3 h-3 text-emerald-500/80" />
            <span>
              Rascunho salvo no dispositivo • {formatDraftSavedAt(draftSavedAt)}
            </span>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-650 text-slate-950 font-bold rounded-2xl text-sm transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 cursor-pointer"
        >
          {submitting ? "Enviando Gabarito..." : "Finalizar e Enviar Respostas"}
        </button>
      </form>
    </div>
  );
}
