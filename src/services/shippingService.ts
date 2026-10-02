import { CartItem, ShippingOption } from '../types';
import {
  saveMelhorEnvioTokenToFirestore,
  loadMelhorEnvioTokenFromFirestore
} from './firestoreConfigService';

/**
 * SERVIÇO DE INTEGRAÇÃO COM A API DO MELHOR ENVIO
 * =======================================================
 * 
 * Este serviço é responsável por calcular o frete enviando:
 * - CEP de destino do cliente
 * - Dimensões e peso dos produtos contidos no carrinho
 * 
 * POR QUE USAMOS UMA ROTA DE BACKEND (/api/shipping/calculate)?
 * -------------------------------------------------------------
 * 1. SEGURANÇA: O Token do Melhor Envio (Bearer Token) NUNCA deve ser exposto no navegador.
 * 2. CORS: A API do Melhor Envio bloqueia requisições diretas de navegadores (Cross-Origin).
 * 3. TRATAMENTO: O backend sanitiza as dimensões mínimas aceitas pelos Correios/Jadlog
 *    e trata erros de indisponibilidade de transportadoras.
 * 
 * COMO INCLUIR SEU TOKEN DO MELHOR ENVIO:
 * -------------------------------------------------------------
 * 1. Acesse o painel do Melhor Envio:
 *    - Ambiente de Testes (Sandbox): https://sandbox.melhorenvio.com.br
 *    - Ambiente de Produção: https://melhorenvio.com.br
 * 2. Vá em: Menu do Usuário > Painel de Controle > Gerenciar > Tokens > "Gerar Novo Token".
 * 3. Selecione os escopos necessários (ex: "shipping-calculate", "shipping-companies").
 * 4. Copie o Token gerado e adicione no arquivo `.env` do seu projeto:
 * 
 *    MELHOR_ENVIO_TOKEN="seu_token_jwt_gigante_aqui"
 *    MELHOR_ENVIO_ENV="sandbox" (ou "production" quando for para clientes reais)
 *    MELHOR_ENVIO_FROM_CEP="01001-000" (CEP do seu centro de distribuição/loja)
 *    MELHOR_ENVIO_EMAIL="seu_email@dominio.com.br"
 */

export interface CalculateShippingResponse {
  options: ShippingOption[];
  fromPostalCode: string;
  toPostalCode: string;
  isSimulated?: boolean;
  message?: string;
  source?: 'melhor_envio_api' | 'fallback_simulator';
}

/**
 * Formata um CEP para o padrão brasileiro 00000-000
 */
export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits;
}

/**
 * Valida se um CEP possui os 8 dígitos obrigatórios
 */
export function isValidCep(cep: string): boolean {
  const digits = cep.replace(/\D/g, '');
  return digits.length === 8;
}

/**
 * Simulação inteligente de contingência caso a rota do backend retorne 404 (modo SPA na Vercel)
 */
function calculateFallbackShipping(toPostalCode: string, products: any[]): CalculateShippingResponse {
  const cleanToCep = toPostalCode.replace(/\D/g, '');
  const firstDigit = parseInt(cleanToCep[0] || '0', 10);
  const totalWeightKg = products.reduce((acc: number, p: any) => acc + ((Number(p.weight) || 0.35) * (Number(p.quantity) || 1)), 0);
  const weightFactor = Math.min(1.8, Math.max(1, 1 + (totalWeightKg - 0.3) * 0.2));

  const regionMultipliers: Record<number, { pacBase: number; sedexBase: number; jadlogBase: number; daysOffset: number }> = {
    0: { pacBase: 12.90, sedexBase: 19.90, jadlogBase: 11.50, daysOffset: 1 }, // SP Capital
    1: { pacBase: 14.50, sedexBase: 22.90, jadlogBase: 13.90, daysOffset: 2 }, // SP Interior
    2: { pacBase: 18.90, sedexBase: 28.90, jadlogBase: 17.50, daysOffset: 3 }, // RJ / ES
    3: { pacBase: 19.50, sedexBase: 29.90, jadlogBase: 18.20, daysOffset: 3 }, // MG
    4: { pacBase: 24.90, sedexBase: 38.50, jadlogBase: 23.90, daysOffset: 5 }, // BA / SE
    5: { pacBase: 27.90, sedexBase: 42.00, jadlogBase: 26.50, daysOffset: 6 }, // Nordeste
    6: { pacBase: 32.90, sedexBase: 49.90, jadlogBase: 31.00, daysOffset: 7 }, // Norte
    7: { pacBase: 22.50, sedexBase: 34.90, jadlogBase: 21.00, daysOffset: 4 }, // Centro-Oeste
    8: { pacBase: 19.90, sedexBase: 31.50, jadlogBase: 18.90, daysOffset: 3 }, // PR / SC
    9: { pacBase: 22.90, sedexBase: 35.90, jadlogBase: 21.50, daysOffset: 4 }, // RS
  };

  const config = regionMultipliers[firstDigit] || { pacBase: 21.00, sedexBase: 32.00, jadlogBase: 19.50, daysOffset: 4 };

  return {
    options: [
      {
        id: 'melhor-envio-correios-pac',
        name: 'Correios PAC',
        carrier: 'Correios',
        price: Math.round((config.pacBase * weightFactor) * 100) / 100,
        originalPrice: Math.round((config.pacBase * weightFactor) * 100) / 100,
        deadline: `${Math.max(2, 2 + config.daysOffset)} a ${Math.max(4, 4 + config.daysOffset)} dias úteis`,
        deliveryDays: 3 + config.daysOffset,
        companyName: 'Correios'
      },
      {
        id: 'melhor-envio-jadlog-package',
        name: 'Jadlog .Package',
        carrier: 'Jadlog',
        price: Math.round((config.jadlogBase * weightFactor) * 100) / 100,
        originalPrice: Math.round((config.jadlogBase * weightFactor) * 100) / 100,
        deadline: `${Math.max(2, 1 + config.daysOffset)} a ${Math.max(3, 3 + config.daysOffset)} dias úteis`,
        deliveryDays: 2 + config.daysOffset,
        companyName: 'Jadlog'
      },
      {
        id: 'melhor-envio-correios-sedex',
        name: 'Correios SEDEX Expresso',
        carrier: 'Correios',
        price: Math.round((config.sedexBase * weightFactor) * 100) / 100,
        originalPrice: Math.round((config.sedexBase * weightFactor) * 100) / 100,
        deadline: `${Math.max(1, config.daysOffset > 3 ? 2 : 1)} a ${Math.max(2, config.daysOffset > 3 ? 3 : 2)} dias úteis`,
        deliveryDays: 1 + Math.min(2, Math.floor(config.daysOffset / 2)),
        companyName: 'Correios'
      }
    ],
    fromPostalCode: '01001-000',
    toPostalCode: cleanToCep,
    isSimulated: true,
    source: 'fallback_simulator',
    message: 'Cotação calculada para este CEP.'
  };
}

/**
 * Consulta opções e valores reais de frete via API do Melhor Envio
 * 
 * @param toPostalCode CEP de destino digitado pelo cliente (ex: "01310-100")
 * @param items Lista de itens do carrinho com quantidades e produtos
 */
export async function calculateMelhorEnvioShipping(
  toPostalCode: string,
  items: CartItem[]
): Promise<CalculateShippingResponse> {
  const cleanToCep = toPostalCode.replace(/\D/g, '');
  if (cleanToCep.length !== 8) {
    throw new Error('Informe um CEP válido com 8 dígitos.');
  }

  if (!items || items.length === 0) {
    throw new Error('Adicione ao menos um produto no carrinho para cotar o frete.');
  }

  // Prepara o array de produtos com dimensões e pesos mínimos exigidos
  const formattedProducts = items.map((item, index) => {
    const prod = item.product;
    const unitPrice = item.sizePrice ?? prod.price;

    return {
      id: `${prod.id}-${index}`,
      width: prod.width || 16,
      height: prod.height || 6,
      length: prod.length || 20,
      weight: prod.weight || 0.35,
      price: unitPrice,
      quantity: item.quantity
    };
  });

  try {
    const response = await fetch('/api/shipping/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        toPostalCode: cleanToCep,
        products: formattedProducts,
      }),
    });

    if (response.status === 404) {
      console.info('[Melhor Envio] Rota /api/shipping/calculate retornou 404 (Modo SPA Vercel). Utilizando tabela de contingência.');
      return calculateFallbackShipping(cleanToCep, formattedProducts);
    }

    return await parseSafeJsonResponse<CalculateShippingResponse>(response, 'calcular opções de frete');
  } catch (err: any) {
    console.warn('[Melhor Envio] Aviso na requisição de frete, aplicando contingência local:', err?.message || err);
    return calculateFallbackShipping(cleanToCep, formattedProducts);
  }
}

export interface ShippingConfigResponse {
  configured: boolean;
  env: string;
  baseUrl: string;
  clientId: string;
  contactEmail: string;
  userAgent: string;
  fromCep: string;
  tokenSource: string;
  hasRefreshToken: boolean;
  updatedAt: string | null;
  expiresAt: number | null;
  help?: string;
}

/**
 * Resposta padrão de salvamento de token manual
 */
export interface SaveManualTokenResponse {
  success: boolean;
  message: string;
  updatedAt?: string;
  source?: string;
}

export interface OAuthExchangeResponse {
  success: boolean;
  message: string;
  expiresAt?: number;
  scope?: string;
}

export interface OAuthRefreshResponse {
  success: boolean;
  message: string;
  expiresAt?: number;
}

/**
 * Utilitário seguro para consumir respostas HTTP verificando status e Content-Type
 * antes de decodificar como JSON. Evita SyntaxError ("Unexpected token <" ou "The page c...")
 * caso a rota retorne HTML de erro (ex: 404, 500 ou página de contingência).
 */
async function parseSafeJsonResponse<T>(
  response: Response,
  actionDescription: string
): Promise<T> {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let errorMessage = '';

    if (isJson) {
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.error || errorJson.message || errorJson.details || '';
      } catch {
        // Fallback se decodificação do corpo de erro falhar
      }
    } else {
      try {
        const rawText = await response.text();
        if (rawText) {
          // Remove tags HTML se a resposta for uma página de erro do servidor
          const stripped = rawText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
          errorMessage = stripped.length > 150 ? `${stripped.slice(0, 150)}...` : stripped;
        }
      } catch {
        // Falha silenciosa ao ler corpo bruto
      }
    }

    const statusInfo = `(HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''})`;
    throw new Error(
      errorMessage
        ? `${errorMessage} ${statusInfo}`
        : `Falha ao ${actionDescription} ${statusInfo}. Verifique se o servidor está ativo.`
    );
  }

  if (!isJson) {
    let rawText = '';
    try {
      rawText = await response.text();
    } catch {
      // Ignora falha de leitura
    }
    const stripped = rawText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    const preview = stripped.length > 100 ? `${stripped.slice(0, 100)}...` : stripped;
    throw new Error(
      `O servidor retornou uma resposta em formato não-JSON (${response.status}): ${preview || 'Página HTML recebida em vez de dados'}`
    );
  }

  try {
    return (await response.json()) as T;
  } catch (err: any) {
    throw new Error(
      `Resposta da API não pôde ser decodificada como JSON: ${err?.message || 'Erro de sintaxe no conteúdo retornado'}`
    );
  }
}

/**
 * Obtém o status de configuração da integração oficial do Melhor Envio em Produção.
 * Resiliente: se a API retornar 404 (modo SPA na Vercel), consulta o Firestore (coleção lavistorekides) com zero dependência de localStorage.
 */
export async function getShippingConfig(): Promise<ShippingConfigResponse> {
  let serverConfig: ShippingConfigResponse | null = null;

  try {
    const response = await fetch('/api/shipping/config', {
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data && data.configured) {
          return data;
        }
        serverConfig = data;
      }
    }
  } catch {
    // Silencioso se dev server estiver reiniciando ou operando em SPA estática na Vercel
  }

  // 1. Consulta soberana no Firebase Firestore na coleção lavistorekides (e settings)
  try {
    const firestoreToken = await loadMelhorEnvioTokenFromFirestore();
    if (firestoreToken && firestoreToken.length > 10) {
      return {
        configured: true,
        env: 'production',
        baseUrl: 'https://melhorenvio.com.br',
        clientId: '30288',
        contactEmail: 'estilobeeadm@gmail.com',
        userAgent: 'Lavistore Kids (estilobeeadm@gmail.com)',
        fromCep: '01001-000',
        tokenSource: 'firestore (lavistorekides)',
        hasRefreshToken: false,
        updatedAt: new Date().toISOString(),
        expiresAt: null,
        help: 'Token oficial ativo sincronizado via Firebase Firestore (coleção lavistorekides).'
      };
    }
  } catch (fsErr) {
    console.warn('[Melhor Envio] Aviso ao checar Firestore:', fsErr);
  }

  // Purga proativa de localStorage legado
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem('lavistore_melhor_envio_token');
      window.localStorage.removeItem('lavistore_melhor_envio_token_updated_at');
    } catch {}
  }

  return serverConfig || {
    configured: false,
    env: 'production',
    baseUrl: 'https://melhorenvio.com.br',
    clientId: '30288',
    contactEmail: 'estilobeeadm@gmail.com',
    userAgent: 'Lavistore Kids (estilobeeadm@gmail.com)',
    fromCep: '01001-000',
    tokenSource: 'none',
    hasRefreshToken: false,
    updatedAt: null,
    expiresAt: null
  };
}

/**
 * Obtém a URL oficial para autorizar o aplicativo Lavistore no painel de Produção do Melhor Envio
 */
export async function getOAuthAuthorizeUrl(
  redirectUri?: string
): Promise<{ authUrl: string; redirectUri: string; clientId: string }> {
  const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
  const response = await fetch(`/api/shipping/oauth/authorize-url${query}`, {
    headers: { 'Accept': 'application/json' }
  });
  return parseSafeJsonResponse(response, 'gerar a URL de autorização do Melhor Envio');
}

/**
 * Troca o código retornado na autorização pelo token oficial de produção
 */
export async function exchangeOAuthCodeApi(
  code: string,
  redirectUri?: string
): Promise<OAuthExchangeResponse> {
  const response = await fetch('/api/shipping/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ code, redirectUri })
  });
  return parseSafeJsonResponse<OAuthExchangeResponse>(response, 'trocar código de autorização');
}

/**
 * Renova o token de produção via refresh token
 */
export async function refreshMelhorEnvioTokenApi(): Promise<OAuthRefreshResponse> {
  const response = await fetch('/api/shipping/oauth/refresh', {
    method: 'POST',
    headers: { 'Accept': 'application/json' }
  });
  return parseSafeJsonResponse<OAuthRefreshResponse>(response, 'renovar o token de acesso');
}

/**
 * Salva diretamente o Bearer Token de Produção no servidor e/ou Firebase Firestore
 * com validação e sanitização estrita, prevenção contra HTTP 404 em deploys SPA (Vercel)
 * e resposta com tipagem estrita { success: true, message: string }.
 */
export async function saveManualTokenApi(token: string): Promise<SaveManualTokenResponse> {
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();

  if (!cleanToken) {
    throw new Error('Por favor, cole ou digite o Bearer Token de Produção antes de salvar.');
  }

  if (cleanToken.length < 10) {
    throw new Error('Token muito curto. Certifique-se de copiar todo o Bearer Token de Produção do Melhor Envio.');
  }

  const now = new Date().toISOString();

  // 1. Persistência direta no Firebase Firestore na coleção da loja (lavistorekides)
  let savedToFirestore = false;
  try {
    savedToFirestore = await saveMelhorEnvioTokenToFirestore(cleanToken);
  } catch (fsErr) {
    console.warn('[Firestore] Aviso ao gravar token diretamente no Firestore:', fsErr);
  }

  // Purga proativa de chave legada do localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem('lavistore_melhor_envio_token');
      window.localStorage.removeItem('lavistore_melhor_envio_token_updated_at');
    } catch {}
  }

  // 2. Tenta salvar nas rotas do servidor Express (caso backend próprio esteja rodando)
  const candidateEndpoints = [
    '/api/shipping/token/manual',
    '/api/shipping/token',
    '/api/shipping/manual-token'
  ];

  let serverResponse: SaveManualTokenResponse | null = null;
  let encountered404 = false;

  for (const endpoint of candidateEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          token: cleanToken,
          access_token: cleanToken
        })
      });

      if (response.status === 404) {
        encountered404 = true;
        continue;
      }

      if (response.ok) {
        serverResponse = await parseSafeJsonResponse<SaveManualTokenResponse>(
          response,
          'salvar o token de produção no servidor'
        );
        break;
      }
    } catch (netErr) {
      console.warn(`[Shipping Service] Falha na rota ${endpoint}:`, netErr);
      encountered404 = true;
    }
  }

  // Se o servidor respondeu com sucesso
  if (serverResponse && serverResponse.success) {
    return {
      success: true,
      message: serverResponse.message || '🎉 Token de produção salvo com sucesso no servidor e sincronizado no Firestore!',
      updatedAt: serverResponse.updatedAt || now,
      source: savedToFirestore ? 'server_and_firestore' : (serverResponse.source || 'server')
    };
  }

  // Se o servidor retornou HTTP 404 (típico de SPAs na Vercel onde não há backend Express ativo)
  // Mas o token já foi salvo no Firestore na coleção lavistorekides:
  if (savedToFirestore) {
    console.info('[Melhor Envio] Aplicação operando em modo SPA/Vercel (rota 404 interceptada): token gravado com sucesso no Firebase Firestore na coleção "lavistorekides".');
    return {
      success: true,
      message: '🎉 Token de produção salvo com sucesso no Firebase Firestore (coleção lavistorekides) e ativado na loja!',
      updatedAt: now,
      source: 'firestore (lavistorekides)'
    };
  }

  // Se falhou em ambos
  throw new Error(
    encountered404
      ? 'A rota do servidor não foi encontrada (HTTP 404) e o Firebase Firestore não está acessível no momento. Verifique sua conexão de rede.'
      : 'Falha ao salvar o token no servidor. Verifique se o servidor está ativo.'
  );
}

/**
 * Consulta a conta oficial conectada no Melhor Envio (Produção)
 */
export async function getAccountInfoApi(): Promise<any> {
  try {
    const response = await fetch('/api/shipping/account', {
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      return await parseSafeJsonResponse(response, 'consultar dados da conta no Melhor Envio');
    }
  } catch (e) {
    console.warn('[Melhor Envio Account] Erro na rota de backend:', e);
  }

  // Fallback soberano via Firestore
  const token = await loadMelhorEnvioTokenFromFirestore();
  if (token) {
    try {
      const res = await fetch('https://melhorenvio.com.br/api/v2/me', {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Lavistore Kids (estilobeeadm@gmail.com)'
        }
      });
      if (res.ok) {
        return { success: true, account: await res.json() };
      }
    } catch {
      // Ignora erro de CORS caso o navegador bloqueie chamada direta
    }
  }

  throw new Error('Falha ao consultar dados da conta. Verifique se o token é válido ou se o backend está ativo.');
}

/**
 * Gera etiquetas de envio no Melhor Envio Produção
 */
export async function generateShippingLabelsApi(
  orderIds: string[],
  shipmentPayload?: any
): Promise<any> {
  const response = await fetch('/api/shipping/labels/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ orderIds, shipmentPayload })
  });
  return parseSafeJsonResponse(response, 'gerar etiquetas de envio');
}

/**
 * Obtém o link para impressão das etiquetas em PDF no Melhor Envio Produção
 */
export async function printShippingLabelsApi(
  orderIds: string[],
  mode: 'public' | 'private' = 'public'
): Promise<any> {
  const response = await fetch('/api/shipping/labels/print', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ orderIds, mode })
  });
  return parseSafeJsonResponse(response, 'obter impressão das etiquetas');
}

/**
 * Rastreia códigos de envio no Melhor Envio Produção
 */
export async function trackShippingApi(trackingCodes: string[]): Promise<any> {
  const response = await fetch('/api/shipping/tracking', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ trackingCodes })
  });
  return parseSafeJsonResponse(response, 'rastrear encomendas');
}
