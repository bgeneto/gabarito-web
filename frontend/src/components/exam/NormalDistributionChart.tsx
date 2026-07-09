import type { StudentPerformanceContext } from "../../types/examStats";
import {
  buildNormalCurvePoints,
  percentToSvgX,
  pointsToSvgPath,
} from "../../utils/normalDistribution";

interface NormalDistributionChartProps {
  context: StudentPerformanceContext;
  title?: string;
}

const WIDTH = 360;
const HEIGHT = 180;
const PADDING = { top: 16, right: 16, bottom: 28, left: 36 };

export function NormalDistributionChart({
  context,
  title = "Distribuição de notas",
}: NormalDistributionChartProps) {
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

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
        {title}
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="Curva de distribuição normal da turma com posição da nota do aluno"
      >
        <line
          x1={PADDING.left}
          y1={baselineY}
          x2={WIDTH - PADDING.right}
          y2={baselineY}
          stroke="currentColor"
          className="text-slate-700"
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
                stroke="currentColor"
                className="text-slate-600"
                strokeWidth="1"
              />
              <text
                x={x}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-slate-500 text-[9px]"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        <path d={areaPath} className="fill-cyan-500/20 stroke-none" />
        <path
          d={curvePath}
          fill="none"
          className="stroke-cyan-400"
          strokeWidth="2"
        />

        <line
          x1={cutoffX}
          y1={PADDING.top}
          x2={cutoffX}
          y2={baselineY}
          stroke="currentColor"
          className="text-slate-500"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x={cutoffX}
          y={PADDING.top - 2}
          textAnchor="middle"
          className="fill-slate-500 text-[8px]"
        >
          Corte 50%
        </text>

        <line
          x1={studentX}
          y1={PADDING.top}
          x2={studentX}
          y2={baselineY}
          stroke="currentColor"
          className="text-rose-400"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <text
          x={studentX}
          y={PADDING.top + 10}
          textAnchor="middle"
          className="fill-rose-300 text-[8px] font-bold"
        >
          Você
        </text>
      </svg>

      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
          Distribuição normal (modelo)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 border-t-2 border-dashed border-rose-400 inline-block" />
          Sua nota: {context.student_percent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
