import {
  buildClearSessionCookie,
  buildClearRecoveryCookie,
  setCookies,
  sendResponse
} from './_lib/adminAuth';

/**
 * Vercel Serverless Function: POST /api/admin/logout
 * Terminates the admin session by removing and expiring the HttpOnly cookie.
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
    // Expire both session and recovery cookies
    setCookies(res, [buildClearSessionCookie(), buildClearRecoveryCookie()]);

    return sendResponse(res, 200, {
      success: true,
      message: 'Sessão administrativa encerrada com sucesso.'
    });
  } catch (err: any) {
    return sendResponse(res, 500, {
      success: false,
      error: 'Erro ao encerrar sessão administrativa.'
    });
  }
}
