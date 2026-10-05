import {
  parseRequestBody,
  getAdminCredential,
  verifyAdminPasswordHash,
  createSignedAdminSession,
  buildSessionCookie,
  setCookies,
  sendResponse
} from './_lib/adminAuth';

/**
 * Vercel Serverless Function: POST /api/admin/verify-password
 * Verifies the administrative password and, if valid, establishes a stateless
 * HMAC-signed session via an HttpOnly cookie.
 */
export default async function handler(req: any, res: any) {
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
    return sendResponse(res, 405, { success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    const body = parseRequestBody(req);
    const password = body?.password;

    if (typeof password !== 'string' || !password.trim()) {
      return sendResponse(res, 400, {
        success: false,
        error: 'Senha é obrigatória.'
      });
    }

    const credential = await getAdminCredential();

    if (!credential || !credential.adminPasswordHash) {
      // Fail closed: without a valid configured hash, access is rejected
      return sendResponse(res, 401, {
        success: false,
        error: 'Senha de gerência incorreta.'
      });
    }

    const isValid = verifyAdminPasswordHash(password.trim(), credential.adminPasswordHash);

    if (!isValid) {
      return sendResponse(res, 401, {
        success: false,
        error: 'Senha de gerência incorreta.'
      });
    }

    const sessionToken = createSignedAdminSession();
    if (!sessionToken) {
      return sendResponse(res, 500, {
        success: false,
        error: 'Não foi possível iniciar a sessão administrativa.'
      });
    }

    // Set HttpOnly signed session cookie
    setCookies(res, [buildSessionCookie(sessionToken)]);

    return sendResponse(res, 200, {
      success: true,
      requiresPasswordChange: !Boolean(credential.adminPasswordChanged)
    });
  } catch (err: any) {
    console.error('[Admin Verify Password] Error:', err?.message || err);
    return sendResponse(res, 500, {
      success: false,
      error: 'Erro ao validar senha.'
    });
  }
}
