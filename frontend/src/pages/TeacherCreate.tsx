import { useState } from "react";
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
} from "lucide-react";

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

  const copyToClipboard = (text: string, type: "public" | "admin") => {
    navigator.clipboard.writeText(text);
    if (type === "public") {
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2000);
    } else {
      setCopiedAdmin(true);
      setTimeout(() => setCopiedAdmin(false), 2000);
    }
  };

  const totalPoints = items.reduce(
    (acc, curr) => acc + Number(curr.points || 0),
    0,
  );

  // Exibição do Painel de Sucesso após a criação
  if (result) {
    const publicUrl = `${window.location.origin}/prova/${result.public_code}`;
    const adminUrl = `${window.location.origin}/admin/${result.admin_token}`;

    return (
      <div className="max-w-2xl mx-auto w-full space-y-6 animate-fade-in">
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
        </div>

        {/* Informações da Prova */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lado do Aluno */}
          <div className="glass-panel border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
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

              <div className="flex items-center justify-center bg-white p-3 rounded-xl max-w-[180px] mx-auto mb-4 border border-slate-200">
                <QRCodeSVG value={publicUrl} size={156} />
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
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
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
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
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
          </div>

          {/* Lado do Professor */}
          <div className="glass-panel border border-slate-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl"></div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-rose-400">
                  Painel do Professor (Admin)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Use este token privado para acessar o painel de resultados e
                encerrar a prova posteriormente.
              </p>

              <div className="bg-rose-950/20 border border-rose-900/30 p-3.5 rounded-xl text-xs text-rose-300 mb-4 flex gap-2">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>
                  <strong>ATENÇÃO:</strong> Guarde este link administrativo! Por
                  motivos de segurança, você não poderá consultá-lo novamente.
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
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
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
                    {adminUrl}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(adminUrl, "admin")}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
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
        </div>

        <div className="text-center pt-4">
          <button
            onClick={() => navigateTo(`/admin/${result.admin_token}`)}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-sm font-bold text-slate-200 transition-colors cursor-pointer"
          >
            Acessar Painel de Resultados →
          </button>
        </div>
      </div>
    );
  }

  // Formulário de Criação
  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigateTo("/")}
          className="p-2 bg-slate-900 border border-slate-850 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-300" />
        </button>
        <div>
          <h1 className="text-2xl font-black">Configurar Prova</h1>
          <p className="text-xs text-slate-500">
            Defina o título, as questões e os gabaritos aceitos.
          </p>
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
                    step="0.1"
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
                    <option value="text_exact">Texto Exato Normalizado</option>
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
