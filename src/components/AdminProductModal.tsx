import React, { useState, useEffect, useMemo } from 'react';
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
  Calculator,
  TrendingUp,
  Percent,
  Package,
  AlertCircle,
  Ruler,
  Palette
} from 'lucide-react';
import { Product, ProductSizeVariant, ProductColorVariant, Category } from '../types';
import { CATEGORIES } from '../data/categories';
import { safeSetItem, compressImage } from '../utils/storage';

interface AdminProductModalProps {
  isOpen: boolean;
  productToEdit: Product | null;
  onClose: () => void;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  categories?: Category[];
}

export const AdminProductModal: React.FC<AdminProductModalProps> = ({
  isOpen,
  productToEdit,
  onClose,
  onSaveProduct,
  onDeleteProduct,
  categories = CATEGORIES
}) => {
  const isEditing = !!productToEdit;

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: 'cadernos-planners',
    price: 39.90,
    originalPrice: undefined,
    stock: 10,
    initialStock: 10,
    acquisitionCostTotal: 150.00,
    unitCost: 15.00,
    pricingMode: 'markup',
    markupPercent: 166.00,
    grossProfit: 24.90,
    grossMarginPercent: 62.40,
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
  });

  const [newFeatureText, setNewFeatureText] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  // Initialize form state and check for auto-saved draft if creating a new product
  useEffect(() => {
    if (productToEdit) {
      const initStock = productToEdit.initialStock || productToEdit.stock || 10;
      const acqTotal = productToEdit.acquisitionCostTotal ?? (productToEdit.unitCost ? productToEdit.unitCost * initStock : (productToEdit.price * 0.4 * initStock));
      const uCost = productToEdit.unitCost ?? (initStock > 0 ? acqTotal / initStock : productToEdit.price * 0.4);
      const prMode = productToEdit.pricingMode || 'markup';
      const mPercent = productToEdit.markupPercent ?? (uCost > 0 ? Math.round(((productToEdit.price - uCost) / uCost) * 100) : 100);
      const gProfit = productToEdit.price - uCost;
      const gMargin = productToEdit.price > 0 ? (gProfit / productToEdit.price) * 100 : 0;
      const hasSz = productToEdit.hasSizes ?? (productToEdit.sizes && productToEdit.sizes.length > 0) ?? false;
      const szList = productToEdit.sizes ? [...productToEdit.sizes] : [];
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
        hasSizes: hasSz,
        sizePricingMode: productToEdit.sizePricingMode || 'same',
        sizes: szList,
        hasColors: hasCols,
        colors: colList,
        initialStock: initStock,
        acquisitionCostTotal: Math.round(acqTotal * 100) / 100,
        unitCost: Math.round(uCost * 100) / 100,
        pricingMode: prMode,
        markupPercent: Math.round(mPercent * 100) / 100,
        grossProfit: Math.round(gProfit * 100) / 100,
        grossMarginPercent: Math.round(gMargin * 10) / 10,
        imageFit: productToEdit.imageFit || 'cover',
        imagePosition: productToEdit.imagePosition || 'center',
        imageScale: productToEdit.imageScale || 100,
        images: productToEdit.images && productToEdit.images.length > 0 
          ? [...productToEdit.images] 
          : ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80'],
        features: productToEdit.features ? [...productToEdit.features] : []
      });
      setHasRestoredDraft(false);
    } else {
      // Check if there is an existing draft saved in localStorage
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
        const defaultInitialStock = 20;
        const defaultAcqCostTotal = 300.00;
        const defaultUnitCost = defaultAcqCostTotal / defaultInitialStock; // R$ 15.00
        const defaultMarkup = 166; // -> R$ 39.90
        const calculatedPrice = defaultUnitCost * (1 + defaultMarkup / 100);
        const grossProfit = calculatedPrice - defaultUnitCost;
        const grossMargin = (grossProfit / calculatedPrice) * 100;

        setFormData({
          id: `lav-${Date.now().toString().slice(-5)}`,
          name: '',
          category: 'cadernos-planners',
          price: Math.round(calculatedPrice * 100) / 100,
          originalPrice: undefined,
          stock: defaultInitialStock,
          initialStock: defaultInitialStock,
          acquisitionCostTotal: defaultAcqCostTotal,
          unitCost: defaultUnitCost,
          pricingMode: 'markup',
          markupPercent: defaultMarkup,
          grossProfit: Math.round(grossProfit * 100) / 100,
          grossMarginPercent: Math.round(grossMargin * 10) / 10,
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
        });
        setHasRestoredDraft(false);
      }
    }
    setErrorMessage(null);
    setShowDeleteConfirm(false);
    setShowCloseConfirm(false);
  }, [productToEdit, isOpen]);

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
          { id: `sz-${Date.now()}-1`, label: 'P', stock: 5, initialStock: 5, price: prev.price, unitCost: prev.unitCost },
          { id: `sz-${Date.now()}-2`, label: 'M', stock: 5, initialStock: 5, price: prev.price, unitCost: prev.unitCost },
          { id: `sz-${Date.now()}-3`, label: 'G', stock: 5, initialStock: 5, price: prev.price, unitCost: prev.unitCost },
          { id: `sz-${Date.now()}-4`, label: 'GG', stock: 5, initialStock: 5, price: prev.price, unitCost: prev.unitCost },
        ];
      }
      const sumStock = currentSizes.reduce((acc, s) => acc + (Number(s.stock) || 0), 0);
      const sumInitial = currentSizes.reduce((acc, s) => acc + (Number(s.initialStock) || Number(s.stock) || 0), 0);
      return {
        ...prev,
        hasSizes: checked,
        sizes: currentSizes,
        stock: checked ? sumStock : prev.stock,
        initialStock: checked && sumInitial > 0 ? sumInitial : prev.initialStock
      };
    });
  };

  const handleApplySizePreset = (preset: 'calcados' | 'roupas' | 'infantil' | 'numeros' | 'papelaria') => {
    const baseP = formData.price || 0;
    const baseCost = formData.unitCost || 0;
    let newSizes: ProductSizeVariant[] = [];

    if (preset === 'calcados') {
      newSizes = [
        { id: `sz-${Date.now()}-1`, label: 'P (Infantil 28-33)', stock: 4, initialStock: 4, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-2`, label: 'M (34-36)', stock: 6, initialStock: 6, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-3`, label: 'G (37-39)', stock: 6, initialStock: 6, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-4`, label: 'GG (40-42)', stock: 4, initialStock: 4, price: baseP, unitCost: baseCost },
      ];
    } else if (preset === 'roupas') {
      newSizes = [
        { id: `sz-${Date.now()}-1`, label: 'P', stock: 5, initialStock: 5, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-2`, label: 'M', stock: 6, initialStock: 6, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-3`, label: 'G', stock: 5, initialStock: 5, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-4`, label: 'GG', stock: 4, initialStock: 4, price: baseP, unitCost: baseCost },
      ];
    } else if (preset === 'infantil') {
      newSizes = [
        { id: `sz-${Date.now()}-1`, label: '1 a 2 Anos', stock: 4, initialStock: 4, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-2`, label: '3 a 4 Anos', stock: 5, initialStock: 5, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-3`, label: '5 a 6 Anos', stock: 5, initialStock: 5, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-4`, label: '7 a 8 Anos', stock: 4, initialStock: 4, price: baseP, unitCost: baseCost },
      ];
    } else if (preset === 'numeros') {
      newSizes = [
        { id: `sz-${Date.now()}-1`, label: '34', stock: 3, initialStock: 3, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-2`, label: '36', stock: 4, initialStock: 4, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-3`, label: '38', stock: 5, initialStock: 5, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-4`, label: '40', stock: 4, initialStock: 4, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-5`, label: '42', stock: 3, initialStock: 3, price: baseP, unitCost: baseCost },
      ];
    } else if (preset === 'papelaria') {
      newSizes = [
        { id: `sz-${Date.now()}-1`, label: 'A6 (Bolso 10x15cm)', stock: 5, initialStock: 5, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-2`, label: 'A5 (Padrão 15x21cm)', stock: 8, initialStock: 8, price: baseP, unitCost: baseCost },
        { id: `sz-${Date.now()}-3`, label: 'Universitário (20x27cm)', stock: 5, initialStock: 5, price: Math.round(baseP * 1.25 * 100) / 100, unitCost: baseCost },
      ];
    }

    const sumStock = newSizes.reduce((acc, s) => acc + s.stock, 0);
    const sumInitial = newSizes.reduce((acc, s) => acc + (s.initialStock || s.stock), 0);
    setFormData(prev => ({
      ...prev,
      hasSizes: true,
      sizes: newSizes,
      stock: sumStock,
      initialStock: sumInitial
    }));
  };

  const handleAddSizeVariant = () => {
    const currentList = formData.sizes || [];
    const newVariant: ProductSizeVariant = {
      id: `sz-${Date.now()}-${currentList.length + 1}`,
      label: `Tamanho ${currentList.length + 1}`,
      stock: 5,
      initialStock: 5,
      price: formData.price || 0,
      unitCost: formData.unitCost || 0
    };
    setFormData(prev => {
      const updated = [...(prev.sizes || []), newVariant];
      const sumStock = updated.reduce((acc, s) => acc + (Number(s.stock) || 0), 0);
      const sumInitial = updated.reduce((acc, s) => acc + (Number(s.initialStock) || Number(s.stock) || 0), 0);
      return {
        ...prev,
        hasSizes: true,
        sizes: updated,
        stock: sumStock,
        initialStock: sumInitial > 0 ? sumInitial : prev.initialStock
      };
    });
  };

  const handleRemoveSizeVariant = (id: string) => {
    setFormData(prev => {
      const updated = (prev.sizes || []).filter(s => s.id !== id);
      const sumStock = updated.reduce((acc, s) => acc + (Number(s.stock) || 0), 0);
      const sumInitial = updated.reduce((acc, s) => acc + (Number(s.initialStock) || Number(s.stock) || 0), 0);
      return {
        ...prev,
        sizes: updated,
        stock: updated.length > 0 ? sumStock : prev.stock,
        initialStock: updated.length > 0 && sumInitial > 0 ? sumInitial : prev.initialStock
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
      const sumInitial = updated.reduce((acc, s) => acc + (Number(s.initialStock) || Number(s.stock) || 0), 0);
      return {
        ...prev,
        sizes: updated,
        stock: sumStock,
        initialStock: sumInitial > 0 ? sumInitial : prev.initialStock
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

  // SMART PRICING CALCULATOR HANDLERS
  const handleInitialStockChange = (newInitialStock: number) => {
    const qty = Math.max(1, newInitialStock || 1);
    const totalCost = formData.acquisitionCostTotal ?? 0;
    const unitCost = qty > 0 ? totalCost / qty : 0;

    let newPrice = formData.price ?? 0;
    let markup = formData.markupPercent ?? 100;

    if (formData.pricingMode === 'markup') {
      newPrice = unitCost * (1 + markup / 100);
    } else {
      markup = unitCost > 0 ? ((newPrice - unitCost) / unitCost) * 100 : 0;
    }

    const grossProfit = newPrice - unitCost;
    const grossMargin = newPrice > 0 ? (grossProfit / newPrice) * 100 : 0;

    setFormData(prev => {
      // If product does not have custom sizes, automatically update current stock balance to match initial lot quantity
      const calculatedStock = prev.hasSizes && prev.sizes && prev.sizes.length > 0
        ? prev.sizes.reduce((acc, s) => acc + (Number(s.stock) || 0), 0)
        : qty;

      return {
        ...prev,
        initialStock: qty,
        stock: calculatedStock,
        unitCost: Math.round(unitCost * 100) / 100,
        price: Math.round(newPrice * 100) / 100,
        markupPercent: Math.round(markup * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossMarginPercent: Math.round(grossMargin * 10) / 10,
      };
    });
  };

  const handleAcquisitionTotalChange = (newTotalCost: number) => {
    const totalCost = Math.max(0, newTotalCost || 0);
    const qty = formData.initialStock && formData.initialStock > 0 ? formData.initialStock : 1;
    const unitCost = totalCost / qty;

    let newPrice = formData.price ?? 0;
    let markup = formData.markupPercent ?? 100;

    if (formData.pricingMode === 'markup') {
      newPrice = unitCost * (1 + markup / 100);
    } else {
      markup = unitCost > 0 ? ((newPrice - unitCost) / unitCost) * 100 : 0;
    }

    const grossProfit = newPrice - unitCost;
    const grossMargin = newPrice > 0 ? (grossProfit / newPrice) * 100 : 0;

    setFormData(prev => ({
      ...prev,
      acquisitionCostTotal: totalCost,
      unitCost: Math.round(unitCost * 100) / 100,
      price: Math.round(newPrice * 100) / 100,
      markupPercent: Math.round(markup * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMarginPercent: Math.round(grossMargin * 10) / 10,
    }));
  };

  const handlePricingModeChange = (mode: 'markup' | 'manual') => {
    const unitCost = formData.unitCost || 0;
    let currentPrice = formData.price || 0;
    let markup = formData.markupPercent || 100;

    if (mode === 'markup') {
      currentPrice = unitCost * (1 + markup / 100);
    } else {
      markup = unitCost > 0 ? ((currentPrice - unitCost) / unitCost) * 100 : 0;
    }

    const grossProfit = currentPrice - unitCost;
    const grossMargin = currentPrice > 0 ? (grossProfit / currentPrice) * 100 : 0;

    setFormData(prev => ({
      ...prev,
      pricingMode: mode,
      price: Math.round(currentPrice * 100) / 100,
      markupPercent: Math.round(markup * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMarginPercent: Math.round(grossMargin * 10) / 10,
    }));
  };

  const handleMarkupPercentChange = (newMarkup: number) => {
    const markup = Math.max(0, newMarkup || 0);
    const unitCost = formData.unitCost || 0;
    const calculatedPrice = unitCost * (1 + markup / 100);
    const grossProfit = calculatedPrice - unitCost;
    const grossMargin = calculatedPrice > 0 ? (grossProfit / calculatedPrice) * 100 : 0;

    setFormData(prev => ({
      ...prev,
      markupPercent: markup,
      price: Math.round(calculatedPrice * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMarginPercent: Math.round(grossMargin * 10) / 10,
    }));
  };

  const handleManualPriceChange = (newPrice: number) => {
    const manualPrice = Math.max(0, newPrice || 0);
    const unitCost = formData.unitCost || 0;
    const calculatedMarkup = unitCost > 0 ? ((manualPrice - unitCost) / unitCost) * 100 : 0;
    const grossProfit = manualPrice - unitCost;
    const grossMargin = manualPrice > 0 ? (grossProfit / manualPrice) * 100 : 0;

    setFormData(prev => ({
      ...prev,
      price: manualPrice,
      markupPercent: Math.round(calculatedMarkup * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMarginPercent: Math.round(grossMargin * 10) / 10,
    }));
  };

  if (!isOpen) return null;

  // Handle image upload from device
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
          images: [compressedBase64, ...(prev.images || [])]
        }));
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao comprimir imagem.');
      }
    });
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
    // If user typed something and it's not saved yet, confirm before closing
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

    const finalProduct: Product = {
      id: formData.id || `lav-${Date.now().toString().slice(-5)}`,
      name: formData.name.trim(),
      category: formData.category || 'cadernos-planners',
      price: Number(formData.price),
      originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
      rating: formData.rating || 5.0,
      reviewCount: formData.reviewCount || 10,
      images: formData.images,
      description: formData.description?.trim() || 'Mimo especial Lavistore.',
      features: formData.features && formData.features.length > 0 ? formData.features : ['Design encantador com carinho'],
      stock: Number(formData.stock ?? 10),
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
      // Smart Pricing metrics
      initialStock: formData.initialStock ? Number(formData.initialStock) : Number(formData.stock ?? 10),
      acquisitionCostTotal: formData.acquisitionCostTotal ? Number(formData.acquisitionCostTotal) : undefined,
      unitCost: formData.unitCost ? Number(formData.unitCost) : undefined,
      pricingMode: formData.pricingMode || 'markup',
      markupPercent: formData.markupPercent ? Number(formData.markupPercent) : undefined,
      grossProfit: formData.grossProfit ? Number(formData.grossProfit) : undefined,
      grossMarginPercent: formData.grossMarginPercent ? Number(formData.grossMarginPercent) : undefined,
      imageFit: formData.imageFit || 'cover',
      imagePosition: formData.imagePosition || 'center',
      imageScale: formData.imageScale || 100,
    };

    // Clean up draft on successful save
    try {
      localStorage.removeItem('lavistore_product_draft');
    } catch {}

    onSaveProduct(finalProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-purple-950/60 backdrop-blur-sm animate-in fade-in">
      <div 
        id="admin-product-modal"
        className="bg-white rounded-3xl border-2 border-amber-300 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden font-['Comfortaa'] text-slate-800 my-auto relative"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-amber-200/80 bg-gradient-to-r from-amber-100/90 via-white to-pink-100/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 border-2 border-white shadow-xs flex items-center justify-center text-purple-950 font-bold">
              <Sparkles className="w-5 h-5 text-purple-950" />
            </div>
            <div>
              <h2 className="font-['Mali'] text-xl sm:text-2xl font-bold text-purple-950">
                {isEditing ? 'Editar Mimo & Precificação Inteligente' : 'Cadastrar Novo Mimo & Precificação 🌸'}
              </h2>
              <p className="text-xs text-purple-900 font-semibold">
                {isEditing ? `ID: ${formData.id} • Custos, Mark-up, Fotos e Estoque` : 'Preencha os dados e custos para calcular o preço ideal • Rascunho salvo automaticamente'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseAttempt}
            className="p-2 rounded-xl text-slate-400 hover:text-purple-950 hover:bg-amber-200/60 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Close Confirmation Modal (Protects against accidental closure) */}
        {showCloseConfirm && (
          <div className="absolute inset-0 z-50 bg-purple-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 border-2 border-amber-300 shadow-2xl max-w-md w-full text-center space-y-4 font-['Comfortaa']">
              <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-300 text-amber-600 mx-auto flex items-center justify-center">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="font-['Mali'] text-lg font-bold text-purple-950">
                Deseja sair do cadastro?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Você tem informações preenchidas para <strong>"{formData.name || 'este produto'}"</strong>. Seu rascunho fica salvo automaticamente para você continuar depois.
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

        {/* Delete Confirmation Overlay (In-App Modal to avoid iframe popup blockage) */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 bg-purple-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 border-2 border-rose-300 shadow-2xl max-w-md w-full text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-100 border-2 border-rose-300 text-rose-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="font-['Mali'] text-lg font-bold text-purple-950">
                Excluir este Produto?
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
                  Sim, Excluir Produto
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Body (Scrollable) */}
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

          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-base font-bold text-purple-950 flex items-center gap-2 border-b border-amber-100 pb-1.5">
              <Tag className="w-4 h-4 text-amber-500" />
              <span>1. Informações Básicas do Mimo</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="font-bold text-purple-950">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Caderno Argolado Jardim Lilás Sonhos"
                  className="w-full px-3.5 py-2.5 bg-amber-50/50 border-2 border-amber-200 rounded-2xl font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950">Categoria *</label>
                <select
                  value={formData.category || 'cadernos-planners'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-amber-50/50 border-2 border-amber-200 rounded-2xl font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                >
                  {categories.filter(c => c.id !== 'todos').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tag / Badge */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950">Selo / Tag em Destaque</label>
                <input
                  type="text"
                  value={formData.tag || ''}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  placeholder="Ex: Mais Amado 🌸, Novidade ✨, Edição Especial"
                  className="w-full px-3.5 py-2.5 bg-amber-50/50 border-2 border-amber-200 rounded-2xl font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Current Stock */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-purple-950 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    <span>Estoque Atual Disponível (Unidades)</span>
                  </label>
                  {!formData.hasSizes && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, stock: prev.initialStock || 10 }))}
                      className="text-[8px] font-bold text-purple-800 hover:text-purple-950 bg-amber-100/90 hover:bg-amber-200 px-2 py-0.5 rounded-lg border border-amber-300 transition-colors"
                      title="Igualar o estoque atual à quantidade inicial do lote"
                    >
                      🔄 Igualar ao Lote ({formData.initialStock || 10})
                    </button>
                  )}
                </div>
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
                        : 'bg-amber-50/50 border-2 border-amber-200 focus:ring-2 focus:ring-amber-400'
                    }`}
                  />
                  {formData.hasSizes && (
                    <span className="absolute right-3 top-2.5 text-[8px] font-extrabold bg-pink-100 text-pink-800 px-2 py-0.5 rounded-md border border-pink-200">
                      Soma automática das grades
                    </span>
                  )}
                </div>
                <span className="text-[8px] text-slate-500 font-medium block">
                  {formData.hasSizes 
                    ? `Calculado automaticamente pela soma das variações de tamanho (${formData.sizes?.length || 0} grades cadastradas).`
                    : `Saldo atualizado automaticamente com a Quantidade Inicial (${formData.initialStock || 10} un.).`}
                </span>
              </div>

              {/* Dimensions */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950">Dimensões / Medidas (Opcional)</label>
                <input
                  type="text"
                  value={formData.dimensions || ''}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  placeholder="Ex: 15 x 21 cm (A5) • 160 págs"
                  className="w-full px-3.5 py-2.5 bg-amber-50/50 border-2 border-amber-200 rounded-2xl font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: SMART PRICING & COST ENGINE (Calculo de Preço Inteligente) */}
          <div className="space-y-4 p-5 bg-gradient-to-br from-amber-50/90 via-yellow-50/50 to-amber-100/60 rounded-3xl border-2 border-amber-300 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/90 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-purple-950 flex items-center justify-center shadow-xs font-bold">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-['Mali'] text-base font-bold text-purple-950">
                    2. Cálculo de Preço Inteligente & Rentabilidade
                  </h3>
                  <p className="text-[11px] text-purple-900 font-medium">
                    Informe a aquisição e o sistema calcula o custo unitário e lucro bruto automaticamente!
                  </p>
                </div>
              </div>
              <span className="text-[8px] font-extrabold bg-amber-200 text-purple-950 px-2.5 py-1 rounded-full border border-amber-300">
                🔒 Visível Somente p/ Administrador
              </span>
            </div>

            {/* Acquisition Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Initial Acquisition Quantity */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-700" />
                  <span>Quantidade Inicial (Lote)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.initialStock || ''}
                  onChange={(e) => handleInitialStockChange(parseInt(e.target.value) || 0)}
                  placeholder="Ex: 50 un."
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-amber-200 rounded-2xl font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-[8px] text-slate-500 font-medium block">
                  Total de itens comprados no lote
                </span>
              </div>

              {/* Total Acquisition Cost */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Valor Total da Aquisição (R$)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.acquisitionCostTotal ?? ''}
                    onChange={(e) => handleAcquisitionTotalChange(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border-2 border-amber-200 rounded-2xl font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <span className="text-[8px] text-slate-500 font-medium block">
                  Custo total pago pelo lote
                </span>
              </div>

              {/* Calculated Unit Cost (ReadOnly Highlight) */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  <span>Custo Unitário Calculado</span>
                </label>
                <div className="p-2.5 rounded-2xl bg-white border-2 border-amber-300 shadow-2xs flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900">Custo / Peça:</span>
                  <span className="text-base font-extrabold text-purple-950 font-mono">
                    R$ {(formData.unitCost || 0).toFixed(2)}
                  </span>
                </div>
                <span className="text-[8px] text-slate-500 font-medium block">
                  = Valor Total ÷ Quantidade Inicial
                </span>
              </div>
            </div>

            {/* Pricing Mode Selection (Markup vs Manual) */}
            <div className="pt-2 border-t border-amber-200/80 space-y-3">
              <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider">
                Escolha o Formato de Precificação:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mode A: Mark-up % */}
                <div 
                  onClick={() => handlePricingModeChange('markup')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.pricingMode === 'markup'
                      ? 'border-amber-500 bg-white ring-2 ring-amber-300 shadow-sm'
                      : 'border-amber-200/70 bg-white/70 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name="pricingMode"
                      checked={formData.pricingMode === 'markup'}
                      onChange={() => handlePricingModeChange('markup')}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-400 accent-amber-500"
                    />
                    <span className="font-bold text-purple-950 text-xs">
                      📈 Aplicar Percentual de Mark-up (%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Defina a margem desejada sobre o custo e o preço final é calculado.
                  </p>

                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      disabled={formData.pricingMode !== 'markup'}
                      value={formData.markupPercent ?? 100}
                      onChange={(e) => handleMarkupPercentChange(parseFloat(e.target.value) || 0)}
                      placeholder="100"
                      className={`w-full pr-8 pl-3.5 py-2 rounded-xl text-xs font-bold ${
                        formData.pricingMode === 'markup'
                          ? 'bg-amber-50/80 border-2 border-amber-300 text-purple-950'
                          : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-amber-800">%</span>
                  </div>

                  {/* Quick Markup Presets */}
                  {formData.pricingMode === 'markup' && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[50, 80, 100, 120, 150, 200].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleMarkupPercentChange(preset); }}
                          className={`px-2 py-0.5 rounded-lg text-[8px] font-bold border transition-colors ${
                            formData.markupPercent === preset
                              ? 'bg-amber-500 text-purple-950 border-amber-600 shadow-2xs'
                              : 'bg-amber-100/80 hover:bg-amber-200 text-purple-950 border-amber-300'
                          }`}
                        >
                          +{preset}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mode B: Manual Price */}
                <div 
                  onClick={() => handlePricingModeChange('manual')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.pricingMode === 'manual'
                      ? 'border-amber-500 bg-white ring-2 ring-amber-300 shadow-sm'
                      : 'border-amber-200/70 bg-white/70 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name="pricingMode"
                      checked={formData.pricingMode === 'manual'}
                      onChange={() => handlePricingModeChange('manual')}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-400 accent-amber-500"
                    />
                    <span className="font-bold text-purple-950 text-xs">
                      ✍️ Informar Preço de Venda Manualmente (R$)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Digite o preço de venda final e o sistema calcula o mark-up resultante.
                  </p>

                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={formData.pricingMode !== 'manual'}
                      value={formData.price ?? ''}
                      onChange={(e) => handleManualPriceChange(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-xs font-bold ${
                        formData.pricingMode === 'manual'
                          ? 'bg-amber-50 border-2 border-amber-300 text-purple-950'
                          : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Pricing Profitability Summary Card */}
            <div className="bg-white rounded-2xl p-4 border-2 border-amber-300 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Resumo Financeiro & Lucro Bruto Calculado</span>
                </span>
                <span className="text-[11px] font-bold text-purple-950 bg-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300">
                  Mark-up: {(formData.markupPercent || 0).toFixed(1)}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Final Price for Customer */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-100/60 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[8px] font-bold text-amber-900 block">Preço Final Loja (Cliente):</span>
                  <span className="text-base font-black text-rose-600 font-mono">
                    R$ {(formData.price || 0).toFixed(2)}
                  </span>
                  <span className="text-[7px] text-slate-500 block font-normal">Exibido na vitrine</span>
                </div>

                {/* 2. Unit Cost */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[8px] font-bold text-slate-600 block">Custo Unitário:</span>
                  <span className="text-sm font-extrabold text-slate-800 font-mono">
                    R$ {(formData.unitCost || 0).toFixed(2)}
                  </span>
                  <span className="text-[7px] text-slate-400 block font-normal">Custo por unidade</span>
                </div>

                {/* 3. Gross Profit Per Unit */}
                <div className={`p-2.5 rounded-xl border ${
                  (formData.grossProfit || 0) >= 0 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <span className="text-[8px] font-bold block">Lucro Bruto / Unidade:</span>
                  <span className="text-sm font-black font-mono">
                    R$ {(formData.grossProfit || 0).toFixed(2)}
                  </span>
                  <span className="text-[7px] font-bold block opacity-80">
                    Margem: {(formData.grossMarginPercent || 0).toFixed(1)}%
                  </span>
                </div>

                {/* 4. Estimated Total Gross Profit */}
                <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[8px] font-bold text-purple-900 block">Lucro Total Estimado:</span>
                  <span className="text-sm font-black text-purple-950 font-mono">
                    R$ {((formData.grossProfit || 0) * (formData.stock || 0)).toFixed(2)}
                  </span>
                  <span className="text-[7px] text-amber-800 block font-normal">
                    no estoque atual ({formData.stock || 0} un.)
                  </span>
                </div>
              </div>

              {/* Promotional Original "De" Price */}
              <div className="pt-2 border-t border-amber-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-950">Preço Original Riscado "De" (Opcional):</span>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.originalPrice ?? ''}
                      onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Ex: 59.90"
                      className="w-full pl-8 pr-2 py-1 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {formData.originalPrice && formData.price && formData.originalPrice > formData.price && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    🎉 Desconto de {Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100)}% exibido ao cliente
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Size & Variant Management (New!) */}
          <div className="bg-gradient-to-br from-amber-50/70 via-white to-yellow-50/50 rounded-2xl p-4 border-2 border-amber-300 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/90 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-purple-950 flex items-center justify-center shadow-xs font-bold">
                  <Ruler className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-['Mali'] text-sm sm:text-base font-bold text-purple-950 flex items-center gap-1.5">
                    <span>3. Grade de Tamanhos & Estoque por Medida</span>
                    <span className="text-[8px] font-bold bg-amber-200 text-purple-950 px-2 py-0.5 rounded-full border border-amber-300">
                      Personalizável
                    </span>
                  </h3>
                  <p className="text-[11px] text-purple-900">
                    Controle quantidades e preços para P, M, G, calçados (ex: Meia 3/4 Panda), infantil ou medidas customizadas
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-2xs hover:border-amber-400 transition-colors self-start sm:self-auto">
                <input
                  type="checkbox"
                  checked={!!formData.hasSizes}
                  onChange={(e) => handleToggleHasSizes(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400 cursor-pointer accent-amber-500"
                />
                <span className="text-xs font-bold text-purple-950">
                  {formData.hasSizes ? '✅ Grade Ativada' : '⬜ Ativar Tamanhos'}
                </span>
              </label>
            </div>

            {formData.hasSizes ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Fast Presets */}
                <div>
                  <label className="text-[11px] font-bold text-purple-950 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Carregar Grade Rápida com 1 Clique (Opcional):</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplySizePreset('calcados')}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-purple-950 border border-amber-200 hover:border-amber-300 rounded-lg text-xs font-bold transition-all shadow-2xs"
                    >
                      🧦 Meias / Calçados (34-36, 37-39...)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySizePreset('roupas')}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-purple-950 border border-amber-200 hover:border-amber-300 rounded-lg text-xs font-bold transition-all shadow-2xs"
                    >
                      👕 Roupas (P, M, G, GG)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySizePreset('infantil')}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-purple-950 border border-amber-200 hover:border-amber-300 rounded-lg text-xs font-bold transition-all shadow-2xs"
                    >
                      👶 Infantil (1-2a, 3-4a, 5-6a...)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySizePreset('numeros')}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-purple-950 border border-amber-200 hover:border-amber-300 rounded-lg text-xs font-bold transition-all shadow-2xs"
                    >
                      📏 Numeração (34, 36, 38, 40...)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySizePreset('papelaria')}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-purple-950 border border-amber-200 hover:border-amber-300 rounded-lg text-xs font-bold transition-all shadow-2xs"
                    >
                      📐 Cadernos (A6, A5, Univ.)
                    </button>
                  </div>
                </div>

                {/* Pricing Mode per Size */}
                <div className="bg-white/90 p-3 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-bold text-purple-950">Preço dos Tamanhos:</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-purple-950">
                      <input
                        type="radio"
                        name="sizePricingMode"
                        checked={formData.sizePricingMode !== 'custom'}
                        onChange={() => setFormData(prev => ({ ...prev, sizePricingMode: 'same' }))}
                        className="text-amber-500 focus:ring-amber-400 accent-amber-500"
                      />
                      <span>Preço Único (R$ {Number(formData.price || 0).toFixed(2)})</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-purple-950">
                      <input
                        type="radio"
                        name="sizePricingMode"
                        checked={formData.sizePricingMode === 'custom'}
                        onChange={() => setFormData(prev => ({ ...prev, sizePricingMode: 'custom' }))}
                        className="text-amber-500 focus:ring-amber-400 accent-amber-500"
                      />
                      <span>Preço Diferenciado por Tamanho</span>
                    </label>
                  </div>
                </div>

                {/* Sizes List Table */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-2 text-[8px] font-bold text-purple-950 uppercase">
                    <div className="col-span-5 sm:col-span-4">Tamanho / Medida (Editável)</div>
                    <div className="col-span-3 sm:col-span-2 text-center">Estoque Atual</div>
                    <div className="col-span-3 sm:col-span-2 text-center">Estoque Inicial</div>
                    {formData.sizePricingMode === 'custom' && (
                      <div className="col-span-4 sm:col-span-3 text-center">Preço Venda (R$)</div>
                    )}
                    <div className="col-span-1 text-center">Excluir</div>
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {(formData.sizes || []).map((sz, index) => (
                      <div 
                        key={sz.id || index}
                        className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-amber-200 shadow-2xs hover:border-amber-400 transition-all"
                      >
                        {/* Label Input */}
                        <div className="col-span-5 sm:col-span-4">
                          <input
                            type="text"
                            value={sz.label}
                            onChange={(e) => handleUpdateSizeVariant(sz.id, 'label', e.target.value)}
                            placeholder="Ex: P, M, 34-36, 15x21cm"
                            className="w-full px-2.5 py-1.5 bg-amber-50/50 border border-amber-200 rounded-lg text-xs font-bold text-purple-950 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        </div>

                        {/* Current Stock */}
                        <div className="col-span-3 sm:col-span-2">
                          <input
                            type="number"
                            min="0"
                            value={sz.stock}
                            onChange={(e) => handleUpdateSizeVariant(sz.id, 'stock', Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full text-center px-2 py-1.5 bg-amber-50/80 border border-amber-200 rounded-lg text-xs font-extrabold text-purple-950 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        </div>

                        {/* Initial Stock */}
                        <div className="col-span-3 sm:col-span-2">
                          <input
                            type="number"
                            min="0"
                            value={sz.initialStock ?? sz.stock}
                            onChange={(e) => handleUpdateSizeVariant(sz.id, 'initialStock', Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full text-center px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </div>

                        {/* Custom Price (if enabled) */}
                        {formData.sizePricingMode === 'custom' && (
                          <div className="col-span-4 sm:col-span-3 relative">
                            <span className="absolute left-2 top-1.5 text-[11px] font-bold text-slate-400">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={sz.price ?? formData.price ?? 0}
                              onChange={(e) => handleUpdateSizeVariant(sz.id, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full pl-7 pr-2 py-1.5 bg-rose-50/60 border border-rose-200 rounded-lg text-xs font-extrabold text-rose-700 focus:outline-none focus:ring-1 focus:ring-rose-400"
                            />
                          </div>
                        )}

                        {/* Delete Button */}
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

                  {/* Add Size Button & Summary */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-amber-200/90">
                    <button
                      type="button"
                      onClick={handleAddSizeVariant}
                      className="w-full sm:w-auto px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-purple-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-300 transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Outro Tamanho / Medida</span>
                    </button>

                    <div className="text-[11px] font-bold text-purple-950 bg-white/90 px-3 py-1 rounded-xl border border-amber-200 shadow-2xs">
                      📊 Total: <strong>{formData.sizes?.length || 0}</strong> variações • Estoque Total Somado: <strong className="text-amber-800 font-black">{formData.stock || 0} un.</strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white/60 rounded-xl border border-amber-200 text-center">
                <p className="text-xs text-slate-600">
                  Controle de tamanho desativado. O estoque deste produto será controlado como tamanho único ({formData.stock || 0} unidades).
                </p>
              </div>
            )}
          </div>

          {/* Section 4: Color Grid & Variants */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/90 pb-2">
              <div>
                <h3 className="font-['Mali'] text-base font-bold text-purple-950 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-pink-500" />
                  <span>4. Grade de Cores & Estampas (Foto & Descrição)</span>
                </h3>
                <p className="text-[11px] text-purple-900 font-medium">
                  Cadastre as opções de cores ou estampas com foto miniatura e descrição para o cliente escolher na loja
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => handleToggleHasColors(!formData.hasColors)}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-2xs ${
                  formData.hasColors
                    ? 'bg-amber-400 text-purple-950 border-2 border-amber-500 shadow-amber-200'
                    : 'bg-slate-100 text-slate-600 border-2 border-slate-300 hover:bg-slate-200'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${formData.hasColors ? 'bg-purple-950 border-amber-500 translate-x-0.5' : 'bg-slate-400 border-slate-300'}`} />
                <span>{formData.hasColors ? 'Grade de Cores Ativada' : 'Ativar Grade de Cores'}</span>
              </button>
            </div>

            {formData.hasColors ? (
              <div className="p-4 bg-gradient-to-br from-amber-50/70 via-yellow-50/40 to-pink-50/50 rounded-2xl border-2 border-amber-300 space-y-4">
                {/* Presets Bar */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white/80 rounded-xl border border-amber-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-purple-950 flex items-center gap-1 mr-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
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

                {/* Color Variants List */}
                <div className="space-y-3">
                  <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-3 text-[11px] font-bold text-purple-950">
                    <div className="sm:col-span-4">Foto / Miniatura da Cor</div>
                    <div className="sm:col-span-5">Descrição / Nome da Cor *</div>
                    <div className="sm:col-span-2">Tom (Hex)</div>
                    <div className="sm:col-span-1 text-center">Excluir</div>
                  </div>

                  <div className="space-y-2.5">
                    {(formData.colors || []).map((col, idx) => (
                      <div
                        key={col.id}
                        className="bg-white p-3 rounded-2xl border-2 border-amber-200 shadow-2xs hover:border-amber-400 transition-all flex flex-col sm:grid sm:grid-cols-12 gap-3 items-center"
                      >
                        {/* Column 1: Image Thumbnail & Upload */}
                        <div className="w-full sm:col-span-4 flex items-center gap-2">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-300 bg-slate-50 shrink-0 flex items-center justify-center shadow-2xs group">
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

                          {/* Upload Buttons */}
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <label className="cursor-pointer px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-purple-950 border border-amber-200 font-bold text-[10px] text-center flex items-center justify-center gap-1 transition-colors">
                              <Upload className="w-3 h-3 text-amber-600" />
                              <span>{col.imageUrl ? 'Trocar Foto' : 'Enviar Foto'}</span>
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

                            {/* Direct URL input option */}
                            <input
                              type="url"
                              value={col.imageUrl?.startsWith('data:') ? 'Foto carregada do dispositivo' : (col.imageUrl || '')}
                              disabled={col.imageUrl?.startsWith('data:')}
                              onChange={(e) => handleUpdateColorVariant(col.id, 'imageUrl', e.target.value)}
                              placeholder="ou Cole link da foto"
                              className="w-full px-2 py-0.5 bg-amber-50/30 border border-amber-200 rounded-lg text-[9px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>
                        </div>

                        {/* Column 2: Color Name / Description */}
                        <div className="w-full sm:col-span-5 space-y-1">
                          <label className="sm:hidden text-[10px] font-bold text-purple-950 block">
                            Descrição / Nome da Cor:
                          </label>
                          <input
                            type="text"
                            required
                            value={col.name || ''}
                            onChange={(e) => handleUpdateColorVariant(col.id, 'name', e.target.value)}
                            placeholder="Ex: Lilás Lavanda, Floral Primavera, Rosa Bebê"
                            className="w-full px-3 py-2 bg-amber-50/40 border-2 border-amber-200 rounded-xl font-bold text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>

                        {/* Column 3: Hex Picker */}
                        <div className="w-full sm:col-span-2 flex items-center gap-1.5">
                          <input
                            type="color"
                            value={col.hex || '#F472B6'}
                            onChange={(e) => handleUpdateColorVariant(col.id, 'hex', e.target.value)}
                            className="w-8 h-8 rounded-xl cursor-pointer border border-amber-300 p-0.5 bg-white shrink-0"
                            title="Escolher tom de cor"
                          />
                          <input
                            type="text"
                            value={col.hex || ''}
                            onChange={(e) => handleUpdateColorVariant(col.id, 'hex', e.target.value)}
                            placeholder="#F472B6"
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[10px] text-slate-700 uppercase focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        </div>

                        {/* Column 4: Delete Action */}
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

                  {/* Add Color Button & Summary */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-amber-200/90">
                    <button
                      type="button"
                      onClick={handleAddColorVariant}
                      className="w-full sm:w-auto px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-purple-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-300 transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Outra Cor / Estampa</span>
                    </button>

                    <div className="text-[11px] font-bold text-purple-950 bg-white/90 px-3 py-1 rounded-xl border border-amber-200 shadow-2xs">
                      🎨 Total: <strong>{formData.colors?.length || 0}</strong> cores/estampas cadastradas
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white/60 rounded-xl border border-amber-200 text-center">
                <p className="text-xs text-slate-600">
                  Grade de cores desativada. O produto será vendido sem seleção obrigatória de cor.
                </p>
              </div>
            )}
          </div>

          {/* Section 5: Photos & Gallery */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-amber-100 pb-1.5">
              <h3 className="font-['Mali'] text-base font-bold text-purple-950 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-600" />
                <span>5. Fotos do Produto ({formData.images?.length || 0})</span>
              </h3>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                A 1ª foto é a capa principal
              </span>
            </div>

            {/* Existing Images Previews */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(formData.images || []).map((img, idx) => (
                <div 
                  key={idx} 
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 group shadow-xs ${
                    idx === 0 ? 'border-amber-400 ring-2 ring-amber-300' : 'border-slate-200'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Foto ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 bg-amber-400 text-purple-950 text-[8px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      Capa Principal
                    </span>
                  )}
                  {/* Action overlay */}
                  <div className="absolute inset-0 bg-purple-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        className="p-1.5 bg-amber-400 text-purple-950 rounded-xl font-bold text-[8px] shadow-xs hover:bg-amber-300 transition-colors"
                        title="Tornar Foto Principal"
                      >
                        Definir Capa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1.5 bg-rose-500 text-white rounded-xl shadow-xs hover:bg-rose-600 transition-colors"
                      title="Excluir Foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Image Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Option A: Upload from Device */}
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-amber-300 hover:border-amber-400 bg-amber-50/60 hover:bg-amber-100/60 rounded-2xl cursor-pointer transition-colors text-center group">
                <Upload className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform mb-1" />
                <span className="font-bold text-purple-950 text-xs">Enviar do Computador / Celular</span>
                <span className="text-[8px] text-slate-500 font-medium">PNG, JPG, WebP até 2.5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Option B: Insert URL */}
              <div className="flex flex-col justify-between p-3.5 bg-purple-50/50 border-2 border-purple-200 rounded-2xl gap-2">
                <span className="font-bold text-purple-950 text-xs flex items-center gap-1">
                  <span>Ou cole o link direto da imagem:</span>
                </span>
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://exemplo.com/minha-foto.jpg"
                    className="flex-1 px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-xs"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>

            {/* Photo Sizing & Framing Controls for Product */}
            <div className="mt-4 p-4 bg-gradient-to-br from-amber-50/80 via-white to-purple-50/80 rounded-2xl border-2 border-amber-200/90 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-700" />
                  <span className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                    Ajuste de Tamanho & Enquadramento das Fotos
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      imageFit: 'cover',
                      imageScale: 100,
                      imagePosition: 'center'
                    }));
                  }}
                  className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline"
                >
                  Restaurar Padrão
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Left Controls */}
                <div className="md:col-span-7 space-y-3.5">
                  {/* Framing Mode */}
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1.5 flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Modo de Exibição da Foto:</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageFit: 'cover' }))}
                        className={`p-2 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center justify-center text-center ${
                          formData.imageFit !== 'contain'
                            ? 'border-purple-600 bg-purple-100 text-purple-950 shadow-2xs ring-1 ring-purple-400'
                            : 'border-amber-200 bg-white text-slate-700 hover:bg-amber-50'
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
                            ? 'border-purple-600 bg-purple-100 text-purple-950 shadow-2xs ring-1 ring-purple-400'
                            : 'border-amber-200 bg-white text-slate-700 hover:bg-amber-50'
                        }`}
                      >
                        <span className="font-extrabold text-xs">🔍 Foto Inteira (Contain)</span>
                        <span className="text-[8px] text-slate-500 font-normal">Sem cortes nas laterais</span>
                      </button>
                    </div>
                  </div>

                  {/* Zoom / Scale Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                        <ZoomIn className="w-3.5 h-3.5 text-amber-600" />
                        <span>Zoom / Escala da Foto:</span>
                      </label>
                      <span className="text-xs font-black text-purple-950 bg-white px-2 py-0.5 rounded border border-amber-300">
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
                        className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <ZoomIn className="w-4 h-4 text-purple-700 shrink-0" />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[8px] text-slate-500">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageScale: Math.max(60, (prev.imageScale || 100) - 10) }))}
                        className="px-2 py-0.5 bg-white hover:bg-amber-100 rounded border border-amber-200 font-bold text-purple-900"
                      >
                        -10%
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageScale: 100 }))}
                        className="px-2 py-0.5 bg-white hover:bg-amber-100 rounded border border-amber-200 font-bold text-purple-900"
                      >
                        100% (Normal)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageScale: Math.min(150, (prev.imageScale || 100) + 10) }))}
                        className="px-2 py-0.5 bg-white hover:bg-amber-100 rounded border border-amber-200 font-bold text-purple-900"
                      >
                        +10%
                      </button>
                    </div>
                  </div>

                  {/* Focal Position */}
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1.5 flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5 text-amber-600" />
                      <span>Alinhamento do Foco:</span>
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
                          className={`py-1 px-2 rounded-lg border text-xs font-bold transition-all ${
                            (formData.imagePosition || 'center') === pos.id
                              ? 'border-purple-600 bg-purple-100 text-purple-950 shadow-2xs ring-1 ring-purple-400'
                              : 'border-amber-200 bg-white text-slate-700 hover:bg-amber-50'
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Mini Preview Card */}
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="w-full max-w-[200px] bg-white rounded-2xl border-2 border-amber-300 shadow-md p-2.5 space-y-2">
                    <div className="text-[8px] font-bold text-purple-950 text-center flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Prévia na Vitrine</span>
                    </div>

                    {/* Preview Image Box */}
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
                        <span className="absolute top-1 left-1 bg-white/90 text-purple-950 text-[6.5px] font-bold px-1.5 py-0.5 rounded-full shadow-2xs">
                          {formData.tag}
                        </span>
                      )}
                    </div>

                    <div className="text-center">
                      <p className="text-[11px] font-bold text-purple-950 truncate">
                        {formData.name || 'Nome do Mimo'}
                      </p>
                      <p className="text-xs font-black text-rose-500">
                        R$ {Number(formData.price || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: Description & Bullet Features */}
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-base font-bold text-purple-950 flex items-center gap-2 border-b border-amber-100 pb-1.5">
              <Layers className="w-4 h-4 text-rose-500" />
              <span>6. Descrição & Diferenciais Encantadores</span>
            </h3>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <label className="font-bold text-purple-950">Descrição Completa do Mimo</label>
              <textarea
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Conte a história deste produto, materiais, acabamento e por que ele é perfeito para presentear..."
                className="w-full px-3.5 py-2.5 bg-amber-50/50 border-2 border-amber-200 rounded-2xl font-medium text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400 leading-relaxed"
              />
            </div>

            {/* Bullet features list */}
            <div className="space-y-2">
              <label className="font-bold text-purple-950">Diferenciais em Tópicos (Bullets)</label>
              <div className="space-y-1.5">
                {(formData.features || []).map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-amber-50/80 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-950">
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

              {/* Add feature input */}
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
                  placeholder="Ex: Folhas 90g resistentes • Acompanha cartela de adesivos..."
                  className="flex-1 px-3.5 py-2 bg-white border-2 border-amber-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-purple-950 font-bold rounded-xl text-xs shadow-xs flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Incluir</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 6: Highlights & Badges */}
          <div className="space-y-3 bg-amber-50/60 p-4 rounded-2xl border-2 border-amber-200">
            <span className="font-['Mali'] text-sm font-bold text-purple-950 block">
              6. Destaques Especiais:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-950">
                <input
                  type="checkbox"
                  checked={!!formData.isNew}
                  onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-amber-300"
                />
                <span>✨ Produto Novo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-950">
                <input
                  type="checkbox"
                  checked={!!formData.isBestseller}
                  onChange={(e) => setFormData({ ...formData, isBestseller: e.target.checked })}
                  className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400 border-amber-300"
                />
                <span>🔥 Mais Vendido</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-950">
                <input
                  type="checkbox"
                  checked={!!formData.isFloralSpecial}
                  onChange={(e) => setFormData({ ...formData, isFloralSpecial: e.target.checked })}
                  className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-400 border-amber-300"
                />
                <span>🌸 Coleção 3 Flores</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-3">
            {isEditing && onDeleteProduct ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2.5 rounded-2xl bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Produto</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={handleCloseAttempt}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#F43F5E] via-[#FB923C] via-[#FACC15] to-[#06B6D4] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 border-2 border-white/60 active:scale-95 transition-transform"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Mimo'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
