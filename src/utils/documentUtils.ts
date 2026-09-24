/**
 * Utilitários de Validação e Formatação de Documentos Brasileiros (CPF e CNPJ)
 * Essencial para o Checkout Transparente e Mercado Pago (Banco Central do Brasil)
 */

/**
 * Validação algorítmica de CPF (Módulo 11 da Receita Federal do Brasil)
 */
export function isValidCpf(cpf?: string | null): boolean {
  if (!cpf || typeof cpf !== 'string') return false;
  const clean = cpf.replace(/\D/g, '');

  if (clean.length !== 11) return false;

  // Rejeita sequências conhecidas de dígitos idênticos (ex: 000.000.000-00, 111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  const digit1 = (remainder >= 10) ? 0 : remainder;
  if (digit1 !== parseInt(clean.charAt(9), 10)) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  const digit2 = (remainder >= 10) ? 0 : remainder;
  if (digit2 !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

/**
 * Validação algorítmica de CNPJ
 */
export function isValidCnpj(cnpj?: string | null): boolean {
  if (!cnpj || typeof cnpj !== 'string') return false;
  const clean = cnpj.replace(/\D/g, '');

  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  // Primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(clean.charAt(12), 10)) return false;

  // Segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(clean.charAt(13), 10)) return false;

  return true;
}

/**
 * Valida se é um documento brasileiro válido (CPF com 11 dígitos ou CNPJ com 14 dígitos)
 */
export function isValidDocument(doc?: string | null): boolean {
  if (!doc) return false;
  const clean = doc.replace(/\D/g, '');
  if (clean.length === 11) return isValidCpf(clean);
  if (clean.length === 14) return isValidCnpj(clean);
  return false;
}

/**
 * Formata CPF como 000.000.000-00
 */
export function formatCpf(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Formata CNPJ como 00.000.000/0000-00
 */
export function formatCnpj(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Formata dinamicamente como CPF (até 11 dígitos) ou CNPJ (até 14 dígitos)
 */
export function formatDocument(val: string): string {
  const clean = val.replace(/\D/g, '');
  if (clean.length > 11) {
    return formatCnpj(val);
  }
  return formatCpf(val);
}

/**
 * Gera um CPF matematicamente válido a partir de uma raiz numérica de 9 dígitos
 * Útil para fallbacks de sandbox / testes do Mercado Pago sem rejeição algorítmica
 */
export function repairOrGenerateValidCpf(baseDigits: string = '123456789'): string {
  let digits = baseDigits.replace(/\D/g, '').slice(0, 9);
  if (digits.length < 9) {
    digits = digits.padEnd(9, '1');
  }
  if (/^(\d)\1{8}$/.test(digits)) {
    digits = '123456789';
  }

  // Primeiro dígito
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rest = 11 - (sum % 11);
  const d1 = (rest >= 10) ? 0 : rest;

  // Segundo dígito
  const withD1 = digits + String(d1);
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(withD1.charAt(i), 10) * (11 - i);
  }
  rest = 11 - (sum % 11);
  const d2 = (rest >= 10) ? 0 : rest;

  return withD1 + String(d2);
}
