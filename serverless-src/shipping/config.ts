import {
  getShippingEnvironment,
  applyCorsHeaders,
  sendResponse
} from './_lib/melhorEnvio';

/**
 * Vercel Serverless Function: GET /api/shipping/config
 * ====================================================
 * Exposes exclusively non-sensitive operational integration status.
 * 
 * STRICT SECURITY CONSTRAINTS:
 * - NEVER returns token, access_token, refresh_token, or client_secret.
 * - NEVER returns Authorization header or raw environment variable values.
 * - Does not return MELHOR_ENVIO_EMAIL.
 * - Does not return FROM_CEP.
 */
export default async function handler(req: any, res: any) {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return sendResponse(res, 200, { ok: true });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return sendResponse(res, 405, {
      success: false,
      error: `Method ${req.method} Not Allowed`
    });
  }

  try {
    const { isConfigured, env } = getShippingEnvironment();

    return sendResponse(res, 200, {
      success: true,
      configured: isConfigured,
      env
    });
  } catch {
    return sendResponse(res, 500, {
      success: false,
      configured: false
    });
  }
}
