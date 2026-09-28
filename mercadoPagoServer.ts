/**
 * MERCADO PAGO - INTEGRAÇÃO OFICIAL DE PRODUÇÃO
 * Lavistore / Lavistore Kids
 * 
 * Credenciais Oficiais de Produção (Homologadas):
 * - User ID: 153059854
 * - Número da aplicação (Client ID): 2284468817819275
 * - Client Secret: S4245f21k2c5HO6hh1HAO5Z4TdMVIq00
 * - Public Key de Produção: APP_USR-3d4386ef-56c9-4327-8ca6-ccee96d68b27
 * - Access Token de Produção: APP_USR-2284468817819275-090511-d5a3cce116abc10a686c588cd9c0b04d-153059854
 * - Integração: Checkout Transparente (API Pagamentos)
 * - Ambiente: Produção (https://api.mercadopago.com)
 */

import fs from 'fs';
import path from 'path';

// Credenciais padrão de produção extraídas das credenciais oficiais da conta
export const DEFAULT_MP_PUBLIC_KEY = 'APP_USR-3d4386ef-56c9-4327-8ca6-ccee96d68b27';
export const DEFAULT_MP_ACCESS_TOKEN = 'APP_USR-2284468817819275-090511-d5a3cce116abc10a686c588cd9c0b04d-153059854';
export const DEFAULT_MP_CLIENT_ID = '2284468817819275';
export const DEFAULT_MP_CLIENT_SECRET = 'S4245f21k2c5HO6hh1HAO5Z4TdMVIq00';
export const DEFAULT_MP_USER_ID = '153059854';
export const MERCADO_PAGO_API_BASE_URL = 'https://api.mercadopago.com';

const PERSISTENT_DIR = path.join(process.cwd(), 'persistent_data');
const MP_CONFIG_FILE = path.join(PERSISTENT_DIR, 'mercadopago_config.json');

export interface StoredMercadoPagoConfig {
  publicKey: string;
  accessToken: string;
  clientId?: string;
  clientSecret?: string;
  userId?: string;
  environment: 'production' | 'sandbox';
  updatedAt: string;
  lastTestedAt?: string;
  lastTestStatus?: 'connected' | 'error';
  lastTestMessage?: string;
  availableMethods?: Array<{ id: string; name: string; status: string; type: string }>;
}

function ensurePersistentDir(): void {
  try {
    if (!fs.existsSync(PERSISTENT_DIR)) {
      fs.mkdirSync(PERSISTENT_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[Mercado Pago] Erro ao criar diretório persistent_data:', err);
  }
}

/**
 * Obtém as credenciais ativas do Mercado Pago
 * Prioridade: persistent_data/mercadopago_config.json > process.env > constantes oficiais de produção
 */
export function getMercadoPagoCredentials(): StoredMercadoPagoConfig {
  ensurePersistentDir();

  let fileConfig: Partial<StoredMercadoPagoConfig> = {};

  try {
    if (fs.existsSync(MP_CONFIG_FILE)) {
      const raw = fs.readFileSync(MP_CONFIG_FILE, 'utf-8');
      fileConfig = JSON.parse(raw) || {};
    }
  } catch (err) {
    console.warn('[Mercado Pago] Aviso ao ler mercadopago_config.json:', err);
  }

  const publicKey = (
    fileConfig.publicKey?.trim() ||
    process.env.MERCADO_PAGO_PUBLIC_KEY?.trim() ||
    process.env.VITE_MP_PUBLIC_KEY?.trim() ||
    process.env.VITE_MERCADO_PAGO_PUBLIC_KEY?.trim() ||
    DEFAULT_MP_PUBLIC_KEY
  );

  const accessToken = (
    fileConfig.accessToken?.trim() ||
    process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() ||
    DEFAULT_MP_ACCESS_TOKEN
  );

  const clientId = (
    fileConfig.clientId?.trim() ||
    process.env.MERCADO_PAGO_CLIENT_ID?.trim() ||
    DEFAULT_MP_CLIENT_ID
  );

  const clientSecret = (
    fileConfig.clientSecret?.trim() ||
    process.env.MERCADO_PAGO_CLIENT_SECRET?.trim() ||
    DEFAULT_MP_CLIENT_SECRET
  );

  const userId = (
    fileConfig.userId?.trim() ||
    process.env.MERCADO_PAGO_USER_ID?.trim() ||
    DEFAULT_MP_USER_ID
  );

  const environment: 'production' | 'sandbox' = publicKey.startsWith('TEST') ? 'sandbox' : 'production';

  return {
    publicKey,
    accessToken,
    clientId,
    clientSecret,
    userId,
    environment,
    updatedAt: fileConfig.updatedAt || new Date().toISOString(),
    lastTestedAt: fileConfig.lastTestedAt,
    lastTestStatus: fileConfig.lastTestStatus,
    lastTestMessage: fileConfig.lastTestMessage,
    availableMethods: fileConfig.availableMethods
  };
}

/**
 * Salva as credenciais do Mercado Pago no arquivo persistente de forma atômica
 */
export function saveMercadoPagoCredentials(data: Partial<StoredMercadoPagoConfig>): StoredMercadoPagoConfig {
  ensurePersistentDir();

  const current = getMercadoPagoCredentials();
  const updated: StoredMercadoPagoConfig = {
    ...current,
    ...data,
    updatedAt: new Date().toISOString()
  };

  try {
    const tmp = `${MP_CONFIG_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(updated, null, 2), 'utf-8');
    fs.renameSync(tmp, MP_CONFIG_FILE);
    console.log('[Mercado Pago] Credenciais de produção atualizadas com sucesso em persistent_data/mercadopago_config.json');
  } catch (err) {
    console.error('[Mercado Pago] Erro ao gravar mercadopago_config.json:', err);
  }

  return updated;
}

/**
 * Testa a conexão em tempo real com a API do Mercado Pago
 * Realiza uma requisição autenticada em https://api.mercadopago.com/v1/payment_methods
 */
export async function testMercadoPagoConnection(): Promise<{
  success: boolean;
  message: string;
  statusCode: number;
  environment: 'production' | 'sandbox';
  methodsCount: number;
  methods: Array<{ id: string; name: string; status: string; type: string }>;
  verifiedAt: string;
}> {
  const creds = getMercadoPagoCredentials();
  const token = creds.accessToken;

  if (!token || token.length < 10) {
    return {
      success: false,
      message: 'Access Token do Mercado Pago não configurado.',
      statusCode: 400,
      environment: creds.environment,
      methodsCount: 0,
      methods: [],
      verifiedAt: new Date().toISOString()
    };
  }

  try {
    const response = await fetch(`${MERCADO_PAGO_API_BASE_URL}/v1/payment_methods`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'Lavistore Kids (estilobeeadm@gmail.com)'
      }
    });

    const verifiedAt = new Date().toISOString();

    if (!response.ok) {
      const errText = await response.text();
      saveMercadoPagoCredentials({
        lastTestedAt: verifiedAt,
        lastTestStatus: 'error',
        lastTestMessage: `HTTP ${response.status}: ${errText}`
      });
      return {
        success: false,
        message: `Falha na autenticação do Mercado Pago (HTTP ${response.status}): ${errText}`,
        statusCode: response.status,
        environment: creds.environment,
        methodsCount: 0,
        methods: [],
        verifiedAt
      };
    }

    const data: any = await response.json();
    const methods: Array<{ id: string; name: string; status: string; type: string }> = Array.isArray(data)
      ? data.map((m: any) => ({
          id: m.id,
          name: m.name,
          status: m.status,
          type: m.payment_type_id || 'payment_method'
        }))
      : [];

    saveMercadoPagoCredentials({
      lastTestedAt: verifiedAt,
      lastTestStatus: 'connected',
      lastTestMessage: `Conexão bem-sucedida! ${methods.length} métodos ativos em produção.`,
      availableMethods: methods
    });

    return {
      success: true,
      message: `Conexão Oficial com o Mercado Pago validada com sucesso! ${methods.length} métodos de pagamento ativos.`,
      statusCode: 200,
      environment: creds.environment,
      methodsCount: methods.length,
      methods,
      verifiedAt
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao conectar com API do Mercado Pago: ${err.message}`,
      statusCode: 500,
      environment: creds.environment,
      methodsCount: 0,
      methods: [],
      verifiedAt: new Date().toISOString()
    };
  }
}
