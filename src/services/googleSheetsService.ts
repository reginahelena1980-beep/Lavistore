/**
 * SERVIÇO DE INTEGRAÇÃO COM GOOGLE SHEETS & FIREBASE AUTH (LAVISTORE BI)
 * 
 * Escopo: https://www.googleapis.com/auth/spreadsheets
 * Permite:
 * 1. Criar planilha corporativa do BI Lavistore Kids no Google Drive do lojista
 * 2. Sincronizar apuração por produto, CPV, faturamento, margens e pedidos
 * 3. Enviar novas vendas aprovadas (PIX / Cartão) automaticamente para a planilha
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { BiProductCalculatedRecord, OrderData } from '../types';
import { parseSpreadsheetBuffer } from '../utils/biFinanceEngine';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets'
];

// Reutiliza a instância do Firebase App ou inicializa a partir do firebase-applet-config.json
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.setCustomParameters({
  prompt: 'select_account'
});

// Cache em memória do access token OAuth (conforme diretriz de segurança de Workspace APIs)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  lastSync?: string;
  autoSync: boolean;
}

const CONFIG_KEY = 'lavistore_google_sheets_config';
let inMemorySheetsConfig: GoogleSheetsConfig | null = null;

export function getStoredSheetsConfig(): GoogleSheetsConfig | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(CONFIG_KEY);
    } catch {}
  }
  return inMemorySheetsConfig;
}

export function saveStoredSheetsConfig(config: GoogleSheetsConfig | null): void {
  inMemorySheetsConfig = config;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(CONFIG_KEY);
    } catch {}
  }
}

/**
 * Inicializa listener de autenticação Firebase Auth
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token não está mais em memória (ex: refresh de página)
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Realiza login via popup com conta Google e solicita permissão para o Google Sheets
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso da conta Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro ao autenticar com Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async (): Promise<void> => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Cria uma nova planilha no Google Sheets com 3 abas formatadas para a Lavistore
 */
export async function createBiSpreadsheet(
  title: string = 'Lavistore Kids - BI & Controle Financeiro',
  records: BiProductCalculatedRecord[] = [],
  orders: OrderData[] = []
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Usuário não autenticado no Google. Faça login primeiro.');

  const payload = {
    properties: {
      title,
      locale: 'pt_BR',
      autoRecalc: 'ON_CHANGE'
    },
    sheets: [
      {
        properties: {
          title: 'Resumo Financeiro',
          gridProperties: { frozenRowCount: 1, frozenColumnCount: 1 }
        }
      },
      {
        properties: {
          title: 'Apuração BI por Produto',
          gridProperties: { frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'Pedidos e Vendas',
          gridProperties: { frozenRowCount: 1 }
        }
      }
    ]
  };

  const createResp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!createResp.ok) {
    const err = await createResp.json();
    throw new Error(err.error?.message || 'Falha ao criar planilha no Google Sheets.');
  }

  const sheetData = await createResp.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  // Preenche dados iniciais
  await syncBiToSpreadsheet(spreadsheetId, records, orders);

  const newConfig: GoogleSheetsConfig = {
    spreadsheetId,
    spreadsheetUrl,
    title,
    lastSync: new Date().toISOString(),
    autoSync: true
  };
  saveStoredSheetsConfig(newConfig);

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Sincroniza todas as linhas de BI e Pedidos com a planilha existente
 */
export async function syncBiToSpreadsheet(
  spreadsheetId: string,
  records: BiProductCalculatedRecord[] = [],
  orders: OrderData[] = []
): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Usuário não autenticado no Google.');

  // 1. Monta dados da aba "Apuração BI por Produto"
  const biHeader = [
    'ID',
    'Produto',
    'Tamanho / Cor',
    'Mês / Ano',
    'Qtd Comprada',
    'Custo Total (R$)',
    'Custo Unitário (R$)',
    'Preço Venda (R$)',
    'Qtd Vendida',
    'Faturamento Realizado (R$)',
    'CPV - Custo da Venda (R$)',
    'Lucro Bruto (R$)',
    'Saldo Estoque (un)',
    'Capital Imobilizado (R$)',
    'Margem Real (%)',
    'Markup Real (%)',
    'Meta Atingida (%)',
    'Status Estoque'
  ];

  const biRows = records.map(r => [
    r.id,
    r.produto,
    r.tamCor || 'Único',
    `${r.mes} / ${r.ano}`,
    r.quantidadeComprada,
    Number(r.custoTotal.toFixed(2)),
    Number(r.custoUnitario.toFixed(2)),
    Number(r.precoVenda.toFixed(2)),
    r.quantidadeVendida,
    Number(r.vendaTotal.toFixed(2)),
    Number(r.custoVenda.toFixed(2)),
    Number(r.lucroBruto.toFixed(2)),
    r.saldoEstoqueQtd,
    Number(r.custoEstoque.toFixed(2)),
    `${Number(r.margemLucro.toFixed(1))}%`,
    `${Number(r.markupReal.toFixed(1))}%`,
    `${Number(r.atingimentoMeta.toFixed(1))}%`,
    r.statusEstoque.toUpperCase()
  ]);

  // 2. Monta dados da aba "Pedidos e Vendas"
  const ordersHeader = [
    'ID Pedido',
    'Data',
    'Cliente',
    'E-mail',
    'Telefone',
    'CPF',
    'Forma de Pagamento',
    'Status Mercado Pago',
    'ID Mercado Pago',
    'Transportadora',
    'Frete (R$)',
    'Subtotal (R$)',
    'Desconto / Cupom (R$)',
    'Total Pedido (R$)',
    'Itens Comprados'
  ];

  const orderRows = orders.map(o => {
    const itemsDesc = Array.isArray(o.items)
      ? o.items.map(it => `${it.quantity}x ${(it.product?.name || (it as any).name)}`).join('; ')
      : 'Itens';

    return [
      o.orderId,
      o.date,
      o.customerName,
      o.customerEmail,
      o.customerPhone,
      o.customerCpf || '-',
      o.paymentMethod,
      o.mercadoPagoStatus || 'approved',
      o.mercadoPagoPaymentId || '-',
      o.shippingMethod,
      Number(Number(o.shippingCost || 0).toFixed(2)),
      Number(Number(o.subtotal || 0).toFixed(2)),
      Number(Number(o.discountAmount || 0).toFixed(2)),
      Number(Number(o.total || 0).toFixed(2)),
      itemsDesc
    ];
  });

  // 3. Monta dados da aba "Resumo Financeiro"
  const totalFaturamento = records.reduce((acc, r) => acc + r.vendaTotal, 0);
  const totalCpv = records.reduce((acc, r) => acc + r.custoVenda, 0);
  const totalLucro = totalFaturamento - totalCpv;
  const margemMedia = totalFaturamento > 0 ? (totalLucro / totalFaturamento) * 100 : 0;
  const estoqueImobilizado = records.reduce((acc, r) => acc + r.custoEstoque, 0);
  const totalPcsEstoque = records.reduce((acc, r) => acc + r.saldoEstoqueQtd, 0);

  const resumoHeader = ['Indicador Executivo', 'Valor Consolidado', 'Detalhamento', 'Sincronizado em'];
  const resumoRows = [
    ['Faturamento Bruto Realizado', `R$ ${totalFaturamento.toFixed(2)}`, 'Vendas apuradas pelo BI', new Date().toLocaleString('pt-BR')],
    ['CPV Total (Custo Mercadoria Vendida)', `R$ ${totalCpv.toFixed(2)}`, 'Custo real dos produtos saídos', new Date().toLocaleString('pt-BR')],
    ['Lucro Bruto Comercial', `R$ ${totalLucro.toFixed(2)}`, 'Receita líquida antes de despesas fixas', new Date().toLocaleString('pt-BR')],
    ['Margem Bruta Média', `${margemMedia.toFixed(1)}%`, 'Percentual médio de rentabilidade', new Date().toLocaleString('pt-BR')],
    ['Capital Imobilizado em Estoque', `R$ ${estoqueImobilizado.toFixed(2)}`, `${totalPcsEstoque} peças físicas disponíveis`, new Date().toLocaleString('pt-BR')],
    ['Total de Pedidos Realizados', orders.length, 'Total de transações registradas', new Date().toLocaleString('pt-BR')]
  ];

  // Limpa e escreve as abas usando batchUpdate de values
  const writePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: "'Apuração BI por Produto'!A1:R" + (biRows.length + 1),
        values: [biHeader, ...biRows]
      },
      {
        range: "'Pedidos e Vendas'!A1:O" + (orderRows.length + 1),
        values: [ordersHeader, ...orderRows]
      },
      {
        range: "'Resumo Financeiro'!A1:D" + (resumoRows.length + 1),
        values: [resumoHeader, ...resumoRows]
      }
    ]
  };

  const updateResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(writePayload)
    }
  );

  if (!updateResp.ok) {
    const err = await updateResp.json();
    throw new Error(err.error?.message || 'Falha ao sincronizar dados com o Google Sheets.');
  }

  // Atualiza timestamp da última sincronização
  const currentConfig = getStoredSheetsConfig();
  if (currentConfig && currentConfig.spreadsheetId === spreadsheetId) {
    currentConfig.lastSync = new Date().toISOString();
    saveStoredSheetsConfig(currentConfig);
  }
}

/**
 * Helper para converter índice de coluna (0-based) em letra da planilha (A, B, C... Z, AA, AB...)
 */
export function colIndexToLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Extrai automaticamente o ID da planilha (Spreadsheet ID) a partir de qualquer formato de link do Google Sheets ou ID isolado.
 * Suporta:
 * - https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit...
 * - https://docs.google.com/spreadsheets/u/0/d/{SPREADSHEET_ID}/...
 * - https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv
 * - https://drive.google.com/file/d/{SPREADSHEET_ID}/view...
 * - {SPREADSHEET_ID} (ID alfanumérico direto)
 */
export function extractSpreadsheetId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();

  // 1. URL padrão do Google Sheets: /spreadsheets/(?:u/\d+/)?d/([a-zA-Z0-9-_]+)
  const sheetsMatch = trimmed.match(/\/spreadsheets(?:\/u\/\d+)?\/d\/([a-zA-Z0-9-_]+)/i);
  if (sheetsMatch && sheetsMatch[1]) return sheetsMatch[1];

  // 2. Link do Google Drive: /file/d/([a-zA-Z0-9-_]+) ou ?id=([a-zA-Z0-9-_]+)
  const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9-_]+)/i) || trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/i);
  if (driveMatch && driveMatch[1]) return driveMatch[1];

  // 3. ID puro isolado (mínimo 20 caracteres sem barras ou espaços)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;

  return null;
}

/**
 * Extrai o ID da aba (gid) caso exista no link do Google Sheets (ex: #gid=123456 ou ?gid=123456)
 */
export function extractSheetGid(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const match = urlOrId.trim().match(/[#?&]gid=([0-9]+)/i);
  return match && match[1] ? match[1] : null;
}

/**
 * Converte qualquer link de visualização ou compartilhamento do Google Sheets para o endpoint oficial de exportação CSV pública:
 * https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv
 */
export function convertToGoogleSheetsCsvUrl(urlOrId: string): string {
  const spreadsheetId = extractSpreadsheetId(urlOrId);
  if (!spreadsheetId) {
    throw new Error('Link ou ID da planilha do Google Sheets inválido. Cole a URL completa (ex: https://docs.google.com/spreadsheets/d/.../edit).');
  }

  const gid = extractSheetGid(urlOrId);
  if (gid && gid !== '0') {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
}

/**
 * Tipagem estrita para uma linha bruta em JSON derivada do CSV da planilha
 */
export interface GoogleSheetRawRow {
  [columnHeader: string]: string;
}

/**
 * Tipagem estrita para o resultado completo da importação da planilha
 */
export interface GoogleSheetImportResult {
  spreadsheetId: string;
  csvUrl: string;
  rawJson: GoogleSheetRawRow[];
  records: BiProductCalculatedRecord[];
  totalRows: number;
  warnings: string[];
}

/**
 * Transforma o texto CSV bruto em JSON estruturado com cabeçalhos como chaves dos objetos,
 * respeitando normas RFC-4180 (aspas, vírgulas ou ponto-e-vírgula como delimitadores).
 */
export function parseCsvToStructuredJson(csvText: string): {
  headers: string[];
  rows: GoogleSheetRawRow[];
} {
  if (!csvText || typeof csvText !== 'string') {
    return { headers: [], rows: [] };
  }

  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { headers: [], rows: [] };
  }

  // Detecta o delimitador analisando a primeira linha
  const firstLine = cleanText.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semicolonCount > commaCount && semicolonCount >= tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  }

  // Parser robusto com suporte a campos entre aspas contendo quebras de linha e delimitadores
  const parsedGrid: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // pula aspas escapadas
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // consome \r\n
      }
      currentRow.push(currentCell.trim());
      currentCell = '';

      if (currentRow.some(col => col.length > 0)) {
        parsedGrid.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(col => col.length > 0)) {
      parsedGrid.push(currentRow);
    }
  }

  if (parsedGrid.length < 2) {
    return { headers: parsedGrid[0] || [], rows: [] };
  }

  const rawHeaders = parsedGrid[0].map(h => h.replace(/^["']|["']$/g, '').trim());
  const dataRows = parsedGrid.slice(1);

  const rows: GoogleSheetRawRow[] = dataRows.map(row => {
    const rowObj: GoogleSheetRawRow = {};
    rawHeaders.forEach((header, index) => {
      const val = row[index] !== undefined ? row[index].replace(/^["']|["']$/g, '').trim() : '';
      rowObj[header] = val;
    });
    return rowObj;
  });

  return {
    headers: rawHeaders,
    rows
  };
}

/**
 * Realiza fetch no endpoint CSV do Google Sheets e trata possíveis erros de permissão ou formato
 */
export async function fetchGoogleSheetCsv(urlOrId: string): Promise<{
  csvText: string;
  csvUrl: string;
  spreadsheetId: string;
}> {
  const spreadsheetId = extractSpreadsheetId(urlOrId);
  if (!spreadsheetId) {
    throw new Error('Link ou ID da planilha do Google Sheets inválido. Verifique o link informado.');
  }

  const csvUrl = convertToGoogleSheetsCsvUrl(urlOrId);

  let responseText = '';
  let directFetchOk = false;

  // 1. Tenta fetch direto no endpoint oficial CSV do Google Sheets
  try {
    const response = await fetch(csvUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv,text/plain,*/*'
      },
      redirect: 'follow'
    });

    if (response.ok) {
      responseText = await response.text();
      directFetchOk = true;
    } else if (response.status === 404) {
      throw new Error('Planilha não encontrada no Google Sheets (404). Verifique se o link ou ID está correto.');
    } else if (response.status === 401 || response.status === 403) {
      throw new Error('A planilha está com acesso RESTRITO. No Google Sheets, clique em "Compartilhar" (canto superior direito) e altere para "Qualquer pessoa com o link" (como Leitor).');
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('404') || err.message.includes('RESTRITO'))) {
      throw err;
    }
    // Erros de CORS ou rede: tentará o fallback seguro via backend
  }

  // 2. Fallback via backend proxy caso o fetch direto seja bloqueado pelo navegador (CORS)
  if (!directFetchOk) {
    try {
      const fallbackRes = await fetch('/api/bi/import-google-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: csvUrl })
      });

      const fallbackRawText = await fallbackRes.text();
      let fallbackData: any;
      try {
        fallbackData = JSON.parse(fallbackRawText);
      } catch {
        throw new Error('O servidor retornou uma resposta não reconhecida. Certifique-se de que a planilha está pública para "Qualquer pessoa com o link".');
      }

      if (!fallbackRes.ok || !fallbackData.success) {
        throw new Error(fallbackData.error || 'Não foi possível carregar os dados da planilha do Google Sheets.');
      }

      if (fallbackData.csvText) {
        responseText = fallbackData.csvText;
      } else if (fallbackData.dataBase64) {
        const binStr = window.atob(fallbackData.dataBase64);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }
        responseText = new TextDecoder('utf-8').decode(bytes);
      } else {
        throw new Error('Os dados da planilha não foram recebidos corretamente.');
      }
    } catch (fbErr: any) {
      throw new Error(fbErr.message || 'Erro ao conectar à planilha do Google Sheets. Verifique o link e se a permissão está pública.');
    }
  }

  // 3. Validação de conteúdo HTML retornado (típico quando a planilha exige login ou permissão)
  const sample = responseText.slice(0, 1000).toLowerCase();
  const isHtml = sample.includes('<!doctype html') || sample.includes('<html') || sample.includes('<head>') || sample.startsWith('the page c');
  const isGoogleLogin = (
    sample.includes('accounts.google.com') ||
    sample.includes('servicelogin') ||
    sample.includes('sign in') ||
    sample.includes('drive.google.com/signin') ||
    sample.includes('access denied')
  );

  if (isHtml || isGoogleLogin) {
    throw new Error('Esta planilha do Google Sheets está com acesso RESTRITO (privada). No Google Sheets, clique em "Compartilhar" (canto superior direito) e altere o Acesso Geral para "Qualquer pessoa com o link" (como Leitor).');
  }

  if (!responseText.trim()) {
    throw new Error('A planilha baixada do Google Sheets está vazia.');
  }

  return {
    csvText: responseText,
    csvUrl,
    spreadsheetId
  };
}

/**
 * Importa a planilha do Google Sheets a partir de URL ou ID, converte o CSV para JSON estruturado,
 * valida colunas obrigatórias e calcula os registros financeiros de BI da Lavistore.
 */
export async function importGoogleSheetAsRecords(urlOrId: string): Promise<GoogleSheetImportResult> {
  const { csvText, csvUrl, spreadsheetId } = await fetchGoogleSheetCsv(urlOrId);
  const { rows } = parseCsvToStructuredJson(csvText);

  if (rows.length === 0) {
    throw new Error('A planilha está vazia ou não possui linhas de produtos abaixo do cabeçalho.');
  }

  // Processa as linhas usando o motor de validação e cálculos financeiros
  const encoder = new TextEncoder();
  const bytes = encoder.encode(csvText);
  const parsed = parseSpreadsheetBuffer(bytes);

  if (!parsed.success || parsed.records.length === 0) {
    const errorDetails = parsed.errors.length > 0
      ? parsed.errors.join(' | ')
      : 'Não foi possível identificar as colunas obrigatórias na planilha.';
    throw new Error(`${errorDetails} Certifique-se de que a primeira linha possui: Ano, Mês, Produto, Tam/Cor, Descrição, Quantidade Comprada, Custo Total, Preço de Venda.`);
  }

  return {
    spreadsheetId,
    csvUrl,
    rawJson: rows,
    records: parsed.records,
    totalRows: parsed.records.length,
    warnings: parsed.warnings
  };
}

export interface UpdateInitialSheetResult {
  spreadsheetId: string;
  sheetTitle: string;
  updatedRowsCount: number;
  updatedCellsCount: number;
  details: string[];
}

/**
 * CANAL INVERSO (Site ➔ Planilha Inicial):
 * Atualiza os dados de vendas e estoque na MESMA planilha que a lojista importou inicialmente.
 * Preserva exatamente a estrutura original, formatação, cabeçalhos e ordem das linhas.
 */
export async function updateUserInitialSpreadsheet(
  urlOrSpreadsheetId: string,
  records: BiProductCalculatedRecord[]
): Promise<UpdateInitialSheetResult> {
  const spreadsheetId = extractSpreadsheetId(urlOrSpreadsheetId);
  if (!spreadsheetId) {
    throw new Error('Link ou ID da planilha do Google Sheets inválido.');
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  // 1. Obter metadados da planilha para saber o nome da primeira aba
  const metaResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  if (!metaResp.ok) {
    const err = await metaResp.json().catch(() => ({}));
    if (metaResp.status === 401 || metaResp.status === 403) {
      throw new Error('PERMISSIONS_ERROR: Permissão negada para editar esta planilha no Google Sheets. Certifique-se de que a conta Google conectada tem acesso de editor à planilha.');
    }
    throw new Error(err.error?.message || 'Falha ao acessar os dados da planilha no Google Sheets.');
  }

  const metaData = await metaResp.json();
  const firstSheet = metaData.sheets?.[0];
  const sheetTitle = firstSheet?.properties?.title || 'Página1';

  // 2. Ler as linhas da aba principal (até 500 linhas)
  const rowsResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A1:Z500?valueRenderOption=UNFORMATTED_VALUE`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  if (!rowsResp.ok) {
    const err = await rowsResp.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao ler o conteúdo da planilha.');
  }

  const rowsData = await rowsResp.json();
  const allRows: any[][] = rowsData.values || [];
  if (allRows.length < 2) {
    throw new Error('A planilha está vazia ou não possui cabeçalho na primeira linha.');
  }

  const headerRow = allRows[0];
  
  const cleanHeader = (h: any) =>
    String(h || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  let colProduto = -1;
  let colTamCor = -1;
  let colQtdVendida = -1;
  let colVendaTotal = -1;
  let colCpv = -1;
  let colLucroBruto = -1;
  const colSaldoEstoqueList: number[] = [];
  const colCustoEstoqueList: number[] = [];

  headerRow.forEach((h: any, idx: number) => {
    const cleaned = cleanHeader(h);
    if (cleaned.includes('produto')) {
      colProduto = idx;
    } else if (cleaned.includes('tam') || cleaned.includes('cor')) {
      colTamCor = idx;
    } else if (cleaned.includes('vendida') || cleaned === 'vendas' || cleaned.includes('qtdvenda')) {
      colQtdVendida = idx;
    } else if (cleaned.includes('vendatotal') || cleaned.includes('faturamento')) {
      colVendaTotal = idx;
    } else if (cleaned.includes('lucro')) {
      colLucroBruto = idx;
    } else if (cleaned.includes('cpv') || (cleaned.includes('custototal') && idx > 10)) {
      colCpv = idx;
    } else if (cleaned.includes('saldo')) {
      colSaldoEstoqueList.push(idx);
    } else if (cleaned.includes('custoemestoque') || cleaned.includes('valorestoque')) {
      colCustoEstoqueList.push(idx);
    }
  });

  // Fallback baseado na estrutura comum da planilha da Lavistore (Ano, Mês, Produto, Tam/Cor... Col L = Quantidade Vendida)
  if (colProduto === -1) colProduto = 2; // Col C
  if (colQtdVendida === -1) {
    // Procura na Col L (index 11)
    if (headerRow.length > 11 && cleanHeader(headerRow[11]).includes('venda')) {
      colQtdVendida = 11;
    }
  }

  if (colQtdVendida === -1) {
    throw new Error('Não foi encontrada a coluna "Quantidade Vendida" na planilha para atualização.');
  }

  // 3. Montar as atualizações célula a célula (preservando o resto da planilha intacto)
  const valueUpdates: Array<{ range: string; values: any[][] }> = [];
  let updatedRowsCount = 0;
  let updatedCellsCount = 0;
  const details: string[] = [];

  for (let rowIndex = 1; rowIndex < allRows.length; rowIndex++) {
    const row = allRows[rowIndex];
    const rowNumber = rowIndex + 1; // Google Sheets é 1-indexed

    const rawProd = String(row[colProduto] || '').trim();
    if (!rawProd) continue;

    const rawTam = colTamCor >= 0 ? String(row[colTamCor] || '').trim() : '';

    // Encontra o registro correspondente no BI do site
    const match = records.find(r => {
      const sameName = r.produto.trim().toLowerCase() === rawProd.toLowerCase();
      if (!sameName) return false;

      if (colTamCor >= 0 && rawTam) {
        const rTam = (r.tamCor || '').trim().toLowerCase();
        const sTam = rawTam.toLowerCase();
        if (rTam && sTam && rTam !== sTam && rTam !== 'único' && sTam !== 'único') {
          return false;
        }
      }
      return true;
    });

    if (match) {
      updatedRowsCount++;
      
      // 1. Atualizar Quantidade Vendida
      const letterQtd = colIndexToLetter(colQtdVendida);
      valueUpdates.push({
        range: `'${sheetTitle}'!${letterQtd}${rowNumber}`,
        values: [[match.quantidadeVendida]]
      });
      updatedCellsCount++;

      // 2. Atualizar Venda Total se a coluna existir
      if (colVendaTotal >= 0) {
        const letterVenda = colIndexToLetter(colVendaTotal);
        valueUpdates.push({
          range: `'${sheetTitle}'!${letterVenda}${rowNumber}`,
          values: [[Number(match.vendaTotal.toFixed(2))]]
        });
        updatedCellsCount++;
      }

      // 3. Atualizar CPV se existir
      if (colCpv >= 0) {
        const letterCpv = colIndexToLetter(colCpv);
        valueUpdates.push({
          range: `'${sheetTitle}'!${letterCpv}${rowNumber}`,
          values: [[Number(match.custoVenda.toFixed(2))]]
        });
        updatedCellsCount++;
      }

      // 4. Atualizar Lucro Bruto se existir
      if (colLucroBruto >= 0) {
        const letterLucro = colIndexToLetter(colLucroBruto);
        valueUpdates.push({
          range: `'${sheetTitle}'!${letterLucro}${rowNumber}`,
          values: [[Number(match.lucroBruto.toFixed(2))]]
        });
        updatedCellsCount++;
      }

      // 5. Atualizar Saldo em Estoque em todas as colunas de saldo detectadas
      for (const colSaldo of colSaldoEstoqueList) {
        const letterSaldo = colIndexToLetter(colSaldo);
        valueUpdates.push({
          range: `'${sheetTitle}'!${letterSaldo}${rowNumber}`,
          values: [[match.saldoEstoqueQtd]]
        });
        updatedCellsCount++;
      }

      // 6. Atualizar Custo em Estoque / Valor Estoque
      for (const colCustoEst of colCustoEstoqueList) {
        const letterCustoEst = colIndexToLetter(colCustoEst);
        valueUpdates.push({
          range: `'${sheetTitle}'!${letterCustoEst}${rowNumber}`,
          values: [[Number(match.custoEstoque.toFixed(2))]]
        });
        updatedCellsCount++;
      }

      if (match.quantidadeVendida > 0) {
        details.push(`${match.produto}${match.tamCor ? ` (${match.tamCor})` : ''}: ${match.quantidadeVendida} un. vendida(s), saldo ${match.saldoEstoqueQtd} un.`);
      }
    }
  }

  if (valueUpdates.length === 0) {
    throw new Error('Nenhum produto correspondente foi encontrado entre o BI do site e a planilha.');
  }

  // 4. Disparar batchUpdate para aplicar todas as células em uma única chamada atômica
  const batchResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueUpdates
      })
    }
  );

  if (!batchResp.ok) {
    const err = await batchResp.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao salvar alterações na planilha inicial.');
  }

  // Salva no config para registrar o sync
  const currentConfig = getStoredSheetsConfig();
  const now = new Date();
  const timestamp = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  
  saveStoredSheetsConfig({
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    title: metaData.properties?.title || 'Planilha Inicial Lavistore',
    lastSync: now.toISOString(),
    autoSync: currentConfig ? currentConfig.autoSync : true
  });

  return {
    spreadsheetId,
    sheetTitle,
    updatedRowsCount,
    updatedCellsCount,
    details
  };
}

/**
 * Adiciona uma nova linha de pedido na aba "Pedidos e Vendas" da planilha conectada
 */
export async function appendOrderToSpreadsheet(
  spreadsheetId: string,
  order: OrderData
): Promise<void> {
  const token = await getAccessToken();
  if (!token) return;

  const itemsDesc = Array.isArray(order.items)
    ? order.items.map(it => `${it.quantity}x ${(it.product?.name || (it as any).name)}`).join('; ')
    : 'Itens';

  const row = [
    order.orderId,
    order.date,
    order.customerName,
    order.customerEmail,
    order.customerPhone,
    order.customerCpf || '-',
    order.paymentMethod,
    order.mercadoPagoStatus || 'approved',
    order.mercadoPagoPaymentId || '-',
    order.shippingMethod,
    Number(Number(order.shippingCost || 0).toFixed(2)),
    Number(Number(order.subtotal || 0).toFixed(2)),
    Number(Number(order.discountAmount || 0).toFixed(2)),
    Number(Number(order.total || 0).toFixed(2)),
    itemsDesc
  ];

  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Pedidos e Vendas'!A:O:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [row]
        })
      }
    );
  } catch (err) {
    console.warn('[Google Sheets] Não foi possível anexar pedido em tempo real:', err);
  }
}
