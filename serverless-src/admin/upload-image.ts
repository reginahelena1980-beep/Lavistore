import {
  getAdminSessionFromCookies,
  verifyAdminSessionToken,
  parseRequestBody,
  sendResponse
} from './_lib/adminAuth';
import { processImageUpload } from './_lib/imageUploadService';

/**
 * Vercel Serverless Function: POST /api/admin/upload-image
 *
 * Secure server-side image upload endpoint for Lavistore Admin.
 * Validates HttpOnly admin session cookie (lavistore_admin_session),
 * parses and validates Data URL image payload, computes deterministic SHA-256
 * storage path, checks idempotency in Firebase Storage, and returns
 * tokenized HTTPS download URL.
 *
 * The browser NEVER writes directly to Firebase Storage.
 */
export default async function handler(req: any, res: any) {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers?.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return sendResponse(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendResponse(res, 405, {
      success: false,
      error: `Method ${req.method} Not Allowed`
    });
  }

  // 1. Validate Lavistore Admin Authentication
  const token = getAdminSessionFromCookies(req);
  if (!token) {
    return sendResponse(res, 401, {
      success: false,
      error: 'Acesso não autorizado. Sessão administrativa necessária.'
    });
  }

  const { valid, payload } = verifyAdminSessionToken(token);
  if (!valid || !payload) {
    return sendResponse(res, 401, {
      success: false,
      error: 'Sessão administrativa inválida ou expirada.'
    });
  }

  // 2. Parse request body and process upload
  try {
    const body = parseRequestBody(req);
    const result = await processImageUpload(body);
    return sendResponse(res, result.status, result.body);
  } catch (err: any) {
    console.error('[Admin Upload Image] Unexpected handler error:', err?.message || 'Unknown error');
    return sendResponse(res, 500, {
      success: false,
      error: 'Erro interno ao processar upload de imagem.'
    });
  }
}
