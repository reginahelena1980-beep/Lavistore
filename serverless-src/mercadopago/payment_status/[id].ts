import { getMercadoPagoCredentials, MERCADO_PAGO_API_BASE_URL } from '../../../mercadoPagoServer';

/**
 * Vercel Serverless Function: GET /api/mercadopago/payment_status/[id]
 * Consulta em tempo real o status de um pagamento na API oficial do Mercado Pago.
 * Reutiliza a lógica de autenticação e credenciais do projeto (mercadoPagoServer.ts).
 */
export default async function handler(req: any, res: any) {
  // Configuração de CORS para requisições no navegador
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      return res.status(200).end();
    }
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    const notAllowed = { error: `Method ${req.method} Not Allowed` };
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(405).json(notAllowed);
    }
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(notAllowed));
  }

  try {
    const rawId = req.query?.id || req.params?.id || (typeof req.url === 'string' ? req.url.split('?')[0].split('/').filter(Boolean).pop() : '');
    const paymentId = Array.isArray(rawId) ? rawId[0] : String(rawId || '').trim();

    if (!paymentId) {
      const errBody = { error: 'ID do pagamento não informado.' };
      if (typeof res.status === 'function' && typeof res.json === 'function') {
        return res.status(400).json(errBody);
      }
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(errBody));
    }

    const creds = getMercadoPagoCredentials();
    const accessToken = creds.accessToken?.trim();

    if (!accessToken) {
      const simBody = { id: paymentId, status: 'approved', isSimulated: true };
      if (typeof res.status === 'function' && typeof res.json === 'function') {
        return res.status(200).json(simBody);
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(simBody));
    }

    const baseUrl = MERCADO_PAGO_API_BASE_URL || 'https://api.mercadopago.com';
    const mpResp = await fetch(`${baseUrl}/v1/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Lavistore Kids (estilobeeadm@gmail.com)'
      }
    });

    if (!mpResp.ok) {
      const errBody = {
        error: 'Pagamento não localizado no Mercado Pago.',
        statusCode: mpResp.status
      };
      if (typeof res.status === 'function' && typeof res.json === 'function') {
        return res.status(mpResp.status).json(errBody);
      }
      res.statusCode = mpResp.status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(errBody));
    }

    const mpData: any = await mpResp.json();

    const responsePayload = {
      id: String(mpData.id),
      status: mpData.status, // 'pending', 'approved', 'rejected', 'in_process'
      status_detail: mpData.status_detail,
      date_approved: mpData.date_approved,
      transaction_amount: mpData.transaction_amount
    };

    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(200).json(responsePayload);
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(responsePayload));
  } catch (err: any) {
    console.error('[Mercado Pago API Function] Erro ao consultar status do pagamento:', err?.message || err);
    const errBody = { error: 'Erro ao consultar status no Mercado Pago.' };
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(500).json(errBody);
    }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(errBody));
  }
}
