import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  BarChart3,
  Percent,
  Check,
  X,
  Code2,
  Eye,
  Info,
  ArrowUpDown,
  FileText,
  Globe,
  RefreshCw,
  Link2,
  ExternalLink,
  Store,
  ShoppingBag,
  Database
} from 'lucide-react';
import { BiProductCalculatedRecord, BiConsolidatedKpis, Product } from '../types';
import {
  calculateBiRow,
  calculateConsolidatedKpis,
  parseSpreadsheetBuffer,
  generateBiTemplateCsv,
  exportRecordsToXlsx,
  convertGoogleDriveUrlToDirectExportUrl,
  DEFAULT_BI_SAMPLE_RECORDS,
  PYTHON_PANDAS_PIPELINE_CODE
} from '../utils/biFinanceEngine';
import { PublishToVitrineModal } from './PublishToVitrineModal';
import { BiDatabaseArchitectureModal } from './BiDatabaseArchitectureModal';

interface BiFinancialManagerProps {
  products?: Product[];
  onSaveProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  categories?: any[];
  onViewProductLive?: (product: Product) => void;
  onGoToStorefront?: () => void;
  onNotify?: (message: string) => void;
}

export const BiFinancialManager: React.FC<BiFinancialManagerProps> = ({
  products = [],
  onSaveProduct,
  onDeleteProduct,
  categories = [],
  onViewProductLive,
  onGoToStorefront,
  onNotify
}) => {
  // Estado dos registros calculados
  const [records, setRecords] = useState<BiProductCalculatedRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);

  // Modo de importação: Google Drive / Google Sheets ou Arquivo do Computador
  const [importTab, setImportTab] = useState<'googledrive' | 'file'>('googledrive');
  const [googleDriveUrl, setGoogleDriveUrl] = useState<string>(() => {
    return localStorage.getItem('lavistore_bi_google_drive_url') || '';
  });
  const [isLoadingDrive, setIsLoadingDrive] = useState<boolean>(false);
  const [lastDriveSync, setLastDriveSync] = useState<string | null>(() => {
    return localStorage.getItem('lavistore_bi_last_drive_sync') || null;
  });

  // Filtros interativos solicitados
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');
  const [vitrineFilter, setVitrineFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [sortBy, setSortBy] = useState<'vendaTotal' | 'lucroBruto' | 'saldoEstoqueQtd' | 'produto'>('vendaTotal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modais
  const [showAddRowModal, setShowAddRowModal] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<BiProductCalculatedRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<BiProductCalculatedRecord | null>(null);
  const [showPythonCodeModal, setShowPythonCodeModal] = useState<boolean>(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [recordToPublish, setRecordToPublish] = useState<BiProductCalculatedRecord | null>(null);
  const [showArchitectureModal, setShowArchitectureModal] = useState<boolean>(false);

  // Formulário de adição / edição manual de linha
  const [rowForm, setRowForm] = useState({
    ano: new Date().getFullYear(),
    mes: 'Janeiro',
    produto: '',
    tamCor: 'Único',
    descricao: '',
    quantidadeComprada: 10,
    custoTotal: 100,
    precoVenda: 25.0,
    quantidadeVendida: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega registros da API do servidor ou fallback
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/bi/records');
        if (res.ok) {
          const data = await res.json();
          if (data.records && Array.isArray(data.records) && data.records.length > 0) {
            setRecords(data.records);
            localStorage.setItem('lavistore_bi_records', JSON.stringify(data.records));
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[BI] Falha ao carregar registros do servidor, usando fallback local.');
      }

      // Fallback: tenta recuperar do localStorage ou usa dados de demonstração
      const local = localStorage.getItem('lavistore_bi_records');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Se o cache local contiver dados corrompidos pelo mapeamento antigo (ex: mes numérico como "32.5"), ignora
            const isCorrupted = parsed.some((p: any) => /^\d+[.,]\d+$/.test(String(p.mes || '')));
            if (!isCorrupted) {
              setRecords(parsed);
              setIsLoading(false);
              return;
            }
          }
        } catch {}
      }

      // Se não houver nada, inicializa com os registros modelo da Lavistore (Meias de Panda, Canetas, etc.)
      setRecords(DEFAULT_BI_SAMPLE_RECORDS);
      setIsLoading(false);
    }

    loadData();
  }, []);

  // Persiste no backend e localStorage quando os dados são atualizados
  const persistRecords = async (newRecords: BiProductCalculatedRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem('lavistore_bi_records', JSON.stringify(newRecords));

    try {
      await fetch('/api/bi/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: newRecords })
      });
    } catch (err) {
      console.warn('[BI] Erro ao sincronizar com o backend:', err);
    }
  };

  // Anos disponíveis dinamicamente com base nos dados
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    records.forEach(r => {
      if (r.ano) years.add(r.ano);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [records]);

  // Lista dos 12 meses
  const monthsList = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Processamento do Upload da Planilha (CSV ou Excel)
  const handleFileProcess = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadWarnings([]);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSpreadsheetBuffer(new Uint8Array(buffer));

      if (!parsed.success || parsed.records.length === 0) {
        setUploadError(parsed.errors.join(' | ') || 'Não foi possível ler os produtos da planilha.');
        if (parsed.warnings.length > 0) setUploadWarnings(parsed.warnings);
        setIsUploading(false);
        return;
      }

      // Se houver registros válidos, mescla ou substitui no banco
      const mergedRecords = [...parsed.records];
      await persistRecords(mergedRecords);

      setUploadSuccess(`Planilha "${file.name}" importada com sucesso! ${parsed.records.length} produtos processados e apurados.`);
      if (parsed.warnings.length > 0) {
        setUploadWarnings(parsed.warnings);
      }
      if (onNotify) {
        onNotify(`Planilha importada com sucesso! ${parsed.records.length} itens apurados no BI. 📊✨`);
      }
    } catch (err: any) {
      setUploadError(`Erro ao processar o arquivo: ${err.message || 'Formato não suportado'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  // Importação de planilha via Link do Google Drive / Google Sheets
  const handleImportFromGoogleDrive = async (overrideUrl?: string) => {
    const urlToUse = (overrideUrl !== undefined ? overrideUrl : googleDriveUrl).trim();
    if (!urlToUse) {
      setUploadError('Por favor, informe o link de compartilhamento da sua planilha no Google Drive ou Google Sheets.');
      return;
    }

    setIsLoadingDrive(true);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadWarnings([]);

    try {
      const res = await fetch('/api/bi/import-google-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToUse })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao importar do Google Drive.');
      }

      // Decodifica base64 para Uint8Array
      const binaryString = window.atob(data.dataBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Processa através do motor de cálculos e validação
      const parsed = parseSpreadsheetBuffer(bytes);

      if (!parsed.success || parsed.records.length === 0) {
        setUploadError(
          parsed.errors.join(' | ') ||
          'Não foi possível identificar as colunas obrigatórias na planilha do Google Drive.'
        );
        if (parsed.warnings.length > 0) setUploadWarnings(parsed.warnings);
        return;
      }

      // Persiste os registros calculados no banco de dados da aplicação
      await persistRecords(parsed.records);

      const now = new Date();
      const syncTimestamp = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      setLastDriveSync(syncTimestamp);
      localStorage.setItem('lavistore_bi_google_drive_url', urlToUse);
      localStorage.setItem('lavistore_bi_last_drive_sync', syncTimestamp);

      setUploadSuccess(`Planilha sincronizada do Google Drive com sucesso! ${parsed.records.length} produtos apurados.`);
      if (parsed.warnings.length > 0) {
        setUploadWarnings(parsed.warnings);
      }
      if (onNotify) {
        onNotify(`Planilha do Google Drive sincronizada! ${parsed.records.length} produtos apurados no BI. 📊✨`);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao conectar e importar a planilha do Google Drive.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Download do Modelo de Planilha em CSV
  const handleDownloadTemplate = () => {
    const csvContent = generateBiTemplateCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_planilha_bi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onNotify) {
      onNotify('Modelo de planilha baixado com sucesso! Preencha e faça o upload quando desejar. 📥');
    }
  };

  // Exportar Relatório Filtrado para Excel (.xlsx)
  const handleExportFilteredXlsx = () => {
    if (filteredRecords.length === 0) {
      alert('Nenhum dado selecionado para exportação.');
      return;
    }
    const uint8Data = exportRecordsToXlsx(filteredRecords);
    const blob = new Blob([uint8Data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bi_relatorio_${selectedYear}_${selectedMonth}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onNotify) {
      onNotify('Relatório apurado exportado para Excel com sucesso! 📊');
    }
  };

  // Carregar dados de exemplo padrão
  const handleLoadSampleData = async () => {
    await persistRecords(DEFAULT_BI_SAMPLE_RECORDS);
    setSelectedYear('all');
    setSelectedMonth('all');
    setSearchTerm('');
    setUploadSuccess('Dados de exemplo carregados com sucesso!');
    if (onNotify) {
      onNotify('Exemplo com produtos carregado no BI!');
    }
  };

  // Limpar todos os registros
  const handleConfirmReset = async () => {
    await persistRecords([]);
    setShowResetConfirmModal(false);
    setUploadSuccess('Base de dados do BI limpa com sucesso. Você pode enviar uma nova planilha.');
    if (onNotify) {
      onNotify('Dados de BI redefinidos.');
    }
  };

  // Salvar formulário manual (novo ou edição)
  const handleSaveRowForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rowForm.produto.trim()) {
      alert('O nome do produto é obrigatório.');
      return;
    }

    const calculated = calculateBiRow({
      ano: rowForm.ano,
      mes: rowForm.mes,
      produto: rowForm.produto,
      tamCor: rowForm.tamCor,
      descricao: rowForm.descricao,
      quantidadeComprada: rowForm.quantidadeComprada,
      custoTotal: rowForm.custoTotal,
      precoVenda: rowForm.precoVenda,
      quantidadeVendida: rowForm.quantidadeVendida
    }, editingRecord?.id);

    let updated: BiProductCalculatedRecord[];
    if (editingRecord) {
      updated = records.map(r => (r.id === editingRecord.id ? calculated : r));
    } else {
      updated = [calculated, ...records];
    }

    await persistRecords(updated);
    setShowAddRowModal(false);
    setEditingRecord(null);
    setUploadSuccess(`Produto "${calculated.produto}" salvo com cálculos atualizados!`);
  };

  // Abrir edição
  const handleOpenEdit = (rec: BiProductCalculatedRecord) => {
    setEditingRecord(rec);
    setRowForm({
      ano: rec.ano,
      mes: rec.mes,
      produto: rec.produto,
      tamCor: rec.tamCor,
      descricao: rec.descricao,
      quantidadeComprada: rec.quantidadeComprada,
      custoTotal: rec.custoTotal,
      precoVenda: rec.precoVenda,
      quantidadeVendida: rec.quantidadeVendida
    });
    setShowAddRowModal(true);
  };

  // Excluir linha
  const handleDeleteRow = async (id: string) => {
    const updated = records.filter(r => r.id !== id);
    await persistRecords(updated);
    setRecordToDelete(null);
    if (onNotify) {
      onNotify('Registro removido do BI.');
    }
  };

  // Identifica se o produto do BI já está na Vitrine
  const isRecordPublished = (r: BiProductCalculatedRecord) => {
    if (r.publishedToVitrine) return true;
    if (products && products.some(p => p.biRecordId === r.id || (r.vitrineProductId && p.id === r.vitrineProductId))) {
      return true;
    }
    return false;
  };

  // Localiza o produto correspondente da Vitrine
  const getMatchingProduct = (r: BiProductCalculatedRecord): Product | null => {
    if (!products || products.length === 0) return null;
    return products.find(p => p.biRecordId === r.id || (r.vitrineProductId && p.id === r.vitrineProductId)) || null;
  };

  // Publica ou atualiza o produto na Vitrine do E-commerce
  const handlePublishToVitrine = async (updatedRecord: BiProductCalculatedRecord, productData: Partial<Product>) => {
    const existing = getMatchingProduct(updatedRecord);
    const prodId = existing?.id || updatedRecord.vitrineProductId || `lav-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    
    const productToSave: Product = {
      ...productData,
      id: prodId,
      name: productData.name || updatedRecord.produto,
      category: productData.category || 'papelaria',
      price: productData.price || updatedRecord.precoVenda,
      originalPrice: productData.originalPrice || (productData.price ? Number((productData.price * 1.25).toFixed(2)) : undefined),
      rating: existing?.rating || 5.0,
      reviewCount: existing?.reviewCount || 12,
      images: productData.images && productData.images.length > 0
        ? productData.images
        : [updatedRecord.vitrineImageUrl || 'https://images.unsplash.com/photo-1582966770380-921587181f82?w=800&auto=format&fit=crop&q=80'],
      description: productData.description || updatedRecord.descricao,
      features: productData.features || [
        `Tam/Cor: ${updatedRecord.tamCor}`,
        'Item selecionado com rigoroso padrão de qualidade',
        'Embalado com todo o cuidado para envio seguro',
        'Pronta entrega em estoque real'
      ],
      tag: productData.tag || 'Novidade ✨',
      dimensions: productData.dimensions,
      isNew: productData.isNew ?? true,
      isBestseller: productData.isBestseller ?? false,
      isFloralSpecial: productData.isFloralSpecial ?? false,
      hasSizes: productData.hasSizes ?? false,
      sizePricingMode: productData.sizePricingMode || 'same',
      sizes: productData.sizes,
      hasColors: productData.hasColors ?? false,
      colors: productData.colors,
      imageFit: productData.imageFit || 'cover',
      imagePosition: productData.imagePosition || 'center',
      imageScale: productData.imageScale || 100,
      stock: productData.stock ?? updatedRecord.saldoEstoqueQtd, // Preserva estoque calculado ou sincronizado
      biRecordId: updatedRecord.id,
      originTamCor: updatedRecord.tamCor,
      isPublished: productData.isPublished !== undefined ? productData.isPublished : true,
      autoHideWhenOutOfStock: productData.autoHideWhenOutOfStock !== undefined 
        ? productData.autoHideWhenOutOfStock 
        : (updatedRecord.autoHideWhenOutOfStock !== undefined ? updatedRecord.autoHideWhenOutOfStock : true)
    };

    if (onSaveProduct) {
      onSaveProduct(productToSave);
    }

    const finalRecord: BiProductCalculatedRecord = {
      ...updatedRecord,
      publishedToVitrine: true,
      vitrineProductId: prodId,
      vitrineImageUrl: productToSave.images[0],
      vitrineCategory: productToSave.category,
      vitrineTag: productToSave.tag
    };

    const newRecords = records.map(item => item.id === finalRecord.id ? finalRecord : item);
    await persistRecords(newRecords);
    setRecordToPublish(null);

    if (onNotify) {
      onNotify(`✨ Mimo "${productToSave.name}" publicado na vitrine com sucesso! Estoque: ${productToSave.stock} un.`);
    }
  };

  // Despublica o produto da Vitrine (remove da visão pública dos clientes)
  const handleUnpublishFromVitrine = async (recordId: string, productId?: string) => {
    const rec = records.find(r => r.id === recordId);
    if (!rec) return;

    if (productId && products) {
      const prod = products.find(p => p.id === productId || p.biRecordId === recordId);
      if (prod && onSaveProduct) {
        onSaveProduct({ ...prod, isPublished: false });
      }
    }

    const updated = records.map(r => r.id === recordId ? { ...r, publishedToVitrine: false } : r);
    await persistRecords(updated);
    setRecordToPublish(null);

    if (onNotify) {
      onNotify(`Mimo "${rec.produto}" despublicado da vitrine dos clientes.`);
    }
  };

  // Filtragem dos registros
  const filteredRecords = useMemo(() => {
    return records
      .filter(r => {
        // Filtro Ano
        const matchesYear = selectedYear === 'all' || String(r.ano) === selectedYear;
        // Filtro Mês
        const matchesMonth = selectedMonth === 'all' || r.mes.toLowerCase() === selectedMonth.toLowerCase();
        // Filtro Busca
        const matchesSearch =
          searchTerm === '' ||
          r.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.tamCor.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.descricao.toLowerCase().includes(searchTerm.toLowerCase());
        // Filtro Status Estoque
        const matchesStock =
          stockStatusFilter === 'all' ||
          (stockStatusFilter === 'low' && r.statusEstoque === 'baixo') ||
          (stockStatusFilter === 'out' && (r.statusEstoque === 'esgotado' || r.statusEstoque === 'negativo')) ||
          (stockStatusFilter === 'ok' && r.statusEstoque === 'ok');
        // Filtro Vitrine E-commerce
        const matchesVitrine =
          vitrineFilter === 'all' ||
          (vitrineFilter === 'published' && isRecordPublished(r)) ||
          (vitrineFilter === 'unpublished' && !isRecordPublished(r));

        return matchesYear && matchesMonth && matchesSearch && matchesStock && matchesVitrine;
      })
      .sort((a, b) => {
        let valA: any = a[sortBy];
        let valB: any = b[sortBy];

        if (typeof valA === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [records, products, selectedYear, selectedMonth, searchTerm, stockStatusFilter, vitrineFilter, sortBy, sortOrder]);

  // KPIs consolidados com base nos registros filtrados
  const kpis: BiConsolidatedKpis = useMemo(() => {
    return calculateConsolidatedKpis(filteredRecords);
  }, [filteredRecords]);

  return (
    <div className="space-y-8 animate-in fade-in font-['Comfortaa'] pb-12">
      {/* 1. CABEÇALHO EXECUTIVO DO MÓDULO BI */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-pink-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border-2 border-purple-800">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
          <BarChart3 size={280} />
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/30 border border-pink-400/40 text-pink-200 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-pink-300" />
              <span>Business Intelligence & Apuração de Resultados</span>
            </div>
            <h1 className="font-['Mali'] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              BI Financeiro & Controle de Estoque 📊
            </h1>
            <p className="text-xs sm:text-sm text-purple-200 leading-relaxed font-normal">
              Importação de planilhas de compras e vendas, apuração automatizada de Faturamento, CPV,
              Lucro Bruto, Saldo em Estoque em tempo real e Capital Imobilizado.
            </p>
          </div>

          {/* Ações principais do topo */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-bi-download-template"
              type="button"
              onClick={handleDownloadTemplate}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Baixar planilha padrão em formato CSV com colunas obrigatórias"
            >
              <Download className="w-4 h-4 text-pink-300" />
              <span>Baixar Modelo CSV</span>
            </button>

            <button
              id="btn-bi-show-python-code"
              type="button"
              onClick={() => setShowPythonCodeModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Ver código em Python/Pandas para pipelines e rotas de upload"
            >
              <Code2 className="w-4 h-4 text-amber-300" />
              <span>Código Python / Pandas</span>
            </button>

            <button
              id="btn-bi-add-manual"
              type="button"
              onClick={() => {
                setEditingRecord(null);
                setRowForm({
                  ano: new Date().getFullYear(),
                  mes: 'Janeiro',
                  produto: '',
                  tamCor: 'Único',
                  descricao: '',
                  quantidadeComprada: 20,
                  custoTotal: 100,
                  precoVenda: 19.9,
                  quantidadeVendida: 0
                });
                setShowAddRowModal(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer border border-pink-400"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adicionar Linha</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. ÁREA DE UPLOAD DE PLANILHA (PARTE 1 DA SOLICITAÇÃO) */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border-2 border-amber-200 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-4">
          <div>
            <h2 className="font-['Mali'] text-lg sm:text-xl font-bold text-purple-950 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>1. Importação e Upload de Planilha (Excel ou CSV)</span>
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Envie sua planilha com as colunas obrigatórias para apuração automática de indicadores.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-bi-load-sample-data"
              type="button"
              onClick={handleLoadSampleData}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-purple-950 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Carregar produtos de teste (dados de demonstração)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-300" />
              <span>Carregar Exemplo</span>
            </button>

            {records.length > 0 && (
              <button
                id="btn-bi-clear-data"
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Limpar todos os dados importados"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Limpar Dados</span>
              </button>
            )}
          </div>
        </div>

        {/* SELETOR DE MÉTODO DE IMPORTAÇÃO (GOOGLE DRIVE / SHEETS vs ARQUIVO DO COMPUTADOR) */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-amber-100/60 rounded-2xl border border-amber-300 w-full sm:w-fit">
          <button
            id="btn-import-tab-googledrive"
            type="button"
            onClick={() => setImportTab('googledrive')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              importTab === 'googledrive'
                ? 'bg-purple-950 text-white shadow-sm'
                : 'text-purple-950 hover:bg-amber-200/70'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>🌐 Link do Google Drive / Sheets</span>
          </button>

          <button
            id="btn-import-tab-file"
            type="button"
            onClick={() => setImportTab('file')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              importTab === 'file'
                ? 'bg-purple-950 text-white shadow-sm'
                : 'text-purple-950 hover:bg-amber-200/70'
            }`}
          >
            <Upload className="w-4 h-4 text-amber-300" />
            <span>📁 Arquivo do Computador (.XLSX / .CSV)</span>
          </button>
        </div>

        {/* MÉTODO 1: GOOGLE DRIVE / GOOGLE SHEETS VIA LINK */}
        {importTab === 'googledrive' && (
          <div className="bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 border-2 border-emerald-300 rounded-2xl p-5 sm:p-7 space-y-5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs border border-emerald-200 shrink-0">
                  <Globe className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                    <span>Sincronização Direta com o Google Drive / Sheets</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200 text-emerald-950 border border-emerald-300">
                      Nuvem
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Cole o link de compartilhamento da sua planilha salva no Google Drive ou Google Sheets para apurar os dados automaticamente.
                  </p>
                </div>
              </div>

              {lastDriveSync && (
                <div className="text-[11px] text-emerald-900 font-bold bg-emerald-100/90 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5 self-start sm:self-auto shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Última sincronização: {lastDriveSync}</span>
                </div>
              )}
            </div>

            {/* Input de URL e botão de ação */}
            <div className="space-y-2">
              <label htmlFor="input-google-drive-url" className="block text-xs font-bold text-purple-950">
                Link da Planilha no Google Drive ou Google Sheets:
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <input
                    id="input-google-drive-url"
                    type="url"
                    value={googleDriveUrl}
                    onChange={(e) => setGoogleDriveUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && googleDriveUrl.trim() && !isLoadingDrive) {
                        e.preventDefault();
                        handleImportFromGoogleDrive();
                      }
                    }}
                    placeholder="Cole o link da planilha do Google Sheets aqui"
                    className="w-full pl-10 pr-9 py-3 rounded-xl border-2 border-emerald-300 bg-white text-xs sm:text-sm text-purple-950 font-medium placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all"
                  />
                  {googleDriveUrl && (
                    <button
                      type="button"
                      onClick={() => setGoogleDriveUrl('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Limpar link"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  id="btn-sync-google-drive"
                  type="button"
                  onClick={() => handleImportFromGoogleDrive()}
                  disabled={isLoadingDrive || !googleDriveUrl.trim()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer border border-emerald-400"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                  <span>{isLoadingDrive ? 'Sincronizando com Google...' : 'Sincronizar Planilha'}</span>
                </button>
              </div>
            </div>

            {/* Como compartilhar corretamente no Google Drive */}
            <div className="p-4 rounded-xl bg-emerald-100/60 border border-emerald-200 text-xs text-slate-700 space-y-2">
              <div className="font-bold text-emerald-950 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Como configurar o link no Google Drive / Google Sheets:</span>
              </div>
              <ol className="list-decimal list-inside text-[11px] text-slate-700 space-y-1 leading-relaxed pl-1">
                <li>Abra a sua planilha no <strong>Google Sheets</strong> ou clique com o botão direito no arquivo no <strong>Google Drive</strong>.</li>
                <li>Clique no botão <strong>"Compartilhar"</strong> no canto superior direito.</li>
                <li>Em <em>Acesso Geral</em>, altere de "Restrito" para <strong>"Qualquer pessoa com o link"</strong> (modo Leitor).</li>
                <li>Clique em <strong>"Copiar link"</strong> e cole no campo acima!</li>
              </ol>
              <div className="pt-1 text-[11px] text-emerald-900 font-semibold flex items-center gap-1">
                <span>💡 <strong>Dica Pro:</strong> Sempre que você adicionar compras ou alterar vendas na planilha do Google Drive, basta clicar em "Sincronizar Planilha" para recalcular tudo no painel!</span>
              </div>
            </div>

            {/* Selo das colunas obrigatórias */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Colunas Obrigatórias:</span>
              {[
                'Ano', 'Mês', 'Produto', 'Tam/Cor', 'Descrição',
                'Quantidade Comprada', 'Custo Total', 'Preço de Venda', 'Quantidade Vendida'
              ].map((col, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-purple-900 text-[10px] font-bold shadow-2xs"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* MÉTODO 2: UPLOAD DE ARQUIVO LOCAL */}
        {importTab === 'file' && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="relative border-2 border-dashed border-amber-300 hover:border-purple-600 bg-amber-50/40 hover:bg-purple-50/40 rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer group animate-in fade-in"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-200/90 text-purple-950 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs">
                <Upload className="w-7 h-7 text-purple-950" />
              </div>

              <div>
                <p className="text-sm font-bold text-purple-950">
                  {isUploading ? 'Processando e calculando indicadores...' : 'Arraste a planilha aqui ou clique para selecionar'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Formatos aceitos: <strong>.XLSX, .XLS ou .CSV</strong> (com separador vírgula ou ponto e vírgula)
                </p>
              </div>

              {/* Selo das colunas obrigatórias */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 max-w-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Colunas Obrigatórias:</span>
                {[
                  'Ano', 'Mês', 'Produto', 'Tam/Cor', 'Descrição',
                  'Quantidade Comprada', 'Custo Total', 'Preço de Venda', 'Quantidade Vendida'
                ].map((col, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-white border border-amber-200 text-purple-900 text-[10px] font-bold shadow-2xs"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mensagens de Status de Upload */}
        {uploadError && (
          <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl text-rose-900 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-bold">Falha no processamento da planilha:</strong>
              <p>{uploadError}</p>
            </div>
          </div>
        )}

        {uploadSuccess && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
            <button
              onClick={() => setUploadSuccess(null)}
              className="text-emerald-700 hover:text-emerald-950 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {uploadWarnings.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-1">
            <span className="font-bold flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-amber-700" />
              Avisos da Leitura:
            </span>
            <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
              {uploadWarnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 3. FILTROS INTERATIVOS (PARTE 3 DA SOLICITAÇÃO) */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border-2 border-amber-200 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-['Mali'] text-lg sm:text-xl font-bold text-purple-950 flex items-center gap-2">
            <Filter className="w-5 h-5 text-pink-600" />
            <span>Filtros Interativos & Período de Apuração</span>
          </h2>

          <span className="text-xs font-bold text-slate-500">
            Exibindo <strong>{filteredRecords.length}</strong> de <strong>{records.length}</strong> itens
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Filtro 1: Ano */}
          <div>
            <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider mb-1">
              📅 Selecionar Ano:
            </label>
            <select
              id="select-bi-ano"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-amber-50/60 border-2 border-amber-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="all">Todos os Anos</option>
              {availableYears.map(yr => (
                <option key={yr} value={String(yr)}>
                  Ano {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro 2: Mês */}
          <div>
            <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider mb-1">
              🗓️ Selecionar Mês:
            </label>
            <select
              id="select-bi-mes"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-amber-50/60 border-2 border-amber-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="all">Todos os Meses</option>
              {monthsList.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro 3: Busca Textual */}
          <div>
            <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider mb-1">
              🔍 Buscar Produto / Tam/Cor:
            </label>
            <div className="relative">
              <input
                id="input-bi-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite o nome do produto ou variação para buscar..."
                className="w-full pl-9 pr-3.5 py-2.5 bg-amber-50/60 border-2 border-amber-200 rounded-xl text-xs font-medium text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtro 4: Status do Saldo em Estoque */}
          <div>
            <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider mb-1">
              📦 Saldo em Estoque:
            </label>
            <select
              id="select-bi-stock-status"
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-amber-50/60 border-2 border-amber-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="all">Todos os Saldos</option>
              <option value="ok">Estoque Normal (&gt; 5 un.)</option>
              <option value="low">Estoque Baixo (≤ 5 un.)</option>
              <option value="out">Esgotados / Zerados</option>
            </select>
          </div>

          {/* Filtro 5: Status da Vitrine E-commerce */}
          <div>
            <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider mb-1">
              🛍️ Vitrine E-commerce:
            </label>
            <select
              id="select-bi-vitrine-filter"
              value={vitrineFilter}
              onChange={(e) => setVitrineFilter(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-amber-50/60 border-2 border-amber-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="all">Todas as Situações</option>
              <option value="published">🛍️ Publicados na Vitrine</option>
              <option value="unpublished">⚪ Não Publicados</option>
            </select>
          </div>
        </div>

        {/* Resumo do filtro ativo em texto */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <span>Filtro Ativo:</span>
            <span className="px-2 py-0.5 bg-amber-100 rounded-md font-bold text-purple-950">
              Ano: {selectedYear === 'all' ? 'Todos' : selectedYear}
            </span>
            <span className="px-2 py-0.5 bg-pink-100 rounded-md font-bold text-purple-950">
              Mês: {selectedMonth === 'all' ? 'Todos' : selectedMonth}
            </span>
            {searchTerm && (
              <span className="px-2 py-0.5 bg-purple-100 rounded-md font-bold text-purple-950">
                Busca: "{searchTerm}"
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedYear('all');
              setSelectedMonth('all');
              setSearchTerm('');
              setStockStatusFilter('all');
            }}
            className="text-purple-700 hover:text-purple-950 underline font-bold"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* 4. CARDS DE KPIS CONSOLIDADOS (PARTE 3 DA SOLICITAÇÃO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Faturamento Total */}
        <div className="bg-gradient-to-br from-white to-emerald-50/80 rounded-3xl p-5 border-2 border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-2">
            <span>Faturamento Total (Vendas)</span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="font-['Mali'] text-2xl sm:text-3xl font-bold text-emerald-950">
            R$ {kpis.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-[11px] text-emerald-800 font-semibold mt-2 pt-2 border-t border-emerald-100">
            <span>{kpis.totalVendidoQtd} un. vendidas</span>
            <span>Meta: {kpis.atingimentoGlobal}%</span>
          </div>
        </div>

        {/* KPI 2: Custo Total & CPV */}
        <div className="bg-gradient-to-br from-white to-amber-50/80 rounded-3xl p-5 border-2 border-amber-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-2">
            <span>Custo da Venda (CPV)</span>
            <Layers className="w-5 h-5 text-amber-600" />
          </div>
          <p className="font-['Mali'] text-2xl sm:text-3xl font-bold text-amber-950">
            R$ {kpis.cpvTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-[11px] text-amber-800 font-semibold mt-2 pt-2 border-t border-amber-100">
            <span>Compras Totais: R$ {kpis.custoTotalCompras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span>{kpis.totalCompradoQtd} un.</span>
          </div>
        </div>

        {/* KPI 3: Lucro Bruto Total */}
        <div className="bg-gradient-to-br from-white to-rose-50/80 rounded-3xl p-5 border-2 border-rose-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-rose-900 mb-2">
            <span>Lucro Bruto Total</span>
            <TrendingUp className="w-5 h-5 text-rose-600" />
          </div>
          <p className="font-['Mali'] text-2xl sm:text-3xl font-bold text-rose-600">
            R$ {kpis.lucroBrutoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-[11px] text-rose-800 font-semibold mt-2 pt-2 border-t border-rose-100">
            <span>Margem Real Média:</span>
            <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              ~{kpis.margemLucroMedia}%
            </span>
          </div>
        </div>

        {/* KPI 4: Valor Total em Estoque (Capital Imobilizado) */}
        <div className="bg-gradient-to-br from-white to-purple-50/80 rounded-3xl p-5 border-2 border-purple-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-purple-900 mb-2">
            <span>Capital Imobilizado (Estoque)</span>
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <p className="font-['Mali'] text-2xl sm:text-3xl font-bold text-purple-950">
            R$ {kpis.valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-[11px] text-purple-800 font-semibold mt-2 pt-2 border-t border-purple-100">
            <span>Saldo em Peças:</span>
            <span className="font-bold">{kpis.saldoTotalEstoqueQtd} un. no estoque</span>
          </div>
        </div>
      </div>

      {/* 5. TABELA DINÂMICA DETALHADA DE DESEMPENHO (PARTE 2 E 3 DA SOLICITAÇÃO) */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border-2 border-amber-200 shadow-md overflow-hidden space-y-0">
        <div className="p-5 sm:p-6 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-50/60 to-pink-50/40">
          <div>
            <h2 className="font-['Mali'] text-lg sm:text-xl font-bold text-purple-950 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-700" />
              <span>Tabela Dinâmica de Apuração & Desempenho por Produto</span>
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Acompanhamento de estoque em tempo real, custos unitários, CPV, margens e rentabilidade calculados.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-bi-db-architecture"
              type="button"
              onClick={() => setShowArchitectureModal(true)}
              className="px-3.5 py-2 bg-purple-900 hover:bg-purple-950 text-amber-300 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border border-purple-800"
              title="Visualizar modelo de banco de dados, chaves estrangeiras e triggers ACID de sincronização em tempo real"
            >
              <Database className="w-3.5 h-3.5 text-amber-300" />
              <span>Lógica de Banco de Dados</span>
            </button>

            <button
              id="btn-bi-export-xlsx"
              type="button"
              onClick={handleExportFilteredXlsx}
              disabled={filteredRecords.length === 0}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Exportar esta visão apurada para planilha Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Tabela Responsiva */}
        {filteredRecords.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-purple-950 mx-auto flex items-center justify-center">
              <Package className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="font-['Mali'] text-lg font-bold text-purple-950">Nenhum produto encontrado</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Nenhum item corresponde aos filtros selecionados (Ano: {selectedYear}, Mês: {selectedMonth}).
              Tente redefinir os filtros ou importar uma planilha.
            </p>
            <button
              onClick={handleLoadSampleData}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-purple-950 font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Carregar Dados de Exemplo</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-amber-100/70 text-purple-950 uppercase text-[10px] font-bold tracking-wider border-b-2 border-amber-200">
                  {/* 1ª COLUNA: VITRINE DA LOJA (Acesso direto sem scroll) */}
                  <th className="py-3 px-3.5 text-center min-w-[175px] bg-pink-100/80 border-r border-amber-200">
                    <div className="flex items-center justify-center gap-1.5 text-pink-950 font-extrabold">
                      <Store className="w-3.5 h-3.5 text-pink-600" />
                      <span>Vitrine da Loja</span>
                    </div>
                  </th>
                  <th className="py-3 px-3.5 min-w-[220px]">Produto & Tam/Cor</th>
                  <th className="py-3 px-3.5">Período</th>
                  <th className="py-3 px-3.5 text-center">Compras (Qtd)</th>
                  <th className="py-3 px-3.5 text-center">Vendas (Qtd)</th>
                  <th className="py-3 px-3.5 text-center">Saldo Estoque</th>
                  <th className="py-3 px-3.5 text-right">Custo Unit.</th>
                  <th className="py-3 px-3.5 text-right">Preço Venda</th>
                  <th className="py-3 px-3.5 text-right">Faturamento</th>
                  <th className="py-3 px-3.5 text-right">CPV (Custo Venda)</th>
                  <th className="py-3 px-3.5 text-right">Lucro Bruto</th>
                  <th className="py-3 px-3.5 text-center">Margem</th>
                  <th className="py-3 px-3.5 text-right">Custo Estoque</th>
                  <th className="py-3 px-3.5 text-center min-w-[90px]">Ações BI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {filteredRecords.map((r) => {
                  const isPublished = isRecordPublished(r);
                  const matchingProduct = getMatchingProduct(r);
                  const displayThumb = matchingProduct?.images?.[0] || r.vitrineImageUrl;

                  return (
                    <tr key={r.id} className="hover:bg-amber-50/50 transition-colors">
                      {/* 1ª COLUNA: BOTÃO DE PUBLICAÇÃO & STATUS DA VITRINE */}
                      <td className="py-3 px-3.5 text-center bg-pink-50/40 border-r border-amber-200">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          {isPublished ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setRecordToPublish(r)}
                                title={`Editar foto, preço e detalhes de "${r.produto}" na vitrine`}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                              >
                                <Store className="w-3.5 h-3.5 text-purple-700" />
                                <span>Editar Vitrine</span>
                              </button>

                              {matchingProduct && onViewProductLive && (
                                <button
                                  type="button"
                                  onClick={() => onViewProductLive(matchingProduct)}
                                  title={`Visualizar "${r.produto}" ao vivo na vitrine dos clientes`}
                                  className="p-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRecordToPublish(r)}
                              title={`Publicar "${r.produto} (${r.tamCor})" diretamente na vitrine da loja`}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-[11px] font-extrabold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 border border-pink-400 whitespace-nowrap"
                            >
                              <Store className="w-3.5 h-3.5 text-amber-200" />
                              <span>Publicar na Vitrine 🌸</span>
                            </button>
                          )}

                          {/* Status badge sob o botão */}
                          <div className="flex items-center gap-1 flex-wrap justify-center">
                            {isPublished ? (
                              <>
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-pink-100 text-pink-900 border border-pink-200">
                                  <span>🛍️ Na Vitrine</span>
                                </span>
                                {r.saldoEstoqueQtd <= 0 ? (
                                  <span className="text-[9px] text-rose-700 font-bold">
                                    🚫 Esgotado
                                  </span>
                                ) : r.saldoEstoqueQtd <= 5 ? (
                                  <span className="text-[9px] text-amber-700 font-bold">
                                    ⚠️ {r.saldoEstoqueQtd} un.
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-emerald-700 font-bold">
                                    ✅ Ativo
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">
                                Não Publicado
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2ª COLUNA: Produto & Tam/Cor (Ao lado do botão de publicação) */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          {displayThumb ? (
                            <img
                              src={displayThumb}
                              alt={r.produto}
                              className="w-10 h-10 rounded-xl object-cover border border-amber-200 shadow-2xs shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-400 shrink-0">
                              <ShoppingBag className="w-5 h-5 text-purple-400" />
                            </div>
                          )}
                          <div className="space-y-0.5 min-w-0">
                            <strong className="font-bold text-purple-950 text-xs sm:text-sm block truncate max-w-[200px]">
                              {r.produto}
                            </strong>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-900 text-[10px] font-bold">
                                {r.tamCor}
                              </span>
                              {r.descricao && (
                                <span className="text-[10px] text-slate-400 truncate max-w-[140px]" title={r.descricao}>
                                  {r.descricao}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3ª COLUNA: Período */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-bold text-purple-950 block">{r.mes}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{r.ano}</span>
                      </td>

                      {/* Quantidade Comprada */}
                      <td className="py-3 px-3.5 text-center font-bold text-slate-700">
                        {r.quantidadeComprada} un.
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Total: R$ {r.custoTotal.toFixed(2)}
                        </span>
                      </td>

                      {/* Quantidade Vendida */}
                      <td className="py-3 px-3.5 text-center font-bold text-emerald-800">
                        {r.quantidadeVendida} un.
                        <span className="block text-[10px] text-emerald-600 font-normal">
                          Meta: {r.atingimentoMeta}%
                        </span>
                      </td>

                      {/* Saldo em Estoque */}
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            r.statusEstoque === 'ok'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : r.statusEstoque === 'baixo'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {r.saldoEstoqueQtd} un.
                        </span>
                        {r.statusEstoque === 'baixo' && (
                          <span className="block text-[9px] text-amber-700 font-bold mt-0.5">Estoque Baixo</span>
                        )}
                        {r.statusEstoque === 'esgotado' && (
                          <span className="block text-[9px] text-rose-700 font-bold mt-0.5">Esgotado</span>
                        )}
                      </td>

                      {/* Custo Unitário */}
                      <td className="py-3 px-3.5 text-right font-medium text-slate-700">
                        R$ {r.custoUnitario.toFixed(2)}
                      </td>

                      {/* Preço de Venda */}
                      <td className="py-3 px-3.5 text-right font-bold text-purple-950">
                        R$ {r.precoVenda.toFixed(2)}
                      </td>

                      {/* Faturamento (Venda Total) */}
                      <td className="py-3 px-3.5 text-right font-bold text-emerald-700">
                        R$ {r.vendaTotal.toFixed(2)}
                      </td>

                      {/* CPV */}
                      <td className="py-3 px-3.5 text-right font-medium text-slate-600">
                        R$ {r.custoVenda.toFixed(2)}
                      </td>

                      {/* Lucro Bruto */}
                      <td className="py-3 px-3.5 text-right font-bold text-rose-600">
                        R$ {r.lucroBruto.toFixed(2)}
                      </td>

                      {/* Margem de Lucro (%) */}
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            r.margemLucro >= 50
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : r.margemLucro >= 25
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {r.margemLucro}%
                        </span>
                        <span className="block text-[9px] text-slate-400">Mk: {r.markupReal}%</span>
                      </td>

                      {/* Custo em Estoque (Capital Imobilizado) */}
                      <td className="py-3 px-3.5 text-right font-bold text-purple-950">
                        R$ {r.custoEstoque.toFixed(2)}
                      </td>

                      {/* Ações da Planilha do BI (Editar / Excluir) */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r)}
                            title="Editar compras, vendas e custos deste registro"
                            className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRecordToDelete(r)}
                            title="Excluir linha da apuração"
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. MODAL: ADICIONAR / EDITAR PRODUTO MANUALMENTE */}
      {showAddRowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border-2 border-amber-200 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <h3 className="font-['Mali'] text-lg font-bold text-purple-950 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-pink-600" />
                <span>{editingRecord ? 'Editar Produto no BI' : 'Cadastrar Produto no BI'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRowForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-purple-950 mb-1">Ano:</label>
                  <input
                    type="number"
                    value={rowForm.ano}
                    onChange={(e) => setRowForm({ ...rowForm, ano: parseInt(e.target.value, 10) || 2026 })}
                    className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-purple-950 mb-1">Mês:</label>
                  <select
                    value={rowForm.mes}
                    onChange={(e) => setRowForm({ ...rowForm, mes: e.target.value })}
                    className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold"
                  >
                    {monthsList.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-950 mb-1">Nome do Produto:</label>
                <input
                  type="text"
                  value={rowForm.produto}
                  onChange={(e) => setRowForm({ ...rowForm, produto: e.target.value })}
                  placeholder="Digite o nome do produto aqui"
                  className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-purple-950 mb-1">Tamanho / Cor:</label>
                  <input
                    type="text"
                    value={rowForm.tamCor}
                    onChange={(e) => setRowForm({ ...rowForm, tamCor: e.target.value })}
                    placeholder="Digite a variação de tamanho ou cor aqui"
                    className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-purple-950 mb-1">Preço de Venda (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rowForm.precoVenda}
                    onChange={(e) => setRowForm({ ...rowForm, precoVenda: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-emerald-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-purple-950 mb-1">Qtd Comprada:</label>
                  <input
                    type="number"
                    min="0"
                    value={rowForm.quantidadeComprada}
                    onChange={(e) => setRowForm({ ...rowForm, quantidadeComprada: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-purple-950 mb-1">Custo Total da Compra (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rowForm.custoTotal}
                    onChange={(e) => setRowForm({ ...rowForm, custoTotal: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-950 mb-1">Quantidade Vendida:</label>
                <input
                  type="number"
                  min="0"
                  value={rowForm.quantidadeVendida}
                  onChange={(e) => setRowForm({ ...rowForm, quantidadeVendida: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-950 mb-1">Descrição (Opcional):</label>
                <textarea
                  value={rowForm.descricao}
                  onChange={(e) => setRowForm({ ...rowForm, descricao: e.target.value })}
                  placeholder="Escreva os detalhes adicionais, material ou fornecedor aqui"
                  rows={2}
                  className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs"
                />
              </div>

              {/* Prévia automática dos cálculos */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                <span className="font-bold text-purple-950 block">Prévia dos Cálculos Automáticos:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                  <span>Custo Unit.: R$ {rowForm.quantidadeComprada > 0 ? (rowForm.custoTotal / rowForm.quantidadeComprada).toFixed(2) : '0.00'}</span>
                  <span>Saldo Estoque: {rowForm.quantidadeComprada - rowForm.quantidadeVendida} un.</span>
                  <span>Faturamento: R$ {(rowForm.quantidadeVendida * rowForm.precoVenda).toFixed(2)}</span>
                  <span>CPV: R$ {rowForm.quantidadeComprada > 0 ? ((rowForm.custoTotal / rowForm.quantidadeComprada) * rowForm.quantidadeVendida).toFixed(2) : '0.00'}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-white font-bold text-xs shadow-md"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: EXCLUIR LINHA */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border-2 border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-purple-950">Remover do BI?</h4>
                <p className="text-xs text-slate-500">"{recordToDelete.produto}"</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja excluir este registro de <strong>{recordToDelete.mes}/{recordToDelete.ano}</strong> da base de cálculos?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRow(recordToDelete.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: CONFIRMAR LIMPEZA GERAL */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border-2 border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <RotateCcw className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-['Mali'] text-base font-bold text-purple-950">Limpar Dados do BI?</h3>
                <p className="text-xs text-slate-500">Esta ação apagará a base carregada atual.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Todos os {records.length} produtos apurados serão removidos. Você poderá enviar uma nova planilha a qualquer momento ou carregar os dados modelo de demonstração.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL: CÓDIGO DA ARQUITETURA PYTHON / PANDAS */}
      {showPythonCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl max-w-3xl w-full border-2 border-purple-500/40 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                  <Code2 className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Arquitetura da Solução em Python & Pandas</h3>
                  <p className="text-[11px] text-slate-400">Pipeline de ingestão, cálculo financeiro e rota FastAPI para integração backend</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(PYTHON_PANDAS_PIPELINE_CODE);
                    if (onNotify) onNotify('Código Python copiado para a área de transferência! 📋');
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Copiar Código
                </button>
                <button
                  type="button"
                  onClick={() => setShowPythonCodeModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 font-mono text-xs text-emerald-300 bg-slate-950/80 leading-relaxed whitespace-pre">
              {PYTHON_PANDAS_PIPELINE_CODE}
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL: PUBLICAR / EDITAR PRODUTO NA VITRINE DO E-COMMERCE */}
      {recordToPublish && (
        <PublishToVitrineModal
          record={recordToPublish}
          existingProduct={getMatchingProduct(recordToPublish)}
          categories={categories}
          onClose={() => setRecordToPublish(null)}
          onPublish={handlePublishToVitrine}
          onUnpublish={handleUnpublishFromVitrine}
          onViewLive={onViewProductLive}
        />
      )}

      {/* 11. MODAL: ARQUITETURA DE BANCO DE DADOS & TRIGGERS */}
      {showArchitectureModal && (
        <BiDatabaseArchitectureModal
          onClose={() => setShowArchitectureModal(false)}
        />
      )}
    </div>
  );
};
