import { useEffect, useRef, useState } from "react";
import { navigateTo } from "../App";
import { QRCodeSVG } from "qrcode.react";
import {
  Plus,
  Trash2,
  ShieldAlert,
  Copy,
  Check,
  QrCode,
  ClipboardList,
  ArrowLeft,
  Upload,
  Download,
  Lock,
  Eye,
  EyeOff,
  Monitor,
  Printer,
  MessageCircle,
  X,
} from "lucide-react";
import { useModal } from "../components/ModalProvider";
import {
  buildAdminDeepLink,
  buildPublicUrl,
  downloadCredentialsTxt,
  downloadQrCodePng,
  formatCredentialsText,
  formatWhatsAppStudentMessage,
  openWhatsAppShare,
} from "../utils/examCredentials";
import { setAdminToken } from "../utils/adminSession";

interface ItemInput {
  id: string;
  questionNumber: number;
  subLabel: string;
  points: number;
  answerType: "choice" | "true_false" | "text_exact";
  accepted: string[];
  tempVariant: string; // utilitário para input de texto exato
}

interface CreationResult {
  id: string;
  public_code: string;
  admin_token: string;
}

export default function TeacherCreate() {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<ItemInput[]>([
    {
      id: "1",
      questionNumber: 1,
      subLabel: "",
      points: 1.0,
      answerType: "choice",
      accepted: ["A"],
      tempVariant: "",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CreationResult | null>(null);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showAdminCredentials, setShowAdminCredentials] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showSaveCredentialsModal, setShowSaveCredentialsModal] =
    useState(false);
  const [credentialsSavedAcknowledged, setCredentialsSavedAcknowledged] =
    useState(false);
  const [autoDownloadStatus, setAutoDownloadStatus] = useState<
    "success" | "blocked" | null
  >(null);
  const [autoCopyStatus, setAutoCopyStatus] = useState<
    "success" | "failed" | null
  >(null);
  const qrCodeRef = useRef<SVGSVGElement>(null);
  const autoSaveRanForRef = useRef<string | null>(null);

  const { alert, confirm } = useModal();

  useEffect(() => {
    if (!presentationMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPresentationMode(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [presentationMode]);

  useEffect(() => {
    if (!result) {
      autoSaveRanForRef.current = null;
      return;
    }
    if (autoSaveRanForRef.current === result.id) return;
    autoSaveRanForRef.current = result.id;

    setShowSaveCredentialsModal(true);
    setCredentialsSavedAcknowledged(false);
    setAutoDownloadStatus(null);
    setAutoCopyStatus(null);

    const credentials = {
      title: title.trim() || "Prova",
      publicCode: result.public_code,
      adminToken: result.admin_token,
    };

    navigator.clipboard
      .writeText(formatCredentialsText(credentials))
      .then(() => setAutoCopyStatus("success"))
      .catch(() => setAutoCopyStatus("failed"));

    try {
      downloadCredentialsTxt(credentials);
      setAutoDownloadStatus("success");
    } catch {
      setAutoDownloadStatus("blocked");
    }
  }, [result, title]);

  const validateImportedData = (data: any): string | null => {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return "O formato do arquivo deve ser um objeto JSON contendo o título e as questões.";
    }
    if (typeof data.title !== "string" || !data.title.trim()) {
      return "O título da prova é inválido ou está vazio.";
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
      return "A lista de questões ('items') deve conter pelo menos uma questão.";
    }

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const itemIndex = i + 1;
      if (typeof item !== "object" || item === null) {
        return `A questão na posição ${itemIndex} é inválida.`;
      }
      if (typeof item.questionNumber !== "number" || item.questionNumber < 1) {
        return `A questão na posição ${itemIndex} precisa ter um 'questionNumber' numérico válido (maior ou igual a 1).`;
      }
      if (typeof item.points !== "number" || item.points <= 0) {
        return `A questão ${item.questionNumber} precisa ter uma pontuação ('points') maior que zero.`;
      }
      if (!["choice", "true_false", "text_exact"].includes(item.answerType)) {
        return `A questão ${item.questionNumber} possui um tipo de resposta ('answerType') inválido. Deve ser 'choice', 'true_false' ou 'text_exact'.`;
      }
      if (!Array.isArray(item.accepted) || item.accepted.length === 0) {
        return `A questão ${item.questionNumber} precisa de pelo menos uma resposta correta no array 'accepted'.`;
      }
    }
    return null;
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== "string") {
          await alert("Não foi possível ler o arquivo.");
          return;
        }

        const data = JSON.parse(text);
        const validationError = validateImportedData(data);
        if (validationError) {
          await alert(validationError, {
            title: "Erro na Importação",
            severity: "danger",
          });
          return;
        }

        const confirmImport = await confirm(
          "Deseja importar as questões deste arquivo? Isso substituirá as questões atuais da tela.",
          {
            title: "Confirmar Importação",
            confirmText: "Sim, Importar",
            cancelText: "Cancelar",
            severity: "warning",
          },
        );

        if (!confirmImport) {
          e.target.value = "";
          return;
        }

        setTitle(data.title);
        const importedItems = data.items.map((item: any) => ({
          id: Math.random().toString(36).substring(2, 9),
          questionNumber: Number(item.questionNumber) || 1,
          subLabel: String(item.subLabel || "")
            .toLowerCase()
            .replace(/[^a-z]/g, ""),
          points: Number(item.points) || 1.0,
          answerType: item.answerType,
          accepted: Array.isArray(item.accepted)
            ? item.accepted.map(String)
            : ["A"],
          tempVariant: "",
        }));
        setItems(importedItems);
        e.target.value = "";
      } catch (err) {
        await alert(
          "Ocorreu um erro ao decodificar o JSON. Verifique se o arquivo está correto.",
          {
            title: "Erro de Formatação",
            severity: "danger",
          },
        );
      }
    };
    reader.readAsText(file);
  };

  const handleExportFile = () => {
    try {
      const exportData = {
        title: title.trim(),
        items: items.map((item) => ({
          questionNumber: item.questionNumber,
          subLabel: item.subLabel.trim() || "",
          points: item.points,
          answerType: item.answerType,
          accepted: item.accepted,
        })),
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const cleanTitle = title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      link.href = url;
      link.download = `gabarito-${cleanTitle || "prova"}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erro ao exportar gabarito.");
    }
  };

  const handleAddItem = () => {
    const nextNum =
      items.length > 0
        ? Math.max(...items.map((i) => i.questionNumber)) + 1
        : 1;
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(2, 9),
        questionNumber: nextNum,
        subLabel: "",
        points: 1.0,
        answerType: "choice",
        accepted: ["A"],
        tempVariant: "",
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, fields: Partial<ItemInput>) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...fields };

        // Se mudou o tipo, reinicia os valores aceitos padrões
        if (fields.answerType) {
          if (fields.answerType === "choice") {
            updated.accepted = ["A"];
          } else if (fields.answerType === "true_false") {
            updated.accepted = ["V"];
          } else {
            updated.accepted = [];
          }
        }
        return updated;
      }),
    );
  };

  const handleAddTextVariant = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item || !item.tempVariant.trim()) return;

    const cleanVariant = item.tempVariant.trim();
    if (item.accepted.includes(cleanVariant)) {
      handleUpdateItem(id, { tempVariant: "" });
      return;
    }

    handleUpdateItem(id, {
      accepted: [...item.accepted, cleanVariant],
      tempVariant: "",
    });
  };

  const handleRemoveTextVariant = (id: string, indexToRemove: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    handleUpdateItem(id, {
      accepted: item.accepted.filter((_, idx) => idx !== indexToRemove),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!title.trim()) {
      setError("Por favor, informe o título da prova.");
      setLoading(false);
      return;
    }

    // Validações básicas dos itens
    for (const item of items) {
      if (item.accepted.length === 0) {
        setError(
          `A questão ${item.questionNumber}${item.subLabel ? item.subLabel : ""} precisa de pelo menos uma resposta correta.`,
        );
        setLoading(false);
        return;
      }
      if (item.points <= 0) {
        setError(
          `A pontuação da questão ${item.questionNumber}${item.subLabel ? item.subLabel : ""} deve ser maior que zero.`,
        );
        setLoading(false);
        return;
      }
    }

    // Validação de questões repetidas/subitens
    const questionCounts: Record<number, number> = {};
    for (const item of items) {
      const qNum = item.questionNumber;
      questionCounts[qNum] = (questionCounts[qNum] || 0) + 1;
    }

    const seenKeys = new Set<string>();
    for (const item of items) {
      const qNum = item.questionNumber;
      const sub = item.subLabel.trim().toLowerCase();
      const key = `${qNum}-${sub}`;

      if (questionCounts[qNum] > 1 && !sub) {
        setError(
          `A questão ${qNum} aparece mais de uma vez e precisa ter subitens preenchidos (ex: A, B, C).`,
        );
        setLoading(false);
        return;
      }

      if (seenKeys.has(key)) {
        setError(
          sub
            ? `A questão ${qNum} com subitem "${sub.toUpperCase()}" está duplicada.`
            : `A questão ${qNum} está duplicada (sem subitem).`,
        );
        setLoading(false);
        return;
      }
      seenKeys.add(key);
    }

    const payload = {
      title: title.trim(),
      items: items.map((item) => ({
        question_number: item.questionNumber,
        sub_label: item.subLabel.trim() || null,
        points: item.points,
        answer_type: item.answerType,
        answer_config: {
          accepted: item.accepted,
        },
      })),
    };

    try {
      const response = await fetch("/api/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erro ao criar gabarito.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Houve um problema de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "public" | "admin" | "all") => {
    navigator.clipboard.writeText(text);
    if (type === "public") {
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2000);
    } else if (type === "admin") {
      setCopiedAdmin(true);
      setTimeout(() => setCopiedAdmin(false), 2000);
    } else {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const getCredentialsInput = (creationResult: CreationResult) => ({
    title: title.trim() || "Prova",
    publicCode: creationResult.public_code,
    adminToken: creationResult.admin_token,
  });

  const handleCopyAllCredentials = (creationResult: CreationResult) => {
    copyToClipboard(
      formatCredentialsText(getCredentialsInput(creationResult)),
      "all",
    );
  };

  const handleDownloadCredentialsTxt = (creationResult: CreationResult) => {
    downloadCredentialsTxt(getCredentialsInput(creationResult));
  };

  const handleDownloadQrPng = async (creationResult: CreationResult) => {
    const svg = qrCodeRef.current;
    if (!svg) {
      await alert("Não foi possível gerar a imagem do QR code.");
      return;
    }
    try {
      const safeCode = creationResult.public_code.replace(/[^a-zA-Z0-9-]/g, "");
      await downloadQrCodePng(svg, `gabarito-${safeCode}-qr.png`);
    } catch {
      await alert("Erro ao baixar o QR code.");
    }
  };

  const handleShareWhatsApp = (creationResult: CreationResult) => {
    openWhatsAppShare(
      formatWhatsAppStudentMessage({
        title: title.trim() || "Prova",
        publicCode: creationResult.public_code,
      }),
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const requireCredentialsSaved = () => {
    if (credentialsSavedAcknowledged) return true;
    setShowSaveCredentialsModal(true);
    return false;
  };

  const handleOpenPresentation = () => {
    if (!requireCredentialsSaved()) return;
    setPresentationMode(true);
  };

  const handleRevealAdmin = () => {
    if (!requireCredentialsSaved()) return;
    setShowAdminCredentials(true);
  };

  const handleConfirmCredentialsSaved = () => {
    if (!credentialsSavedAcknowledged) return;
    setShowSaveCredentialsModal(false);
  };

  const credentialsFilename = result
    ? `gabarito-${result.public_code.replace(/[^a-zA-Z0-9-]/g, "")}-credenciais.txt`
    : "";

  const totalPoints = items.reduce(
    (acc, curr) => acc + Number(curr.points || 0),
    0,
  );

  // Exibição do Painel de Sucesso após a criação
  if (result) {
    const publicUrl = buildPublicUrl(result.public_code);
    const adminDeepLink = buildAdminDeepLink(result.admin_token);
    const examTitle = title.trim() || "Prova";

    return (
      <>
        <div
          id="exam-credentials-print"
          className="hidden print:block print-credentials"
        >
          <div className="print-page">
            <h1>GabaritoWEB — Acesso dos Alunos</h1>
            <p className="print-subtitle">{examTitle}</p>
            <div className="print-qr">
              <QRCodeSVG value={publicUrl} size={200} />
            </div>
            <p>
              <strong>Código da prova:</strong> {result.public_code}
            </p>
            <p className="print-break-word">
              <strong>Link de resposta:</strong> {publicUrl}
            </p>
          </div>
          <div className="print-page print-page-break">
            <h1>GabaritoWEB — Acesso do Professor</h1>
            <p className="print-subtitle">{examTitle}</p>
            <p className="print-warning">
              ATENÇÃO: Guarde este documento em local seguro. Por motivos de
              segurança, o link administrativo não poderá ser consultado
              novamente. Não divulgue para os alunos.
            </p>
            <p>
              <strong>Token administrativo:</strong> {result.admin_token}
            </p>
            <p className="print-break-word">
              <strong>Link do painel admin:</strong> {adminDeepLink}
            </p>
          </div>
        </div>

        {showSaveCredentialsModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 no-print">
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm" />
            <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl relative z-10 overflow-hidden animate-modal-in border border-amber-500/20">
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none bg-amber-500" />

              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 bg-amber-950/85 border border-amber-800/40 rounded-2xl flex items-center justify-center text-amber-400 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-100">
                    Salve suas credenciais agora
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    O link administrativo{" "}
                    <strong className="text-amber-300">
                      não poderá ser recuperado depois
                    </strong>
                    . Guarde o arquivo em local seguro antes de exibir a prova
                    para a turma.
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {autoDownloadStatus === "success" && (
                  <div className="flex items-start gap-2 text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-900/40 rounded-xl p-3">
                    <Check className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Download iniciado:{" "}
                      <span className="font-mono">{credentialsFilename}</span>.
                      Verifique sua pasta de Downloads.
                    </span>
                  </div>
                )}
                {autoDownloadStatus === "blocked" && (
                  <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-900/40 rounded-xl p-3">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      O download automático foi bloqueado pelo navegador. Clique
                      no botão abaixo para baixar manualmente.
                    </span>
                  </div>
                )}
                {autoCopyStatus === "success" && (
                  <div className="flex items-start gap-2 text-xs text-cyan-300 bg-cyan-950/30 border border-cyan-900/40 rounded-xl p-3">
                    <Check className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Credenciais copiadas para a área de transferência. Você
                      pode colar em um bloco de notas ou e-mail.
                    </span>
                  </div>
                )}
                {autoCopyStatus === "failed" && (
                  <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                    <Copy className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Não foi possível copiar automaticamente. Use os botões
                      abaixo para salvar manualmente.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 mb-5">
                <button
                  onClick={() => handleDownloadCredentialsTxt(result)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Baixar credenciais (.txt)
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir / PDF
                  </button>
                  <button
                    onClick={() => handleCopyAllCredentials(result)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedAll ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Copiar tudo
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={credentialsSavedAcknowledged}
                  onChange={(e) =>
                    setCredentialsSavedAcknowledged(e.target.checked)
                  }
                  className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500/30 cursor-pointer"
                />
                <span className="text-sm text-slate-300 leading-relaxed">
                  Já salvei as credenciais em local seguro (arquivo, e-mail ou
                  bloco de notas).
                </span>
              </label>

              <button
                onClick={handleConfirmCredentialsSaved}
                disabled={!credentialsSavedAcknowledged}
                className="w-full px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-xl text-sm transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {presentationMode && (
          <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 no-print">
            <button
              onClick={() => setPresentationMode(false)}
              className="absolute top-4 right-4 p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Sair (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center space-y-6 max-w-md w-full">
              <h2 className="text-xl font-black text-slate-100">{examTitle}</h2>
              <div className="flex items-center justify-center bg-white p-4 rounded-2xl mx-auto border border-slate-200">
                <QRCodeSVG value={publicUrl} size={320} />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Código da Prova
                </p>
                <p className="font-mono font-black text-3xl tracking-wider text-cyan-400">
                  {result.public_code}
                </p>
              </div>
              <p className="font-mono text-sm text-slate-400 break-all">
                {publicUrl}
              </p>
              <button
                onClick={() => setPresentationMode(false)}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-sm font-bold text-slate-300 transition-colors cursor-pointer"
              >
                Sair do Modo Apresentação
              </button>
            </div>
          </div>
        )}

        <div className="max-w-lg mx-auto w-full space-y-6 animate-fade-in no-print">
          <div className="glass-panel border border-emerald-500/20 bg-emerald-950/5 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 bg-emerald-950/80 border border-emerald-800/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black text-emerald-400">
              Gabarito Criado com Sucesso!
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              A prova foi publicada e está pronta para receber submissões.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                onClick={handleExportFile}
                className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-400 transition-all cursor-pointer"
                title="Baixar arquivo JSON do gabarito"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar Gabarito (JSON)
              </button>
              <button
                onClick={() => handleCopyAllCredentials(result)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer"
                title="Copiar todas as credenciais"
              >
                {copiedAll ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Copiar Credenciais
              </button>
              <button
                onClick={() => handleDownloadCredentialsTxt(result)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer"
                title="Baixar credenciais em arquivo de texto"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Credenciais (.txt)
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer"
                title="Imprimir ou salvar como PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir / PDF
              </button>
            </div>
          </div>

          <div className="glass-panel border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-cyan-400">
                  Acesso dos Alunos
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Compartilhe o código ou o QR code abaixo para que os estudantes
                enviem suas respostas.
              </p>

              <div className="flex items-center justify-center bg-white p-4 rounded-xl max-w-[220px] mx-auto mb-4 border border-slate-200">
                <QRCodeSVG ref={qrCodeRef} value={publicUrl} size={220} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">
                    Código da Prova
                  </span>
                  <span className="font-mono font-bold text-sm tracking-wider">
                    {result.public_code}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(result.public_code, "public")}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  title="Copiar Código"
                >
                  {copiedPublic ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 flex items-center justify-between">
                <div className="text-left truncate mr-2">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">
                    Link de Resposta
                  </span>
                  <span className="font-mono text-xs text-slate-300 block truncate">
                    {publicUrl}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(publicUrl, "public")}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  title="Copiar Link"
                >
                  {copiedPublic ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleOpenPresentation}
                disabled={!credentialsSavedAcknowledged}
                className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-900/30 disabled:text-cyan-700 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:cursor-not-allowed"
                title={
                  credentialsSavedAcknowledged
                    ? "Abrir modo apresentação"
                    : "Salve as credenciais antes de exibir para a turma"
                }
              >
                <Monitor className="w-4 h-4" />
                Mostrar para a turma
              </button>
              <button
                onClick={() => handleDownloadQrPng(result)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar QR (PNG)
              </button>
              <button
                onClick={() => handleShareWhatsApp(result)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
            </div>
          </div>

          {!credentialsSavedAcknowledged && (
            <div className="flex items-start gap-2 text-xs text-amber-300/90 bg-amber-950/20 border border-amber-900/30 rounded-xl p-3">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Salve as credenciais administrativas antes de exibir a prova
                para a turma ou revelar o link admin.
              </span>
            </div>
          )}

          {!showAdminCredentials ? (
            <div className="glass-panel border border-slate-800 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-slate-400">
                    Guarde o link administrativo em local seguro antes de exibir
                    a prova para a turma.
                  </p>
                  <button
                    onClick={handleRevealAdmin}
                    disabled={!credentialsSavedAcknowledged}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 disabled:bg-slate-900 disabled:border-slate-800 border border-rose-500/30 hover:border-rose-500/50 disabled:hover:border-slate-800 rounded-xl text-xs font-bold text-rose-400 disabled:text-slate-500 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Eye className="w-4 h-4" />
                    Revelar link administrativo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl"></div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-rose-400" />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-rose-400">
                      Painel do Professor (Admin)
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAdminCredentials(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    Ocultar
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Use este token privado para acessar o painel de resultados e
                  encerrar a prova posteriormente.
                </p>

                <div className="bg-rose-950/20 border border-rose-900/30 p-3.5 rounded-xl text-xs text-rose-300 mb-4 flex gap-2">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>
                    <strong>ATENÇÃO:</strong> Guarde este link! Por motivos de
                    segurança, você não poderá consultá-lo novamente. Não
                    divulgue ou mostre este link para seus alunos.
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 flex items-center justify-between">
                  <div className="text-left truncate mr-2">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Token Administrativo
                    </span>
                    <span className="font-mono text-xs text-rose-400 block truncate font-bold">
                      {result.admin_token}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(result.admin_token, "admin")}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title="Copiar Token"
                  >
                    {copiedAdmin ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 flex items-center justify-between">
                  <div className="text-left truncate mr-2">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      Link do Painel Admin
                    </span>
                    <span className="font-mono text-xs text-rose-300 block truncate">
                      {adminDeepLink}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(adminDeepLink, "admin")}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title="Copiar Link Admin"
                  >
                    {copiedAdmin ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAdminCredentials && (
            <div className="text-center pt-2">
              <button
                onClick={() => {
                  setAdminToken(result.admin_token);
                  navigateTo("/admin");
                }}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-sm font-bold text-slate-200 transition-colors cursor-pointer"
              >
                Acessar Painel de Resultados →
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  // Formulário de Criação
  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo("/")}
            className="back-nav-btn"
            aria-label="Voltar para Home"
          >
            <ArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-black">Configurar Prova</h1>
            <p className="text-xs text-slate-500">
              Defina o título, as questões e os gabaritos aceitos.
            </p>
          </div>
        </div>

        <div>
          <input
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
            id="import-gabarito-file"
          />
          <label
            htmlFor="import-gabarito-file"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-slate-950/10"
            title="Importar gabarito de arquivo JSON"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Importar</span>
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Título da Prova */}
        <div className="glass-panel border border-slate-800 rounded-2xl p-5">
          <label
            htmlFor="examTitle"
            className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider"
          >
            Título da Prova
          </label>
          <input
            id="examTitle"
            type="text"
            placeholder="Ex: Prova de Física Geral I - Recuperação"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-slate-100 placeholder:text-slate-600 font-bold"
            required
          />
        </div>

        {/* Questões */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">
              Estrutura de Itens
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              Total de pontos:{" "}
              <strong className="text-blue-400">
                {totalPoints.toFixed(1)}
              </strong>
            </span>
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className="glass-panel border border-slate-800 rounded-2xl p-5 space-y-4 relative"
            >
              {/* Top Row: Numero, Subitem, Pontos, Botao Excluir */}
              <div className="grid grid-cols-12 gap-3 items-end">
                {/* Número da Questão */}
                <div className="col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                    Questão
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.questionNumber}
                    onChange={(e) =>
                      handleUpdateItem(item.id, {
                        questionNumber: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-sm text-center font-bold"
                    required
                  />
                </div>

                {/* Subitem (ex: a, b) */}
                <div className="col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                    Subitem
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="Sem"
                    value={item.subLabel}
                    onChange={(e) =>
                      handleUpdateItem(item.id, {
                        subLabel: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z]/g, ""),
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-sm text-center font-bold uppercase placeholder:text-slate-700"
                  />
                </div>

                {/* Pontos */}
                <div className="col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                    Pontos
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={item.points}
                    onChange={(e) =>
                      handleUpdateItem(item.id, {
                        points: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-sm text-center font-bold text-blue-400"
                    required
                  />
                </div>

                {/* Remover Questão */}
                <div className="col-span-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={items.length === 1}
                    className="p-2 border border-slate-850 hover:border-rose-900/50 rounded-xl text-slate-500 hover:text-rose-400 disabled:opacity-40 disabled:hover:text-slate-500 disabled:border-slate-850 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Excluir Questão"
                  >
                    <Trash2 className="w-5 h-5 mx-auto" />
                  </button>
                </div>
              </div>

              {/* Bottom Row: Tipo e Gabarito */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-900">
                {/* Tipo de Questão */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                    Tipo de Resposta
                  </label>
                  <select
                    value={item.answerType}
                    onChange={(e) =>
                      handleUpdateItem(item.id, {
                        answerType: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="choice">Múltipla Escolha</option>
                    <option value="true_false">
                      Verdadeiro ou Falso (V/F)
                    </option>
                    <option value="text_exact">Texto</option>
                  </select>
                </div>

                {/* Gabarito da Questão */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                    Gabarito Oficial
                  </label>

                  {/* Múltipla Escolha */}
                  {item.answerType === "choice" && (
                    <div className="flex gap-1.5 justify-between">
                      {["A", "B", "C", "D", "E"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            handleUpdateItem(item.id, { accepted: [option] })
                          }
                          className={`flex-1 py-1.5 rounded-lg border text-sm font-bold transition-all cursor-pointer ${
                            item.accepted.includes(option)
                              ? "bg-cyan-500 text-slate-950 border-cyan-400"
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
                    <div className="flex gap-2">
                      {["V", "F"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            handleUpdateItem(item.id, { accepted: [option] })
                          }
                          className={`flex-1 py-1.5 rounded-lg border text-sm font-bold transition-all cursor-pointer ${
                            item.accepted.includes(option)
                              ? "bg-blue-500 text-white border-blue-400"
                              : "bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-800"
                          }`}
                        >
                          {option === "V" ? "Verdadeiro (V)" : "Falso (F)"}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Texto Exato com variantes */}
                  {item.answerType === "text_exact" && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Nova variação aceita..."
                          value={item.tempVariant}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              tempVariant: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTextVariant(item.id);
                            }
                          }}
                          className="flex-1 bg-slate-900 border border-slate-850 rounded-xl px-3 py-1.5 text-xs placeholder:text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddTextVariant(item.id)}
                          className="px-3 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Adicionar
                        </button>
                      </div>

                      {/* Lista de Variantes adicionadas */}
                      <div className="flex flex-wrap gap-1">
                        {item.accepted.map((val, variantIdx) => (
                          <span
                            key={variantIdx}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-850 border border-slate-800 text-[10px] text-slate-300 font-mono"
                          >
                            {val}
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveTextVariant(item.id, variantIdx)
                              }
                              className="text-slate-500 hover:text-rose-400 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {item.accepted.length === 0 && (
                          <span className="text-[10px] text-slate-650 italic">
                            Insira variações de resposta (ex: "cinco", "5")
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Botão de Adicionar Item */}
        <button
          type="button"
          onClick={handleAddItem}
          className="w-full py-3 bg-slate-900 border border-slate-850 hover:bg-slate-850 border-dashed text-slate-400 hover:text-slate-200 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar Nova Questão ou Item
        </button>

        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 p-3.5 rounded-xl">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800/40 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading
            ? "Criando Gabarito..."
            : "Publicar Gabarito e Gerar QR Code"}
        </button>
      </form>
    </div>
  );
}
