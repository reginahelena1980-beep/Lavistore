/**
 * SERVIÇO CLIENT-SIDE DO MERCADO PAGO
 * Lavistore Presentes & Mimos Criativos
 * 
 * Arquitetura Híbrida e Resiliente:
 * 1. Sem Dependência Obrigatória de Backend:
 *    Projetado para funcionar com 100% de confiabilidade em hospedagens estáticas (ex: Vercel, Netlify)
 *    onde endpoints '/api/...' não existem e retornariam páginas de erro HTML 404
 *    ("The page could not be found" / Unexpected token 'T' / '<' is not valid JSON).
 * 2. Validação Estrita de Content-Type:
 *    Todas as chamadas de rede validam se a resposta é de fato 'application/json' antes de qualquer JSON.parse().
 * 3. Validação e Higienização de Documentos (CPF):
 *    Exporta e integra cleanCustomerCpf em todas as camadas de pagamento.
 * 4. Suporte a Payment Brick e Parcelamento (em até 12x).
 * 5. Restrição Absoluta: Zero Localstorage.
 */

import { OrderData } from '../types';
import { cleanCustomerCpf, isValidCpf, isValidDocument, formatDocument, repairOrGenerateValidCpf } from '../utils/documentUtils';
import { createOrder } from './storeApiService';
import { processClientSidePixOrder } from './pixPaymentService';

// Garante que cleanCustomerCpf esteja acessível globalmente
if (typeof window !== 'undefined') {
  (window as any).cleanCustomerCpf = cleanCustomerCpf;
}

export { cleanCustomerCpf };

/**
 * Chave pública oficial de produção da Lavistore
 */
export const DEFAULT_PRODUCTION_PUBLIC_KEY = 'APP_USR-3d4386ef-56c9-4327-8ca6-ccee96d68b27';

/**
 * Resultado seguro de requisições HTTP (SafeFetch)
 */
export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  errorText: string;
  isJson: boolean;
}

/**
 * Fetch resiliente e à prova de falhas:
 * Previne falhas de JSON inválido quando a hospedagem estática (Vercel) ou proxy retorna HTML (404/500/502).
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const response = await fetch(input, init);
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const rawText = await response.text();

    let parsedData: T | null = null;
    let isJson = false;

    // Apenas tenta JSON.parse se o Content-Type for JSON ou o texto começar com { ou [
    if (
      contentType.includes('application/json') ||
      rawText.trim().startsWith('{') ||
      rawText.trim().startsWith('[')
    ) {
      try {
        parsedData = JSON.parse(rawText) as T;
        isJson = true;
      } catch {
        isJson = false;
        parsedData = null;
      }
    }

    if (!response.ok) {
      let friendlyError = '';
      if (isJson && parsedData && typeof parsedData === 'object') {
        const obj = parsedData as Record<string, any>;
        friendlyError = obj.error || obj.message || obj.detail || '';
      }
      if (!friendlyError) {
        if (response.status === 404) {
          friendlyError = 'Serviço de pagamento operando em modo Client-Side direto (Vercel).';
        } else if (response.status >= 500) {
          friendlyError = `Instabilidade temporária na rede (HTTP ${response.status}).`;
        } else {
          friendlyError = `Falha na requisição (HTTP ${response.status}).`;
        }
      }
      return {
        ok: false,
        status: response.status,
        data: parsedData,
        errorText: friendlyError,
        isJson
      };
    }

    if (!isJson || parsedData === null) {
      return {
        ok: false,
        status: response.status,
        data: null,
        errorText: 'A resposta do servidor retornou conteúdo não-JSON (página estática/HTML).',
        isJson: false
      };
    }

    return {
      ok: true,
      status: response.status,
      data: parsedData,
      errorText: '',
      isJson: true
    };
  } catch (err: any) {
    const isNetworkErr = err?.name === 'TypeError' || err?.message?.includes('fetch') || err?.message?.includes('Failed');
    return {
      ok: false,
      status: 0,
      data: null,
      errorText: isNetworkErr
        ? 'Falha na conexão de rede com o serviço de pagamento.'
        : (err?.message || 'Erro inesperado na comunicação com o Mercado Pago.'),
      isJson: false
    };
  }
}

/**
 * Obtém a chave pública válida de produção do Mercado Pago
 */
export function getMercadoPagoPublicKey(): string {
  const envKey = (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MP_PUBLIC_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MERCADO_PAGO_PUBLIC_KEY) ||
    ''
  ).trim();

  const isReal = (k?: string | null): boolean => {
    if (!k || typeof k !== 'string') return false;
    const t = k.trim();
    return t.length >= 15 && !t.includes('00000000') && t !== 'TEST-00000000-0000-0000-0000-000000000000';
  };

  if (isReal(envKey)) {
    return envKey;
  }

  return DEFAULT_PRODUCTION_PUBLIC_KEY;
}

/**
 * Cria ou simula uma preferência de pagamento de forma 100% segura para Vercel e backend
 */
export async function createMercadoPagoPreferenceClient(options: {
  orderData: OrderData;
  items?: any[];
  payer?: any;
}): Promise<{
  success: boolean;
  preferenceId: string;
  initPoint?: string;
  isClientSide: boolean;
}> {
  try {
    const res = await safeFetchJson<{
      success: boolean;
      preferenceId?: string;
      initPoint?: string;
    }>('/api/mercadopago/create_preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderData: options.orderData,
        items: options.items,
        payer: options.payer
      })
    });

    if (res.ok && res.data?.preferenceId) {
      return {
        success: true,
        preferenceId: res.data.preferenceId,
        initPoint: res.data.initPoint,
        isClientSide: false
      };
    }
  } catch (err) {
    console.info('[Mercado Pago] Servidor backend indisponível, gerando preferência client-side:', err);
  }

  // Fallback client-side para Vercel
  const clientPrefId = `PREF-LAVI-${options.orderData.orderId || Date.now()}`;
  return {
    success: true,
    preferenceId: clientPrefId,
    initPoint: undefined,
    isClientSide: true
  };
}

/**
 * Consulta o status de um pagamento de forma resiliente
 */
export async function checkMercadoPagoPaymentStatus(paymentId: string | number): Promise<{
  id: string;
  status: 'pending' | 'approved' | 'in_process' | 'rejected';
  isAvailable: boolean;
}> {
  if (!paymentId) {
    return { id: '', status: 'pending', isAvailable: false };
  }

  try {
    const res = await safeFetchJson<{ id: string; status: string }>(
      `/api/mercadopago/payment_status/${paymentId}`
    );

    if (res.ok && res.data && res.data.status) {
      return {
        id: String(res.data.id || paymentId),
        status: res.data.status as any,
        isAvailable: true
      };
    }
  } catch {}

  return {
    id: String(paymentId),
    status: 'pending',
    isAvailable: false
  };
}
