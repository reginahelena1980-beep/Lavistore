import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Sparkles, 
  Check, 
  DollarSign, 
  Tag, 
  Layers, 
  HelpCircle,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  Package,
  AlertCircle,
  Ruler,
  Palette,
  Camera,
  Percent,
  Star,
  Store,
  Eye,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Product, ProductSizeVariant, ProductColorVariant, Category, BiProductCalculatedRecord } from '../types';
import { CATEGORIES } from '../data/categories';
import { safeSetItem, compressImage } from '../utils/storage';
import { 
  getGroupingKey, 
  normalizeBaseProductName, 
  findSiblingBiRecords 
} from '../utils/productGroupingEngine';

export const SUGGESTED_PRODUCT_PHOTOS: Record<string, string[]> = {
  caneta: [
    'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585336261026-41804f58c73c?w=800&auto=format&fit=crop&q=80'
  ],
  caderno: [
    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&auto=format&fit=crop&q=80'
  ],
  meia: [
    'https://images.unsplash.com/photo-1582966770380-921587181f82?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800&auto=format&fit=crop&q=80'
  ],
  caneca: [
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=800&auto=format&fit=crop&q=80'
  ],
  garrafa: [
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80'
  ],
  adesivo: [
    'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&auto=format&fit=crop&q=80'
  ],
  necessaire: [
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80'
  ],
  pelucia: [
    'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=800&auto=format&fit=crop&q=80'
  ],
  default: [
    'https://images.unsplash.com/photo-1582966770380-921587181f82?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80'
  ]
};

export const getSuggestedPhotoForName = (text: string) => {
  const lower = (text || '').toLowerCase();
  for (const [key, urls] of Object.entries(SUGGESTED_PRODUCT_PHOTOS)) {
    if (key !== 'default' && lower.includes(key)) {
      return { keyword: key, url: urls[0] };
    }
  }
  return null;
};

export interface AdminProductModalProps {
  isOpen: boolean;
  productToEdit: Product | null;
  onClose: () => void;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  categories?: Category[];
  // Integração unificada com a Planilha BI:
  biRecord?: BiProductCalculatedRecord | null;
  allBiRecords?: BiProductCalculatedRecord[];
  onPublishBiRecord?: (record: BiProductCalculatedRecord, productData: Partial<Product>) => void;
  onUnpublishBiRecord?: (recordId: string, productId?: string) => void;
  onViewLiveProduct?: (product: Product) => void;
}

export const AdminProductModal: React.FC<AdminProductModalProps> = ({
  isOpen,
  productToEdit,
  onClose,
  onSaveProduct,
  onDeleteProduct,
  categories = CATEGORIES,
  biRecord,
  allBiRecords,
  onPublishBiRecord,
  onUnpublishBiRecord,
  onViewLiveProduct
}) => {
  const isEditing = !!productToEdit;

  // Identifica se há um registro da planilha vinculado a esta tela
  const [currentBiRecord, setCurrentBiRecord] = useState<BiProductCalculatedRecord | null>(biRecord || null);
  // Lista de linhas irmãs da família identificadas na planilha
  const [detectedSpreadsheetSiblings, setDetectedSpreadsheetSiblings] = useState<BiProductCalculatedRecord[]>([]);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: 'cadernos-planners',
    price: 39.90,
    originalPrice: undefined,
    stock: 10,
    hasSizes: false,
    sizePricingMode: 'same',
    sizes: [],
    hasColors: false,
    colors: [],
    rating: 5.0,
    reviewCount: 12,
    images: ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80'],
    description: '',
    features: ['Acabamento especial com toque aveludado', 'Embalado para presente com cheirinho doce'],
    tag: 'Novidade ✨',
    dimensions: '',
    imageFit: 'cover',
    imagePosition: 'center',
    imageScale: 100,
    isNew: true,
    isBestseller: false,
    isFloralSpecial: false,
    isPublished: true,
    autoHideWhenOutOfStock: true,
  });

  const [newFeatureText, setNewFeatureText] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [showImageAdjustments, setShowImageAdjustments] = useState(false);

  // Determinar se há foto sugerida para o nome atual digitado
  const suggestedPhoto = getSuggestedPhotoForName(formData.name || (currentBiRecord ? currentBiRecord.produto : ''));

  // Carrega automaticamente a grade de tamanhos e quantidades a partir da planilha Google Sheets
  const handleLoadSizesFromSpreadsheet = () => {
    if (detectedSpreadsheetSiblings.length === 0) return;
    const importedSizes: ProductSizeVariant[] = detectedSpreadsheetSiblings.map((s, idx) => {
      const effectiveStock = s.saldoEstoqueQtd > 0
        ? s.saldoEstoqueQtd
        : ((!s.quantidadeVendida || s.quantidadeVendida === 0) && (s.quantidadeComprada || 0) > 0)
          ? s.quantidadeComprada
          : Math.max(0, s.saldoEstoqueQtd || 0);

      return {
        id: `size-${s.id || idx}`,
        label: s.tamCor || 'Único',
        stock: effectiveStock,
        initialStock: s.quantidadeComprada,
        price: s.precoVenda,
        unitCost: s.custoUnitario,
        biRecordId: s.id
      };
    });

    const totalStk = importedSizes.reduce((acc, sz) => acc + (sz.stock || 0), 0);
    setFormData(prev => ({
      ...prev,
      hasSizes: true,
      sizes: importedSizes,
      stock: totalStk
    }));
  };

  // Initialize form state when opening or editing
  useEffect(() => {
    // 1. Resolver o registro do BI correspondente (se passado diretamente ou por vínculo no produto)
    let foundBi: BiProductCalculatedRecord | null = biRecord || null;
    let allRecordsList: BiProductCalculatedRecord[] = allBiRecords || [];

    if (allRecordsList.length === 0) {
      try {
        const raw = localStorage.getItem('lavistore_bi_records');
        if (raw) {
          allRecordsList = JSON.parse(raw);
        }
      } catch {}
    }

    if (!foundBi && productToEdit) {
      if (productToEdit.biRecordId) {
        foundBi = allRecordsList.find((item: any) => item.id === productToEdit.biRecordId) || null;
      }
      if (!foundBi && productToEdit.name) {
        const pKey = getGroupingKey(productToEdit.name);
        foundBi = allRecordsList.find((item: any) => getGroupingKey(item.produto) === pKey) || null;
      }
    }
    setCurrentBiRecord(foundBi);

    // 2. Localiza automaticamente todas as linhas irmãs da família pelo nome do produto
    const siblings = foundBi ? findSiblingBiRecords(foundBi, allRecordsList) : [];
    setDetectedSpreadsheetSiblings(siblings);

    // Constrói lista de tamanhos originada diretamente da coluna Tam/Cor da planilha Google Sheets
    const autoSpreadsheetSizes: ProductSizeVariant[] = siblings.map((s, idx) => {
      const effectiveStock = s.saldoEstoqueQtd > 0
        ? s.saldoEstoqueQtd
        : ((!s.quantidadeVendida || s.quantidadeVendida === 0) && (s.quantidadeComprada || 0) > 0)
          ? s.quantidadeComprada
          : Math.max(0, s.saldoEstoqueQtd || 0);

      return {
        id: `size-${s.id || idx}`,
        label: s.tamCor || 'Único',
        stock: effectiveStock,
        initialStock: s.quantidadeComprada,
        price: s.precoVenda,
        unitCost: s.custoUnitario,
        biRecordId: s.id
      };
    });

    const isSpreadsheetFamily = siblings.length > 1 || (siblings.length === 1 && siblings[0].tamCor && !['único', 'unico'].includes(siblings[0].tamCor.trim().toLowerCase()));

    // 3. Se temos produto já cadastrado na vitrine
    if (productToEdit) {
      const hasExistingSizes = productToEdit.hasSizes && productToEdit.sizes && productToEdit.sizes.length > 0;
      let szList: ProductSizeVariant[];
      let hasSz: boolean;

      if (hasExistingSizes) {
        szList = (productToEdit.sizes || []).map(sz => {
          const matchingSibling = siblings.find(
            s => s.id === sz.biRecordId || s.tamCor.trim().toLowerCase() === sz.label.trim().toLowerCase()
          );
          return {
            ...sz,
            biRecordId: sz.biRecordId || matchingSibling?.id,
            initialStock: sz.initialStock ?? matchingSibling?.quantidadeComprada,
            unitCost: sz.unitCost ?? matchingSibling?.custoUnitario
          };
        });
        hasSz = true;
      } else if (isSpreadsheetFamily && autoSpreadsheetSizes.length > 0) {
        // Automaticamente ativa e popula a grade a partir da planilha!
        szList = autoSpreadsheetSizes;
        hasSz = true;
      } else {
        szList = [];
        hasSz = false;
      }

      const totalStockFromSizes = (hasSz && szList.length > 0)
        ? szList.reduce((acc, s) => acc + (s.stock || 0), 0)
        : null;

      const effectiveStock = totalStockFromSizes !== null
        ? totalStockFromSizes
        : (foundBi ? (foundBi.saldoEstoqueQtd > 0 ? foundBi.saldoEstoqueQtd : foundBi.quantidadeComprada) : (productToEdit.stock ?? 10));

      const hasCols = productToEdit.hasColors ?? (productToEdit.colors && productToEdit.colors.length > 0) ?? false;
      const colList: ProductColorVariant[] = productToEdit.colors 
        ? productToEdit.colors.map((c, idx) => ({
            id: c.id || `col-${Date.now()}-${idx + 1}`,
            name: c.name || `Cor ${idx + 1}`,
            imageUrl: c.imageUrl || undefined,
            hex: c.hex || undefined,
            bgClass: c.bgClass || undefined,
            stock: c.stock
          }))
        : [];

      setFormData({
        ...productToEdit,
        name: productToEdit.name || (foundBi ? normalizeBaseProductName(foundBi.produto) : ''),
        hasSizes: hasSz,
        sizePricingMode: productToEdit.sizePricingMode || 'same',
        sizes: szList,
        hasColors: hasCols,
        colors: colList,
        price: productToEdit.price,
        originalPrice: productToEdit.originalPrice,
        stock: effectiveStock,
        imageFit: productToEdit.imageFit || 'cover',
        imagePosition: productToEdit.imagePosition || 'center',
        imageScale: productToEdit.imageScale || 100,
        images: productToEdit.images && productToEdit.images.length > 0 
          ? [...productToEdit.images] 
          : (foundBi?.vitrineImageUrl ? [foundBi.vitrineImageUrl] : ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80']),
        features: productToEdit.features ? [...productToEdit.features] : [],
        isPublished: productToEdit.isPublished !== undefined ? productToEdit.isPublished : true,
        autoHideWhenOutOfStock: productToEdit.autoHideWhenOutOfStock !== undefined 
          ? productToEdit.autoHideWhenOutOfStock 
          : (foundBi?.autoHideWhenOutOfStock !== undefined ? foundBi.autoHideWhenOutOfStock : true),
        biRecordId: foundBi?.id || productToEdit.biRecordId,
        originTamCor: foundBi?.tamCor || productToEdit.originTamCor
      });
      setHasRestoredDraft(false);
    } else if (foundBi) {
      // 4. Veio diretamente da planilha do BI sem produto na vitrine ainda
      const cleanBaseName = normalizeBaseProductName(foundBi.produto) || foundBi.produto;

      const initialPhotos = foundBi.vitrineImageUrl
        ? [foundBi.vitrineImageUrl]
        : [getSuggestedPhotoForName(cleanBaseName)?.url || SUGGESTED_PRODUCT_PHOTOS.default[0]];

      const useSizes = isSpreadsheetFamily && autoSpreadsheetSizes.length > 0;
      const initialSizes = useSizes ? autoSpreadsheetSizes : [];
      const totalStockFromSizes = useSizes ? autoSpreadsheetSizes.reduce((acc, s) => acc + (s.stock || 0), 0) : null;
      const effectiveStock = totalStockFromSizes !== null 
        ? totalStockFromSizes 
        : (foundBi.saldoEstoqueQtd > 0 ? foundBi.saldoEstoqueQtd : (foundBi.quantidadeVendida === 0 && foundBi.quantidadeComprada > 0 ? foundBi.quantidadeComprada : 0));

      setFormData({
        id: foundBi.vitrineProductId || `lav-${Date.now().toString().slice(-5)}`,
        name: cleanBaseName,
        category: (foundBi.vitrineCategory as any) || 'papelaria',
        price: foundBi.precoVenda,
        originalPrice: Number((foundBi.precoVenda * 1.25).toFixed(2)),
        stock: effectiveStock,
        hasSizes: useSizes,
        sizePricingMode: 'same',
        sizes: initialSizes,
        hasColors: false,
        colors: [],
        rating: 5.0,
        reviewCount: 12,
        images: initialPhotos,
        description: foundBi.descricao || `Lindo mimo ${cleanBaseName} da Lavistore! Perfeito para presentear quem você ama com muito afeto, delicadeza e encanto. ✨💖`,
        features: [
          useSizes ? `Variações disponíveis na planilha: ${siblings.map(s => s.tamCor).join(', ')}` : `Tam/Cor: ${foundBi.tamCor || 'Único'}`,
          'Item selecionado com carinho pela Lavistore',
          'Embalado com todo o cuidado e cheirinho doce especial',
          'Pronta entrega com estoque real sincronizado'
        ],
        tag: foundBi.vitrineTag || 'Novidade ✨',
        dimensions: '',
        imageFit: 'cover',
        imagePosition: 'center',
        imageScale: 100,
        isNew: true,
        isBestseller: false,
        isFloralSpecial: false,
        isPublished: true,
        autoHideWhenOutOfStock: foundBi.autoHideWhenOutOfStock !== undefined ? foundBi.autoHideWhenOutOfStock : true,
        biRecordId: foundBi.id,
        originTamCor: foundBi.tamCor
      });
      setHasRestoredDraft(false);
    } else {
      // 4. Criação avulsa padrão
      let savedDraft: Partial<Product> | null = null;
      try {
        const raw = localStorage.getItem('lavistore_product_draft');
        if (raw) {
          savedDraft = JSON.parse(raw);
        }
      } catch (e) {
        console.error('Failed to parse draft', e);
      }

      if (savedDraft && savedDraft.name && savedDraft.name.trim().length > 0) {
        setFormData(savedDraft);
        setHasRestoredDraft(true);
      } else {
        setFormData({
          id: `lav-${Date.now().toString().slice(-5)}`,
          name: '',
          category: 'cadernos-planners',
          price: 39.90,
          originalPrice: undefined,
          stock: 10,
          hasSizes: false,
          sizePricingMode: 'same',
          sizes: [],
          hasColors: false,
          colors: [],
          rating: 5.0,
          reviewCount: 8,
          images: ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80'],
          description: 'Mimo especial e cheio de carinho para encantar o seu dia ou presentear quem você ama.',
          features: ['Design exclusivo Lavistore', 'Embalado com cheirinho doce especial'],
          tag: 'Novidade ✨',
          dimensions: '',
          imageFit: 'cover',
          imagePosition: 'center',
          imageScale: 100,
          isNew: true,
          isBestseller: false,
          isFloralSpecial: false,
          isPublished: true,
          autoHideWhenOutOfStock: true,
        });
        setHasRestoredDraft(false);
      }
    }
    setErrorMessage(null);
    setShowDeleteConfirm(false);
    setShowCloseConfirm(false);
  }, [productToEdit, biRecord, isOpen]);

  // Sincronizar dados da linha da Planilha Financeira BI para o formulário
  const handleSyncFromSpreadsheet = () => {
    if (!currentBiRecord) return;
    setFormData(prev => ({
      ...prev,
      name: currentBiRecord.tamCor && currentBiRecord.tamCor.toLowerCase() !== 'único' && currentBiRecord.tamCor.toLowerCase() !== 'unico'
        ? `${currentBiRecord.produto} - ${currentBiRecord.tamCor}`
        : currentBiRecord.produto,
      price: currentBiRecord.precoVenda,
      stock: currentBiRecord.saldoEstoqueQtd,
      description: currentBiRecord.descricao || prev.description,
      category: (currentBiRecord.vitrineCategory as any) || prev.category,
      tag: currentBiRecord.vitrineTag || prev.tag
    }));
  };

  // Auto-save draft to localStorage whenever user types something on a new product
  useEffect(() => {
    if (!isEditing && isOpen && formData.name && formData.name.trim().length > 0) {
      safeSetItem('lavistore_product_draft', JSON.stringify(formData));
    }
  }, [formData, isEditing, isOpen]);

  // SIZE VARIANT MANAGEMENT HANDLERS
  const handleToggleHasSizes = (checked: boolean) => {
    setFormData(prev => {
      let currentSizes = prev.sizes ? [...prev.sizes] : [];
      if (checked && currentSizes.length === 0) {
        currentSizes = [
          { id: `sz-${Date.now()}-1`, label: 'P', stock: 5, price: prev.price },
          { id: `sz-${Date.now()}-2`, label: 'M', stock: 5, price: prev.price },
          { id: `sz-${Date.now()}-3`, label: 'G', stock: 5, price: prev.price },
          { id: `sz-${Date.now()}-4`, label: 'GG', stock: 5, price: prev.price },
        ];
      }
      const sumStock = currentSizes.reduce((acc, s) => acc + (Number(s.stock) || 0), 0);
      return {
        ...prev,
        hasSizes: checked,
        sizes: currentSizes,
        stock: checked ? sumStock : prev.stock,
      };
    });
  };

  const handleApplySizePreset = (preset: 'calcados' | 'roupas' | 'infantil' | 'numeros' | 'papelaria') => {
    const baseP = formData.price || 0;
    let newSizes: ProductSizeVariant[] = [];

    if (preset === 'calcados') {
      newSizes = [
        { id: `sz-${Date.now()}-1`, label: 'P (Infantil 28-33)', stock: 4, price: baseP },
        { id: `sz-${Date.now()}-2`, label: 'M (34-36)', stock: 6, price: baseP },
        { id: `sz-${Date.now()}-3`, label: 'G (37-39)', stock: 6, price: baseP },
        { id: `sz-${Date.now()}-4`, label: 'GG (40-42)', stock: 4, price: baseP },
      ];
    } else if (preset === 'roupas') {
      newSizes = [
        { id: `sz-${Date.now()}-1`, label: 'P', stock: 5, price: baseP },
        { id: `sz-${Date.now()}-2`, label: 'M', stock: 6, price: baseP },
        { id: `sz-${Date.now()}-3`, label: 'G', stock: 5, price: baseP },
        { id: `sz-${Date.now()}-4`, label: 'GG', stock: 4, price: baseP },
      ];
    } else if (preset === 'infantil') {
      newSizes = [
        { id: `sz-${Date.now()}-1`, label: '1 a 2 Anos', stock: 4, price: baseP },
        { id: `sz-${Date.now()}-2`, label: '3 a 4 Anos', stock: 5, price: baseP },
        { id: `sz-${Date.now()}-3`, label: '5 a 6 Anos', stock: 5, price: baseP },
        { id: `sz-${Date.now()}-4`, label: '7 a 8 Anos', stock: 4, price: baseP },
      ];
    } else if (preset === 'numeros') {
      newSizes = [
        { id: `sz-${Date.now()}-1`, label: '34', stock: 3, price: baseP },
        { id: `sz-${Date.now()}-2`, label: '36', stock: 4, price: baseP },
        { id: `sz-${Date.now()}-3`, label: '38', stock: 5, price: baseP },
        { id: `sz-${Date.now()}-4`, label: '40', stock: 4, price: baseP },
        { id: `sz-${Date.now()}-5`, label: '42', stock: 3, price: baseP },
      ];
    } else if (preset === 'papelaria') {
      newSizes = [
        { id: `sz-${Date.now()}-1`, label: 'A6 (Bolso 10x15cm)', stock: 5, price: baseP },
        { id: `sz-${Date.now()}-2`, label: 'A5 (Padrão 15x21cm)', stock: 8, price: baseP },
        { id: `sz-${Date.now()}-3`, label: 'Universitário (20x27cm)', stock: 5, price: Math.round(baseP * 1.25 * 100) / 100 },
      ];
    }

    const sumStock = newSizes.reduce((acc, s) => acc + s.stock, 0);
    setFormData(prev => ({
      ...prev,
      hasSizes: true,
      sizes: newSizes,
      stock: sumStock,
    }));
  };

  const handleAddSizeVariant = () => {
    const currentList = formData.sizes || [];
    const newVariant: ProductSizeVariant = {
      id: `sz-${Date.now()}-${currentList.length + 1}`,
      label: `Tamanho ${currentList.length + 1}`,
      stock: 5,
      price: formData.price || 0,
    };
    setFormData(prev => {
      const updated = [...(prev.sizes || []), newVariant];
      const sumStock = updated.reduce((acc, s) => acc + (Number(s.stock) || 0), 0);
      return {
        ...prev,
        hasSizes: true,
        sizes: updated,
        stock: sumStock,
      };
    });
  };

  const handleRemoveSizeVariant = (id: string) => {
    setFormData(prev => {
      const updated = (prev.sizes || []).filter(s => s.id !== id);
      const sumStock = updated.reduce((acc, s) => acc + (Number(s.stock) || 0), 0);
      return {
        ...prev,
        sizes: updated,
        stock: updated.length > 0 ? sumStock : prev.stock,
      };
    });
  };

  const handleUpdateSizeVariant = (id: string, field: keyof ProductSizeVariant, value: any) => {
    setFormData(prev => {
      const updated = (prev.sizes || []).map(s => {
        if (s.id === id) {
          return { ...s, [field]: value };
        }
        return s;
      });
      const sumStock = updated.reduce((acc, s) => acc + (Number(s.stock) || 0), 0);
      return {
        ...prev,
        sizes: updated,
        stock: sumStock,
      };
    });
  };

  // COLOR VARIANT MANAGEMENT HANDLERS
  const handleToggleHasColors = (checked: boolean) => {
    setFormData(prev => {
      let currentColors = prev.colors ? [...prev.colors] : [];
      if (checked && currentColors.length === 0) {
        currentColors = [
          { id: `col-${Date.now()}-1`, name: 'Lilás Lavanda', hex: '#C084FC', bgClass: 'bg-purple-300' },
          { id: `col-${Date.now()}-2`, name: 'Rosa Pétala', hex: '#F472B6', bgClass: 'bg-pink-300' },
          { id: `col-${Date.now()}-3`, name: 'Baunilha Suave', hex: '#FEF08A', bgClass: 'bg-amber-100' },
        ];
      }
      return {
        ...prev,
        hasColors: checked,
        colors: currentColors
      };
    });
  };

  const handleApplyColorPreset = (preset: 'pasteis' | 'basicas' | 'florais' | 'candy') => {
    let newColors: ProductColorVariant[] = [];
    if (preset === 'pasteis') {
      newColors = [
        { id: `col-${Date.now()}-1`, name: 'Rosa Bebê', hex: '#FBCFE8', bgClass: 'bg-pink-200' },
        { id: `col-${Date.now()}-2`, name: 'Lilás Suave', hex: '#DDD6FE', bgClass: 'bg-purple-200' },
        { id: `col-${Date.now()}-3`, name: 'Amarelo Manteiga', hex: '#FEF08A', bgClass: 'bg-amber-100' },
        { id: `col-${Date.now()}-4`, name: 'Azul Céu', hex: '#BAE6FD', bgClass: 'bg-sky-200' },
        { id: `col-${Date.now()}-5`, name: 'Verde Menta', hex: '#A7F3D0', bgClass: 'bg-emerald-200' },
      ];
    } else if (preset === 'basicas') {
      newColors = [
        { id: `col-${Date.now()}-1`, name: 'Branco Puro', hex: '#FFFFFF', bgClass: 'bg-white' },
        { id: `col-${Date.now()}-2`, name: 'Preto Clássico', hex: '#1E293B', bgClass: 'bg-slate-900' },
        { id: `col-${Date.now()}-3`, name: 'Nude / Kraft', hex: '#E5D5C5', bgClass: 'bg-amber-200' },
        { id: `col-${Date.now()}-4`, name: 'Dourado / Mostarda', hex: '#FACC15', bgClass: 'bg-amber-400' },
      ];
    } else if (preset === 'florais') {
      newColors = [
        { id: `col-${Date.now()}-1`, name: 'Jardim Rosé', hex: '#F472B6', bgClass: 'bg-pink-300', imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80' },
        { id: `col-${Date.now()}-2`, name: 'Lavanda Silvestre', hex: '#C084FC', bgClass: 'bg-purple-300', imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80' },
        { id: `col-${Date.now()}-3`, name: 'Margaridas do Campo', hex: '#FEF08A', bgClass: 'bg-amber-100', imageUrl: 'https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?auto=format&fit=crop&w=400&q=80' },
      ];
    } else if (preset === 'candy') {
      newColors = [
        { id: `col-${Date.now()}-1`, name: 'Rosa Chiclete', hex: '#F472B6', bgClass: 'bg-pink-300' },
        { id: `col-${Date.now()}-2`, name: 'Lilás Marshmallow', hex: '#C084FC', bgClass: 'bg-purple-300' },
        { id: `col-${Date.now()}-3`, name: 'Menta Macaron', hex: '#6EE7B7', bgClass: 'bg-emerald-300' },
      ];
    }

    setFormData(prev => ({
      ...prev,
      hasColors: true,
      colors: newColors
    }));
  };

  const handleAddColorVariant = () => {
    const currentList = formData.colors || [];
    const newColor: ProductColorVariant = {
      id: `col-${Date.now()}-${currentList.length + 1}`,
      name: `Nova Cor ${currentList.length + 1}`,
      hex: '#F472B6',
      bgClass: 'bg-pink-300'
    };
    setFormData(prev => ({
      ...prev,
      hasColors: true,
      colors: [...(prev.colors || []), newColor]
    }));
  };

  const handleRemoveColorVariant = (id: string) => {
    setFormData(prev => ({
      ...prev,
      colors: (prev.colors || []).filter(c => c.id !== id)
    }));
  };

  const handleUpdateColorVariant = (id: string, field: keyof ProductColorVariant, value: any) => {
    setFormData(prev => ({
      ...prev,
      colors: (prev.colors || []).map(c => {
        if (c.id === id) {
          return { ...c, [field]: value };
        }
        return c;
      })
    }));
  };

  const handleColorImageUpload = async (id: string, file: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('A imagem da cor deve ter no máximo 8MB.');
      return;
    }
    try {
      const compressed = await compressImage(file, 500, 0.8);
      handleUpdateColorVariant(id, 'imageUrl', compressed);
    } catch (e: any) {
      setErrorMessage(e.message || 'Erro ao processar imagem da cor.');
    }
  };

  // MULTIPLE PHOTOS MANAGEMENT
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Por favor selecione apenas arquivos de imagem.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('A imagem selecionada é muito pesada (máx 10MB).');
        return;
      }

      try {
        const compressedBase64 = await compressImage(file, 1000, 0.82);
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), compressedBase64]
        }));
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao comprimir imagem.');
      }
    });

    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), imageUrlInput.trim()]
    }));
    setImageUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => {
      const updated = (prev.images || []).filter((_, i) => i !== index);
      return {
        ...prev,
        images: updated.length > 0 ? updated : ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80']
      };
    });
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return;
    setFormData(prev => {
      const imgs = [...(prev.images || [])];
      const selected = imgs.splice(index, 1)[0];
      return {
        ...prev,
        images: [selected, ...imgs]
      };
    });
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setFormData(prev => ({
      ...prev,
      features: [...(prev.features || []), newFeatureText.trim()]
    }));
    setNewFeatureText('');
  };

  const handleRemoveFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: (prev.features || []).filter((_, i) => i !== index)
    }));
  };

  const handleCloseAttempt = () => {
    if (formData.name && formData.name.trim().length > 0) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleDiscardDraftAndClose = () => {
    try {
      localStorage.removeItem('lavistore_product_draft');
    } catch {}
    setShowCloseConfirm(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setErrorMessage('Por favor, informe o nome do produto.');
      return;
    }
    if (!formData.price || formData.price <= 0) {
      setErrorMessage('Por favor, informe um preço de venda válido maior que zero.');
      return;
    }
    if (!formData.images || formData.images.length === 0) {
      setErrorMessage('Adicione pelo menos 1 foto para o produto.');
      return;
    }

    const calculatedStock = formData.hasSizes && formData.sizes && formData.sizes.length > 0
      ? formData.sizes.reduce((acc, s) => acc + (Number(s.stock) || 0), 0)
      : Number(formData.stock ?? 10);

    const finalProduct: Product = {
      ...formData,
      id: formData.id || (currentBiRecord?.vitrineProductId) || `lav-${Date.now().toString().slice(-5)}`,
      name: formData.name.trim(),
      category: formData.category || 'cadernos-planners',
      price: Number(formData.price),
      originalPrice: formData.originalPrice && Number(formData.originalPrice) > 0 ? Number(formData.originalPrice) : undefined,
      rating: formData.rating || 5.0,
      reviewCount: formData.reviewCount || 10,
      images: formData.images,
      description: formData.description?.trim() || 'Mimo especial Lavistore.',
      features: formData.features && formData.features.length > 0 ? formData.features : ['Design encantador com carinho'],
      stock: calculatedStock,
      tag: formData.tag?.trim() || undefined,
      dimensions: formData.dimensions?.trim() || undefined,
      isNew: formData.isNew,
      isBestseller: formData.isBestseller,
      isFloralSpecial: formData.isFloralSpecial,
      // Size Management & Variants
      hasSizes: formData.hasSizes ?? false,
      sizePricingMode: formData.sizePricingMode || 'same',
      sizes: formData.hasSizes ? (formData.sizes || []) : undefined,
      // Color Management & Variants
      hasColors: formData.hasColors ?? false,
      colors: formData.hasColors ? (formData.colors || []) : undefined,
      // Framing
      imageFit: formData.imageFit || 'cover',
      imagePosition: formData.imagePosition || 'center',
      imageScale: formData.imageScale || 100,
      // Vitrine & BI Integration
      biRecordId: currentBiRecord?.id || formData.biRecordId,
      originTamCor: currentBiRecord?.tamCor || formData.originTamCor,
      isPublished: formData.isPublished !== undefined ? formData.isPublished : true,
      autoHideWhenOutOfStock: formData.autoHideWhenOutOfStock !== undefined ? formData.autoHideWhenOutOfStock : true,
    };

    // Clean up draft on successful save
    try {
      localStorage.removeItem('lavistore_product_draft');
    } catch {}

    if (currentBiRecord && onPublishBiRecord) {
      onPublishBiRecord(currentBiRecord, finalProduct);
    } else {
      if (currentBiRecord) {
        try {
          const raw = localStorage.getItem('lavistore_bi_records');
          if (raw) {
            const list: BiProductCalculatedRecord[] = JSON.parse(raw);
            const updatedList = list.map(item => {
              if (item.id === currentBiRecord.id) {
                return {
                  ...item,
                  publishedToVitrine: finalProduct.isPublished !== false,
                  vitrineProductId: finalProduct.id,
                  vitrineImageUrl: finalProduct.images[0],
                  vitrineCategory: finalProduct.category,
                  vitrineTag: finalProduct.tag
                };
              }
              return item;
            });
            localStorage.setItem('lavistore_bi_records', JSON.stringify(updatedList));
            fetch('/api/bi/records', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ records: updatedList })
            }).catch(() => {});
          }
        } catch (err) {
          console.warn('Erro ao sincronizar registro do BI:', err);
        }
      }
      onSaveProduct(finalProduct);
    }
    onClose();
  };

  const handleUnpublish = () => {
    if (currentBiRecord && onUnpublishBiRecord) {
      onUnpublishBiRecord(currentBiRecord.id, formData.id);
      onClose();
    } else if (productToEdit) {
      onSaveProduct({ ...productToEdit, isPublished: false });
      onClose();
    }
  };

  const handleViewLive = () => {
    if (onViewLiveProduct && formData.id) {
      onViewLiveProduct(formData as Product);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Status de publicação atual na vitrine
  const isPublishedOnVitrine = Boolean(
    (currentBiRecord && currentBiRecord.publishedToVitrine) ||
    (productToEdit && productToEdit.isPublished !== false) ||
    formData.isPublished
  );

  // Calculate discount percentage if original price is set
  const discountPercent = formData.originalPrice && formData.price && formData.originalPrice > formData.price
    ? Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-purple-950/60 backdrop-blur-sm animate-in fade-in">
      <div 
        id="admin-product-modal"
        className="bg-white rounded-3xl border-2 border-pink-300 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden font-['Comfortaa'] text-slate-800 my-auto relative"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-pink-200/80 bg-gradient-to-r from-pink-100/90 via-purple-50 to-amber-100/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 border-2 border-white shadow-xs flex items-center justify-center text-white font-bold">
              {currentBiRecord ? <Store className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-['Mali'] text-xl sm:text-2xl font-bold text-purple-950">
                  {currentBiRecord 
                    ? (isPublishedOnVitrine ? 'Atualizar Mimo na Vitrine 🌸' : 'Publicar Mimo na Vitrine 🌸')
                    : (isEditing ? 'Editar Mimo da Vitrine 🌸' : 'Cadastrar Novo Mimo na Vitrine 🌸')}
                </h2>
                {currentBiRecord && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500 text-white border border-pink-400 shadow-2xs">
                    Integração Direta com Planilha BI
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-900 font-semibold">
                {currentBiRecord
                  ? 'Replica os dados da planilha para a loja virtual com foto personalizada, estoque real e grades.'
                  : (isEditing 
                    ? `ID: ${formData.id} • Dados da Loja, Fotos, Preços, Cores e Tamanhos` 
                    : 'Preencha as informações que os clientes verão na loja online')}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseAttempt}
            className="p-2 rounded-xl text-slate-400 hover:text-purple-950 hover:bg-pink-200/60 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Close Confirmation Modal */}
        {showCloseConfirm && (
          <div className="absolute inset-0 z-50 bg-purple-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 border-2 border-pink-300 shadow-2xl max-w-md w-full text-center space-y-4 font-['Comfortaa']">
              <div className="w-14 h-14 rounded-full bg-pink-100 border-2 border-pink-300 text-pink-600 mx-auto flex items-center justify-center">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="font-['Mali'] text-lg font-bold text-purple-950">
                Deseja sair da edição?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Você tem alterações para <strong>"{formData.name || 'este produto'}"</strong>. Seu rascunho fica salvo automaticamente para você continuar depois.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseConfirm(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-sm transition-colors"
                >
                  Continuar Editando
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCloseConfirm(false);
                    onClose();
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-amber-100 hover:bg-amber-200 text-purple-950 font-bold text-xs transition-colors"
                >
                  Fechar (Manter Rascunho)
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraftAndClose}
                  className="w-full sm:w-auto px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-500 font-bold text-[11px] transition-colors"
                  title="Apagar o rascunho salvo e fechar"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 bg-purple-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 border-2 border-rose-300 shadow-2xl max-w-md w-full text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-100 border-2 border-rose-300 text-rose-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="font-['Mali'] text-lg font-bold text-purple-950">
                Excluir este Mimo da Vitrine?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Tem certeza que deseja remover <strong>"{formData.name}"</strong> do catálogo? Essa ação removerá o item da vitrine.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteProduct && formData.id) {
                      onDeleteProduct(formData.id);
                      onClose();
                    }
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
                >
                  Sim, Excluir Mimo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* Draft Restored Banner */}
          {hasRestoredDraft && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 text-emerald-900 p-3 rounded-2xl font-bold flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Rascunho recuperado automaticamente! Você não perdeu suas alterações.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('lavistore_product_draft');
                  } catch {}
                  setHasRestoredDraft(false);
                }}
                className="px-2 py-0.5 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px]"
              >
                Limpar
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-50 border-2 border-rose-300 text-rose-800 p-3.5 rounded-2xl font-bold flex items-center gap-2 animate-in fade-in">
              <HelpCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* MIMO SELECIONADO DA PLANILHA PARA A VITRINE */}
          {currentBiRecord && (
            <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-amber-50/80 p-4 sm:p-5 rounded-3xl border-2 border-pink-300 shadow-xs space-y-3 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-pink-600" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-pink-800">
                    Mimo Selecionado da Planilha para a Vitrine:
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border flex items-center gap-1 ${
                  currentBiRecord.saldoEstoqueQtd > 0
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {currentBiRecord.saldoEstoqueQtd > 0 ? `✓ ${currentBiRecord.saldoEstoqueQtd} em estoque real` : '⚠️ Esgotado na planilha'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base sm:text-lg font-['Mali'] font-extrabold text-purple-950">
                    {currentBiRecord.produto}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-800 font-bold border border-purple-200">
                    {currentBiRecord.tamCor || 'Único'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSyncFromSpreadsheet}
                  title="Copiar dados recentes da linha da planilha para o formulário"
                  className="px-3 py-1.5 text-[11px] font-bold bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-pink-600" />
                  <span>Sincronizar dados da Planilha</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-pink-200/80 text-[11px]">
                <div className="bg-white/90 p-2.5 rounded-xl border border-pink-100 shadow-2xs">
                  <span className="text-slate-400 block text-[10px]">Preço de Venda</span>
                  <strong className="text-purple-950 font-bold text-xs">R$ {currentBiRecord.precoVenda.toFixed(2)}</strong>
                </div>
                <div className="bg-white/90 p-2.5 rounded-xl border border-pink-100 shadow-2xs">
                  <span className="text-slate-400 block text-[10px]">Custo Unitário</span>
                  <strong className="text-slate-700 font-bold text-xs">R$ {currentBiRecord.custoUnitario.toFixed(2)}</strong>
                </div>
                <div className="bg-white/90 p-2.5 rounded-xl border border-pink-100 shadow-2xs">
                  <span className="text-slate-400 block text-[10px]">Saldo Estoque</span>
                  <strong className="text-emerald-700 font-bold text-xs">{currentBiRecord.saldoEstoqueQtd} unidades</strong>
                </div>
                <div className="bg-white/90 p-2.5 rounded-xl border border-pink-100 shadow-2xs">
                  <span className="text-slate-400 block text-[10px]">Apuração</span>
                  <strong className="text-purple-900 font-bold text-xs">{currentBiRecord.mes}/{currentBiRecord.ano}</strong>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 1: INFORMAÇÕES BÁSICAS DA VITRINE */}
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-base font-bold text-purple-950 flex items-center gap-2 border-b border-pink-100 pb-1.5">
              <Tag className="w-4 h-4 text-pink-500" />
              <span>1. Informações Básicas na Vitrine</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome do Produto */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="font-bold text-purple-950 flex items-center justify-between">
                  <span>Nome do Produto na Vitrine *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Exibido em destaque aos clientes</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Caneta Tinta Invisível, Caderno Argolado Jardim Lilás..."
                  className="w-full px-3.5 py-2.5 bg-purple-50/40 border-2 border-purple-200 rounded-2xl font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              {/* Categoria */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950">Categoria da Loja *</label>
                <select
                  value={formData.category || 'cadernos-planners'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-purple-50/40 border-2 border-purple-200 rounded-2xl font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer"
                >
                  {categories.filter(c => c.id !== 'todos').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selo / Tag em Destaque */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950">Selo / Tag em Destaque (Badge)</label>
                <input
                  type="text"
                  value={formData.tag || ''}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  placeholder="Ex: Novidade ✨, Mais Vendido 🔥, Fofura 🌸"
                  className="w-full px-3.5 py-2.5 bg-purple-50/40 border-2 border-purple-200 rounded-2xl font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              {/* Dimensões / Medidas */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="font-bold text-purple-950 flex items-center justify-between">
                  <span>Dimensões / Medidas do Mimo (Opcional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Ex: tamanho, gramatura, páginas</span>
                </label>
                <input
                  type="text"
                  value={formData.dimensions || ''}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  placeholder="Ex: 15 x 21 cm (A5) • 160 páginas • Gramatura 90g"
                  className="w-full px-3.5 py-2.5 bg-purple-50/40 border-2 border-purple-200 rounded-2xl font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PREÇO NA VITRINE & OFERTA (PREÇO ORIGINAL RISCADO "DE") */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-pink-50/80 via-white to-amber-50/60 rounded-3xl border-2 border-pink-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-pink-200/80 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-500 text-white flex items-center justify-center shadow-xs font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-['Mali'] text-base font-bold text-purple-950">
                    2. Preço de Venda & Oferta na Vitrine
                  </h3>
                  <p className="text-[11px] text-purple-900 font-medium">
                    Valores exibidos diretamente aos clientes na loja (preço promocional "De ... Por")
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-pink-700 bg-pink-100 px-2.5 py-1 rounded-full border border-pink-200">
                🌸 Vitrine Online
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Preço de Venda Final */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-pink-600" />
                  <span>Preço de Venda (Por R$) *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-pink-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.price ?? ''}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    placeholder="39.90"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border-2 border-pink-300 rounded-2xl font-black text-base text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>
                <span className="text-[9px] text-slate-500 font-medium block">
                  Valor final que o cliente paga na loja
                </span>
              </div>

              {/* Preço Original Riscado "De" */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-600">
                    <span>Preço Original "De" (R$)</span>
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">Opcional</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.originalPrice ?? ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      originalPrice: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    placeholder="Ex: 59.90"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border-2 border-slate-200 rounded-2xl font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
                <span className="text-[9px] text-slate-500 font-medium block">
                  Aparece riscado na vitrine em promoções
                </span>
              </div>

              {/* Estoque Disponível */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-600" />
                  <span>Estoque Disponível (Unidades)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    disabled={!!formData.hasSizes}
                    value={formData.stock ?? 10}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2.5 rounded-2xl font-bold text-purple-950 focus:outline-none ${
                      formData.hasSizes
                        ? 'bg-purple-100/80 border-2 border-purple-300 cursor-not-allowed text-purple-900'
                        : 'bg-white border-2 border-amber-200 focus:ring-2 focus:ring-amber-400'
                    }`}
                  />
                  {formData.hasSizes && (
                    <span className="absolute right-3 top-2.5 text-[8px] font-extrabold bg-pink-100 text-pink-800 px-2 py-0.5 rounded-md border border-pink-200">
                      Soma das grades
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-slate-500 font-medium block">
                  {formData.hasSizes 
                    ? `Soma automática das ${formData.sizes?.length || 0} variações de tamanho cadastradas.` 
                    : 'Quantidade total disponível para pronta entrega.'}
                </span>
              </div>
            </div>

            {/* Prévia da Promoção na Vitrine */}
            {discountPercent > 0 && (
              <div className="p-3 bg-gradient-to-r from-pink-100/90 to-amber-100/90 rounded-2xl border border-pink-200 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-2xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-rose-600 text-white rounded-xl font-black text-xs shadow-xs flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    <span>-{discountPercent}% OFF</span>
                  </span>
                  <span className="text-xs text-purple-950 font-bold">
                    Destaque Promocional Ativo na Vitrine!
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 line-through font-semibold">
                    De R$ {(formData.originalPrice || 0).toFixed(2)}
                  </span>
                  <span className="font-extrabold text-pink-600 text-sm">
                    Por R$ {(formData.price || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-lg">
                    Economia de R$ {((formData.originalPrice || 0) - (formData.price || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: FOTOS DO MIMO & GALERIA DA VITRINE */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pink-100 pb-2">
              <div>
                <h3 className="font-['Mali'] text-base font-bold text-purple-950 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-pink-500" />
                  <span>3. Fotos do Mimo & Galeria ({formData.images?.length || 0})</span>
                </h3>
                <p className="text-[11px] text-purple-900 font-medium">
                  Insira várias fotos para os clientes verem detalhes, ângulos e variações do produto
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                  ⭐ A 1ª foto é a Capa Principal
                </span>
              </div>
            </div>

            {/* Previews das Fotos Cadastradas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {(formData.images || []).map((img, idx) => (
                <div 
                  key={idx} 
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 group shadow-xs transition-all ${
                    idx === 0 
                      ? 'border-pink-500 ring-2 ring-pink-300 scale-[1.02]' 
                      : 'border-slate-200 hover:border-pink-300'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Foto ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-current" /> Capa
                    </span>
                  )}
                  {/* Overlay de Ações */}
                  <div className="absolute inset-0 bg-purple-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        className="px-2 py-1 bg-amber-400 hover:bg-amber-300 text-purple-950 rounded-xl font-bold text-[9px] shadow-xs transition-colors flex items-center gap-1"
                        title="Tornar esta foto a capa principal da vitrine"
                      >
                        <Star className="w-3 h-3" /> Tornar Capa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1 text-[9px] font-bold"
                      title="Excluir Foto"
                    >
                      <Trash2 className="w-3 h-3" /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Sugestão de Foto Inteligente com base no nome do mimo */}
            {suggestedPhoto && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gradient-to-r from-amber-50 via-pink-50 to-purple-50 border-2 border-pink-200 rounded-2xl shadow-2xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-600 shrink-0" />
                  <span className="text-xs text-purple-950 font-bold">
                    Foto sugerida para <span className="text-pink-600 capitalize">"{suggestedPhoto.keyword}"</span>:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => {
                      const imgs = prev.images || [];
                      if (!imgs.includes(suggestedPhoto.url)) {
                        return { ...prev, images: [suggestedPhoto.url, ...imgs] };
                      }
                      return prev;
                    });
                  }}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aplicar Foto Sugerida</span>
                </button>
              </div>
            )}

            {/* Inserir Mais Fotos - Área Destacada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Opção A: Upload de Múltiplas Fotos do Dispositivo */}
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-pink-300 hover:border-pink-500 bg-pink-50/50 hover:bg-pink-100/50 rounded-2xl cursor-pointer transition-colors text-center group shadow-2xs">
                <div className="w-9 h-9 rounded-full bg-pink-100 group-hover:bg-pink-200 text-pink-600 flex items-center justify-center mb-1 transition-colors">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="font-bold text-purple-950 text-xs flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-pink-500" />
                  <span>Inserir Mais Fotos (Computador / Celular)</span>
                </span>
                <span className="text-[9px] text-slate-500 font-medium">
                  Selecione uma ou várias fotos juntas (JPG, PNG, WebP)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Opção B: Inserir via Link / URL */}
              <div className="flex flex-col justify-between p-3.5 bg-purple-50/40 border-2 border-purple-200 rounded-2xl gap-2 shadow-2xs">
                <span className="font-bold text-purple-950 text-xs flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>Ou adicione foto por Link / URL:</span>
                </span>
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://exemplo.com/minha-foto.jpg"
                    className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors shrink-0"
                  >
                    + Adicionar
                  </button>
                </div>
                <span className="text-[8px] text-slate-400">
                  Cole o link direto da imagem na internet
                </span>
              </div>
            </div>

            {/* Painel Retrátil de Ajuste de Enquadramento e Foco da Capa */}
            <div className="border border-purple-200/80 rounded-2xl bg-purple-50/30 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowImageAdjustments(!showImageAdjustments)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-purple-100/50 transition-colors"
              >
                <span className="text-xs font-bold text-purple-950 flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-purple-600" />
                  <span>Ajustar Enquadramento, Zoom e Foco das Fotos (Opcional)</span>
                </span>
                <span className="text-[10px] font-bold text-purple-700 underline">
                  {showImageAdjustments ? 'Recolher Ajustes ▲' : 'Configurar Enquadramento ▼'}
                </span>
              </button>

              {showImageAdjustments && (
                <div className="p-4 border-t border-purple-200/80 bg-white space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-7 space-y-3">
                      {/* Modo de Exibição */}
                      <div>
                        <label className="block text-[11px] font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                          <Maximize2 className="w-3.5 h-3.5 text-purple-600" />
                          <span>Modo de Enquadramento:</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, imageFit: 'cover' }))}
                            className={`p-2 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center justify-center text-center ${
                              formData.imageFit !== 'contain'
                                ? 'border-pink-500 bg-pink-50 text-purple-950 shadow-2xs ring-1 ring-pink-300'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="font-extrabold text-xs">🖼️ Preencher (Cover)</span>
                            <span className="text-[8px] text-slate-500 font-normal">Ocupa todo o quadrado</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, imageFit: 'contain' }))}
                            className={`p-2 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center justify-center text-center ${
                              formData.imageFit === 'contain'
                                ? 'border-pink-500 bg-pink-50 text-purple-950 shadow-2xs ring-1 ring-pink-300'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="font-extrabold text-xs">🔍 Foto Inteira (Contain)</span>
                            <span className="text-[8px] text-slate-500 font-normal">Sem cortes nas bordas</span>
                          </button>
                        </div>
                      </div>

                      {/* Zoom / Escala Slider */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                            <ZoomIn className="w-3.5 h-3.5 text-purple-600" />
                            <span>Zoom / Escala da Foto:</span>
                          </label>
                          <span className="text-xs font-black text-purple-950 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            {formData.imageScale || 100}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <ZoomOut className="w-4 h-4 text-purple-700 shrink-0" />
                          <input
                            type="range"
                            min="60"
                            max="150"
                            step="5"
                            value={formData.imageScale || 100}
                            onChange={(e) => setFormData(prev => ({ ...prev, imageScale: Number(e.target.value) }))}
                            className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                          />
                          <ZoomIn className="w-4 h-4 text-purple-700 shrink-0" />
                        </div>
                      </div>

                      {/* Alinhamento do Foco */}
                      <div>
                        <label className="block text-[11px] font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                          <Move className="w-3.5 h-3.5 text-purple-600" />
                          <span>Alinhamento do Foco da Foto:</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'top', label: '⬆️ Topo' },
                            { id: 'center', label: '⏹️ Centro' },
                            { id: 'bottom', label: '⬇️ Base' }
                          ].map((pos) => (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, imagePosition: pos.id as any }))}
                              className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all ${
                                (formData.imagePosition || 'center') === pos.id
                                  ? 'border-pink-500 bg-pink-100 text-purple-950 shadow-2xs ring-1 ring-pink-300'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-purple-50'
                              }`}
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Mini Prévia da Capa */}
                    <div className="md:col-span-5 flex flex-col items-center">
                      <div className="w-full max-w-[190px] bg-white rounded-2xl border-2 border-pink-300 shadow-md p-2.5 space-y-2">
                        <div className="text-[9px] font-bold text-purple-950 text-center flex items-center justify-center gap-1">
                          <Sparkles className="w-3 h-3 text-pink-500" />
                          <span>Prévia do Card na Vitrine</span>
                        </div>

                        <div className={`relative aspect-square rounded-xl overflow-hidden border border-purple-100 ${formData.imageFit === 'contain' ? 'bg-purple-50/70 p-1 flex items-center justify-center' : 'bg-slate-100'}`}>
                          <img
                            src={formData.images?.[0] || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80'}
                            alt="Prévia do produto"
                            style={{
                              objectFit: formData.imageFit || 'cover',
                              objectPosition: formData.imagePosition || 'center',
                              transform: formData.imageScale && formData.imageScale !== 100 ? `scale(${formData.imageScale / 100})` : undefined,
                            }}
                            className="w-full h-full transition-transform duration-300"
                          />
                          {formData.tag && (
                            <span className="absolute top-1 left-1 bg-white/90 text-purple-950 text-[7px] font-bold px-1.5 py-0.5 rounded-full shadow-2xs">
                              {formData.tag}
                            </span>
                          )}
                        </div>

                        <div className="text-center">
                          <p className="text-[11px] font-bold text-purple-950 truncate">
                            {formData.name || 'Nome do Mimo'}
                          </p>
                          <div className="flex items-center justify-center gap-1.5">
                            {formData.originalPrice && formData.originalPrice > (formData.price || 0) && (
                              <span className="text-[9px] text-slate-400 line-through">
                                R$ {Number(formData.originalPrice).toFixed(2)}
                              </span>
                            )}
                            <span className="text-xs font-black text-rose-500">
                              R$ {Number(formData.price || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: CONTROLE POR GRADE DE TAMANHO */}
          <div className="bg-gradient-to-br from-purple-50/70 via-white to-pink-50/50 rounded-3xl p-4 sm:p-5 border-2 border-purple-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs font-bold">
                  <Ruler className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-['Mali'] text-base font-bold text-purple-950 flex items-center gap-2">
                    <span>4. Grade de Tamanhos & Medidas</span>
                    <span className="text-[9px] font-bold bg-purple-200 text-purple-950 px-2 py-0.5 rounded-full border border-purple-300">
                      Opcional
                    </span>
                  </h3>
                  <p className="text-[11px] text-purple-900">
                    Permite ao cliente escolher tamanho (P, M, G, 34-36, numeração ou medidas) com controle individual de estoque
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => handleToggleHasSizes(!formData.hasSizes)}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-2xs ${
                  formData.hasSizes
                    ? 'bg-purple-600 text-white border-2 border-purple-700 shadow-purple-200'
                    : 'bg-slate-100 text-slate-600 border-2 border-slate-300 hover:bg-slate-200'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${formData.hasSizes ? 'bg-white border-purple-600 translate-x-0.5' : 'bg-slate-400 border-slate-300'}`} />
                <span>{formData.hasSizes ? 'Grade de Tamanhos Ativada' : 'Ativar Grade de Tamanhos'}</span>
              </button>
            </div>

            {formData.hasSizes ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Banner de Sincronização Inteligente com a Planilha */}
                {detectedSpreadsheetSiblings.length > 0 && (
                  <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-purple-50 border-2 border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-2xs">
                    <div className="flex items-start sm:items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Sparkles className="w-4 h-4 text-amber-200" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                          <span>✨ Variações Preenchidas Automaticamente da Planilha</span>
                          <span className="bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-full text-[9px] font-extrabold border border-emerald-300">
                            Coluna 'Tam/Cor'
                          </span>
                        </h4>
                        <p className="text-[11px] text-emerald-900 font-medium">
                          {detectedSpreadsheetSiblings.length} variações identificadas com seus saldos de estoque:{' '}
                          <strong className="text-emerald-950">
                            {detectedSpreadsheetSiblings.map(s => `${s.tamCor} (${s.saldoEstoqueQtd > 0 ? s.saldoEstoqueQtd : s.quantidadeComprada} un.)`).join(', ')}
                          </strong>.
                          Zero trabalho manual duplicado!
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadSizesFromSpreadsheet}
                      title="Recarregar tamanhos e quantidades originais da planilha"
                      className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl text-xs font-extrabold shadow-2xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Recarregar da Planilha</span>
                    </button>
                  </div>
                )}

                {/* Presets Rápidos */}
                <div>
                  <label className="text-[11px] font-bold text-purple-950 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Carregar Grade Rápida com 1 Clique:</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedSpreadsheetSiblings.length > 0 && (
                      <button
                        type="button"
                        onClick={handleLoadSizesFromSpreadsheet}
                        className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 border border-emerald-400 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-200" />
                        <span>📊 Planilha ({detectedSpreadsheetSiblings.map(s => s.tamCor).join(', ')})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleApplySizePreset('calcados')}
                      className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-950 border border-purple-200 rounded-lg text-xs font-bold transition-all shadow-2xs"
                    >
                      🧦 Meias / Calçados (34-36, 37-39...)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySizePreset('roupas')}
                      className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-950 border border-purple-200 rounded-lg text-xs font-bold transition-all shadow-2xs"
                    >
                      👕 Roupas (P, M, G, GG)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySizePreset('infantil')}
                      className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-950 border border-purple-200 rounded-lg text-xs font-bold transition-all shadow-2xs"
                    >
                      👶 Infantil (1-2a, 3-4a, 5-6a...)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySizePreset('numeros')}
                      className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-950 border border-purple-200 rounded-lg text-xs font-bold transition-all shadow-2xs"
                    >
                      📏 Numeração (34, 36, 38, 40...)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySizePreset('papelaria')}
                      className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-950 border border-purple-200 rounded-lg text-xs font-bold transition-all shadow-2xs"
                    >
                      📐 Cadernos (A6, A5, Univ.)
                    </button>
                  </div>
                </div>

                {/* Modo de Preço por Tamanho */}
                <div className="bg-white/90 p-3 rounded-2xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-bold text-purple-950">Preço dos Tamanhos:</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-purple-950">
                      <input
                        type="radio"
                        name="sizePricingMode"
                        checked={formData.sizePricingMode !== 'custom'}
                        onChange={() => setFormData(prev => ({ ...prev, sizePricingMode: 'same' }))}
                        className="text-purple-600 focus:ring-purple-400 accent-purple-600"
                      />
                      <span>Preço Único (R$ {Number(formData.price || 0).toFixed(2)})</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-purple-950">
                      <input
                        type="radio"
                        name="sizePricingMode"
                        checked={formData.sizePricingMode === 'custom'}
                        onChange={() => setFormData(prev => ({ ...prev, sizePricingMode: 'custom' }))}
                        className="text-purple-600 focus:ring-purple-400 accent-purple-600"
                      />
                      <span>Preço Diferenciado por Tamanho</span>
                    </label>
                  </div>
                </div>

                {/* Tabela de Tamanhos */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-2 text-[9px] font-bold text-purple-950 uppercase">
                    <div className={formData.sizePricingMode === 'custom' ? 'col-span-6 sm:col-span-5' : 'col-span-8 sm:col-span-7'}>
                      Tamanho / Medida (Editável)
                    </div>
                    <div className="col-span-3 sm:col-span-3 text-center">Estoque Disponível</div>
                    {formData.sizePricingMode === 'custom' && (
                      <div className="col-span-3 sm:col-span-3 text-center">Preço (R$)</div>
                    )}
                    <div className="col-span-1 text-center">Excluir</div>
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {(formData.sizes || []).map((sz, index) => (
                      <div 
                        key={sz.id || index}
                        className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-purple-200 shadow-2xs hover:border-purple-400 transition-all"
                      >
                        {/* Label */}
                        <div className={formData.sizePricingMode === 'custom' ? 'col-span-6 sm:col-span-5' : 'col-span-8 sm:col-span-7'}>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={sz.label}
                              onChange={(e) => handleUpdateSizeVariant(sz.id, 'label', e.target.value)}
                              placeholder="Ex: P, M, 34-36, 15x21cm"
                              className="w-full px-2.5 py-1.5 bg-purple-50/40 border border-purple-200 rounded-lg text-xs font-bold text-purple-950 focus:outline-none focus:ring-1 focus:ring-purple-400"
                            />
                            {sz.biRecordId && (
                              <span 
                                className="shrink-0 text-[9px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-md"
                                title="Variação vinculada à linha correspondente na planilha Google Sheets"
                              >
                                📊 Planilha
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Estoque */}
                        <div className="col-span-3 sm:col-span-3">
                          <input
                            type="number"
                            min="0"
                            value={sz.stock}
                            onChange={(e) => handleUpdateSizeVariant(sz.id, 'stock', Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full text-center px-2 py-1.5 bg-purple-50/60 border border-purple-200 rounded-lg text-xs font-extrabold text-purple-950 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                        </div>

                        {/* Preço Customizado */}
                        {formData.sizePricingMode === 'custom' && (
                          <div className="col-span-3 sm:col-span-3 relative">
                            <span className="absolute left-2 top-1.5 text-[11px] font-bold text-slate-400">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={sz.price ?? formData.price ?? 0}
                              onChange={(e) => handleUpdateSizeVariant(sz.id, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full pl-7 pr-2 py-1.5 bg-pink-50/60 border border-pink-200 rounded-lg text-xs font-extrabold text-pink-700 focus:outline-none focus:ring-1 focus:ring-pink-400"
                            />
                          </div>
                        )}

                        {/* Excluir */}
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveSizeVariant(sz.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remover este tamanho"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Adicionar Tamanho & Resumo */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-purple-200/90">
                    <button
                      type="button"
                      onClick={handleAddSizeVariant}
                      className="w-full sm:w-auto px-3.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-purple-300 transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Outro Tamanho / Medida</span>
                    </button>

                    <div className="text-[11px] font-bold text-purple-950 bg-white/90 px-3 py-1 rounded-xl border border-purple-200 shadow-2xs">
                      📊 Total: <strong>{formData.sizes?.length || 0}</strong> tamanhos • Estoque Total Somado: <strong className="text-purple-800 font-black">{formData.stock || 0} un.</strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white/60 rounded-xl border border-purple-200 text-center">
                <p className="text-xs text-slate-600">
                  Grade de tamanho desativada. O produto é vendido como tamanho único com estoque geral de <strong>{formData.stock || 0} unidades</strong>.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 5: CONTROLE POR GRADE DE CORES & ESTAMPAS */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pink-100 pb-2">
              <div>
                <h3 className="font-['Mali'] text-base font-bold text-purple-950 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-pink-500" />
                  <span>5. Grade de Cores & Estampas (Foto & Descrição)</span>
                </h3>
                <p className="text-[11px] text-purple-900 font-medium">
                  Cadastre opções de cores ou estampas com foto miniatura e descrição para o cliente escolher na vitrine
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => handleToggleHasColors(!formData.hasColors)}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-2xs ${
                  formData.hasColors
                    ? 'bg-pink-500 text-white border-2 border-pink-600 shadow-pink-200'
                    : 'bg-slate-100 text-slate-600 border-2 border-slate-300 hover:bg-slate-200'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${formData.hasColors ? 'bg-white border-pink-500 translate-x-0.5' : 'bg-slate-400 border-slate-300'}`} />
                <span>{formData.hasColors ? 'Grade de Cores Ativada' : 'Ativar Grade de Cores'}</span>
              </button>
            </div>

            {formData.hasColors ? (
              <div className="p-4 bg-gradient-to-br from-pink-50/70 via-white to-purple-50/50 rounded-3xl border-2 border-pink-200 space-y-4">
                {/* Presets Bar */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white/80 rounded-xl border border-pink-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-purple-950 flex items-center gap-1 mr-1">
                    <Sparkles className="w-3 h-3 text-pink-500" />
                    <span>Modelos Rápidos:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyColorPreset('pasteis')}
                    className="px-2.5 py-1 rounded-lg bg-pink-100/80 hover:bg-pink-200 text-purple-950 text-[11px] font-bold transition-colors border border-pink-200"
                  >
                    🌸 Tons Pastéis
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyColorPreset('florais')}
                    className="px-2.5 py-1 rounded-lg bg-purple-100/80 hover:bg-purple-200 text-purple-950 text-[11px] font-bold transition-colors border border-purple-200"
                  >
                    🌺 Estampas Florais (com Fotos)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyColorPreset('candy')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100/80 hover:bg-emerald-200 text-purple-950 text-[11px] font-bold transition-colors border border-emerald-200"
                  >
                    🍬 Macaron Candy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyColorPreset('basicas')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition-colors border border-slate-200"
                  >
                    🎨 Neutras / Básicas
                  </button>
                </div>

                {/* Lista de Variações de Cor */}
                <div className="space-y-2.5">
                  {(formData.colors || []).map((col) => (
                    <div
                      key={col.id}
                      className="bg-white p-3 rounded-2xl border-2 border-pink-200/80 shadow-2xs hover:border-pink-400 transition-all flex flex-col sm:grid sm:grid-cols-12 gap-3 items-center"
                    >
                      {/* Miniatura / Upload Foto da Estampa */}
                      <div className="w-full sm:col-span-4 flex items-center gap-2">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-pink-300 bg-slate-50 shrink-0 flex items-center justify-center shadow-2xs group">
                          {col.imageUrl ? (
                            <>
                              <img
                                src={col.imageUrl}
                                alt={col.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateColorVariant(col.id, 'imageUrl', undefined)}
                                className="absolute inset-0 bg-purple-950/75 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold"
                                title="Remover foto"
                              >
                                Remover
                              </button>
                            </>
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-slate-400"
                              style={col.hex ? { backgroundColor: col.hex } : undefined}
                            >
                              {!col.hex && <ImageIcon className="w-4 h-4 text-slate-300" />}
                            </div>
                          )}
                        </div>

                        {/* Botão de Foto da Cor / Estampa */}
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <label className="cursor-pointer px-2 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-purple-950 border border-pink-200 font-bold text-[10px] text-center flex items-center justify-center gap-1 transition-colors">
                            <Upload className="w-3 h-3 text-pink-600" />
                            <span>{col.imageUrl ? 'Trocar Foto' : 'Foto da Estampa'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleColorImageUpload(col.id, e.target.files[0]);
                                }
                              }}
                              className="hidden"
                            />
                          </label>

                          <input
                            type="url"
                            value={col.imageUrl?.startsWith('data:') ? 'Foto do dispositivo' : (col.imageUrl || '')}
                            disabled={col.imageUrl?.startsWith('data:')}
                            onChange={(e) => handleUpdateColorVariant(col.id, 'imageUrl', e.target.value)}
                            placeholder="ou Link da foto"
                            className="w-full px-2 py-0.5 bg-purple-50/30 border border-purple-200 rounded-lg text-[9px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-pink-400"
                          />
                        </div>
                      </div>

                      {/* Nome da Cor */}
                      <div className="w-full sm:col-span-5 space-y-1">
                        <label className="sm:hidden text-[10px] font-bold text-purple-950 block">
                          Nome da Cor / Estampa:
                        </label>
                        <input
                          type="text"
                          required
                          value={col.name || ''}
                          onChange={(e) => handleUpdateColorVariant(col.id, 'name', e.target.value)}
                          placeholder="Ex: Lilás Lavanda, Floral Margaridas, Rosa Bebê"
                          className="w-full px-3 py-2 bg-purple-50/40 border-2 border-purple-200 rounded-xl font-bold text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-400"
                        />
                      </div>

                      {/* Seletor Hex */}
                      <div className="w-full sm:col-span-2 flex items-center gap-1.5">
                        <input
                          type="color"
                          value={col.hex || '#F472B6'}
                          onChange={(e) => handleUpdateColorVariant(col.id, 'hex', e.target.value)}
                          className="w-8 h-8 rounded-xl cursor-pointer border border-pink-300 p-0.5 bg-white shrink-0"
                          title="Escolher tom de cor"
                        />
                        <input
                          type="text"
                          value={col.hex || ''}
                          onChange={(e) => handleUpdateColorVariant(col.id, 'hex', e.target.value)}
                          placeholder="#F472B6"
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[10px] text-slate-700 uppercase focus:outline-none focus:ring-1 focus:ring-pink-400"
                        />
                      </div>

                      {/* Excluir */}
                      <div className="w-full sm:col-span-1 flex items-center justify-end sm:justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveColorVariant(col.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Remover esta cor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Adicionar Cor & Resumo */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-pink-200/90">
                  <button
                    type="button"
                    onClick={handleAddColorVariant}
                    className="w-full sm:w-auto px-3.5 py-1.5 bg-pink-100 hover:bg-pink-200 text-purple-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-pink-300 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Outra Cor / Estampa</span>
                  </button>

                  <div className="text-[11px] font-bold text-purple-950 bg-white/90 px-3 py-1 rounded-xl border border-pink-200 shadow-2xs">
                    🎨 Total: <strong>{formData.colors?.length || 0}</strong> cores/estampas cadastradas
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white/60 rounded-xl border border-pink-200 text-center">
                <p className="text-xs text-slate-600">
                  Grade de cores desativada. O mimo será vendido sem seleção obrigatória de cor na vitrine.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 6: DESCRIÇÃO & DIFERENCIAIS ENCANTADORES */}
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-base font-bold text-purple-950 flex items-center gap-2 border-b border-pink-100 pb-1.5">
              <Layers className="w-4 h-4 text-pink-500" />
              <span>6. Descrição & Diferenciais Encantadores na Loja</span>
            </h3>

            {/* Descrição */}
            <div className="space-y-1.5">
              <label className="font-bold text-purple-950">Descrição Completa para a Vitrine</label>
              <textarea
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Conte com carinho sobre os materiais, acabamento especial, por que ele é apaixonante e perfeito para presentear..."
                className="w-full px-3.5 py-2.5 bg-purple-50/40 border-2 border-purple-200 rounded-2xl font-medium text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-400 leading-relaxed"
              />
            </div>

            {/* Bullets / Diferenciais */}
            <div className="space-y-2">
              <label className="font-bold text-purple-950">Diferenciais em Tópicos (Bullets)</label>
              <div className="space-y-1.5">
                {(formData.features || []).map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-pink-50/60 border border-pink-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-950">
                    <span className="text-pink-500">🌸</span>
                    <span className="flex-1">{feat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(idx)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newFeatureText}
                  onChange={(e) => setNewFeatureText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                  placeholder="Ex: Embalado para presente com cheirinho doce • Toque aveludado..."
                  className="flex-1 px-3.5 py-2 bg-white border-2 border-pink-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="px-3.5 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Incluir</span>
                </button>
              </div>
            </div>
          </div>

          {/* Destaques Especiais & Configurações da Vitrine */}
          <div className="space-y-3 bg-pink-50/40 p-4 rounded-2xl border-2 border-pink-200">
            <span className="font-['Mali'] text-sm font-bold text-purple-950 block">
              Destaques Especiais & Visibilidade na Vitrine:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-pink-200/60">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-950">
                <input
                  type="checkbox"
                  checked={!!formData.isNew}
                  onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                  className="w-4 h-4 rounded text-pink-500 focus:ring-pink-400 border-pink-300"
                />
                <span>✨ Marcar como Novidade</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-950">
                <input
                  type="checkbox"
                  checked={!!formData.isBestseller}
                  onChange={(e) => setFormData({ ...formData, isBestseller: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-pink-300"
                />
                <span>🔥 Mais Vendido</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-950">
                <input
                  type="checkbox"
                  checked={!!formData.isFloralSpecial}
                  onChange={(e) => setFormData({ ...formData, isFloralSpecial: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-400 border-pink-300"
                />
                <span>🌸 Coleção 3 Flores</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-950 text-xs">
                <input
                  type="checkbox"
                  checked={formData.isPublished !== false}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-400 border-pink-300"
                />
                <span>👁️ Visível na Vitrine para compra pelos clientes</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-950 text-xs">
                <input
                  type="checkbox"
                  checked={formData.autoHideWhenOutOfStock !== false}
                  onChange={(e) => setFormData({ ...formData, autoHideWhenOutOfStock: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-400 border-pink-300"
                />
                <span>📦 Ocultar automaticamente se o estoque zerar (0 un)</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-pink-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Botão Despublicar (se já estiver publicado) */}
              {isPublishedOnVitrine && (
                <button
                  type="button"
                  onClick={handleUnpublish}
                  className="px-3.5 py-2.5 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-colors border border-amber-300 shadow-2xs cursor-pointer active:scale-95"
                  title="Ocultar produto da vitrine sem perder os dados cadastrados"
                >
                  <Store className="w-3.5 h-3.5 text-amber-700" />
                  <span>Despublicar da Vitrine</span>
                </button>
              )}

              {/* Botão Ver ao Vivo na Loja */}
              {(isPublishedOnVitrine || productToEdit) && onViewLiveProduct && (
                <button
                  type="button"
                  onClick={handleViewLive}
                  className="px-3.5 py-2.5 rounded-2xl bg-pink-100 hover:bg-pink-200 text-pink-900 font-bold text-xs flex items-center gap-1.5 transition-colors border border-pink-300 shadow-2xs cursor-pointer active:scale-95"
                  title="Abrir a página do mimo ao vivo na loja virtual"
                >
                  <Eye className="w-3.5 h-3.5 text-pink-700" />
                  <span>Ver ao Vivo na Loja 👁️</span>
                </button>
              )}

              {/* Botão Excluir Mimo */}
              {isEditing && onDeleteProduct && !currentBiRecord && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3.5 py-2.5 rounded-2xl bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Mimo</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={handleCloseAttempt}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#F43F5E] via-[#FB923C] via-[#FACC15] to-[#06B6D4] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 border-2 border-white/60 active:scale-95 transition-transform cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {currentBiRecord
                    ? (isPublishedOnVitrine ? 'Atualizar Mimo na Vitrine 🌸' : 'Salvar e Publicar na Vitrine 🌸')
                    : (isEditing ? 'Salvar Alterações na Vitrine' : 'Cadastrar Mimo na Vitrine')}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
