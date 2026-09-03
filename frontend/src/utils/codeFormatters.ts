/**
 * Utilitários para formatação e validação de códigos do GabaritoWEB.
 */

/**
 * Formata o código público da avaliação no padrão GYY-XXXXXX (ex: G26-DNEM9G).
 * Insere automaticamente o hífen na 4ª posição (após GYY).
 */
export function formatPublicCode(input: string): string {
  if (!input) return "";

  // Remove tudo que não for caractere alfanumérico e converte para maiúsculo
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Limita ao tamanho máximo de caracteres alfanuméricos: G (1) + YY (2) + XXXXXX (6) = 9
  const truncated = cleaned.slice(0, 9);

  if (truncated.length <= 3) {
    return truncated;
  }

  return `${truncated.slice(0, 3)}-${truncated.slice(3)}`;
}

/**
 * Valida se a string fornecida é um código público no formato GYY-XXXXXX.
 */
export function validatePublicCode(code: string): boolean {
  if (!code) return false;
  return /^G[0-9]{2}-[0-9A-Z]{6}$/.test(code.trim().toUpperCase());
}

/**
 * Formata ou extrai o código do comprovante de submissão (6 caracteres alfanuméricos).
 * Suporta colagem de URLs completas (/submissao/XXXXXX) ou texto livre.
 */
export function formatReceiptCode(input: string): string {
  if (!input) return "";

  const trimmed = input.trim().toUpperCase();
  const urlMatch = trimmed.match(/\/SUBMISSAO\/([0-9A-Z]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].slice(0, 6);
  }

  return trimmed.replace(/[^0-9A-Z]/g, "").slice(0, 6);
}

/**
 * Valida se o comprovante tem exatamente 6 caracteres base36 (0-9, A-Z).
 */
export function validateReceiptCode(code: string): boolean {
  if (!code) return false;
  return /^[0-9A-Z]{6}$/.test(code.trim().toUpperCase());
}
