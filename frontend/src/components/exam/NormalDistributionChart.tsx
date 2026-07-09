import type { StudentPerformanceContext } from "../../types/examStats";
import {
  buildNormalCurvePoints,
  percentToSvgX,
  pointsToSvgPath,
} from "../../utils/normalDistribution";

interface NormalDistributionChartProps {
  context: StudentPerformanceContext;
  title?: string;
  variant?: "screen" | "print";
}

const WIDTH = 360;
const HEIGHT = 180;
const PADDING = { top: 16, right: 16, bottom: 28, left: 36 };

const CHART_COLORS = {
  screen: {
    area: "#06b6d433",
    curve: "#22d3ee",
    axis: "#334155",
    tick: "#475569",
    label: "#64748b",
    cutoff: "#64748b",
    student: "#fb7185",
    studentLabel: "#fda4af",
    legend: "#64748b",
  },
  print: {
    area: "#dbeafe",
    curve: "#0369a1",
    axis: "#6b7280",
    tick: "#9ca3af",
    label: "#4b5563",
    cutoff: "#6b7280",
    student: "#be123c",
    studentLabel: "#9f1239",
    legend: "#374151",
  },
} as const;

export function NormalDistributionChart({
  context,
  title = "Distribuição de notas",
  variant = "screen",
}: NormalDistributionChartProps) {
  const colors = CHART_COLORS[variant];
  const points = buildNormalCurvePoints(
    context.class_mean_percent,
    context.class_std_dev_percent,
  );
  const peakY = Math.max(...points.map((point) => point.y), 0.0001);
  const curvePath = pointsToSvgPath(points, WIDTH, HEIGHT, PADDING, peakY);
  const areaPath = `${curvePath} L ${percentToSvgX(100, WIDTH, PADDING).toFixed(2)} ${(HEIGHT - PADDING.bottom).toFixed(2)} L ${percentToSvgX(0, WIDTH, PADDING).toFixed(2)} ${(HEIGHT - PADDING.bottom).toFixed(2)} Z`;
  const studentX = percentToSvgX(context.student_percent, WIDTH, PADDING);
  const cutoffX = percentToSvgX(context.cutoff_percent, WIDTH, PADDING);
  const baselineY = HEIGHT - PADDING.bottom;
  const xTicks = [0, 25, 50, 75, 100];

  const wrapperClass =
    variant === "print"
      ? "report-performance-chart"
      : "rounded-xl border border-slate-800 bg-slate-900/40 p-3";

  const titleClass =
    variant === "print"
      ? "report-performance-chart-title"
      : "text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2";

  const legendClass =
    variant === "print"
      ? "report-performance-chart-legend"
      : "flex flex-wrap gap-3 mt-2 text-[10px] text-slate-500";

  return (
    <div className={wrapperClass}>
      <p className={titleClass}>{title}</p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={
          variant === "print" ? "report-performance-chart-svg" : "w-full h-auto"
        }
        role="img"
        aria-label="Curva de distribuição normal da turma com posição da nota do aluno"
      >
        <line
          x1={PADDING.left}
          y1={baselineY}
          x2={WIDTH - PADDING.right}
          y2={baselineY}
          stroke={colors.axis}
          strokeWidth="1"
        />

        {xTicks.map((tick) => {
          const x = percentToSvgX(tick, WIDTH, PADDING);
          return (
            <g key={tick}>
              <line
                x1={x}
                y1={baselineY}
                x2={x}
                y2={baselineY + 4}
                stroke={colors.tick}
                strokeWidth="1"
              />
              <text
                x={x}
                y={HEIGHT - 8}
                textAnchor="middle"
                fill={colors.label}
                fontSize="9"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={colors.area} stroke="none" />
        <path d={curvePath} fill="none" stroke={colors.curve} strokeWidth="2" />

        <line
          x1={cutoffX}
          y1={PADDING.top}
          x2={cutoffX}
          y2={baselineY}
          stroke={colors.cutoff}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x={cutoffX}
          y={PADDING.top - 2}
          textAnchor="middle"
          fill={colors.label}
          fontSize="8"
        >
          Corte 50%
        </text>

        <line
          x1={studentX}
          y1={PADDING.top}
          x2={studentX}
          y2={baselineY}
          stroke={colors.student}
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <text
          x={studentX}
          y={PADDING.top + 10}
          textAnchor="middle"
          fill={colors.studentLabel}
          fontSize="8"
          fontWeight="700"
        >
          Você
        </text>
      </svg>

      <div className={legendClass}>
        <span>
          <span
            style={{
              display: "inline-block",
              width: "12px",
              height: "2px",
              backgroundColor: colors.curve,
              marginRight: "6px",
              verticalAlign: "middle",
            }}
          />
          Distribuição normal
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: "12px",
              borderTop: `2px dashed ${colors.student}`,
              marginRight: "6px",
              verticalAlign: "middle",
            }}
          />
          Sua nota: {context.student_percent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
