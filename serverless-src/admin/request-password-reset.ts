import crypto from 'crypto';
import {
  parseRequestBody,
  getAdminEmails,
  maskEmail,
  createSignedRecoveryToken,
  buildRecoveryCookie,
  setCookies,
  createMailTransporter,
  sendResponse
} from './_lib/adminAuth';

/**
 * Vercel Serverless Function: POST /api/admin/request-password-reset
 * Initiates the password recovery flow:
 * 1. Validates the recipient against configured administrative emails.
 * 2. Generates a cryptographically random 6-digit verification code.
 * 3. Sends the code via SMTP to the administrative email.
 * 4. Issues a stateless HMAC-signed HttpOnly recovery cookie containing a hash
 *    of the code (raw code is NEVER stored in the cookie or returned to client).
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
    const requestedEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    const { primaryEmail, allowedEmails } = await getAdminEmails();

    if (!primaryEmail || allowedEmails.length === 0) {
      return sendResponse(res, 503, {
        success: false,
        error: 'Nenhum e-mail administrativo está configurado para recuperação.'
      });
    }

    const targetEmail = requestedEmail || primaryEmail;

    if (!allowedEmails.includes(targetEmail)) {
      return sendResponse(res, 400, {
        success: false,
        error: 'O e-mail informado não corresponde ao e-mail administrativo cadastrado.'
      });
    }

    // Cryptographically secure 6-digit verification code
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

    // Create signed recovery token (stores HMAC hash of code, never raw code)
    const recoveryToken = createSignedRecoveryToken(targetEmail, code);
    if (!recoveryToken) {
      return sendResponse(res, 500, {
        success: false,
        error: 'Não foi possível gerar a sessão de recuperação.'
      });
    }

    const { transporter, isConfigured } = createMailTransporter();

    if (!isConfigured || !transporter) {
      return sendResponse(res, 503, {
        success: false,
        error: 'O serviço de e-mail de recuperação não está configurado no momento.'
      });
    }

    const fromEmail = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || targetEmail;
    const fromAddress = fromEmail.includes('<') ? fromEmail : `"Lavistore Presentes" <${fromEmail}>`;

    try {
      await transporter.sendMail({
        from: fromAddress,
        to: targetEmail,
        subject: 'Lavistore - Código de Recuperação de Senha',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #1f2937;">
            <h2 style="color: #701a75;">Lavistore Presentes &amp; Mimos</h2>
            <p>Foi solicitada uma redefinição da senha do Painel Administrativo.</p>
            <p>Seu código de segurança é:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #be185d; margin: 20px 0;">
              ${code}
            </div>
            <p>Este código expira em 15 minutos.</p>
            <p style="color: #6b7280; font-size: 12px;">Se você não solicitou esta alteração, ignore esta mensagem com segurança.</p>
          </div>
        `
      });
    } catch (mailError: any) {
      console.error('[Admin Recovery Mail] SMTP dispatch failed:', mailError?.message || mailError);
      return sendResponse(res, 503, {
        success: false,
        error: 'Não foi possível enviar o código de recuperação por e-mail.'
      });
    }

    // Set signed recovery HttpOnly cookie
    setCookies(res, [buildRecoveryCookie(recoveryToken)]);

    return sendResponse(res, 200, {
      success: true,
      message: `Código enviado para ${maskEmail(targetEmail)}.`,
      emailMasked: maskEmail(targetEmail),
      emailSent: true,
      expiresInMinutes: 15
    });
  } catch (err: any) {
    console.error('[Admin Request Reset] Error:', err?.message || err);
    return sendResponse(res, 500, {
      success: false,
      error: 'Erro ao solicitar recuperação de senha.'
    });
  }
}
