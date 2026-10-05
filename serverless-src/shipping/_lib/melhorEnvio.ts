/**
 * MELHOR ENVIO SECURE SERVERLESS UTILITIES
 * ========================================
 * Server-side only utility module for Melhor Envio shipping quotations.
 * Credentials are read exclusively from process.env.
 * 
 * STRICT SECURITY CONSTRAINTS:
 * - Credentials must NEVER be returned to the browser.
 * - Credentials must NEVER be logged.
 * - Authorization headers must NEVER be included in error responses or logs.
 * - No credentials from Firestore, bundled JSON, or hardcoded strings.
 */

export interface FormattedShippingProduct {
  id: string;
  width: number;
  height: number;
  length: number;
  weight: number;
  insurance_value: number;
  quantity: number;
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  deadline: string;
  deliveryDays: number;
  carrier: string;
  carrierLogo?: string;
  companyName: string;
}

export interface CalculateShippingResponse {
  options: ShippingOption[];
  fromPostalCode: string;
  toPostalCode: string;
  isSimulated?: boolean;
  message?: string;
  source?: 'melhor_envio_api' | 'fallback_simulator';
}

const DEFAULT_ORIGIN_CEP = '01001000';
const DEFAULT_SUPPORT_EMAIL = 'estilobeeadm@gmail.com';
const PRODUCTION_BASE_URL = 'https://melhorenvio.com.br';
const SANDBOX_BASE_URL = 'https://sandbox.melhorenvio.com.br';

/**
 * Returns operational, non-sensitive environment configuration.
 * Never returns tokens or secret credentials.
 */
export function getShippingEnvironment() {
  const envRaw = (process.env.MELHOR_ENVIO_ENV || 'production').trim().toLowerCase();
  const env = envRaw === 'sandbox' ? 'sandbox' : 'production';

  const defaultBase = env === 'sandbox' ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL;
  const baseUrl = (process.env.MELHOR_ENVIO_BASE_URL || defaultBase).trim().replace(/\/+$/, '');

  const rawFromCep = process.env.MELHOR_ENVIO_FROM_CEP || DEFAULT_ORIGIN_CEP;
  const fromCep = sanitizeCep(rawFromCep) || DEFAULT_ORIGIN_CEP;

  const email = (process.env.MELHOR_ENVIO_EMAIL || DEFAULT_SUPPORT_EMAIL).trim();
  const userAgent = `Lavistore Kids (${email})`;

  const token = getMelhorEnvioToken();
  const isConfigured = Boolean(token && token.length > 10);

  return {
    isConfigured,
    env,
    baseUrl,
    fromCep,
    userAgent
  };
}

/**
 * Internal-only reader for the Melhor Envio bearer token.
 * Sourced strictly from process.env.
 * NEVER exported to the client or logged.
 */
function getMelhorEnvioToken(): string {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  if (!token || typeof token !== 'string') {
    return '';
  }
  return token.trim();
}

/**
 * Strips non-digits and validates an 8-digit Brazilian CEP.
 * Returns the sanitized 8-digit string or null if invalid.
 */
export function sanitizeCep(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return null;
  }
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length !== 8) {
    return null;
  }
  return digits;
}

/**
 * Sanitizes the product list for Melhor Envio quotation.
 * Guarantees minimum dimensions and package safety accepted by carriers.
 */
export function sanitizeProducts(raw: unknown): FormattedShippingProduct[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      {
        id: 'default-package',
        width: 16,
        height: 8,
        length: 22,
        weight: 0.5,
        insurance_value: 50.0,
        quantity: 1
      }
    ];
  }

  return raw.map((item: any, idx: number) => {
    const width = Math.max(11, Number(item?.width) || 16);
    const height = Math.max(2, Number(item?.height) || 6);
    const length = Math.max(16, Number(item?.length) || 20);
    const weight = Math.max(0.1, Number(item?.weight) || 0.35);
    const insurance_value = Math.max(1, Number(item?.price ?? item?.insurance_value) || 29.90);
    const quantity = Math.max(1, Math.floor(Number(item?.quantity) || 1));

    return {
      id: String(item?.id || `item-${idx + 1}`),
      width,
      height,
      length,
      weight,
      insurance_value,
      quantity
    };
  });
}

/**
 * Calls the official Melhor Envio calculation endpoint server-to-server.
 * Attaches the Authorization header server-side and scrubs any error details
 * so secrets are never leaked.
 */
export async function calculateMelhorEnvioShipment(
  fromPostalCode: string,
  toPostalCode: string,
  products: FormattedShippingProduct[]
): Promise<ShippingOption[]> {
  const token = getMelhorEnvioToken();
  if (!token || token.length <= 10) {
    throw new Error('Melhor Envio token is not configured on the server.');
  }

  const { baseUrl, userAgent } = getShippingEnvironment();
  const url = `${baseUrl}/api/v2/me/shipment/calculate`;

  const payload = {
    from: { postal_code: fromPostalCode },
    to: { postal_code: toPostalCode },
    products,
    options: {
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: false
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    // Read text safely but never log or throw credentials
    let errorSummary = `HTTP ${response.status}`;
    try {
      const errorJson: any = await response.json();
      if (errorJson && typeof errorJson === 'object') {
        errorSummary = errorJson.message || errorJson.error || errorSummary;
      }
    } catch {
      // Keep sanitized status
    }
    // Defense in depth: scrub any token occurrence if present in server message
    const cleanError = String(errorSummary).replace(/Bearer\s+[A-Za-z0-9._-]+/gi, '[REDACTED]');
    throw new Error(`Melhor Envio API calculation failed: ${cleanError}`);
  }

  const data: any = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Unexpected response format from Melhor Envio API.');
  }

  return formatMelhorEnvioOptions(data);
}

/**
 * Transforms carrier responses into the standard Lavistore ShippingOption contract.
 */
export function formatMelhorEnvioOptions(data: any[]): ShippingOption[] {
  return data
    .filter((item: any) => item && !item.error && (item.custom_price || item.price))
    .map((item: any) => {
      const rawPrice = parseFloat(item.custom_price || item.price);
      const deliveryDays = Number(item.custom_delivery_time || item.delivery_time) || 5;
      const carrierName = item.company?.name || (item.name?.toLowerCase().includes('jadlog') ? 'Jadlog' : 'Correios');

      return {
        id: String(item.id),
        name: `${carrierName} ${item.name}`,
        price: Math.round(rawPrice * 100) / 100,
        originalPrice: Math.round(rawPrice * 100) / 100,
        deadline: `${deliveryDays} dias úteis`,
        deliveryDays,
        carrier: carrierName,
        carrierLogo: item.company?.picture,
        companyName: carrierName
      };
    });
}

/**
 * High-fidelity fallback quotation simulation ensuring zero downtime.
 * Used when the carrier API is unreachable, temporary network issues occur,
 * or during initialization before token activation.
 */
export function calculateFallbackShipping(
  toPostalCode: string,
  fromPostalCode: string,
  products: FormattedShippingProduct[]
): CalculateShippingResponse {
  const cleanToCep = sanitizeCep(toPostalCode) || '01001000';
  const cleanFromCep = sanitizeCep(fromPostalCode) || DEFAULT_ORIGIN_CEP;
  const firstDigit = parseInt(cleanToCep[0], 10) || 0;

  const totalWeightKg = products.reduce(
    (acc, p) => acc + (p.weight * p.quantity),
    0
  );
  const weightFactor = Math.min(1.8, Math.max(1, 1 + (totalWeightKg - 0.3) * 0.2));

  const regionMultipliers: Record<number, { pacBase: number; sedexBase: number; jadlogBase: number; daysOffset: number }> = {
    0: { pacBase: 12.90, sedexBase: 19.90, jadlogBase: 11.50, daysOffset: 1 }, // SP Capital
    1: { pacBase: 14.50, sedexBase: 22.90, jadlogBase: 13.90, daysOffset: 2 }, // SP Interior
    2: { pacBase: 18.90, sedexBase: 28.90, jadlogBase: 17.50, daysOffset: 3 }, // RJ / ES
    3: { pacBase: 19.50, sedexBase: 29.90, jadlogBase: 18.20, daysOffset: 3 }, // MG
    4: { pacBase: 24.90, sedexBase: 38.50, jadlogBase: 23.90, daysOffset: 5 }, // BA / SE
    5: { pacBase: 27.90, sedexBase: 42.00, jadlogBase: 26.50, daysOffset: 6 }, // Nordeste
    6: { pacBase: 32.90, sedexBase: 49.90, jadlogBase: 31.00, daysOffset: 7 }, // Norte / Nordeste
    7: { pacBase: 22.50, sedexBase: 34.90, jadlogBase: 21.00, daysOffset: 4 }, // Centro-Oeste
    8: { pacBase: 19.90, sedexBase: 31.50, jadlogBase: 18.90, daysOffset: 3 }, // PR / SC
    9: { pacBase: 22.90, sedexBase: 35.90, jadlogBase: 21.50, daysOffset: 4 }  // RS
  };

  const config = regionMultipliers[firstDigit] || {
    pacBase: 21.00,
    sedexBase: 32.00,
    jadlogBase: 19.50,
    daysOffset: 4
  };

  const simulatedOptions: ShippingOption[] = [
    {
      id: 'melhor-envio-correios-pac',
      name: 'Correios PAC',
      carrier: 'Correios',
      price: Math.round(config.pacBase * weightFactor * 100) / 100,
      originalPrice: Math.round(config.pacBase * weightFactor * 100) / 100,
      deadline: `${Math.max(2, 2 + config.daysOffset)} a ${Math.max(4, 4 + config.daysOffset)} dias úteis`,
      deliveryDays: 3 + config.daysOffset,
      carrierLogo: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=80&q=80',
      companyName: 'Correios'
    },
    {
      id: 'melhor-envio-jadlog-package',
      name: 'Jadlog .Package',
      carrier: 'Jadlog',
      price: Math.round(config.jadlogBase * weightFactor * 100) / 100,
      originalPrice: Math.round(config.jadlogBase * weightFactor * 100) / 100,
      deadline: `${Math.max(2, 1 + config.daysOffset)} a ${Math.max(3, 3 + config.daysOffset)} dias úteis`,
      deliveryDays: 2 + config.daysOffset,
      companyName: 'Jadlog'
    },
    {
      id: 'melhor-envio-correios-sedex',
      name: 'Correios SEDEX Expresso',
      carrier: 'Correios',
      price: Math.round(config.sedexBase * weightFactor * 100) / 100,
      originalPrice: Math.round(config.sedexBase * weightFactor * 100) / 100,
      deadline: `${Math.max(1, config.daysOffset > 3 ? 2 : 1)} a ${Math.max(2, config.daysOffset > 3 ? 3 : 2)} dias úteis`,
      deliveryDays: 1 + Math.min(2, Math.floor(config.daysOffset / 2)),
      carrierLogo: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=80&q=80',
      companyName: 'Correios'
    },
    {
      id: 'melhor-envio-jadlog-com',
      name: 'Jadlog .Com Prioritário',
      carrier: 'Jadlog',
      price: Math.round(config.jadlogBase * 1.3 * weightFactor * 100) / 100,
      originalPrice: Math.round(config.jadlogBase * 1.3 * weightFactor * 100) / 100,
      deadline: `${Math.max(1, config.daysOffset > 3 ? 2 : 1)} a ${Math.max(2, config.daysOffset > 3 ? 3 : 2)} dias úteis`,
      deliveryDays: 1 + Math.min(2, Math.floor(config.daysOffset / 2)),
      companyName: 'Jadlog'
    }
  ];

  return {
    options: simulatedOptions,
    fromPostalCode: cleanFromCep,
    toPostalCode: cleanToCep,
    isSimulated: true,
    source: 'fallback_simulator',
    message: 'Cotação calculada para este CEP.'
  };
}

/**
 * Safely sets standard CORS headers for cross-origin or same-origin API requests.
 */
export function applyCorsHeaders(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers?.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Date'
  );
}

/**
 * Standardized JSON response sender compatible with Vercel Serverless and Express.
 */
export function sendResponse(res: any, statusCode: number, data: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }

  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(data));
}

/**
 * Safely parses the request body across serverless environments.
 */
export function parseRequestBody(req: any): any {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return {};
    }
  }
  return typeof body === 'object' && body !== null ? body : {};
}
