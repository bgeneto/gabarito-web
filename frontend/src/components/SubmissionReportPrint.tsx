import {
  type SubmissionReportData,
  formatAcceptedAnswer,
  formatQuestionLabel,
  formatStudentAnswer,
} from "../utils/submissionReport";

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
