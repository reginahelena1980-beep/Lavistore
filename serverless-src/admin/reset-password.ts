import {
  parseRequestBody,
  getRecoveryTokenFromCookies,
  verifyRecoveryToken,
  persistNewAdminPassword,
  buildClearRecoveryCookie,
  createSignedAdminSession,
  buildSessionCookie,
  setCookies,
  sendResponse
} from './_lib/adminAuth';

/**
 * Vercel Serverless Function: POST /api/admin/reset-password
 * Completes the password recovery flow:
 * 1. Validates submitted verification code against the signed recovery cookie.
 * 2. Hashes the new password with scrypt and saves it to Firestore (private_admin/auth).
 * 3. Clears the recovery cookie.
 * 4. Automatically establishes an authenticated administrative session.
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
    const verificationCode = body?.verificationCode;
    const newPassword = body?.newPassword;

    if (typeof newPassword !== 'string' || newPassword.trim().length < 8) {
      return sendResponse(res, 400, {
        success: false,
        error: 'A nova senha deve possuir pelo menos 8 caracteres.'
      });
    }

    if (typeof verificationCode !== 'string' || !verificationCode.trim()) {
      return sendResponse(res, 400, {
        success: false,
        error: 'O código de verificação é obrigatório.'
      });
    }

    const recoveryToken = getRecoveryTokenFromCookies(req);
    if (!recoveryToken) {
      return sendResponse(res, 400, {
        success: false,
        error: 'Nenhum código de recuperação está ativo ou a sessão expirou. Solicite um novo código.'
      });
    }

    const verification = verifyRecoveryToken(recoveryToken, verificationCode.trim());
    if (!verification.valid) {
      return sendResponse(res, 401, {
        success: false,
        error: 'Código de verificação incorreto ou expirado.'
      });
    }

    // Persist new scrypt hash to Firestore (private_admin/auth)
    const saved = await persistNewAdminPassword(newPassword.trim());
    if (!saved) {
      return sendResponse(res, 500, {
        success: false,
        error: 'Falha ao gravar a nova senha no banco de dados.'
      });
    }

    // Clear recovery cookie and issue new admin session cookie
    const cookiesToSet = [buildClearRecoveryCookie()];
    const sessionToken = createSignedAdminSession();
    if (sessionToken) {
      cookiesToSet.push(buildSessionCookie(sessionToken));
    }
    setCookies(res, cookiesToSet);

    return sendResponse(res, 200, {
      success: true,
      message: 'Nova senha cadastrada com sucesso.'
    });
  } catch (err: any) {
    console.error('[Admin Reset Password] Error:', err?.message || err);
    return sendResponse(res, 500, {
      success: false,
      error: 'Falha ao redefinir senha.'
    });
  }
}
