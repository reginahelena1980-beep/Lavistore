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

/**
 * Obtém o status de configuração da integração do Melhor Envio
 */
export async function getShippingConfig(): Promise<{
  configured: boolean;
  env: string;
  fromCep: string;
}> {
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
    env: 'sandbox',
    fromCep: '01001-000'
  };
}
