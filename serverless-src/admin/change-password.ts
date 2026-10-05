import {
  parseRequestBody,
  getAdminCredential,
  verifyAdminPasswordHash,
  persistNewAdminPassword,
  createSignedAdminSession,
  buildSessionCookie,
  setCookies,
  sendResponse
} from './_lib/adminAuth';

/**
 * Vercel Serverless Function: POST /api/admin/change-password
 * Allows changing the administrative password by validating the current password.
 * Persists the new scrypt hash to Firestore and maintains the active session.
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
    const currentPassword = body?.currentPassword;
    const newPassword = body?.newPassword;

    if (typeof newPassword !== 'string' || newPassword.trim().length < 8) {
      return sendResponse(res, 400, {
        success: false,
        error: 'A nova senha deve ter no mínimo 8 caracteres.'
      });
    }

    if (typeof currentPassword !== 'string' || !currentPassword.trim()) {
      return sendResponse(res, 400, {
        success: false,
        error: 'Senha atual é obrigatória.'
      });
    }

    const credential = await getAdminCredential();
    if (!credential || !credential.adminPasswordHash) {
      return sendResponse(res, 401, {
        success: false,
        error: 'A senha atual informada está incorreta.'
      });
    }

    const isValidCurrent = verifyAdminPasswordHash(
      currentPassword.trim(),
      credential.adminPasswordHash
    );

    if (!isValidCurrent) {
      return sendResponse(res, 401, {
        success: false,
        error: 'A senha atual informada está incorreta.'
      });
    }

    const saved = await persistNewAdminPassword(newPassword.trim());
    if (!saved) {
      return sendResponse(res, 500, {
        success: false,
        error: 'Falha ao salvar a nova senha no banco de dados.'
      });
    }

    // Refresh active admin session
    const sessionToken = createSignedAdminSession();
    if (sessionToken) {
      setCookies(res, [buildSessionCookie(sessionToken)]);
    }

    return sendResponse(res, 200, {
      success: true,
      message: 'Senha de gerência alterada com sucesso!'
    });
  } catch (err: any) {
    console.error('[Admin Change Password] Error:', err?.message || err);
    return sendResponse(res, 500, {
      success: false,
      error: 'Falha ao alterar senha de gerência.'
    });
  }
}
