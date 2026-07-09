import {
  type SubmissionReportData,
  formatAcceptedAnswer,
  formatQuestionLabel,
  formatStudentAnswer,
} from "../utils/submissionReport";
import {
  formatMetricNumber,
  formatMetricPercent,
} from "../utils/normalDistribution";

export default function SubmissionReportPrint({
  data,
  maxPoints,
  percentScore,
}: {
  data: SubmissionReportData;
  maxPoints: number;
  percentScore: number;
}) {
  const submittedAt = new Date(data.submitted_at).toLocaleString("pt-BR");

  return (
    <div id="submission-report-print" className="hidden print:block">
      <header className="report-header">
        <p className="report-brand">GabaritoWEB</p>
        <h1 className="report-title">Relatório de Correção</h1>
        <p className="report-exam-title">{data.exam_title}</p>
      </header>

      <section className="report-summary">
        <p className="report-section-label">Resultado Obtido</p>

        <div className="report-score-ring">
          <span className="report-score-value">
            {data.total_score.toFixed(1)}
          </span>
          <span className="report-score-max">/ {maxPoints.toFixed(1)}</span>
        </div>

        <p className="report-student-name">{data.student_name}</p>
        <p className="report-meta">
          Matrícula: <strong>{data.student_identifier}</strong>
        </p>
        <p className="report-meta">
          Comprovante: <strong>{data.id}</strong>
        </p>
        <p className="report-meta">
          Data de envio: <strong>{submittedAt}</strong>
        </p>
        <p className="report-percent">
          Aproveitamento de <strong>{percentScore.toFixed(0)}%</strong>
        </p>
      </section>

      {data.performance_context && (
        <section className="report-performance">
          <h2 className="report-section-label">Análise em relação à turma</h2>
          <table className="report-performance-table">
            <tbody>
              <tr>
                <th>Sua nota</th>
                <td>
                  {formatMetricPercent(
                    data.performance_context.student_percent,
                  )}
                </td>
              </tr>
              <tr>
                <th>Média da turma</th>
                <td>
                  {formatMetricPercent(
                    data.performance_context.class_mean_percent,
                  )}
                </td>
              </tr>
              <tr>
                <th>Desvio padrão</th>
                <td>
                  {formatMetricPercent(
                    data.performance_context.class_std_dev_percent,
                  )}
                </td>
              </tr>
              <tr>
                <th>Z-score</th>
                <td>{formatMetricNumber(data.performance_context.z_score)}</td>
              </tr>
              <tr>
                <th>Percentil</th>
                <td>
                  {formatMetricPercent(data.performance_context.percentile)}
                </td>
              </tr>
            </tbody>
          </table>
          {data.performance_context.small_sample_warning && (
            <p className="report-performance-note">
              Comparação baseada em poucos alunos (n=
              {data.performance_context.sample_size}).
            </p>
          )}
        </section>
      )}

      <section className="report-answers">
        <h2 className="report-section-label">Correção Questão por Questão</h2>

        <div className="report-answer-list">
          {data.answers.map((ans, idx) => (
            <article
              key={idx}
              className={`report-answer-card ${ans.isCorrect ? "report-answer-correct" : "report-answer-wrong"}`}
            >
              <div className="report-answer-header">
                <div className="report-answer-title">
                  <span className="report-status-icon" aria-hidden="true">
                    {ans.isCorrect ? "✓" : "✗"}
                  </span>
                  <span className="report-question-label">
                    {formatQuestionLabel(ans)}
                  </span>
                </div>
                <span className="report-points">
                  {ans.scoreAwarded.toFixed(1)} / {ans.points.toFixed(1)} pts
                </span>
              </div>

              <div className="report-answer-grid">
                <div className="report-answer-box">
                  <span className="report-answer-box-label">Sua Resposta</span>
                  <span
                    className={
                      ans.isCorrect
                        ? "report-answer-text-correct"
                        : "report-answer-text-wrong"
                    }
                  >
                    {formatStudentAnswer(ans.rawAnswer)}
                  </span>
                </div>
                <div className="report-answer-box">
                  <span className="report-answer-box-label">Gabarito</span>
                  <span className="report-answer-text-key">
                    {formatAcceptedAnswer(ans)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="report-footer">
        <p>
          Documento gerado em{" "}
          {new Date().toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          })}{" "}
          — GabaritoWEB
        </p>
      </footer>
    </div>
  );
}
