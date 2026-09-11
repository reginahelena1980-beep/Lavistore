import * as XLSX from 'xlsx';
import { BiProductCalculatedRecord, BiConsolidatedKpis, BiProductRowRaw } from '../types';

/**
 * MOTOR DE CÁLCULOS E PROCESSAMENTO DE BI FINANCEIRO - LAVISTORE
 * =============================================================
 * Implementa as regras estritas de negócios e fórmulas de e-commerce:
 * 1. Custo Unitário = Custo Total / Quantidade Comprada
 * 2. Venda Total (Faturamento) = Quantidade Vendida * Preço de Venda
 * 3. Custo da Venda (CPV) = Quantidade Vendida * Custo Unitário
 * 4. Lucro Bruto = Venda Total - Custo da Venda
 * 5. Saldo em Estoque (Quantidade) = Quantidade Comprada - Quantidade Vendida
 * 6. Custo em Estoque (Capital Imobilizado) = Saldo em Estoque * Custo Unitário
 * 7. Margem de Lucro e Rentabilidade (Real x Planejado)
 */

/**
 * Converte valores monetários ou numéricos do formato brasileiro (ex: "1.250,50" ou "R$ 35,90") para número float
 */
export function parseNumberPtBr(value: any): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  const str = String(value).trim();
  // Remove "R$", espaços e caracteres estranhos mantendo dígitos, pontos, vírgulas e sinal negativo
  const cleanStr = str.replace(/[R$\s]/g, '');

  // Se tiver formato brasileiro como "1.250,50", converte para "1250.50"
  if (cleanStr.includes(',') && cleanStr.includes('.')) {
    const standardized = cleanStr.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(standardized);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Se tiver apenas vírgula decimal como "35,90", substitui por ponto
  if (cleanStr.includes(',')) {
    const standardized = cleanStr.replace(',', '.');
    const parsed = parseFloat(standardized);
    return isNaN(parsed) ? 0 : parsed;
  }

  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normaliza o nome do mês para exibição consistente
 */
export function normalizeMonthName(monthRaw: any): string {
  if (!monthRaw) return 'Janeiro';
  const str = String(monthRaw).trim();

  // Se for um número decimal (ex: "32.5", "22.94") ou contiver vírgula/ponto decimal, não é um mês válido
  if (/^\d+[.,]\d+$/.test(str) || (str.length > 2 && /^\d+$/.test(str))) {
    return 'Janeiro';
  }

  const cleanStr = str.toLowerCase();

  const monthMap: Record<string, string> = {
    '1': 'Janeiro', '01': 'Janeiro', 'jan': 'Janeiro', 'janeiro': 'Janeiro',
    '2': 'Fevereiro', '02': 'Fevereiro', 'fev': 'Fevereiro', 'fevereiro': 'Fevereiro',
    '3': 'Março', '03': 'Março', 'mar': 'Março', 'marco': 'Março', 'março': 'Março',
    '4': 'Abril', '04': 'Abril', 'abr': 'Abril', 'abril': 'Abril',
    '5': 'Maio', '05': 'Maio', 'mai': 'Maio', 'maio': 'Maio',
    '6': 'Junho', '06': 'Junho', 'jun': 'Junho', 'junho': 'Junho',
    '7': 'Julho', '07': 'Julho', 'jul': 'Julho', 'julho': 'Julho',
    '8': 'Agosto', '08': 'Agosto', 'ago': 'Agosto', 'agosto': 'Agosto',
    '9': 'Setembro', '09': 'Setembro', 'set': 'Setembro', 'setembro': 'Setembro',
    '10': 'Outubro', 'out': 'Outubro', 'outubro': 'Outubro',
    '11': 'Novembro', 'nov': 'Novembro', 'novembro': 'Novembro',
    '12': 'Dezembro', 'dez': 'Dezembro', 'dezembro': 'Dezembro'
  };

  return monthMap[cleanStr] || (cleanStr.charAt(0).toUpperCase() + cleanStr.slice(1));
}

/**
 * Normaliza o ano (garante número de 4 dígitos)
 */
export function normalizeYear(yearRaw: any): number {
  if (!yearRaw) return new Date().getFullYear();
  const num = parseInt(String(yearRaw).replace(/\D/g, ''), 10);
  if (!num || num < 2000 || num > 2100) return new Date().getFullYear();
  return num;
}

/**
 * Motor central de cálculo financeiro de uma linha/produto
 */
export function calculateBiRow(raw: Partial<BiProductRowRaw>, id?: string): BiProductCalculatedRecord {
  const ano = normalizeYear(raw.ano);
  const mes = normalizeMonthName(raw.mes);
  const produto = String(raw.produto || 'Produto Sem Nome').trim();
  const tamCor = String(raw.tamCor || 'Único').trim();
  const descricao = String(raw.descricao || '').trim();

  const quantidadeComprada = Math.max(0, Math.round(parseNumberPtBr(raw.quantidadeComprada)));
  const custoTotal = Math.max(0, parseNumberPtBr(raw.custoTotal));
  const precoVenda = Math.max(0, parseNumberPtBr(raw.precoVenda));
  const quantidadeVendida = Math.max(0, Math.round(parseNumberPtBr(raw.quantidadeVendida)));

  // 1. Custo Unitário = Custo Total / Quantidade Comprada
  const custoUnitario = quantidadeComprada > 0 
    ? Math.round((custoTotal / quantidadeComprada) * 100) / 100 
    : 0;

  // 2. Venda Total (Faturamento) = Quantidade Vendida * Preço de Venda
  const vendaTotal = Math.round((quantidadeVendida * precoVenda) * 100) / 100;

  // 3. Custo da Venda (CPV) = Quantidade Vendida * Custo Unitário
  const custoVenda = Math.round((quantidadeVendida * custoUnitario) * 100) / 100;

  // 4. Lucro Bruto = Venda Total - Custo da Venda (CPV)
  const lucroBruto = Math.round((vendaTotal - custoVenda) * 100) / 100;

  // 5. Saldo em Estoque (Quantidade) = Quantidade Comprada - Quantidade Vendida
  const saldoEstoqueQtd = quantidadeComprada - quantidadeVendida;

  // 6. Custo em Estoque (Capital Imobilizado) = Saldo em Estoque * Custo Unitário
  const custoEstoque = Math.max(0, Math.round((saldoEstoqueQtd * custoUnitario) * 100) / 100);

  // 7. Margem de Lucro (%) = (Lucro Bruto / Venda Total) * 100
  const margemLucro = vendaTotal > 0 
    ? Math.round((lucroBruto / vendaTotal) * 1000) / 10 
    : 0;

  // Mark-up Real (%) = ((Preço Venda - Custo Unitário) / Custo Unitário) * 100
  const markupReal = custoUnitario > 0 
    ? Math.round(((precoVenda - custoUnitario) / custoUnitario) * 1000) / 10 
    : 0;

  // Indicadores Planejados (Potencial Teórico da Compra)
  const faturamentoPlanejado = Math.round((quantidadeComprada * precoVenda) * 100) / 100;
  const lucroPlanejado = Math.round((faturamentoPlanejado - custoTotal) * 100) / 100;
  const margemPlanejada = faturamentoPlanejado > 0 
    ? Math.round((lucroPlanejado / faturamentoPlanejado) * 1000) / 10 
    : 0;

  // Atingimento da Meta (%) = (Venda Total / Faturamento Planejado) * 100
  const atingimentoMeta = faturamentoPlanejado > 0 
    ? Math.round((vendaTotal / faturamentoPlanejado) * 1000) / 10 
    : 0;

  // Rentabilidade Real sobre o Capital Total Investido na Compra (%) = (Lucro Bruto / Custo Total) * 100
  const rentabilidade = custoTotal > 0 
    ? Math.round((lucroBruto / custoTotal) * 1000) / 10 
    : 0;

  // Status visual de estoque
  let statusEstoque: 'ok' | 'baixo' | 'esgotado' | 'negativo' = 'ok';
  if (saldoEstoqueQtd < 0) {
    statusEstoque = 'negativo';
  } else if (saldoEstoqueQtd === 0) {
    statusEstoque = 'esgotado';
  } else if (saldoEstoqueQtd <= 5) {
    statusEstoque = 'baixo';
  }

  return {
    id: id || `bi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ano,
    mes,
    produto,
    tamCor,
    descricao,
    quantidadeComprada,
    custoTotal,
    precoVenda,
    quantidadeVendida,
    custoUnitario,
    vendaTotal,
    custoVenda,
    lucroBruto,
    saldoEstoqueQtd,
    custoEstoque,
    margemLucro,
    markupReal,
    faturamentoPlanejado,
    lucroPlanejado,
    margemPlanejada,
    atingimentoMeta,
    rentabilidade,
    statusEstoque,
    // Integração com a Vitrine
    publishedToVitrine: Boolean(raw.publishedToVitrine),
    vitrineProductId: (raw as any).vitrineProductId,
    autoHideWhenOutOfStock: (raw as any).autoHideWhenOutOfStock !== undefined ? Boolean((raw as any).autoHideWhenOutOfStock) : true,
    vitrineImageUrl: (raw as any).vitrineImageUrl,
    vitrineCategory: (raw as any).vitrineCategory,
    vitrineTag: (raw as any).vitrineTag
  };
}

/**
 * Calcula os totais e KPIs consolidados para os filtros selecionados
 */
export function calculateConsolidatedKpis(records: BiProductCalculatedRecord[]): BiConsolidatedKpis {
  let faturamentoTotal = 0;
  let custoTotalCompras = 0;
  let cpvTotal = 0;
  let lucroBrutoTotal = 0;
  let valorTotalEstoque = 0;
  let saldoTotalEstoqueQtd = 0;
  let totalCompradoQtd = 0;
  let totalVendidoQtd = 0;
  let faturamentoPlanejadoTotal = 0;

  for (const r of records) {
    faturamentoTotal += r.vendaTotal;
    custoTotalCompras += r.custoTotal;
    cpvTotal += r.custoVenda;
    lucroBrutoTotal += r.lucroBruto;
    valorTotalEstoque += r.custoEstoque;
    saldoTotalEstoqueQtd += r.saldoEstoqueQtd;
    totalCompradoQtd += r.quantidadeComprada;
    totalVendidoQtd += r.quantidadeVendida;
    faturamentoPlanejadoTotal += r.faturamentoPlanejado;
  }

  const margemLucroMedia = faturamentoTotal > 0
    ? Math.round((lucroBrutoTotal / faturamentoTotal) * 1000) / 10
    : 0;

  const atingimentoGlobal = faturamentoPlanejadoTotal > 0
    ? Math.round((faturamentoTotal / faturamentoPlanejadoTotal) * 1000) / 10
    : 0;

  return {
    faturamentoTotal: Math.round(faturamentoTotal * 100) / 100,
    custoTotalCompras: Math.round(custoTotalCompras * 100) / 100,
    cpvTotal: Math.round(cpvTotal * 100) / 100,
    lucroBrutoTotal: Math.round(lucroBrutoTotal * 100) / 100,
    valorTotalEstoque: Math.round(valorTotalEstoque * 100) / 100,
    saldoTotalEstoqueQtd,
    totalCompradoQtd,
    totalVendidoQtd,
    margemLucroMedia,
    faturamentoPlanejadoTotal: Math.round(faturamentoPlanejadoTotal * 100) / 100,
    atingimentoGlobal
  };
}

/**
 * Limpa caracteres corrompidos por codificação inadequada (mojibake comum UTF-8 vs Latin-1)
 */
function cleanMojibake(str: string): string {
  return str
    .replace(/Ãª/gi, 'ê')
    .replace(/Ã©/gi, 'é')
    .replace(/Ã¨/gi, 'è')
    .replace(/Ã§/gi, 'ç')
    .replace(/Ã£/gi, 'ã')
    .replace(/Ã¡/gi, 'á')
    .replace(/Ã /gi, 'à')
    .replace(/Ã³/gi, 'ó')
    .replace(/Ãµ/gi, 'õ')
    .replace(/Ãº/gi, 'ú')
    .replace(/Ã­/gi, 'í')
    .replace(/Â/g, '')
    .replace(/\uFFFD/g, '');
}

/**
 * Dicionário de sinônimos para identificação flexível e inteligente de cabeçalhos de planilhas.
 * Trata acentos (ê, ç, ã, etc.), sem acento, variações de nomenclatura, colunas duplicadas e falhas de encoding.
 */
function normalizeHeaderKey(rawHeader: string, index?: number, allHeaders?: string[]): string {
  const cleaned = cleanMojibake(rawHeader || '').trim();
  const lowerWithSpaces = cleaned
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const h = lowerWithSpaces.replace(/[^a-z0-9]/g, '');

  const isEstoque = lowerWithSpaces.includes('estoque') || lowerWithSpaces.includes('stock');
  const isVendaContext = lowerWithSpaces.includes('venda') || lowerWithSpaces.includes('vend') || lowerWithSpaces.includes('cpv') || lowerWithSpaces.includes('cmv');
  const isCompraContext = lowerWithSpaces.includes('compra') || lowerWithSpaces.includes('adquir') || lowerWithSpaces.includes('aquisic');

  // 1. Ano
  if (h === 'ano' || h === 'year' || h === 'exercicio' || lowerWithSpaces.startsWith('ano')) {
    return 'ano';
  }

  // 2. Mês (NUNCA deve bater em colunas com "estoque" ou "em estoque"!)
  if (!isEstoque) {
    if (
      h === 'mes' ||
      h === 'month' ||
      h === 'ms' ||
      h === 'mesreferencia' ||
      h === 'mesref' ||
      h === 'competencia' ||
      lowerWithSpaces.startsWith('mes ') ||
      lowerWithSpaces.startsWith('mes/') ||
      lowerWithSpaces.startsWith('mês') ||
      /\bmes\b/.test(lowerWithSpaces)
    ) {
      return 'mes';
    }
  }

  // 3. Produto (trata "Produto", "Nome", "Item", "Nome do Produto", etc.)
  if (
    h === 'produto' ||
    h === 'product' ||
    h === 'item' ||
    h === 'nome' ||
    h === 'nomedoproduto' ||
    lowerWithSpaces.startsWith('produto') ||
    lowerWithSpaces.startsWith('nome do produto')
  ) {
    return 'produto';
  }

  // 4. Tam/Cor (trata "Tam/Cor", "Tamanho/Cor", "Tamanho", "Cor", "Variação", "Modelo")
  if (
    h.includes('tam') ||
    h.includes('cor') ||
    h.includes('tamanho') ||
    h.includes('variacao') ||
    h.includes('modelo') ||
    h === 'tc'
  ) {
    return 'tamCor';
  }

  // 5. Descrição (trata "Descrição", "Descricao", "Descrio", "DescriÃ§Ã£o", "Detalhes", etc.)
  if (
    h.includes('desc') ||
    h.includes('detalhe') ||
    h.includes('especificacao') ||
    h === 'descrio' ||
    h === 'descricao' ||
    h === 'description'
  ) {
    return 'descricao';
  }

  // 6. Quantidade Comprada
  if (
    (h.includes('qtd') || h.includes('quant') || h.includes('qtde')) &&
    (isCompraContext || h.includes('entr'))
  ) {
    return 'quantidadeComprada';
  }
  if (['comprada', 'comprados', 'comprasqtd', 'qtdcompra', 'quantidadecomprada'].includes(h)) {
    return 'quantidadeComprada';
  }

  // 7. Custo Total de Compra
  // ATENÇÃO: Se a coluna for de estoque ("Saldo em Estoque", "Custo em estoque", etc.), não é custo de compra
  if (isEstoque) {
    return 'custoEstoquePlanilha';
  }
  // Se estiver no contexto de vendas/CPV ou for segunda coluna Custo Total (ex: "Custo Total_1"):
  if (isVendaContext && (h.includes('custo') || h.includes('cpv'))) {
    return 'cpvPlanilha';
  }
  if (
    h.includes('custototal1') ||
    h.includes('custototal2') ||
    (h === 'custototal' && allHeaders && typeof index === 'number' && allHeaders.some((k, i) => i < index && k.toLowerCase().includes('venda')))
  ) {
    return 'cpvPlanilha';
  }
  if (
    (h.includes('custo') || h.includes('gasto') || isCompraContext) &&
    (h.includes('tot') || h.includes('val') || h.includes('global') || isCompraContext) &&
    !h.includes('unit')
  ) {
    return 'custoTotal';
  }
  if (['custototal', 'custototalcompra', 'valortotalcusto', 'custocompra', 'totalcusto'].includes(h)) {
    return 'custoTotal';
  }

  // 8. Preço de Venda (trata "Preço de Venda", "Preco de Venda", "Precodevenda", "Preo de Venda", "Preço Venda", "Valor de Venda", etc.)
  if (
    (h.includes('prec') || h.includes('preo') || h.includes('prea') || h.includes('val') || h.startsWith('pv')) &&
    (h.includes('vend') || h.includes('unit') || h.includes('public') || h.includes('tabela') || h.includes('venda'))
  ) {
    return 'precoVenda';
  }
  if (
    [
      'precovenda',
      'precodevenda',
      'preodevenda',
      'preaodevenda',
      'precovendatotal',
      'precounitario',
      'precotabela',
      'preco',
      'preo',
      'precopublico',
      'venda',
      'valorvenda',
      'valordevenda',
      'pv'
    ].includes(h)
  ) {
    return 'precoVenda';
  }

  // 9. Quantidade Vendida
  if (
    (h.includes('qtd') || h.includes('quant') || h.includes('qtde')) &&
    (isVendaContext || h.includes('said'))
  ) {
    return 'quantidadeVendida';
  }
  if (['quantidadevendida', 'qtdvendida', 'vendida', 'vendidos', 'vendasqtd', 'qtdvenda'].includes(h)) {
    return 'quantidadeVendida';
  }

  return h;
}

/**
 * Lê e processa arquivo de planilha (Excel .xlsx, .xls ou CSV)
 */
export function parseSpreadsheetBuffer(buffer: ArrayBuffer | Uint8Array): {
  success: boolean;
  records: BiProductCalculatedRecord[];
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const calculatedRecords: BiProductCalculatedRecord[] = [];

  try {
    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const isZip = uint8.length >= 4 && uint8[0] === 0x50 && uint8[1] === 0x4B; // PK..
    const isOle = uint8.length >= 8 && uint8[0] === 0xD0 && uint8[1] === 0xCF; // .xls

    let workbook: XLSX.WorkBook;

    if (!isZip && !isOle) {
      // Arquivo texto ou CSV: decodifica com suporte a UTF-8 e fallback para Windows-1252 / Latin1
      let text = '';
      try {
        text = new TextDecoder('utf-8', { fatal: false }).decode(uint8);
        const replacementCount = (text.match(/\uFFFD/g) || []).length;
        if (replacementCount > 0) {
          try {
            const latinText = new TextDecoder('windows-1252').decode(uint8);
            if ((latinText.match(/\uFFFD/g) || []).length < replacementCount) {
              text = latinText;
            }
          } catch (_) {
            // mantém text utf-8
          }
        }
      } catch (_) {
        text = new TextDecoder('windows-1252').decode(uint8);
      }

      workbook = XLSX.read(text, { type: 'string', raw: false });
    } else {
      // Planilha binária do Excel (.xlsx ou .xls)
      workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, records: [], errors: ['A planilha enviada não contém nenhuma aba/pasta de trabalho válida.'], warnings: [] };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return { success: false, records: [], errors: ['A planilha está vazia ou não possui linhas de dados preenchidas.'], warnings: [] };
    }

    // Identifica e mapeia colunas encontradas
    const sampleRow = rawRows[0];
    const originalHeaders = Object.keys(sampleRow);
    const headerMapping: Record<string, string> = {};

    originalHeaders.forEach((original, idx) => {
      const normalizedKey = normalizeHeaderKey(original, idx, originalHeaders);
      headerMapping[original] = normalizedKey;
    });

    const recognizedKeys = new Set(Object.values(headerMapping));
    
    // Colunas obrigatórias conforme a solicitação:
    // Ano, Mês, Produto, Tam/Cor, Descrição, Quantidade Comprada, Custo Total, Preço de Venda (e Quantidade Vendida)
    const requiredKeys = [
      { key: 'ano', label: 'Ano' },
      { key: 'mes', label: 'Mês' },
      { key: 'produto', label: 'Produto' },
      { key: 'tamCor', label: 'Tam/Cor' },
      { key: 'descricao', label: 'Descrição' },
      { key: 'quantidadeComprada', label: 'Quantidade Comprada' },
      { key: 'custoTotal', label: 'Custo Total' },
      { key: 'precoVenda', label: 'Preço de Venda' }
    ];

    const missingRequired = requiredKeys.filter(rk => !recognizedKeys.has(rk.key));
    if (missingRequired.length > 0) {
      const missingLabels = missingRequired.map(m => `"${m.label}"`).join(', ');
      errors.push(`Colunas obrigatórias não identificadas: ${missingLabels}. Por favor, verifique o cabeçalho da planilha.`);
    }

    if (!recognizedKeys.has('quantidadeVendida')) {
      warnings.push('A coluna "Quantidade Vendida" não foi encontrada; os cálculos assumirão valor 0 inicial para esta métrica.');
    }

    // Processa cada linha
    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2; // Considerando linha 1 como cabeçalho
      const normalizedRow: any = {};

      Object.entries(row).forEach(([origKey, val]) => {
        const standardKey = headerMapping[origKey];
        if (standardKey && !standardKey.endsWith('Planilha')) {
          // Proteção contra sobrescrita por colunas duplicadas secundárias com valores vazios/nulos:
          if (
            normalizedRow[standardKey] !== undefined &&
            normalizedRow[standardKey] !== '' &&
            (val === '' || val === null || val === undefined)
          ) {
            return;
          }
          normalizedRow[standardKey] = val;
        }
      });

      // Pula linhas totalmente em branco
      if (!normalizedRow.produto && !normalizedRow.quantidadeComprada && !normalizedRow.custoTotal) {
        return;
      }

      if (!normalizedRow.produto) {
        warnings.push(`Linha ${rowNum}: Produto não especificado, foi descartada ou registrada com nome provisório.`);
      }

      const calculated = calculateBiRow(normalizedRow);
      calculatedRecords.push(calculated);
    });

    if (calculatedRecords.length === 0 && errors.length === 0) {
      errors.push('Nenhum registro de produto válido pôde ser importado da planilha.');
    }

    return {
      success: errors.length === 0 && calculatedRecords.length > 0,
      records: calculatedRecords,
      errors,
      warnings
    };

  } catch (err: any) {
    return {
      success: false,
      records: [],
      errors: [`Falha ao ler o arquivo Excel/CSV: ${err.message || 'Formato incompatível'}`],
      warnings: []
    };
  }
}

/**
 * Converte links de compartilhamento do Google Sheets ou Google Drive em URLs diretas de exportação CSV ou download
 */
export function convertGoogleDriveUrlToDirectExportUrl(rawUrl: string): {
  exportUrl: string;
  type: 'sheets' | 'drive' | 'direct';
  id?: string;
  gid?: string;
} | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  // 1. Google Sheets (ex: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0)
  const sheetsMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
  if (sheetsMatch && sheetsMatch[1]) {
    const spreadsheetId = sheetsMatch[1];
    const gidMatch = trimmed.match(/[#?&]gid=([0-9]+)/i);
    const gid = gidMatch ? gidMatch[1] : '0';
    return {
      exportUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
      type: 'sheets',
      id: spreadsheetId,
      gid
    };
  }

  // 2. Google Drive File (ex: https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view)
  const driveFileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9-_]+)/i);
  if (driveFileMatch && driveFileMatch[1]) {
    const fileId = driveFileMatch[1];
    return {
      exportUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      type: 'drive',
      id: fileId
    };
  }

  // 3. Google Drive Open ID (ex: https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms)
  const driveOpenMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/i);
  if (trimmed.includes('drive.google.com') && driveOpenMatch && driveOpenMatch[1]) {
    const fileId = driveOpenMatch[1];
    return {
      exportUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      type: 'drive',
      id: fileId
    };
  }

  // 4. URL direta (se já for CSV ou link público na web)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      exportUrl: trimmed,
      type: 'direct'
    };
  }

  return null;
}

/**
 * Gera o conteúdo CSV de exemplo para download de template modelo
 */
export function generateBiTemplateCsv(): string {
  const headers = [
    'Ano',
    'Mês',
    'Produto',
    'Tam/Cor',
    'Descrição',
    'Quantidade Comprada',
    'Custo Total',
    'Preço de Venda',
    'Quantidade Vendida'
  ];

  const sampleRows = [
    ['2026', 'Janeiro', 'Meias de Panda Fofas', 'Único / P&B', 'Meia cano médio atoalhada de algodão penteado estampa panda', '50', '250.00', '19.90', '38'],
    ['2026', 'Janeiro', 'Caneta Florzinha Gel Mimo', '0.5mm / Rosa e Lilás', 'Caneta gel com ponta fina e topper de florzinha em silicone', '100', '320.00', '9.90', '82'],
    ['2026', 'Janeiro', 'Pulseira Cristais & Margarida', 'Ajustável / Dourado Floral', 'Pulseira folheada com cristais brilhantes e pingente de margarida', '40', '360.00', '24.90', '29'],
    ['2026', 'Janeiro', 'Caderno Floral Lilás Lavanda', 'A5 / Lilás Vintage', 'Caderno capa dura com detalhes em hot stamping dourado e 80 folhas', '30', '420.00', '34.90', '24'],
    ['2026', 'Fevereiro', 'Meias de Panda Fofas', 'Único / P&B', 'Meia cano médio atoalhada de algodão penteado estampa panda', '60', '300.00', '19.90', '45'],
    ['2026', 'Fevereiro', 'Kit Sacolinha Mimos Criativos', 'Médio / Candy Colors', 'Kit com sacolinha personalizada, laço de cetim e 3 mimos surpresa', '25', '375.00', '42.00', '19'],
    ['2026', 'Fevereiro', 'Chaveiro Pelúcia Ursinho Floral', 'Único / Caramelo', 'Chaveiro de pelúcia com toque aveludado e gravatinha xadrez lilás', '35', '210.00', '16.90', '27'],
    ['2026', 'Fevereiro', 'Caneca Porcelana Flores Silvestres', '350ml / Lavanda', 'Caneca de porcelana legítima com estampa floral artesanal', '20', '260.00', '32.90', '16'],
    ['2026', 'Março', 'Meias de Panda Fofas', 'Único / P&B', 'Meia cano médio atoalhada de algodão penteado estampa panda', '70', '350.00', '19.90', '52'],
    ['2026', 'Março', 'Caneta Florzinha Gel Mimo', '0.5mm / Rosa e Lilás', 'Caneta gel com ponta fina e topper de florzinha em silicone', '120', '384.00', '9.90', '98'],
    ['2026', 'Março', 'Pulseira Cristais & Margarida', 'Ajustável / Dourado Floral', 'Pulseira folheada com cristais brilhantes e pingente de margarida', '50', '450.00', '24.90', '41']
  ];

  const csvLines = [
    headers.join(';'),
    ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(';'))
  ];

  return '\uFEFF' + csvLines.join('\r\n'); // BOM UTF-8 para Excel abrir com acentos perfeitos
}

/**
 * Exporta registros calculados para planilha Excel (.xlsx)
 */
export function exportRecordsToXlsx(records: BiProductCalculatedRecord[]): Uint8Array {
  const exportData = records.map(r => ({
    'Ano': r.ano,
    'Mês': r.mes,
    'Produto': r.produto,
    'Tam/Cor': r.tamCor,
    'Descrição': r.descricao,
    'Qtd Comprada': r.quantidadeComprada,
    'Custo Total (R$)': r.custoTotal,
    'Custo Unitário (R$)': r.custoUnitario,
    'Preço Venda (R$)': r.precoVenda,
    'Qtd Vendida': r.quantidadeVendida,
    'Venda Total / Faturamento (R$)': r.vendaTotal,
    'CPV - Custo da Venda (R$)': r.custoVenda,
    'Lucro Bruto (R$)': r.lucroBruto,
    'Margem de Lucro (%)': `${r.margemLucro}%`,
    'Mark-up Real (%)': `${r.markupReal}%`,
    'Saldo em Estoque (Un.)': r.saldoEstoqueQtd,
    'Custo em Estoque / Imobilizado (R$)': r.custoEstoque,
    'Faturamento Planejado (R$)': r.faturamentoPlanejado,
    'Atingimento Meta (%)': `${r.atingimentoMeta}%`
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório BI Lavistore');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(buffer);
}

/**
 * Registros de exemplo pré-carregados da Lavistore (Meias de Panda, Canetas, Pulseiras, etc.)
 */
export const DEFAULT_BI_SAMPLE_RECORDS: BiProductCalculatedRecord[] = [
  calculateBiRow({
    ano: 2026,
    mes: 'Janeiro',
    produto: 'Meias de Panda Fofas',
    tamCor: 'Único / P&B',
    descricao: 'Meia cano médio atoalhada com carinha de panda bordada em alto relevo',
    quantidadeComprada: 50,
    custoTotal: 250.00,
    precoVenda: 19.90,
    quantidadeVendida: 42
  }, 'bi-panda-jan-26'),
  calculateBiRow({
    ano: 2026,
    mes: 'Janeiro',
    produto: 'Caneta Florzinha Gel Mimo',
    tamCor: '0.5mm / Rosa e Lilás',
    descricao: 'Caneta gel escrita suave ponta agulha e flor de silicone flexível',
    quantidadeComprada: 100,
    custoTotal: 320.00,
    precoVenda: 9.90,
    quantidadeVendida: 86
  }, 'bi-caneta-jan-26'),
  calculateBiRow({
    ano: 2026,
    mes: 'Janeiro',
    produto: 'Pulseira Cristais & Margarida',
    tamCor: 'Ajustável / Dourado Floral',
    descricao: 'Pulseira delicada folheada com cristais multifacetados e florzinha',
    quantidadeComprada: 40,
    custoTotal: 360.00,
    precoVenda: 24.90,
    quantidadeVendida: 31
  }, 'bi-pulseira-jan-26'),
  calculateBiRow({
    ano: 2026,
    mes: 'Janeiro',
    produto: 'Caderno Floral Lilás Lavanda',
    tamCor: 'A5 / Lilás Vintage',
    descricao: 'Caderno capa dura com estampa botânica lilás e fitilho marcador',
    quantidadeComprada: 30,
    custoTotal: 420.00,
    precoVenda: 34.90,
    quantidadeVendida: 25
  }, 'bi-caderno-jan-26'),
  calculateBiRow({
    ano: 2026,
    mes: 'Fevereiro',
    produto: 'Meias de Panda Fofas',
    tamCor: 'Único / P&B',
    descricao: 'Meia cano médio atoalhada com carinha de panda bordada em alto relevo',
    quantidadeComprada: 60,
    custoTotal: 300.00,
    precoVenda: 19.90,
    quantidadeVendida: 54
  }, 'bi-panda-fev-26'),
  calculateBiRow({
    ano: 2026,
    mes: 'Fevereiro',
    produto: 'Caneta Florzinha Gel Mimo',
    tamCor: '0.5mm / Rosa e Lilás',
    descricao: 'Caneta gel escrita suave ponta agulha e flor de silicone flexível',
    quantidadeComprada: 120,
    custoTotal: 384.00,
    precoVenda: 9.90,
    quantidadeVendida: 110
  }, 'bi-caneta-fev-26'),
  calculateBiRow({
    ano: 2026,
    mes: 'Fevereiro',
    produto: 'Pulseira Cristais & Margarida',
    tamCor: 'Ajustável / Dourado Floral',
    descricao: 'Pulseira delicada folheada com cristais multifacetados e florzinha',
    quantidadeComprada: 45,
    custoTotal: 405.00,
    precoVenda: 24.90,
    quantidadeVendida: 38
  }, 'bi-pulseira-fev-26'),
  calculateBiRow({
    ano: 2026,
    mes: 'Fevereiro',
    produto: 'Chaveiro Pelúcia Ursinho Floral',
    tamCor: 'Único / Caramelo',
    descricao: 'Chaveiro de pelúcia com toque aveludado e laço xadrez',
    quantidadeComprada: 35,
    custoTotal: 210.00,
    precoVenda: 16.90,
    quantidadeVendida: 30
  }, 'bi-chaveiro-fev-26'),
  calculateBiRow({
    ano: 2026,
    mes: 'Fevereiro',
    produto: 'Caneca Cerâmica Flores de Jardim',
    tamCor: '350ml / Lavanda',
    descricao: 'Caneca artesanal em cerâmica com acabamento em brilho acetinado',
    quantidadeComprada: 25,
    custoTotal: 325.00,
    precoVenda: 32.90,
    quantidadeVendida: 21
  }, 'bi-caneca-fev-26'),
  calculateBiRow({
    ano: 2026,
    mes: 'Março',
    produto: 'Meias de Panda Fofas',
    tamCor: 'Único / P&B',
    descricao: 'Meia cano médio atoalhada com carinha de panda bordada em alto relevo',
    quantidadeComprada: 80,
    custoTotal: 400.00,
    precoVenda: 19.90,
    quantidadeVendida: 62
  }, 'bi-panda-mar-26'),
  calculateBiRow({
    ano: 2026,
    mes: 'Março',
    produto: 'Pulseira Cristais & Margarida',
    tamCor: 'Ajustável / Dourado Floral',
    descricao: 'Pulseira delicada folheada com cristais multifacetados e florzinha',
    quantidadeComprada: 50,
    custoTotal: 450.00,
    precoVenda: 24.90,
    quantidadeVendida: 44
  }, 'bi-pulseira-mar-26'),
  calculateBiRow({
    ano: 2026,
    mes: 'Março',
    produto: 'Kit Sacolinha Mimos Criativos',
    tamCor: 'Médio / Candy Colors',
    descricao: 'Kit embalagem especial com fita de cetim, cartão aromático e 3 mimos',
    quantidadeComprada: 30,
    custoTotal: 450.00,
    precoVenda: 42.00,
    quantidadeVendida: 26
  }, 'bi-sacolinha-mar-26')
];

/**
 * Código Python/Pandas pronto para pipelines e scripts de ETL/BI solicitados pelo usuário
 */
export const PYTHON_PANDAS_PIPELINE_CODE = `"""
=============================================================================
LAVISTORE E-COMMERCE - MOTOR DE BUSINESS INTELLIGENCE & APURAÇÃO FINANCEIRA
=============================================================================
Stack: Python 3.10+ / Pandas / OpenPyXL / FastAPI ou Flask

Módulo de processamento de planilhas de compras e vendas de produtos.
Executa ingestão de dados, validação de tipos, cálculo de KPIs e consolidação.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple


class LavistoreBiEngine:
    """
    Motor financeiro para apuração de estoque, faturamento e margens da Lavistore.
    """

    REQUIRED_COLUMNS = [
        'Ano', 'Mês', 'Produto', 'Tam/Cor', 'Descrição',
        'Quantidade Comprada', 'Custo Total', 'Preço de Venda', 'Quantidade Vendida'
    ]

    @classmethod
    def load_and_validate(cls, filepath_or_buffer) -> pd.DataFrame:
        """
        Carrega arquivo CSV ou Excel e valida as colunas obrigatórias.
        """
        if str(filepath_or_buffer).endswith('.csv'):
            # Tenta ler com separador ';' comum no Brasil ou vírgula
            try:
                df = pd.read_csv(filepath_or_buffer, sep=';', encoding='utf-8')
                if len(df.columns) <= 1:
                    df = pd.read_csv(filepath_or_buffer, sep=',', encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(filepath_or_buffer, sep=';', encoding='latin1')
        else:
            df = pd.read_excel(filepath_or_buffer)

        # Normaliza nomes de colunas
        column_map = {}
        for col in df.columns:
            clean = str(col).strip()
            column_map[col] = clean

        df = df.rename(columns=column_map)

        # Verifica colunas obrigatórias
        missing = [c for c in cls.REQUIRED_COLUMNS if c not in df.columns]
        if missing:
            raise ValueError(f"Planilha inválida. Faltam as colunas obrigatórias: {missing}")

        # Limpeza e coerção de tipos
        df['Ano'] = pd.to_numeric(df['Ano'], errors='coerce').fillna(2026).astype(int)
        df['Mês'] = df['Mês'].astype(str).str.strip()
        df['Produto'] = df['Produto'].astype(str).str.strip()
        df['Tam/Cor'] = df['Tam/Cor'].astype(str).str.strip()
        df['Descrição'] = df['Descrição'].astype(str).str.strip()

        # Tratamento de valores monetários com vírgula ou formato brasileiro
        for numeric_col in ['Quantidade Comprada', 'Custo Total', 'Preço de Venda', 'Quantidade Vendida']:
            if df[numeric_col].dtype == object:
                df[numeric_col] = (
                    df[numeric_col]
                    .astype(str)
                    .str.replace('R$', '', regex=False)
                    .str.replace(' ', '', regex=False)
                    .str.replace('.', '', regex=False)
                    .str.replace(',', '.', regex=False)
                )
            df[numeric_col] = pd.to_numeric(df[numeric_col], errors='coerce').fillna(0)

        return df

    @classmethod
    def compute_indicators(cls, df: pd.DataFrame) -> pd.DataFrame:
        """
        Executa os cálculos estritos de indicadores por produto/linha:
        - Custo Unitário = Custo Total / Quantidade Comprada
        - Venda Total (Faturamento) = Quantidade Vendida * Preço de Venda
        - Custo da Venda (CPV) = Quantidade Vendida * Custo Unitário
        - Lucro Bruto = Venda Total - Custo da Venda
        - Saldo em Estoque (Qtd) = Quantidade Comprada - Quantidade Vendida
        - Custo em Estoque (Capital Imobilizado) = Saldo em Estoque * Custo Unitário
        - Margem de Lucro Real (%) = (Lucro Bruto / Venda Total) * 100
        - Rentabilidade Real (%) = (Lucro Bruto / Custo Total) * 100
        """
        df = df.copy()

        # 1. Custo Unitário
        df['Custo Unitário'] = np.where(
            df['Quantidade Comprada'] > 0,
            df['Custo Total'] / df['Quantidade Comprada'],
            0.0
        ).round(2)

        # 2. Venda Total (Faturamento Real)
        df['Venda Total'] = (df['Quantidade Vendida'] * df['Preço de Venda']).round(2)

        # 3. Custo da Venda (CPV)
        df['Custo da Venda (CPV)'] = (df['Quantidade Vendida'] * df['Custo Unitário']).round(2)

        # 4. Lucro Bruto
        df['Lucro Bruto'] = (df['Venda Total'] - df['Custo da Venda (CPV)']).round(2)

        # 5. Saldo em Estoque (Quantidade)
        df['Saldo em Estoque'] = (df['Quantidade Comprada'] - df['Quantidade Vendida']).astype(int)

        # 6. Custo em Estoque (Capital Imobilizado)
        df['Custo em Estoque'] = np.maximum(
            0,
            (df['Saldo em Estoque'] * df['Custo Unitário'])
        ).round(2)

        # 7. Margem de Lucro (%)
        df['Margem de Lucro (%)'] = np.where(
            df['Venda Total'] > 0,
            (df['Lucro Bruto'] / df['Venda Total']) * 100.0,
            0.0
        ).round(1)

        # 8. Análise Real vs Planejado
        df['Faturamento Planejado'] = (df['Quantidade Comprada'] * df['Preço de Venda']).round(2)
        df['Atingimento Meta (%)'] = np.where(
            df['Faturamento Planejado'] > 0,
            (df['Venda Total'] / df['Faturamento Planejado']) * 100.0,
            0.0
        ).round(1)

        return df

    @classmethod
    def get_consolidated_kpis(cls, df: pd.DataFrame, ano: int = None, mes: str = None) -> Dict[str, Any]:
        """
        Gera o resumo executivo dos KPIs consolidados com base nos filtros selecionados.
        """
        filtered = df.copy()
        if ano is not None:
            filtered = filtered[filtered['Ano'] == ano]
        if mes is not None and mes != 'Todos':
            filtered = filtered[filtered['Mês'].str.lower() == mes.lower()]

        faturamento_total = filtered['Venda Total'].sum()
        custo_compras_total = filtered['Custo Total'].sum()
        cpv_total = filtered['Custo da Venda (CPV)'].sum()
        lucro_bruto_total = filtered['Lucro Bruto'].sum()
        valor_estoque_total = filtered['Custo em Estoque'].sum()
        saldo_estoque_qtd = filtered['Saldo em Estoque'].sum()
        faturamento_planejado = filtered['Faturamento Planejado'].sum()

        margem_media = (
            (lucro_bruto_total / faturamento_total * 100.0)
            if faturamento_total > 0 else 0.0
        )

        atingimento_global = (
            (faturamento_total / faturamento_planejado * 100.0)
            if faturamento_planejado > 0 else 0.0
        )

        return {
            'periodo': {'ano': ano or 'Todos', 'mes': mes or 'Todos'},
            'total_linhas': len(filtered),
            'faturamento_total': round(faturamento_total, 2),
            'custo_total_compras': round(custo_compras_total, 2),
            'cpv_total': round(cpv_total, 2),
            'lucro_bruto_total': round(lucro_bruto_total, 2),
            'margem_lucro_media': round(margem_media, 1),
            'capital_imobilizado_estoque': round(valor_estoque_total, 2),
            'saldo_estoque_unidades': int(saldo_estoque_qtd),
            'atingimento_planejado_meta': round(atingimento_global, 1)
        }


# =============================================================================
# EXEMPLO DE ROTA FASTAPI PARA UPLOAD E PROCESSAMENTO
# =============================================================================
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI(title="Lavistore BI API")

@app.post("/api/bi/upload")
async def upload_bi_spreadsheet(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        import io
        buffer = io.BytesIO(contents)
        buffer.name = file.filename

        df_raw = LavistoreBiEngine.load_and_validate(buffer)
        df_computed = LavistoreBiEngine.compute_indicators(df_raw)
        kpis = LavistoreBiEngine.get_consolidated_kpis(df_computed)

        records = df_computed.to_dict(orient='records')
        return {
            "success": True,
            "filename": file.filename,
            "total_records": len(records),
            "kpis": kpis,
            "records": records
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
"""
`;
