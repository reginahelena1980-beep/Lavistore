import {
  getShippingEnvironment,
  sanitizeCep,
  sanitizeProducts,
  calculateMelhorEnvioShipment,
  calculateFallbackShipping,
  applyCorsHeaders,
  sendResponse,
  parseRequestBody
} from './_lib/melhorEnvio';

/**
 * Vercel Serverless Function: POST /api/shipping/calculate
 * ========================================================
 * Production proxy for Melhor Envio shipping quotations.
 * 
 * WORKFLOW:
 * Browser → POST /api/shipping/calculate → Vercel Serverless → Melhor Envio API → Vercel Serverless → Browser
 * 
 * STRICT SECURITY CONSTRAINTS:
 * - Reads MELHOR_ENVIO_TOKEN strictly from process.env on the server.
 * - Adds Authorization header server-to-server.
 * - NEVER exposes the Bearer token or Authorization header in responses or errors.
 * - Sanitizes all input parameters.
 * - Preserves the exact frontend response contract for zero checkout disruption.
 */
export default async function handler(req: any, res: any) {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return sendResponse(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendResponse(res, 405, {
      success: false,
      error: `Method ${req.method} Not Allowed`
    });
  }

  try {
    const body = parseRequestBody(req);
    const { toPostalCode, products, fromPostalCode } = body;

    // Validate destination postal code
    const cleanToCep = sanitizeCep(toPostalCode);
    if (!cleanToCep) {
      return sendResponse(res, 400, {
        error: 'CEP de destino inválido. Deve conter 8 dígitos numéricos.'
      });
    }

    // Sanitize products and dimensions
    const formattedProducts = sanitizeProducts(products);

    // Operational configuration from environment
    const { isConfigured, fromCep } = getShippingEnvironment();
    const cleanFromCep = sanitizeCep(fromPostalCode) || fromCep;

    // 1. If configured with server-side token, execute official quotation
    if (isConfigured) {
      try {
        const liveOptions = await calculateMelhorEnvioShipment(
          cleanFromCep,
          cleanToCep,
          formattedProducts
        );

        if (Array.isArray(liveOptions) && liveOptions.length > 0) {
          return sendResponse(res, 200, {
            options: liveOptions,
            fromPostalCode: cleanFromCep,
            toPostalCode: cleanToCep,
            isSimulated: false,
            source: 'melhor_envio_api'
          });
        }
      } catch (callError: any) {
        // Sanitize log message to guarantee credentials are never recorded
        const sanitizedMsg = String(callError?.message || '')
          .replace(/Bearer\s+[^\s]+/gi, '[REDACTED]')
          .replace(/[a-zA-Z0-9_\-]{30,}/g, '[REDACTED]');
        console.warn('[Melhor Envio Serverless] Quotation notice:', sanitizedMsg);
      }
    }

    // 2. High-fidelity contingency fallback (guarantees zero downtime)
    const fallback = calculateFallbackShipping(
      cleanToCep,
      cleanFromCep,
      formattedProducts
    );

    return sendResponse(res, 200, fallback);
  } catch (error: any) {
    const sanitizedError = String(error?.message || 'Erro interno ao processar cotação')
      .replace(/Bearer\s+[^\s]+/gi, '[REDACTED]');

    return sendResponse(res, 500, {
      error: 'Falha ao processar o cálculo de frete.',
      details: sanitizedError
    });
  }
}
