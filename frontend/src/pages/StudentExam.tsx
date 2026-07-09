import { useState, useEffect, useRef, useCallback } from "react";
import { navigateReplace, navigateTo } from "../App";
import {
  ClipboardCheck,
  ShieldAlert,
  Award,
  FileQuestion,
  ArrowLeft,
  Save,
  RotateCcw,
} from "lucide-react";
import { useModal } from "../components/ModalProvider";
import {
  loadDraft,
  saveDraftIfChanged,
  clearDraft,
  mergeDraftWithExamItems,
  buildDraftFromForm,
  formatDraftSavedAt,
} from "../utils/examDraft";
import { fetchJson, formatFetchErrorMessage } from "../utils/fetchJson";
import { clearSubmissionReceiptsForExam } from "../utils/submissionReceipt";
import QrSharePanel from "../components/QrSharePanel";
import {
  buildSubmissionUrl,
  formatWhatsAppSubmissionMessage,
} from "../utils/examCredentials";

interface ExamItem {
  id: string;
  questionNumber: number;
  subLabel: string | null;
  points: number;
  answerType: "choice" | "true_false" | "short_text" | "numerical";
  position: number;
}

interface ExamPublicData {
  id: string;
  title: string;
  status: "open" | "closed";
  items: ExamItem[];
}

interface SubmissionResponse {
  submission_id?: string;
  message?: string;
  already_submitted?: boolean;
}

export default function StudentExam({ publicCode }: { publicCode: string }) {
  const { alert, confirm } = useModal();
  const [exam, setExam] = useState<ExamPublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [studentName, setStudentName] = useState("");
  const [studentIdentifier, setStudentIdentifier] = useState("");
  const [answers, setAnswers] = useState<{ [itemId: string]: string }>({});

  // In-memory only for this session's successful submit (never persisted).
  const [receiptId, setReceiptId] = useState("");

  // Draft persistence
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const formHydratedRef = useRef(false);
  const draftWritesEnabledRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitInFlightRef = useRef(false);

  const cancelPendingDraftSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  const completeSubmission = useCallback(
    (submissionId: string) => {
      // Stop any in-flight draft debounce from resurrecting the form after submit.
      draftWritesEnabledRef.current = false;
      formHydratedRef.current = false;
      cancelPendingDraftSave();
      // PII: never persist matrícula/comprovante — wipe draft + any legacy receipts.
      clearDraft(publicCode);
      clearSubmissionReceiptsForExam(publicCode);
      setReceiptId(submissionId);
      setSubmitError("");
      navigateReplace(`/submissao/${submissionId}`);
    },
    [cancelPendingDraftSave, publicCode],
  );

  const persistDraft = useCallback(
    (
      name: string,
      identifier: string,
      currentAnswers: Record<string, string>,
    ) => {
      if (!exam || !draftWritesEnabledRef.current) return;

      // Local-only (localStorage). Never touches the network — safe on poor 4G.
      const itemIds = exam.items.map((item) => item.id);
      const draft = buildDraftFromForm(
        publicCode,
        name,
        identifier,
        currentAnswers,
        itemIds,
      );
      const saved = saveDraftIfChanged(draft);
      if (saved) setDraftSavedAt(saved.savedAt);
      else if (
        !name.trim() &&
        !identifier.trim() &&
        !Object.values(currentAnswers).some((v) => v.trim())
      ) {
        setDraftSavedAt(null);
      }
    },
    [exam, publicCode],
  );

  const startFreshAsAnotherStudent = useCallback(() => {
    if (!exam) return;

    cancelPendingDraftSave();
    clearDraft(publicCode);
    setDraftRestored(false);
    setDraftSavedAt(null);
    setStudentName("");
    setStudentIdentifier("");
    const emptyAnswers: { [key: string]: string } = {};
    exam.items.forEach((item) => {
      emptyAnswers[item.id] = "";
    });
    setAnswers(emptyAnswers);
    draftWritesEnabledRef.current = true;
    formHydratedRef.current = true;
  }, [cancelPendingDraftSave, exam, publicCode]);

  const fetchExamData = async () => {
    draftWritesEnabledRef.current = false;
    formHydratedRef.current = false;

    try {
      const { ok, data } = await fetchJson<
        ExamPublicData & { message?: string }
      >(`/api/exams/${publicCode}`);
      if (!ok) {
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
      draftWritesEnabledRef.current = true;
    } catch (err: unknown) {
      setLoadError(
        formatFetchErrorMessage(err, "Erro de conexão com o servidor."),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    formHydratedRef.current = false;
    draftWritesEnabledRef.current = false;
    setDraftRestored(false);
    setDraftSavedAt(null);
    setLoadError("");
    setSubmitError("");
    fetchExamData();
  }, [publicCode]);

  useEffect(() => {
    if (!formHydratedRef.current || !exam || receiptId) return;
    if (!draftWritesEnabledRef.current) return;

    cancelPendingDraftSave();

    // Debounce local writes (~1.2s) so rapid typing on weak phones does not
    // thrash localStorage. Network is never used here.
    saveTimeoutRef.current = setTimeout(() => {
      persistDraft(studentName, studentIdentifier, answers);
    }, 1200);

    return () => {
      cancelPendingDraftSave();
    };
  }, [
    publicCode,
    studentName,
    studentIdentifier,
    answers,
    exam,
    receiptId,
    persistDraft,
    cancelPendingDraftSave,
  ]);

  useEffect(() => {
    const flushDraft = () => {
      if (!formHydratedRef.current || !exam || receiptId) return;
      if (!draftWritesEnabledRef.current) return;
      cancelPendingDraftSave();
      persistDraft(studentName, studentIdentifier, answers);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushDraft();
    };

    // Flush immediately when the tab backgrounds / app is suspended — critical
    // on mobile when the OS kills the page mid-exam.
    window.addEventListener("pagehide", flushDraft);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flushDraft);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [
    studentName,
    studentIdentifier,
    answers,
    exam,
    receiptId,
    persistDraft,
    cancelPendingDraftSave,
  ]);

  const handleUpdateAnswer = (itemId: string, val: string) => {
    setAnswers({
      ...answers,
      [itemId]: val,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitInFlightRef.current || submitting) return;

    setSubmitError("");

    if (!studentName.trim() || !studentIdentifier.trim()) {
      setSubmitError("Nome e Matrícula são obrigatórios para a submissão.");
      return;
    }

    submitInFlightRef.current = true;
    setSubmitting(true);

    try {
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
        if (!hasConfirmed) return;
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
        if (!hasConfirmed) return;
      }

      const payload = {
        student_name: studentName.trim(),
        student_identifier: studentIdentifier.trim(),
        answers,
      };

      const { ok, status, data } = await fetchJson<SubmissionResponse>(
        `/api/exams/${publicCode}/submissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (status === 409 || data.already_submitted) {
        await alert(
          data.message ||
            "Você já enviou as respostas para esta prova. O reenvio está bloqueado. Use o código do comprovante na Home para consultar o resultado.",
          {
            title: "Envio já registrado",
            severity: "warning",
            confirmText: "Entendi",
          },
        );
        return;
      }

      if (!ok) {
        throw new Error(data.message || "Erro ao submeter respostas.");
      }

      if (!data.submission_id) {
        throw new Error("Resposta inválida do servidor ao registrar envio.");
      }

      completeSubmission(data.submission_id);
    } catch (err: unknown) {
      setSubmitError(
        formatFetchErrorMessage(err, "Houve um erro de rede ao enviar."),
      );
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
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

  if (loadError && !exam) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="w-14 h-14 bg-rose-950/80 border border-rose-900/30 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold">Não foi possível acessar a prova</h2>
        <p className="text-sm text-slate-400">{loadError}</p>
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

  // Tela de Sucesso (fallback caso a navegação ainda não tenha ocorrido)
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

        <div className="glass-panel border border-slate-800 rounded-2xl p-5 space-y-4 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
            Comprovante de Submissão
          </span>

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
            Guarde o código do comprovante — ele não fica salvo neste aparelho
            (privacidade em dispositivos compartilhados). Quando o professor
            encerrar a prova, consulte sua nota na Home com esse código.
          </p>
        </div>

        <QrSharePanel
          title="Guarde seu Comprovante"
          description="Salve ou compartilhe o QR code abaixo para não perder o acesso ao seu resultado."
          qrValue={buildSubmissionUrl(receiptId)}
          codeLabel="Comprovante"
          codeValue={receiptId}
          linkLabel="Link de Consulta"
          linkValue={buildSubmissionUrl(receiptId)}
          downloadFilename={`comprovante-${receiptId.replace(/[^a-zA-Z0-9-]/g, "")}-qr.png`}
          whatsappMessage={formatWhatsAppSubmissionMessage({
            examTitle: exam.title,
            submissionId: receiptId,
          })}
        />

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
          <p className="text-[10px] text-slate-500 uppercase mt-0.5">
            Prova Aberta • {exam?.items.length} itens • {maxPoints.toFixed(1)}{" "}
            pontos max
          </p>
        </div>
      </div>

      {draftRestored && draftSavedAt && (
        <div className="flex items-start gap-3 bg-cyan-950/30 border border-cyan-800/40 rounded-2xl p-4 text-xs text-cyan-200/90">
          <RotateCcw className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
          <div className="flex-1 space-y-2">
            <p>
              Continuamos de onde você parou. Rascunho restaurado{" "}
              {formatDraftSavedAt(draftSavedAt)}.
            </p>
            <button
              type="button"
              onClick={startFreshAsAnotherStudent}
              className="text-[11px] font-semibold text-cyan-300/90 underline underline-offset-2 hover:text-cyan-200 cursor-pointer"
            >
              Limpar rascunho e começar do zero
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
                disabled={submitting}
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
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setStudentIdentifier(e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-cyan-500 font-mono"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed">
            Rascunho salvo só neste aparelho (sem usar sua internet). O envio ao
            servidor acontece apenas quando você tocar em Finalizar.
          </p>
        </div>

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
                    <span className="ml-2 text-cyan-400 uppercase">
                      {item.subLabel}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-md">
                  {item.points.toFixed(1)} pts
                </span>
              </div>

              <div className="pt-1.5">
                {item.answerType === "choice" && (
                  <div className="flex gap-2 justify-between">
                    {["A", "B", "C", "D", "E"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        disabled={submitting}
                        onClick={() => handleUpdateAnswer(item.id, option)}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
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

                {item.answerType === "true_false" && (
                  <div className="flex gap-3">
                    {["V", "F"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        disabled={submitting}
                        onClick={() =>
                          handleUpdateAnswer(
                            item.id,
                            option === "V" ? "verdadeiro" : "falso",
                          )
                        }
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
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

                {item.answerType === "short_text" && (
                  <input
                    type="text"
                    placeholder="Digite sua resposta..."
                    value={answers[item.id] || ""}
                    disabled={submitting}
                    onChange={(e) =>
                      handleUpdateAnswer(item.id, e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-cyan-500 font-semibold disabled:opacity-60"
                  />
                )}

                {item.answerType === "numerical" && (
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 25,75 ou 30 m/s"
                    value={answers[item.id] || ""}
                    disabled={submitting}
                    onChange={(e) =>
                      handleUpdateAnswer(item.id, e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-cyan-500 font-semibold disabled:opacity-60"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

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

        {submitError && (
          <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {draftSavedAt && (
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
            <Save className="w-3 h-3 text-emerald-500/80" />
            <span>
              Dados salvos neste aparelho • {formatDraftSavedAt(draftSavedAt)}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-650 text-slate-950 font-bold rounded-2xl text-sm transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {submitting ? "Enviando Gabarito..." : "Finalizar e Enviar Respostas"}
        </button>
      </form>
    </div>
  );
}
