import {
  getAdminSessionFromCookies,
  verifyAdminSessionToken,
  sendResponse
} from './_lib/adminAuth';

/**
 * Vercel Serverless Function: GET /api/admin/session
 * Checks if the client has an active, valid HttpOnly admin session cookie.
 * Returns only authentication status ({ success: true, authenticated: boolean }).
 * Never returns tokens, secrets, or internal details.
 */
export default async function handler(req: any, res: any) {
  // CORS & Methods
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers?.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return sendResponse(res, 200, { ok: true });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendResponse(res, 405, { success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    const token = getAdminSessionFromCookies(req);
    if (!token) {
      return sendResponse(res, 200, {
        success: true,
        authenticated: false
      });
    }

    const { valid } = verifyAdminSessionToken(token);
    return sendResponse(res, 200, {
      success: true,
      authenticated: valid
    });
  } catch {
    return sendResponse(res, 200, {
      success: true,
      authenticated: false
    });
  }
}
