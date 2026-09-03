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

/**
 * Formata ou extrai o token administrativo garantindo o prefixo fixo 'adm_'.
 * Sempre retorna uma string iniciada por 'adm_'.
 * O sufixo é composto por até 6 caracteres alfanuméricos em maiúsculas (base36).
 * Trata colagem de URLs completas (/admin/adm_XXXXXX ou /admin/XXXXXX),
 * valores com 'adm_' ou sem 'adm_'.
 */
export function formatAdminToken(input: string): string {
  if (!input) return "adm_";

  const trimmed = input.trim();

  // Se foi colada uma URL que contenha /admin/(adm_)?XXXXXX
  const urlMatch = trimmed.match(/\/admin\/(?:adm_)?([0-9A-Za-z]{1,6})/i);
  if (urlMatch && urlMatch[1]) {
    const code = urlMatch[1]
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, "")
      .slice(0, 6);
    return `adm_${code}`;
  }

  // Se for apenas o prefixo "adm" ou "adm_" sem código
  if (/^adm_?$/i.test(trimmed)) {
    return "adm_";
  }

  let cleaned = trimmed;

  // Remove qualquer quantidade de prefixos "adm_" repetidos no início (ex: adm_adm_XXXXXX)
  while (/^adm_/i.test(cleaned)) {
    cleaned = cleaned.slice(4);
  }

  // Se sobrou algo com prefixo "adm" sem underscore e com mais de 6 caracteres (ex: admXXXXXX)
  if (/^adm[0-9A-Za-z]{6}$/i.test(cleaned)) {
    cleaned = cleaned.slice(3);
  } else if (/^adm/i.test(cleaned) && !/^[0-9A-Za-z]{1,6}$/.test(cleaned)) {
    cleaned = cleaned.replace(/^adm/i, "");
  }

  // Filtra apenas caracteres alfanuméricos e limita a 6
  const suffix = cleaned
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, 6);

  return `adm_${suffix}`;
}

/**
 * Valida se o token tem o formato completo adm_XXXXXX (exatamente 6 caracteres base36 após adm_).
 */
export function validateAdminToken(token: string): boolean {
  if (!token) return false;
  return /^adm_[0-9A-Z]{6}$/i.test(token.trim());
}
