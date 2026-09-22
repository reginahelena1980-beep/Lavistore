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
      },
      body: JSON.stringify({
        toPostalCode: cleanToCep,
        products: formattedProducts,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Erro ${response.status} ao consultar frete no Melhor Envio.`);
    }

    const data = await response.json();
    return data;
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
 * Obtém o status de configuração da integração oficial do Melhor Envio em Produção
 */
export async function getShippingConfig(): Promise<ShippingConfigResponse> {
  try {
    const response = await fetch('/api/shipping/config');
    if (response.ok) {
      return await response.json();
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
export async function getOAuthAuthorizeUrl(redirectUri?: string): Promise<{ authUrl: string; redirectUri: string; clientId: string }> {
  const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
  const response = await fetch(`/api/shipping/oauth/authorize-url${query}`);
  if (!response.ok) {
    throw new Error('Não foi possível gerar a URL de autorização do Melhor Envio.');
  }
  return response.json();
}

/**
 * Troca o código retornado na autorização pelo token oficial de produção
 */
export async function exchangeOAuthCodeApi(code: string, redirectUri?: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/shipping/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao trocar código de autorização.');
  }
  return data;
}

/**
 * Renova o token de produção via refresh token
 */
export async function refreshMelhorEnvioTokenApi(): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/shipping/oauth/refresh', {
    method: 'POST'
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao renovar token do Melhor Envio.');
  }
  return data;
}

/**
 * Salva diretamente o Bearer Token de Produção no servidor
 */
export async function saveManualTokenApi(token: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/shipping/token/manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao salvar token de produção.');
  }
  return data;
}

/**
 * Consulta a conta oficial conectada no Melhor Envio (Produção)
 */
export async function getAccountInfoApi(): Promise<any> {
  const response = await fetch('/api/shipping/account');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao consultar perfil no Melhor Envio.');
  }
  return data;
}

/**
 * Gera etiquetas de envio no Melhor Envio Produção
 */
export async function generateShippingLabelsApi(orderIds: string[], shipmentPayload?: any): Promise<any> {
  const response = await fetch('/api/shipping/labels/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderIds, shipmentPayload })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao gerar etiquetas no Melhor Envio.');
  }
  return data;
}

/**
 * Obtém o link para impressão das etiquetas em PDF no Melhor Envio Produção
 */
export async function printShippingLabelsApi(orderIds: string[], mode: 'public' | 'private' = 'public'): Promise<any> {
  const response = await fetch('/api/shipping/labels/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderIds, mode })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao obter impressão das etiquetas.');
  }
  return data;
}

/**
 * Rastreia códigos de envio no Melhor Envio Produção
 */
export async function trackShippingApi(trackingCodes: string[]): Promise<any> {
  const response = await fetch('/api/shipping/tracking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackingCodes })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao rastrear encomendas.');
  }
  return data;
}
