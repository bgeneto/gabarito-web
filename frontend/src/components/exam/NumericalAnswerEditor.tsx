import { Plus, Trash2, X } from "lucide-react";
import type { AcceptedUnitInput } from "../../types/numericalConfig";

export interface NumericalFormState {
  numericalValue: number;
  unitRequired: boolean;
  canonicalUnit: string;
  toleranceKind: "relative" | "absolute";
  toleranceValue: number;
  acceptedUnits: AcceptedUnitInput[];
}

interface NumericalAnswerEditorProps {
  value: NumericalFormState;
  onChange: (patch: Partial<NumericalFormState>) => void;
  disabled?: boolean;
}

export function defaultNumericalFormState(): NumericalFormState {
  return {
    numericalValue: 0,
    unitRequired: false,
    canonicalUnit: "",
    toleranceKind: "absolute",
    toleranceValue: 0.01,
    acceptedUnits: [],
  };
}

export function validateNumericalFormState(
  state: NumericalFormState,
  questionLabel: string,
): string | null {
  if (!Number.isFinite(state.numericalValue)) {
    return `${questionLabel}: informe um valor esperado válido.`;
  }
  if (!Number.isFinite(state.toleranceValue) || state.toleranceValue < 0) {
    return `${questionLabel}: tolerância inválida.`;
  }
  if (state.toleranceKind === "relative" && state.numericalValue === 0) {
    return `${questionLabel}: valor zero exige tolerância absoluta.`;
  }
  if (state.unitRequired) {
    if (!state.canonicalUnit.trim()) {
      return `${questionLabel}: informe a unidade canônica.`;
    }
    if (state.acceptedUnits.length === 0) {
      return `${questionLabel}: adicione pelo menos uma unidade aceita.`;
    }
    let hasCanonical = false;
    for (const unit of state.acceptedUnits) {
      if (!unit.unit.trim()) {
        return `${questionLabel}: cada unidade precisa de um identificador.`;
      }
      if (!Number.isFinite(unit.unitToCanonical) || unit.unitToCanonical <= 0) {
        return `${questionLabel}: fator de conversão inválido em "${unit.unit}".`;
      }
      if (unit.aliases.length === 0) {
        return `${questionLabel}: a unidade "${unit.unit}" precisa de pelo menos um alias.`;
      }
      if (
        unit.unit.trim() === state.canonicalUnit.trim() &&
        unit.unitToCanonical === 1
      ) {
        hasCanonical = true;
      }
    }
    if (!hasCanonical) {
      return `${questionLabel}: inclua a unidade canônica com fator 1.`;
    }
  }
  return null;
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
    onChange({
      acceptedUnits: [
        ...value.acceptedUnits,
        { unit: "", unitToCanonical: 1, aliases: [], tempAlias: "" },
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
      const canonical = value.canonicalUnit.trim();
      onChange({
        unitRequired: true,
        acceptedUnits: [
          {
            unit: canonical,
            unitToCanonical: 1,
            aliases: canonical ? [canonical] : [],
            tempAlias: "",
          },
        ],
      });
      return;
    }
    onChange({ unitRequired: checked });
  };

  const fieldClass =
    "w-full min-w-0 bg-slate-900 border border-slate-850 rounded-xl px-3 py-1.5 text-xs disabled:opacity-60";

  return (
    <div className="space-y-3 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="min-w-0">
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
            Valor esperado
          </label>
          <input
            type="number"
            step="any"
            value={value.numericalValue}
            disabled={disabled}
            onChange={(e) =>
              onChange({ numericalValue: Number(e.target.value) })
            }
            className={fieldClass}
          />
        </div>
        <div className="min-w-0">
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
            Tipo de tolerância
          </label>
          <select
            value={value.toleranceKind}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                toleranceKind: e.target.value as "relative" | "absolute",
              })
            }
            className={fieldClass}
          >
            <option value="absolute">Absoluta</option>
            <option value="relative">Relativa (%)</option>
          </select>
        </div>
        <div className="min-w-0">
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
            {value.toleranceKind === "relative"
              ? "Tolerância (%)"
              : "Tolerância"}
          </label>
          <input
            type="number"
            step="any"
            min={0}
            value={
              value.toleranceKind === "relative"
                ? value.toleranceValue * 100
                : value.toleranceValue
            }
            disabled={disabled}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange({
                toleranceValue:
                  value.toleranceKind === "relative" ? n / 100 : n,
              });
            }}
            className={fieldClass}
            placeholder={value.toleranceKind === "relative" ? "0.5" : "0.01"}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
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
          <div className="max-w-xs">
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
              Unidade canônica
            </label>
            <input
              type="text"
              value={value.canonicalUnit}
              disabled={disabled}
              onChange={(e) => onChange({ canonicalUnit: e.target.value })}
              placeholder="Ex: m/s"
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Unidades aceitas
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={addUnit}
                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-cyan-400 border border-slate-850 rounded-lg hover:bg-slate-900 disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Unidade
              </button>
            </div>

            {value.acceptedUnits.map((unit, unitIdx) => (
              <div
                key={unitIdx}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-900 space-y-2 min-w-0"
              >
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                  <input
                    type="text"
                    value={unit.unit}
                    disabled={disabled}
                    onChange={(e) =>
                      updateUnit(unitIdx, { unit: e.target.value })
                    }
                    placeholder="Unidade"
                    className="min-w-0 bg-slate-900 border border-slate-850 rounded-lg px-2 py-1.5 text-xs disabled:opacity-60"
                  />
                  <input
                    type="number"
                    step="any"
                    value={unit.unitToCanonical}
                    disabled={disabled}
                    onChange={(e) =>
                      updateUnit(unitIdx, {
                        unitToCanonical: Number(e.target.value),
                      })
                    }
                    placeholder="× fator"
                    title="Fator unitToCanonical"
                    className="w-20 sm:w-24 bg-slate-900 border border-slate-850 rounded-lg px-2 py-1.5 text-xs disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={disabled || value.acceptedUnits.length <= 1}
                    onClick={() => removeUnit(unitIdx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-2 min-w-0">
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
                    placeholder="Novo alias..."
                    className="flex-1 min-w-0 bg-slate-900 border border-slate-850 rounded-lg px-2 py-1 text-[10px] disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => addAlias(unitIdx)}
                    className="shrink-0 px-2 py-1 text-[10px] font-bold border border-slate-850 rounded-lg hover:bg-slate-900 cursor-pointer disabled:opacity-40"
                  >
                    Alias
                  </button>
                </div>

                {unit.aliases.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {unit.aliases.map((alias: string, aliasIdx: number) => (
                      <span
                        key={aliasIdx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-850 border border-slate-800 text-[10px] text-slate-300 font-mono"
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
