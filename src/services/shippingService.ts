import { CartItem, ShippingOption } from '../types';

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
      // Dimensões com valores padrão caso o produto não possua medidas específicas
      width: prod.width || 16,     // Mínimo aceito pelos Correios: 11cm a 16cm
      height: prod.height || 6,    // Altura mínima segura: 2cm a 6cm
      length: prod.length || 20,   // Comprimento mínimo: 16cm a 20cm
      weight: prod.weight || 0.35, // Peso em kg (ex: 350g padrão para mimos/papelaria)
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

    return await parseSafeJsonResponse<CalculateShippingResponse>(response, 'calcular opções de frete');
  } catch (err: any) {
    console.error('Erro na cotação de frete:', err);
    throw err;
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
 * Obtém o status de configuração da integração oficial do Melhor Envio em Produção
 */
export async function getShippingConfig(): Promise<ShippingConfigResponse> {
  try {
    const response = await fetch('/api/shipping/config', {
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('application/json')) {
        return await response.json();
      }
    }
  } catch {
    // Silencioso se dev server estiver reiniciando
  }
  return {
    configured: false,
    env: 'production',
    baseUrl: 'https://melhorenvio.com.br',
    clientId: '30288',
    contactEmail: 'estilobeeadm@gmail.com',
    userAgent: 'Lavistore (estilobeeadm@gmail.com)',
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
 * Salva diretamente o Bearer Token de Produção no servidor com validação e tipagem estrita
 */
export async function saveManualTokenApi(token: string): Promise<SaveManualTokenResponse> {
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();

  if (!cleanToken) {
    throw new Error('Informe o Bearer Token de Produção no campo.');
  }

  if (cleanToken.length < 10) {
    throw new Error('Token muito curto. Certifique-se de copiar todo o Bearer Token de Produção do Melhor Envio.');
  }

  const response = await fetch('/api/shipping/token/manual', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ token: cleanToken })
  });

  return parseSafeJsonResponse<SaveManualTokenResponse>(response, 'salvar o token de produção no servidor');
}

/**
 * Consulta a conta oficial conectada no Melhor Envio (Produção)
 */
export async function getAccountInfoApi(): Promise<any> {
  const response = await fetch('/api/shipping/account', {
    headers: { 'Accept': 'application/json' }
  });
  return parseSafeJsonResponse(response, 'consultar dados da conta no Melhor Envio');
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
