import type { IncomingMessage, ServerResponse } from 'http';
import { processMercadoPagoPayment } from '../../mercadoPagoServer.ts';

/**
 * Vercel Serverless Function: POST /api/mercadopago/process_payment
 * Delega o processamento da transação para a lógica oficial e testada em mercadoPagoServer.ts
 */
export default async function handler(req: any, res: any) {
  // CORS configuration for Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Meli-Session-Id'
  );

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      return res.status(200).end();
    }
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    const notAllowed = { success: false, error: `Method ${req.method} Not Allowed` };
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(405).json(notAllowed);
    }
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(notAllowed));
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // Preserva body original se já for texto
      }
    }

    const result = await processMercadoPagoPayment(body || {}, req.headers || {});

    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(result.statusCode).json(result.body);
    }

    res.statusCode = result.statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(result.body));
  } catch (error: any) {
    console.error('[Mercado Pago API Function] Erro interno:', error?.message || error);
    const errBody = {
      success: false,
      error: 'Falha interna ao processar pagamento no Mercado Pago.',
      details: error?.message || 'Erro desconhecido'
    };

    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(500).json(errBody);
    }

    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(errBody));
  }
}
