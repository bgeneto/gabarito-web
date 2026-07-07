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

export function buildAdminUrl(adminToken: string, origin?: string): string {
  const base = origin ?? window.location.origin;
  return `${base}/admin/${adminToken}`;
}

export function formatCredentialsText({
  title,
  publicCode,
  adminToken,
  origin,
}: ExamCredentialsInput): string {
  const publicUrl = buildPublicUrl(publicCode, origin);
  const adminUrl = buildAdminUrl(adminToken, origin);

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
    `Link do painel admin: ${adminUrl}`,
    "",
    "ATENÇÃO: Guarde este arquivo em local seguro.",
    "Por motivos de segurança, o link administrativo não poderá ser consultado novamente.",
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
  svgElement: SVGSVGElement,
  filename: string,
): Promise<void> {
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

export function sanitizeFilenameSegment(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
