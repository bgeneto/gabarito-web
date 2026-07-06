import crypto from "crypto";

/**
 * Gera uma string base36 aleatória, segura e não enviesada de determinado tamanho.
 * Personagens aceitos: 0-9 e A-Z.
 */
export function generateBase36(length: number): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  while (result.length < length) {
    const byte = crypto.randomBytes(1)[0];
    if (byte < 252) {
      // 36 * 7 = 252 (evita viés do operador resto %)
      result += chars[byte % 36];
    }
  }
  return result;
}

/**
 * Gera um código público no formato GYY-XXXXXX
 */
export function generatePublicCode(year: number): string {
  const yearSuffix = year.toString().slice(-2);
  return `G${yearSuffix}-${generateBase36(6)}`;
}

/**
 * Gera um token administrativo no formato adm_XXXXXX
 */
export function generateAdminToken(): string {
  return `adm_${generateBase36(6)}`;
}

/**
 * Gera um ID de comprovante de submissão com 6 caracteres base36
 */
export function generateSubmissionId(): string {
  return generateBase36(6);
}
