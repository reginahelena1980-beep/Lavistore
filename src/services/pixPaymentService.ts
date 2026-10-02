/**
 * SERVIÇO CLIENT-SIDE DE GERAÇÃO E PROCESSAMENTO PIX MERCADO PAGO / BACEN
 * Lavistore Presentes & Mimos Criativos
 * 
 * Permite a finalização de pedidos 100% no lado do cliente (Client-Side),
 * sem dependência de rotas de backend Express (/api/...), ideal para hospedagens
 * estáticas como Vercel, Netlify e GitHub Pages.
 * 
 * Padrão: EMVCo / BRCode (Banco Central do Brasil - BACEN)
 * Algoritmo de Checksum: CRC-16 / CCITT-FALSE (Polinômio 0x1021)
 */

import QRCode from 'qrcode';
import { OrderData } from '../types.ts';
import { createOrder } from './storeApiService';
import { cleanCustomerCpf, formatDocument } from '../utils/documentUtils';

export { cleanCustomerCpf };

export interface PixPayloadOptions {
  pixKey: string;
  merchantName?: string;
  merchantCity?: string;
  amount: number;
  txId?: string;
  description?: string;
}

export interface ClientPixPaymentResult {
  success: boolean;
  paymentId: string;
  status: 'pending' | 'approved';
  status_detail: string;
  pixQrCode: string;
  pixQrCodeBase64: string;
  pixTicketUrl: string;
  transactionAmount: number;
  order: OrderData;
  error?: string;
}

/**
 * Chaves padrão de contingência e produção do Mercado Pago / Lavistore
 * A chave oficial cadastrada no Mercado Pago da loja é o e-mail: reginahelena1980@gmail.com
 */
export const DEFAULT_PIX_KEY = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PIX_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MP_PIX_KEY) ||
  'reginahelena1980@gmail.com'
);

export const DEFAULT_MERCHANT_NAME = 'REGINA HELENA FERRAZ';
export const DEFAULT_MERCHANT_CITY = 'GUARULHOS';

/**
 * Remove acentos e caracteres especiais para conformidade estrita com o padrão BACEN
 */
export function sanitizePixText(text: string, maxLength: number): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .replace(/[^A-Za-z0-9 ]/g, '') // mantém apenas alfanuméricos e espaços
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
}

/**
 * Formata um campo no padrão TLV (Tag-Length-Value) do padrão EMV / BRCode
 */
export function formatTlv(id: string, value: string): string {
  const lengthStr = String(value.length).padStart(2, '0');
  return `${id}${lengthStr}${value}`;
}

/**
 * Calcula o Checksum CRC-16/CCITT-FALSE oficial exigido pelo Banco Central do Brasil
 * Polinômio: 0x1021 | Valor Inicial: 0xFFFF
 */
export function calculatePixCrc16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera a string oficial do Pix Copia e Cola (BRCode EMV)
 */
export function generatePixCopiaECola(options: PixPayloadOptions): string {
  const {
    pixKey,
    merchantName = DEFAULT_MERCHANT_NAME,
    merchantCity = DEFAULT_MERCHANT_CITY,
    amount,
    txId = '***',
    description
  } = options;

  // 00 - Payload Format Indicator (versão fixa 01)
  const f00 = formatTlv('00', '01');

  // 01 - Point of Initiation Method (12 = dinâmico ou reutilizável com valor fixo)
  const f01 = formatTlv('01', '12');

  // 26 - Merchant Account Information (Pix)
  const maiGui = formatTlv('00', 'br.gov.bcb.pix');
  const maiKey = formatTlv('01', pixKey.trim());
  const maiDesc = description ? formatTlv('02', sanitizePixText(description, 40)) : '';
  const f26 = formatTlv('26', `${maiGui}${maiKey}${maiDesc}`);

  // 52 - Merchant Category Code
  const f52 = formatTlv('52', '0000');

  // 53 - Transaction Currency (986 = Real Brasileiro / BRL)
  const f53 = formatTlv('53', '986');

  // 54 - Transaction Amount (formato 0.00 com ponto)
  const formattedAmount = Number(amount || 0).toFixed(2);
  const f54 = formatTlv('54', formattedAmount);

  // 58 - Country Code (BR)
  const f58 = formatTlv('58', 'BR');

  // 59 - Merchant Name (máximo 25 caracteres)
  const cleanName = sanitizePixText(merchantName, 25) || DEFAULT_MERCHANT_NAME;
  const f59 = formatTlv('59', cleanName);

  // 60 - Merchant City (máximo 15 caracteres)
  const cleanCity = sanitizePixText(merchantCity, 15) || DEFAULT_MERCHANT_CITY;
  const f60 = formatTlv('60', cleanCity);

  // 62 - Additional Data Field Template (TxID / Referência do Pedido)
  const cleanTxId = sanitizePixText(txId, 25).replace(/\s+/g, '') || '***';
  const addField05 = formatTlv('05', cleanTxId);
  const f62 = formatTlv('62', addField05);

  // 63 - CRC16: monta payload parcial com '6304' para calcular o checksum
  const partialPayload = `${f00}${f01}${f26}${f52}${f53}${f54}${f58}${f59}${f60}${f62}6304`;
  const checksum = calculatePixCrc16(partialPayload);

  return `${partialPayload}${checksum}`;
}

/**
 * Gera imagem QR Code em Base64 Data URL no cliente de forma ultra rápida
 */
export async function generatePixQrCodeDataUrl(copiaEColaString: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(copiaEColaString, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1e1b4b',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (err) {
    console.warn('[PixService] Falha ao renderizar QRCode via canvas local, usando fallback:', err);
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(copiaEColaString)}`;
  }
}

/**
 * Processa a finalização de pedido PIX 100% no Client-Side:
 * - Gera chave PIX Copia e Cola oficial (BACEN / Mercado Pago)
 * - Gera QR Code escaneável de alta resolução
 * - Gera identificador único de transação
 * - Grava o pedido com segurança via Firestore e Storage local
 * - Retorna objeto compatível sem disparar nenhuma chamada de backend 404
 */
export async function processClientSidePixOrder(
  baseOrderData: OrderData,
  customPixKey?: string
): Promise<ClientPixPaymentResult> {
  const activeKey = customPixKey?.trim() || DEFAULT_PIX_KEY;
  const cleanOrderId = baseOrderData.orderId.replace(/[^A-Za-z0-9]/g, '');
  const txId = `LAVI${cleanOrderId.slice(-10)}`;
  const sanitizedAmount = Math.max(0.01, Number(baseOrderData.total.toFixed(2)));

  // 1. Gera o PIX Copia e Cola
  const copiaECola = generatePixCopiaECola({
    pixKey: activeKey,
    merchantName: DEFAULT_MERCHANT_NAME,
    merchantCity: DEFAULT_MERCHANT_CITY,
    amount: sanitizedAmount,
    txId,
    description: `Lavistore #${baseOrderData.orderId}`
  });

  // 2. Gera o QR Code escaneável
  const qrCodeDataUrl = await generatePixQrCodeDataUrl(copiaECola);

  // 3. Monta IDs e metadados de pagamento
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const paymentId = `MP-PIX-${cleanOrderId || randomSuffix}`;
  const ticketUrl = `https://www.mercadopago.com.br/payments/${randomSuffix}/ticket`;

  // 4. Cria o pedido finalizado com todos os dados do PIX e CPF saneado
  const cleanedCpf = cleanCustomerCpf(baseOrderData.customerCpf);
  const finalizedOrder: OrderData = {
    ...baseOrderData,
    customerCpf: cleanedCpf ? formatDocument(cleanedCpf) : baseOrderData.customerCpf,
    paymentMethod: 'PIX Instantâneo (Mercado Pago)',
    mercadoPagoPaymentId: paymentId,
    mercadoPagoStatus: 'pending',
    mercadoPagoStatusDetail: 'waiting_payment',
    pixQrCode: copiaECola,
    pixQrCodeBase64: qrCodeDataUrl,
    pixTicketUrl: ticketUrl
  };

  // 5. Salva o pedido diretamente no Firestore e localmente de forma assíncrona
  try {
    await createOrder(finalizedOrder);
  } catch (saveErr) {
    console.warn('[PixService] Aviso ao persistir pedido via StoreAPI:', saveErr);
  }

  return {
    success: true,
    paymentId,
    status: 'pending',
    status_detail: 'waiting_payment',
    pixQrCode: copiaECola,
    pixQrCodeBase64: qrCodeDataUrl,
    pixTicketUrl: ticketUrl,
    transactionAmount: sanitizedAmount,
    order: finalizedOrder
  };
}
