import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Info, Plus, Trash2, X } from "lucide-react";
import type {
  AcceptedUnitInput,
  NumberDraft,
} from "../../types/numericalConfig";

export interface NumericalFormState {
  numericalValue: NumberDraft;
  unitRequired: boolean;
  toleranceKind: "relative" | "absolute";
  toleranceValue: NumberDraft;
  acceptedUnits: AcceptedUnitInput[];
}

interface NumericalAnswerEditorProps {
  value: NumericalFormState;
  onChange: (patch: Partial<NumericalFormState>) => void;
  disabled?: boolean;
}

/** Parse number input without forcing empty → 0 (breaks mobile editing). */
function parseNumberDraft(raw: string): NumberDraft {
  if (raw.trim() === "") return "";
  const n = Number(raw);
  return Number.isFinite(n) ? n : "";
}

export function defaultNumericalFormState(): NumericalFormState {
  return {
    numericalValue: "",
    unitRequired: false,
    toleranceKind: "absolute",
    toleranceValue: 0.01,
    acceptedUnits: [],
  };
}

export function validateNumericalFormState(
  state: NumericalFormState,
  questionLabel: string,
): string | null {
  if (state.numericalValue === "" || !Number.isFinite(state.numericalValue)) {
    return `${questionLabel}: informe um valor esperado válido.`;
  }
  if (
    state.toleranceValue === "" ||
    !Number.isFinite(state.toleranceValue) ||
    state.toleranceValue < 0
  ) {
    return `${questionLabel}: tolerância inválida.`;
  }
  if (state.toleranceKind === "relative" && state.numericalValue === 0) {
    return `${questionLabel}: valor zero exige tolerância absoluta.`;
  }
  if (state.unitRequired) {
    if (state.acceptedUnits.length === 0) {
      return `${questionLabel}: adicione pelo menos uma unidade aceita.`;
    }
    let factorOneCount = 0;
    for (const unit of state.acceptedUnits) {
      if (!unit.unit.trim()) {
        return `${questionLabel}: cada unidade precisa de um identificador.`;
      }
      if (
        unit.unitToCanonical === "" ||
        !Number.isFinite(unit.unitToCanonical) ||
        unit.unitToCanonical <= 0
      ) {
        return `${questionLabel}: fator de conversão inválido em "${unit.unit}".`;
      }
      if (unit.unitToCanonical === 1) {
        factorOneCount += 1;
      }
    }
    if (factorOneCount === 0) {
      return `${questionLabel}: defina exatamente uma unidade com fator 1 (unidade de referência).`;
    }
    if (factorOneCount > 1) {
      return `${questionLabel}: apenas uma unidade pode ter fator 1.`;
    }
  }
  return null;
}

const labelClass =
  "text-[10px] font-bold text-slate-500 uppercase tracking-wide";

/** Shared look — no width utilities (callers set width). Same height everywhere. */
const controlClass =
  "h-9 box-border bg-slate-900 border border-slate-850 rounded-xl px-3 text-xs text-slate-100 placeholder:text-slate-600 disabled:opacity-60 focus:outline-none focus:border-slate-700";

const btnClass =
  "inline-flex items-center justify-center gap-1 h-9 px-3 text-xs font-bold bg-slate-900 border border-slate-850 rounded-xl text-slate-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer shrink-0";

const HELP_PANEL_WIDTH = 280;
const HELP_VIEWPORT_PAD = 12;

function FieldHelp({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.min(
      HELP_PANEL_WIDTH,
      window.innerWidth - HELP_VIEWPORT_PAD * 2,
    );
    // Prefer anchoring under the icon; flip left if near the right edge.
    let left = rect.left;
    if (left + width > window.innerWidth - HELP_VIEWPORT_PAD) {
      left = rect.right - width;
    }
    left = Math.max(
      HELP_VIEWPORT_PAD,
      Math.min(left, window.innerWidth - HELP_VIEWPORT_PAD - width),
    );

    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    let top = rect.bottom + 8;
    if (
      panelHeight > 0 &&
      top + panelHeight > window.innerHeight - HELP_VIEWPORT_PAD
    ) {
      top = Math.max(HELP_VIEWPORT_PAD, rect.top - panelHeight - 8);
    }
    setCoords({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    // Second pass after paint so we know panel height and can flip above if needed.
    const id = requestAnimationFrame(() => updatePosition());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReposition = () => updatePosition();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Ajuda"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer p-0.5 rounded-md"
      >
        <Info className="w-3.5 h-3.5" strokeWidth={2.25} />
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="tooltip"
            style={{
              position: "fixed",
              top: coords?.top ?? -9999,
              left: coords?.left ?? -9999,
              width: Math.min(
                HELP_PANEL_WIDTH,
                typeof window !== "undefined"
                  ? window.innerWidth - HELP_VIEWPORT_PAD * 2
                  : HELP_PANEL_WIDTH,
              ),
              visibility: coords ? "visible" : "hidden",
            }}
            className="z-[100] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-[11px] leading-relaxed text-slate-300 shadow-xl shadow-black/50"
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}

function FieldLabel({
  children,
  help,
}: {
  children: ReactNode;
  help?: string;
}) {
  return (
    <div className="mb-1 flex items-center gap-1 min-h-[1rem]">
      <span className={labelClass}>{children}</span>
      {help ? <FieldHelp text={help} /> : null}
    </div>
  );
}

export default function NumericalAnswerEditor({
  value,
  onChange,
  disabled = false,
}: NumericalAnswerEditorProps) {
  const updateUnit = (index: number, patch: Partial<AcceptedUnitInput>) => {
    const next = value.acceptedUnits.map((u, i) =>
      i === index ? { ...u, ...patch } : u,
    );
    onChange({ acceptedUnits: next });
  };

  const addUnit = () => {
    const hasFactorOne = value.acceptedUnits.some(
      (u) => u.unitToCanonical === 1,
    );
    onChange({
      acceptedUnits: [
        ...value.acceptedUnits,
        {
          unit: "",
          unitToCanonical: hasFactorOne ? "" : 1,
          aliases: [],
          tempAlias: "",
        },
      ],
    });
  };

  const removeUnit = (index: number) => {
    onChange({
      acceptedUnits: value.acceptedUnits.filter(
        (_: AcceptedUnitInput, i: number) => i !== index,
      ),
    });
  };

  const addAlias = (index: number) => {
    const unit = value.acceptedUnits[index];
    const alias = unit.tempAlias.trim();
    if (!alias || unit.aliases.includes(alias)) {
      updateUnit(index, { tempAlias: "" });
      return;
    }
    updateUnit(index, {
      aliases: [...unit.aliases, alias],
      tempAlias: "",
    });
  };

  const removeAlias = (unitIndex: number, aliasIndex: number) => {
    const unit = value.acceptedUnits[unitIndex];
    updateUnit(unitIndex, {
      aliases: unit.aliases.filter((_, i) => i !== aliasIndex),
    });
  };

  const handleUnitRequiredChange = (checked: boolean) => {
    if (checked && value.acceptedUnits.length === 0) {
      onChange({
        unitRequired: true,
        acceptedUnits: [
          {
            unit: "",
            unitToCanonical: 1,
            aliases: [],
            tempAlias: "",
          },
        ],
      });
      return;
    }
    onChange({ unitRequired: checked });
  };

  return (
    <div className="space-y-4 min-w-0 overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="min-w-0">
          <FieldLabel>Valor esperado</FieldLabel>
          <input
            type="number"
            step="any"
            inputMode="decimal"
            value={value.numericalValue}
            disabled={disabled}
            onChange={(e) =>
              onChange({ numericalValue: parseNumberDraft(e.target.value) })
            }
            placeholder="Ex: 5"
            className={`w-full min-w-0 ${controlClass}`}
          />
        </div>
        <div className="min-w-0">
          <FieldLabel>Tipo de tolerância</FieldLabel>
          <select
            value={value.toleranceKind}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                toleranceKind: e.target.value as "relative" | "absolute",
              })
            }
            className={`w-full min-w-0 ${controlClass}`}
          >
            <option value="absolute">Absoluta</option>
            <option value="relative">Relativa (%)</option>
          </select>
        </div>
        <div className="min-w-0">
          <FieldLabel>
            {value.toleranceKind === "relative"
              ? "Tolerância (%)"
              : "Tolerância"}
          </FieldLabel>
          <input
            type="number"
            step="any"
            min={0}
            inputMode="decimal"
            value={
              value.toleranceValue === ""
                ? ""
                : value.toleranceKind === "relative"
                  ? value.toleranceValue * 100
                  : value.toleranceValue
            }
            disabled={disabled}
            onChange={(e) => {
              const draft = parseNumberDraft(e.target.value);
              onChange({
                toleranceValue:
                  draft === ""
                    ? ""
                    : value.toleranceKind === "relative"
                      ? draft / 100
                      : draft,
              });
            }}
            className={`w-full min-w-0 ${controlClass}`}
            placeholder={value.toleranceKind === "relative" ? "0.5" : "0.01"}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value.unitRequired}
          disabled={disabled}
          onChange={(e) => handleUnitRequiredChange(e.target.checked)}
          className="rounded border-slate-700"
        />
        Unidade obrigatória na resposta
      </label>

      {value.unitRequired && (
        <div className="space-y-3 pt-3 border-t border-slate-900">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <FieldLabel help="Liste as unidades que o aluno pode usar. Exatamente uma deve ter fator 1 — essa é a unidade de referência (canônica) do gabarito. As demais são convertidas para ela antes da correção.">
                Unidades aceitas
              </FieldLabel>
              <button
                type="button"
                disabled={disabled}
                onClick={addUnit}
                className={`${btnClass} text-cyan-400 hover:text-cyan-300`}
              >
                <Plus className="w-3.5 h-3.5" />
                Unidade
              </button>
            </div>

            {value.acceptedUnits.map((unit, unitIdx) => {
              const isCanonical = unit.unitToCanonical === 1;
              return (
                <div
                  key={unitIdx}
                  className={`rounded-xl bg-slate-950/60 border p-3 space-y-3 min-w-0 overflow-hidden ${
                    isCanonical ? "border-cyan-900/60" : "border-slate-900"
                  }`}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_2.25rem] gap-2 items-end">
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-1.5 min-h-[1rem]">
                        <span className={labelClass}>Unidade</span>
                        {isCanonical && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-cyan-400/90 bg-cyan-950/50 border border-cyan-900/40 rounded-md px-1.5 py-0.5">
                            Canônica
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={unit.unit}
                        disabled={disabled}
                        onChange={(e) =>
                          updateUnit(unitIdx, { unit: e.target.value })
                        }
                        placeholder={isCanonical ? "Ex: m/s" : "Ex: km/h"}
                        className={`min-w-0 w-full ${controlClass}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <FieldLabel help="Multiplicador que converte o valor nesta unidade para a unidade de referência (fator 1). Ex.: se a referência é m/s e a unidade é km/h, use 0,2778 (porque 1 km/h = 0,2778 m/s). Exatamente uma unidade deve ter fator 1.">
                        Fator (×)
                      </FieldLabel>
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={unit.unitToCanonical}
                        disabled={disabled}
                        onChange={(e) =>
                          updateUnit(unitIdx, {
                            unitToCanonical: parseNumberDraft(e.target.value),
                          })
                        }
                        placeholder="1"
                        className={`min-w-0 w-full text-center ${controlClass}`}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={disabled || value.acceptedUnits.length <= 1}
                      onClick={() => removeUnit(unitIdx)}
                      className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-850 text-slate-500 hover:text-rose-400 hover:border-rose-900/50 disabled:opacity-30 cursor-pointer"
                      title="Remover unidade"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <FieldLabel help="Opcionais. Formas alternativas que o aluno pode digitar além do identificador da unidade (ex.: “metros por segundo”, “mps”). Se vazio, só o texto exato da unidade é aceito.">
                      Aliases / alternativas
                    </FieldLabel>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
                      <input
                        type="text"
                        value={unit.tempAlias}
                        disabled={disabled}
                        onChange={(e) =>
                          updateUnit(unitIdx, { tempAlias: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addAlias(unitIdx);
                          }
                        }}
                        placeholder="Ex: quilômetros por hora"
                        className={`min-w-0 w-full ${controlClass}`}
                      />
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => addAlias(unitIdx)}
                        className={btnClass}
                      >
                        + Alias
                      </button>
                    </div>
                  </div>

                  {unit.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {unit.aliases.map((alias: string, aliasIdx: number) => (
                        <span
                          key={aliasIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-850 text-xs text-slate-300 font-mono"
                        >
                          {alias}
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => removeAlias(unitIdx, aliasIdx)}
                            className="text-slate-500 hover:text-rose-400 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
