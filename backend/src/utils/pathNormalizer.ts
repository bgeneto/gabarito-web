/** Normaliza paths de API e SPA substituindo tokens/códigos dinâmicos por placeholders. */
export function normalizeApiPath(path: string): string {
  return path
    .replace(/\/api\/admin\/exams\/[^/]+/g, "/api/admin/exams/:token")
    .replace(
      /\/api\/exams\/[^/]+\/submissions/g,
      "/api/exams/:code/submissions",
    )
    .replace(/\/api\/exams\/[^/]+$/g, "/api/exams/:code")
    .replace(/\/api\/submissions\/[^/]+/g, "/api/submissions/:id")
    .replace(/\/api\/superadmin\/exams\/[^/]+/g, "/api/superadmin/exams/:id");
}

export function normalizePagePath(path: string): string {
  return path
    .replace(/^\/prova\/[^/]+/, "/prova/:code")
    .replace(/^\/submissao\/[^/]+/, "/submissao/:id")
    .replace(/^\/admin\/[^/]+/, "/admin/:token")
    .replace(/^\/admin\/?$/, "/admin")
    .replace(/^\/superadmin\/prova\/[^/]+/, "/superadmin/prova/:id");
}

export function categorizeApiPath(
  normalizedPath: string,
  method: string,
): string {
  if (normalizedPath === "/health") return "health";
  if (normalizedPath === "/api/exams" && method === "POST")
    return "exam_create";
  if (normalizedPath === "/api/exams/:code") return "exam_public";
  if (normalizedPath === "/api/exams/:code/submissions")
    return "submission_create";
  if (normalizedPath === "/api/submissions/:id") return "submission";
  if (normalizedPath.startsWith("/api/admin/")) return "admin";
  if (normalizedPath.startsWith("/api/superadmin/")) return "superadmin";
  if (normalizedPath === "/api/telemetry/pageview") return "telemetry";
  return "other";
}

export function categorizePagePath(normalizedPath: string): string {
  if (normalizedPath === "/" || normalizedPath === "") return "page_home";
  if (normalizedPath === "/criar-prova") return "page_teacher_create";
  if (normalizedPath.startsWith("/prova/")) return "page_student_exam";
  if (normalizedPath.startsWith("/submissao/")) return "page_student_result";
  if (normalizedPath === "/admin" || normalizedPath.startsWith("/admin/"))
    return "page_teacher_dashboard";
  if (normalizedPath.startsWith("/superadmin")) return "page_superadmin";
  return "page_other";
}
