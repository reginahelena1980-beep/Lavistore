import {
  getAdminCredential,
  getAdminEmails,
  maskEmail,
  getRecoveryTokenFromCookies,
  hasActiveRecoveryToken,
  sendResponse
} from './_lib/adminAuth';

/**
 * Vercel Serverless Function: GET /api/admin/password-status
 * Returns sanitized metadata regarding administrative password status and
 * masked recovery email. Never exposes hashes, codes, or private credentials.
 */
export default async function handler(req: any, res: any) {
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
    const credential = await getAdminCredential();
    const { primaryEmail, storeEmailConfigured } = await getAdminEmails();
    const recoveryToken = getRecoveryTokenFromCookies(req);
    const hasRecoverySession = hasActiveRecoveryToken(recoveryToken || undefined);

    const isConfigured = Boolean(
      credential &&
      typeof credential.adminPasswordHash === 'string' &&
      credential.adminPasswordHash.startsWith('scrypt:')
    );

    const hasChanged = Boolean(credential?.adminPasswordChanged);

    return sendResponse(res, 200, {
      success: true,
      isDefaultPassword: !hasChanged,
      hasChanged,
      credentialConfigured: isConfigured,
      recoveryEmailMasked: maskEmail(primaryEmail),
      isStoreEmailConfigured: storeEmailConfigured,
      hasRecoverySession
    });
  } catch (err: any) {
    console.error('[Admin Password Status] Error:', err?.message || err);
    return sendResponse(res, 500, {
      success: false,
      error: 'Erro ao verificar status da senha.'
    });
  }
}
