/**
 * SERVIÇO DE INTEGRAÇÃO OFICIAL DO MELHOR ENVIO - AMBIENTE DE PRODUÇÃO
 * ====================================================================
 * Credenciais e Endpoints Oficiais:
 * - Base URL: https://melhorenvio.com.br
 * - Client ID: 30288
 * - Client Secret: NbUeUvisVNkpPZCd27bSh79IOPeQSMPVjJwslzO
 * - Suporte / Contato: estilobeeadm@gmail.com
 * - User-Agent Obrigatório: Lavistore (estilobeeadm@gmail.com)
 * - Headers Obrigatórios: Accept: application/json, Content-Type: application/json
 */

import fs from 'fs';
import path from 'path';

// Configurações Oficiais de Produção
export const MELHOR_ENVIO_PRODUCTION_BASE_URL = 'https://melhorenvio.com.br';
export const MELHOR_ENVIO_CLIENT_ID = '30288';
export const MELHOR_ENVIO_CLIENT_SECRET = 'NbUeUvisVNkpPZCd27bSh79IOPeQSMPVjJwslzO';
export const MELHOR_ENVIO_SUPPORT_EMAIL = 'estilobeeadm@gmail.com';
export const MELHOR_ENVIO_APP_NAME = 'Lavistore';
export const MELHOR_ENVIO_USER_AGENT = `${MELHOR_ENVIO_APP_NAME} (${MELHOR_ENVIO_SUPPORT_EMAIL})`;
export const MELHOR_ENVIO_SCOPES = [
  'shipping-calculate',
  'shipping-cancel',
  'shipping-checkout',
  'shipping-companies',
  'shipping-generate',
  'shipping-preview',
  'shipping-print',
  'shipping-share',
  'shipping-tracking'
].join(' ');

// Arquivo de persistência segura do token de produção no backend
const PERSISTENT_DIR = path.join(process.cwd(), 'persistent_data');
const TOKEN_FILE_PATH = path.join(PERSISTENT_DIR, 'melhor_envio_token.json');

export interface StoredMelhorEnvioToken {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: number; // timestamp em ms
  scope?: string;
  updated_at: string;
  source: 'oauth' | 'manual' | 'env';
}

/**
 * Garante que a pasta de dados persistentes exista
 */
function ensurePersistentDir(): void {
  try {
    if (!fs.existsSync(PERSISTENT_DIR)) {
      fs.mkdirSync(PERSISTENT_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[Melhor Envio] Erro ao criar pasta persistent_data:', err);
  }
}

/**
 * Lê o token persistido ou obtém das variáveis de ambiente
 */
export function getStoredTokenData(): StoredMelhorEnvioToken | null {
  ensurePersistentDir();

  // 1. Tenta ler do arquivo protegido de persistência
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const raw = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8');
      const data = JSON.parse(raw) as StoredMelhorEnvioToken;
      if (data && data.access_token) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[Melhor Envio] Aviso ao ler token salvo:', err);
  }

  // 2. Fallback para variável de ambiente MELHOR_ENVIO_TOKEN
  const envToken = process.env.MELHOR_ENVIO_TOKEN?.trim();
  if (envToken && envToken.length > 10) {
    return {
      access_token: envToken,
      token_type: 'Bearer',
      updated_at: new Date().toISOString(),
      source: 'env'
    };
  }

  return null;
}

/**
 * Salva o token de acesso e refresh token de forma protegida e atômica
 */
export function saveTokenData(data: Partial<StoredMelhorEnvioToken>): StoredMelhorEnvioToken {
  ensurePersistentDir();

  const current = getStoredTokenData() || ({} as Partial<StoredMelhorEnvioToken>);
  const expiresIn = data.expires_in ?? current.expires_in;
  const expiresAt = expiresIn ? Date.now() + (expiresIn * 1000) : current.expires_at;

  const updated: StoredMelhorEnvioToken = {
    access_token: data.access_token || current.access_token || '',
    refresh_token: data.refresh_token || current.refresh_token,
    token_type: data.token_type || current.token_type || 'Bearer',
    expires_in: expiresIn,
    expires_at: expiresAt,
    scope: data.scope || current.scope || MELHOR_ENVIO_SCOPES,
    updated_at: new Date().toISOString(),
    source: data.source || current.source || 'oauth'
  };

  try {
    const tempFile = `${TOKEN_FILE_PATH}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(updated, null, 2), 'utf-8');
    fs.renameSync(tempFile, TOKEN_FILE_PATH);
    console.log('[Melhor Envio] Token de produção atualizado e gravado com sucesso no cofre.');
  } catch (err) {
    console.error('[Melhor Envio] Falha ao salvar token no cofre do servidor:', err);
  }

  return updated;
}

/**
 * Retorna os headers obrigatórios para qualquer requisição da API de produção do Melhor Envio
 */
export function getMelhorEnvioHeaders(customToken?: string): Record<string, string> {
  const tokenData = getStoredTokenData();
  const token = customToken || tokenData?.access_token;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': MELHOR_ENVIO_USER_AGENT
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Gera a URL oficial de autorização OAuth2 do Melhor Envio em Produção
 */
export function generateOAuthAuthorizeUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: MELHOR_ENVIO_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: MELHOR_ENVIO_SCOPES
  });

  if (state) {
    params.set('state', state);
  }

  return `${MELHOR_ENVIO_PRODUCTION_BASE_URL}/oauth/authorize?${params.toString()}`;
}

/**
 * Troca o código de autorização (authorization_code) pelo access_token e refresh_token oficiais de produção
 */
export async function exchangeOAuthCode(code: string, redirectUri: string): Promise<StoredMelhorEnvioToken> {
  if (!code) {
    throw new Error('Código de autorização não fornecido.');
  }

  console.log(`[Melhor Envio] Trocando authorization_code por tokens de produção (Client ID: ${MELHOR_ENVIO_CLIENT_ID})...`);

  const payload = {
    grant_type: 'authorization_code',
    client_id: MELHOR_ENVIO_CLIENT_ID,
    client_secret: MELHOR_ENVIO_CLIENT_SECRET,
    redirect_uri: redirectUri,
    code: code.trim()
  };

  const response = await fetch(`${MELHOR_ENVIO_PRODUCTION_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': MELHOR_ENVIO_USER_AGENT
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Melhor Envio] Falha na troca do token (${response.status}):`, errorBody);
    throw new Error(`Falha ao obter token de produção (${response.status}): ${errorBody}`);
  }

  const json: any = await response.json();

  if (!json.access_token) {
    throw new Error('Resposta do Melhor Envio não conteve access_token.');
  }

  const tokenData = saveTokenData({
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    token_type: json.token_type || 'Bearer',
    expires_in: json.expires_in,
    scope: json.scope,
    source: 'oauth'
  });

  return tokenData;
}

/**
 * Renova o access_token utilizando o refresh_token no endpoint oficial de produção
 */
export async function refreshMelhorEnvioToken(): Promise<StoredMelhorEnvioToken | null> {
  const currentToken = getStoredTokenData();
  const refreshToken = currentToken?.refresh_token;

  if (!refreshToken) {
    console.warn('[Melhor Envio] Tentativa de renovação ignorada: nenhum refresh_token disponível.');
    return null;
  }

  console.log('[Melhor Envio] Renovando token de acesso de produção via refresh_token...');

  const payload = {
    grant_type: 'refresh_token',
    client_id: MELHOR_ENVIO_CLIENT_ID,
    client_secret: MELHOR_ENVIO_CLIENT_SECRET,
    refresh_token: refreshToken
  };

  try {
    const response = await fetch(`${MELHOR_ENVIO_PRODUCTION_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': MELHOR_ENVIO_USER_AGENT
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Melhor Envio] Erro na renovação de token (${response.status}):`, errText);
      return null;
    }

    const json: any = await response.json();
    if (json.access_token) {
      const updated = saveTokenData({
        access_token: json.access_token,
        refresh_token: json.refresh_token || refreshToken,
        token_type: json.token_type || 'Bearer',
        expires_in: json.expires_in,
        source: 'oauth'
      });
      console.log('[Melhor Envio] Token de produção renovado com sucesso!');
      return updated;
    }
  } catch (err) {
    console.error('[Melhor Envio] Exceção na renovação do token:', err);
  }

  return null;
}

/**
 * Realiza uma requisição autenticada à API de Produção do Melhor Envio com suporte
 * a headers obrigatórios e auto-renovação de token em caso de HTTP 401 Unauthorized.
 */
export async function fetchMelhorEnvioApi(
  endpointPath: string,
  options: RequestInit = {},
  retryOn401 = true
): Promise<Response> {
  const tokenData = getStoredTokenData();
  const token = tokenData?.access_token;

  const url = endpointPath.startsWith('http')
    ? endpointPath
    : `${MELHOR_ENVIO_PRODUCTION_BASE_URL}${endpointPath.startsWith('/') ? '' : '/'}${endpointPath}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': MELHOR_ENVIO_USER_AGENT,
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers
  };

  let response = await fetch(url, mergedOptions);

  // Auto-refresh se o token expirou (401) e temos refresh_token
  if (response.status === 401 && retryOn401 && tokenData?.refresh_token) {
    console.warn('[Melhor Envio] Requisição recebeu 401 Unauthorized. Tentando renovação automática...');
    const refreshed = await refreshMelhorEnvioToken();
    if (refreshed?.access_token) {
      headers['Authorization'] = `Bearer ${refreshed.access_token}`;
      response = await fetch(url, {
        ...options,
        headers
      });
    }
  }

  return response;
}

/**
 * Consulta cotação oficial de frete na API de Produção
 */
export async function calculateProductionShipment(
  fromPostalCode: string,
  toPostalCode: string,
  products: any[]
): Promise<any> {
  const payload = {
    from: { postal_code: fromPostalCode.replace(/\D/g, '') },
    to: { postal_code: toPostalCode.replace(/\D/g, '') },
    products,
    options: {
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: false
    }
  };

  const response = await fetchMelhorEnvioApi('/api/v2/me/shipment/calculate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na API do Melhor Envio (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Adiciona um envio ao carrinho de etiquetas do Melhor Envio
 */
export async function addShipmentToCart(shipmentData: any): Promise<any> {
  const response = await fetchMelhorEnvioApi('/api/v2/me/cart', {
    method: 'POST',
    body: JSON.stringify(shipmentData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao adicionar etiqueta ao carrinho (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Realiza o checkout e compra de etiquetas
 */
export async function checkoutShipments(orderIds: string[]): Promise<any> {
  const response = await fetchMelhorEnvioApi('/api/v2/me/shipment/checkout', {
    method: 'POST',
    body: JSON.stringify({ orders: orderIds })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao realizar checkout de frete (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Gera as etiquetas pagas para impressão
 */
export async function generateShipmentLabels(orderIds: string[]): Promise<any> {
  const response = await fetchMelhorEnvioApi('/api/v2/me/shipment/generate', {
    method: 'POST',
    body: JSON.stringify({ orders: orderIds })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao gerar etiquetas (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Obtém os links para impressão das etiquetas em PDF
 */
export async function printShipmentLabels(orderIds: string[], mode: 'private' | 'public' = 'public'): Promise<any> {
  const response = await fetchMelhorEnvioApi('/api/v2/me/shipment/print', {
    method: 'POST',
    body: JSON.stringify({ mode, orders: orderIds })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao imprimir etiquetas (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Rastreia encomendas na API do Melhor Envio
 */
export async function trackShipments(orders: string[]): Promise<any> {
  const response = await fetchMelhorEnvioApi('/api/v2/me/shipment/tracking', {
    method: 'POST',
    body: JSON.stringify({ orders })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao rastrear envios (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Obtém os dados cadastrais da conta conectada do Melhor Envio
 */
export async function getConnectedAccountInfo(): Promise<any> {
  const response = await fetchMelhorEnvioApi('/api/v2/me', {
    method: 'GET'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao obter perfil da conta (${response.status}): ${errorText}`);
  }

  return response.json();
}
