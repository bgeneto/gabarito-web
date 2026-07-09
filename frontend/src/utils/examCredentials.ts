import { encodeAdminTokenForUrl } from "./adminTokenUrl";

export interface ExamCredentialsInput {
  title: string;
  publicCode: string;
  adminToken: string;
  origin?: string;
}

export function buildPublicUrl(publicCode: string, origin?: string): string {
  const base = origin ?? window.location.origin;
  return `${base}/prova/${publicCode}`;
}

export function buildSubmissionUrl(
  submissionId: string,
  origin?: string,
): string {
  const base = origin ?? window.location.origin;
  return `${base}/submissao/${submissionId}`;
}

/** Clean session-based admin URL (token stays in sessionStorage). */
export function buildAdminUrl(origin?: string): string {
  const base = origin ?? window.location.origin;
  return `${base}/admin`;
}

/**
 * One-time deep link with base64url-encoded token. Cosmetic obfuscation only.
 * Opening it validates the token, stores sessionStorage, and redirects to /admin.
 */
export function buildAdminDeepLink(
  adminToken: string,
  origin?: string,
): string {
  const base = origin ?? window.location.origin;
  return `${base}/admin/${encodeAdminTokenForUrl(adminToken)}`;
}

export function formatCredentialsText({
  title,
  publicCode,
  adminToken,
  origin,
}: ExamCredentialsInput): string {
  const publicUrl = buildPublicUrl(publicCode, origin);
  const adminPanelUrl = buildAdminUrl(origin);
  const adminDeepLink = buildAdminDeepLink(adminToken, origin);

  return [
    "GABARITOWEB — Credenciais da Prova",
    "====================================",
    "",
    `Título: ${title}`,
    "",
    "--- ACESSO DOS ALUNOS ---",
    `Código da prova: ${publicCode}`,
    `Link de resposta: ${publicUrl}`,
    "",
    "--- ACESSO DO PROFESSOR (PRIVADO) ---",
    `Token administrativo: ${adminToken}`,
    `Painel (após informar o token na Home): ${adminPanelUrl}`,
    `Link direto do painel: ${adminDeepLink}`,
    "",
    "ATENÇÃO: Guarde este arquivo em local seguro.",
    "O token administrativo não é exibido novamente após sair desta tela.",
  ].join("\n");
}

export function formatWhatsAppStudentMessage({
  title,
  publicCode,
  origin,
}: Pick<ExamCredentialsInput, "title" | "publicCode" | "origin">): string {
  const publicUrl = buildPublicUrl(publicCode, origin);

  return [
    `Prova: ${title}`,
    "",
    `Código: ${publicCode}`,
    `Link para enviar respostas: ${publicUrl}`,
    "",
    "Acesse o link acima para preencher e enviar suas respostas.",
  ].join("\n");
}

export interface SubmissionShareInput {
  examTitle: string;
  submissionId: string;
  origin?: string;
}

export function formatWhatsAppSubmissionMessage({
  examTitle,
  submissionId,
  origin,
}: SubmissionShareInput): string {
  const submissionUrl = buildSubmissionUrl(submissionId, origin);

  return [
    `Prova: ${examTitle}`,
    "",
    `Comprovante de submissão: ${submissionId}`,
    `Link para consultar resultado: ${submissionUrl}`,
    "",
    "Guarde este comprovante. Quando o professor encerrar a prova, use o link acima para ver sua nota.",
  ].join("\n");
}

export function resolveQrSvgElement(
  source: SVGSVGElement | HTMLElement | null,
): SVGSVGElement | null {
  if (!source) return null;
  if (source.tagName?.toLowerCase() === "svg") {
    return source as SVGSVGElement;
  }
  return source.querySelector("svg");
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCredentialsTxt(
  credentials: ExamCredentialsInput,
  filename?: string,
): void {
  const safeCode = credentials.publicCode.replace(/[^a-zA-Z0-9-]/g, "");
  downloadTextFile(
    formatCredentialsText(credentials),
    filename ?? `gabarito-${safeCode}-credenciais.txt`,
  );
}

export async function downloadQrCodePng(
  source: SVGSVGElement | HTMLElement,
  filename: string,
): Promise<void> {
  const svgElement = resolveQrSvgElement(source);
  if (!svgElement) {
    throw new Error("QR code SVG não encontrado.");
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const svgBlob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Falha ao carregar QR code."));
      img.src = svgUrl;
    });

    const size = Math.max(img.width, img.height, 320);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas não suportado.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export function openWhatsAppShare(text: string): void {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Opens the browser print dialog scoped to `#qr-share-print` (Save as PDF). */
export function exportQrSharePdf(downloadFilename: string): void {
  const previousTitle = document.title;
  document.title = downloadFilename.replace(/\.(png|pdf)$/i, "");
  document.body.classList.add("printing-qr-share");

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.title = previousTitle;
    document.body.classList.remove("printing-qr-share");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  // Fallback if `afterprint` does not fire in some browsers.
  window.setTimeout(cleanup, 60_000);
}

export function sanitizeFilenameSegment(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
