import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Copy, 
  Download, 
  Upload, 
  RotateCcw, 
  Sparkles, 
  Package, 
  DollarSign, 
  AlertCircle, 
  Layers, 
  Eye, 
  Lock, 
  Check, 
  Image as ImageIcon,
  Link as LinkIcon,
  RefreshCw,
  ArrowRight,
  FileText,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Crosshair,
  Hand,
  Calculator,
  TrendingUp,
  Percent,
  X,
  Tag,
  Heart,
  Phone,
  MessageCircle,
  Ticket,
  ShoppingBag,
  Store,
  BarChart3
} from 'lucide-react';
import { Product, HeroConfig, HomePageConfig, FilterBarConfig, Category, CustomerReview, Coupon } from '../types';
import { CATEGORIES } from '../data/categories';
import { CUSTOMER_REVIEWS } from '../data/reviews';
import { DEFAULT_COUPONS } from '../data/coupons';
import { TrioFlowersIcon } from './LavistoreLogo';
import defaultHeroImg from '../assets/images/lavistore_trio_flowers_1788111020961.jpg';
import { HomeTextManager } from './HomeTextManager';
import { FilterBarManager } from './FilterBarManager';
import { CategoryManager } from './CategoryManager';
import { AboutPageManager } from './AboutPageManager';
import { ContactFooterManager } from './ContactFooterManager';
import { ReviewsManager } from './ReviewsManager';
import { CouponManager } from './CouponManager';
import { OrdersManager } from './OrdersManager';
import { BiFinancialManager } from './BiFinancialManager';
import { DEFAULT_HOME_PAGE_CONFIG } from '../utils/textFormatter';
import { DEFAULT_FILTER_BAR_CONFIG } from '../data/filterConfig';

interface AdminDashboardProps {
  products: Product[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onSaveProduct?: (product: Product) => void;
  onDuplicateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onResetProducts: () => void;
  onImportProducts: (products: Product[]) => void;
  onQuickUpdateStock?: (productId: string, newStock: number, sizeId?: string) => void;
  onExitAdmin: () => void;
  onViewProductLive: (product: Product) => void;
  heroConfig?: HeroConfig;
  onUpdateHeroConfig?: (config: HeroConfig) => void;
  onResetHeroConfig?: () => void;
  homePageConfig?: HomePageConfig;
  onUpdateHomePageConfig?: (config: HomePageConfig) => void;
  onResetHomePageConfig?: () => void;
  filterBarConfig?: FilterBarConfig;
  onUpdateFilterBarConfig?: (config: FilterBarConfig) => void;
  onResetFilterBarConfig?: () => void;
  categories?: Category[];
  onUpdateCategories?: (categories: Category[]) => void;
  onResetCategories?: () => void;
  reviews?: CustomerReview[];
  onUpdateReviews?: (reviews: CustomerReview[]) => void;
  onResetReviews?: () => void;
  coupons?: Coupon[];
  onUpdateCoupons?: (coupons: Coupon[]) => void;
  onResetCoupons?: () => void;
  initialAdminSection?: 'orders' | 'products' | 'hero' | 'hometexts' | 'categories' | 'filters' | 'about' | 'contact' | 'reviews' | 'coupons' | 'bi';
  onGoToStorefront?: () => void;
  onGoToAboutPage?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  onAddProduct,
  onEditProduct,
  onSaveProduct,
  onDuplicateProduct,
  onDeleteProduct,
  onResetProducts,
  onImportProducts,
  onQuickUpdateStock,
  onExitAdmin,
  onViewProductLive,
  heroConfig,
  onUpdateHeroConfig,
  onResetHeroConfig,
  homePageConfig = DEFAULT_HOME_PAGE_CONFIG,
  onUpdateHomePageConfig,
  onResetHomePageConfig,
  filterBarConfig = DEFAULT_FILTER_BAR_CONFIG,
  onUpdateFilterBarConfig,
  onResetFilterBarConfig,
  categories = CATEGORIES,
  onUpdateCategories,
  onResetCategories,
  reviews = CUSTOMER_REVIEWS,
  onUpdateReviews,
  onResetReviews,
  coupons = DEFAULT_COUPONS,
  onUpdateCoupons,
  onResetCoupons,
  initialAdminSection = 'products',
  onGoToStorefront,
  onGoToAboutPage
}) => {
  const [adminSection, setAdminSection] = useState<'orders' | 'products' | 'hero' | 'hometexts' | 'categories' | 'filters' | 'about' | 'contact' | 'reviews' | 'coupons' | 'bi'>(initialAdminSection);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const handleExportFullStore = () => {
    const fullBackup = {
      exportedAt: new Date().toISOString(),
      storeName: 'Lavistore Presentes',
      products,
      heroConfig,
      homePageConfig,
      categories,
      reviews,
      coupons,
      filterBarConfig
    };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lavistore_loja_completa_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCopiedNotification('📦 Backup completo de toda a loja baixado com sucesso!');
    setTimeout(() => setCopiedNotification(null), 3000);
  };
  
  // Custom in-app modal states for safe deletes without blocked browser confirm()
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showResetCatalogModal, setShowResetCatalogModal] = useState(false);
  const [showResetHeroModal, setShowResetHeroModal] = useState(false);

  // Local state for Hero banner editor
  const [heroForm, setHeroForm] = useState<HeroConfig>({
    image: heroConfig?.image || defaultHeroImg,
    badge: heroConfig?.badge || "Presentes Criativos & Mimos com Amor 🌸",
    title: heroConfig?.title || "Faça a diferença no dia de quem você ama, demonstre o seu carinho através dos nossos mimos!",
    subtitle: heroConfig?.subtitle || "A Lavistore nasce da vontade de empreender e fazer um mundo mais divertido e colorido! Unimos presentes criativos, cheirinho doce artesanal e papelaria fofa que transformam pequenos momentos em pura alegria.",
    imageFit: heroConfig?.imageFit || 'cover',
    imageScale: heroConfig?.imageScale || 100,
    imagePosition: heroConfig?.imagePosition || 'center',
    imagePositionX: heroConfig?.imagePositionX ?? 50,
    imagePositionY: heroConfig?.imagePositionY ?? 50,
    bannerHeight: heroConfig?.bannerHeight || 'medium',
  });

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isDraggingHero, setIsDraggingHero] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; posX: number; posY: number }>({ clientX: 0, clientY: 0, posX: 50, posY: 50 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingHero(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      posX: heroForm.imagePositionX ?? 50,
      posY: heroForm.imagePositionY ?? 50
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingHero) return;
    const deltaX = e.clientX - dragStartRef.current.clientX;
    const deltaY = e.clientY - dragStartRef.current.clientY;
    
    // Sensitivity: 1px = ~0.3%
    const newX = Math.max(0, Math.min(100, Math.round(dragStartRef.current.posX - deltaX * 0.35)));
    const newY = Math.max(0, Math.min(100, Math.round(dragStartRef.current.posY - deltaY * 0.35)));

    setHeroForm(prev => ({
      ...prev,
      imagePositionX: newX,
      imagePositionY: newY
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingHero) {
      setIsDraggingHero(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const nudgeHero = (dx: number, dy: number) => {
    setHeroForm(prev => ({
      ...prev,
      imagePositionX: Math.max(0, Math.min(100, (prev.imagePositionX ?? 50) + dx)),
      imagePositionY: Math.max(0, Math.min(100, (prev.imagePositionY ?? 50) + dy))
    }));
  };

  // Update heroForm if heroConfig prop changes externally
  React.useEffect(() => {
    if (heroConfig) {
      setHeroForm({
        image: heroConfig.image || defaultHeroImg,
        badge: heroConfig.badge || "Presentes Criativos & Mimos com Amor 🌸",
        title: heroConfig.title || "Faça a diferença no dia de quem você ama, demonstre o seu carinho através dos nossos mimos!",
        subtitle: heroConfig.subtitle || "A Lavistore nasce da vontade de empreender e fazer um mundo mais divertido e colorido! Unimos presentes criativos, cheirinho doce artesanal e papelaria fofa que transformam pequenos momentos em pura alegria.",
        imageFit: heroConfig.imageFit || 'cover',
        imageScale: heroConfig.imageScale || 100,
        imagePosition: heroConfig.imagePosition || 'center',
        imagePositionX: heroConfig.imagePositionX ?? 50,
        imagePositionY: heroConfig.imagePositionY ?? 50,
        bannerHeight: heroConfig.bannerHeight || 'medium',
      });
    }
  }, [heroConfig]);

  // Handle uploading image file from computer / mobile
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem é muito grande! Por favor, escolha uma imagem com menos de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setHeroForm(prev => ({ ...prev, image: base64 }));
        setCopiedNotification('Nova foto da capa carregada com sucesso! Clique em "Salvar Alterações". 📸');
        setTimeout(() => setCopiedNotification(null), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  // Preset sample covers
  const presetCovers = [
    {
      name: 'Padrão Trio Florzinhas',
      url: defaultHeroImg
    },
    {
      name: 'Papelaria & Cadernos Fofos',
      url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=1000&auto=format&fit=crop&q=80'
    },
    {
      name: 'Embalagem de Presente & Laço',
      url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1000&auto=format&fit=crop&q=80'
    },
    {
      name: 'Mimos & Canecas Candy Colors',
      url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=1000&auto=format&fit=crop&q=80'
    }
  ];

  const handleSaveHero = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateHeroConfig) {
      onUpdateHeroConfig(heroForm);
      setCopiedNotification('Capa da página principal atualizada com sucesso! ✨');
      setTimeout(() => setCopiedNotification(null), 3500);
    }
  };

  const handleResetHero = () => {
    setShowResetHeroModal(true);
  };

  const confirmResetHeroAction = () => {
    if (onResetHeroConfig) {
      onResetHeroConfig();
    }
    setHeroForm({
      image: defaultHeroImg,
      badge: "Presentes Criativos & Mimos com Amor 🌸",
      title: "Faça a diferença no dia de quem você ama, demonstre o seu carinho através dos nossos mimos!",
      subtitle: "A Lavistore nasce da vontade de empreender e fazer um mundo mais divertido e colorido! Unimos presentes criativos, cheirinho doce artesanal e papelaria fofa que transformam pequenos momentos em pura alegria.",
      imageFit: 'cover',
      imageScale: 100,
      imagePosition: 'center',
      imagePositionX: 50,
      imagePositionY: 50,
      bannerHeight: 'medium',
    });
    setShowResetHeroModal(false);
    setCopiedNotification('Capa restaurada para o padrão original!');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  // Filtered list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.tag && p.tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
      
      const matchesStock = 
        stockFilter === 'all' ? true :
        stockFilter === 'low' ? p.stock <= 5 && p.stock > 0 :
        stockFilter === 'out' ? p.stock === 0 : true;

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [products, searchTerm, categoryFilter, stockFilter]);

  // Financial & Inventory Metrics
  const totalStock = useMemo(() => products.reduce((acc, p) => acc + (p.stock || 0), 0), [products]);
  
  const totalAcquisitionInvested = useMemo(() => {
    return products.reduce((acc, p) => {
      const unitC = p.unitCost ?? (p.price * 0.4);
      return acc + (unitC * (p.stock || 0));
    }, 0);
  }, [products]);

  const totalPotentialRevenue = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0);
  }, [products]);

  const totalEstimatedGrossProfit = useMemo(() => {
    return totalPotentialRevenue - totalAcquisitionInvested;
  }, [totalPotentialRevenue, totalAcquisitionInvested]);

  const avgGrossMargin = useMemo(() => {
    if (totalPotentialRevenue <= 0) return 0;
    return Math.round((totalEstimatedGrossProfit / totalPotentialRevenue) * 100);
  }, [totalEstimatedGrossProfit, totalPotentialRevenue]);

  const lowStockCount = useMemo(() => products.filter(p => p.stock <= 5).length, [products]);

  // Export JSON Backup
  const handleExportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `lavistore_produtos_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setCopiedNotification('Backup exportado com sucesso! 📦');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported) && imported.length > 0 && imported[0].name) {
          if (confirm(`Deseja importar ${imported.length} produtos? Isso atualizará o catálogo atual.`)) {
            onImportProducts(imported);
            setCopiedNotification(`${imported.length} produtos importados com sucesso! 🎉`);
            setTimeout(() => setCopiedNotification(null), 3000);
          }
        } else {
          alert('Arquivo JSON inválido. Certifique-se de que é um backup do catálogo Lavistore.');
        }
      } catch (err) {
        alert('Erro ao ler arquivo JSON. Verifique o formato do arquivo.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in font-['Comfortaa'] pb-12">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-gradient-to-r from-amber-100/95 via-white to-pink-100/90 rounded-3xl p-6 sm:p-8 border-2 border-amber-300 shadow-lg relative overflow-hidden">
        {/* Background decorative flower */}
        <div className="absolute -right-8 -bottom-8 opacity-15 pointer-events-none">
          <TrioFlowersIcon size={180} />
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-200/90 border border-amber-300 text-purple-950 text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-300" />
              <span>Painel do Administrador Lavistore</span>
            </div>
            <h1 className="font-['Mali'] text-2xl sm:text-3xl lg:text-4xl font-bold text-purple-950">
              Gerenciador Completo de Produtos 🌸
            </h1>
            <p className="text-xs sm:text-sm text-purple-900 font-medium max-w-xl leading-relaxed">
              Aqui você pode editar fotos, descrições, preços, categorias e estoque de qualquer mimo, além de cadastrar novos itens na sua loja!
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {onGoToStorefront && (
              <button
                id="btn-admin-goto-storefront"
                type="button"
                onClick={onGoToStorefront}
                className="px-4 py-3 rounded-2xl bg-white/95 hover:bg-purple-50 text-purple-950 font-bold text-xs border-2 border-purple-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Visualizar a vitrine da loja como cliente"
              >
                <Store className="w-4 h-4 text-purple-700" />
                <span>Ver Loja (Vitrine)</span>
              </button>
            )}

            <button
              onClick={onAddProduct}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#F43F5E] via-[#FB923C] via-[#FACC15] to-[#06B6D4] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 border-2 border-white/60 active:scale-95 transition-transform cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cadastrar Novo Mimo</span>
            </button>

            <button
              onClick={onExitAdmin}
              className="px-4 py-3 rounded-2xl bg-white/90 hover:bg-amber-50 text-purple-950 font-bold text-xs border-2 border-amber-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Sair da Gerência</span>
            </button>
          </div>
        </div>

        {/* 5 Stats Cards for Financial & Inventory Intelligence */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-6 relative z-10">
          {/* Stat 1: Total Products */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 border-2 border-amber-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-purple-900 font-bold">
              <span>Mimos Cadastrados</span>
              <Package className="w-4 h-4 text-purple-600" />
            </div>
            <p className="font-['Mali'] text-xl font-bold text-purple-950">
              {products.length} itens
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Catálogo completo</p>
          </div>

          {/* Stat 2: Total Stock Units */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 border-2 border-amber-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-cyan-900 font-bold">
              <span>Estoque Atual</span>
              <Layers className="w-4 h-4 text-cyan-600" />
            </div>
            <p className="font-['Mali'] text-xl font-bold text-cyan-950">
              {totalStock} un.
            </p>
            <p className="text-[10px] text-slate-500 font-medium">{lowStockCount} itens com estoque baixo</p>
          </div>

          {/* Stat 3: Total Acquisition Cost Invested */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 border-2 border-amber-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
              <span>Custo Investido</span>
              <Calculator className="w-4 h-4 text-amber-600" />
            </div>
            <p className="font-['Mali'] text-xl font-bold text-amber-950">
              R$ {totalAcquisitionInvested.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Base no custo unitário</p>
          </div>

          {/* Stat 4: Potential Total Revenue */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 border-2 border-amber-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
              <span>Faturamento Previsto</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="font-['Mali'] text-xl font-bold text-emerald-950">
              R$ {totalPotentialRevenue.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Preço de venda final</p>
          </div>

          {/* Stat 5: Estimated Gross Profit */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 border-2 border-amber-200 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-xs text-rose-900 font-bold">
              <span>Lucro Bruto Estimado</span>
              <TrendingUp className="w-4 h-4 text-rose-600" />
            </div>
            <p className="font-['Mali'] text-xl font-bold text-rose-600">
              R$ {totalEstimatedGrossProfit.toFixed(2)}
            </p>
            <p className="text-[10px] text-emerald-700 font-bold">Margem média: ~{avgGrossMargin}%</p>
          </div>
        </div>
      </div>

      {/* Notification toast */}
      {copiedNotification && (
        <div className="bg-amber-100 border-2 border-amber-400 text-purple-950 p-3 rounded-2xl font-bold text-xs flex items-center justify-between shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{copiedNotification}</span>
          </div>
        </div>
      )}

      {/* Section Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-amber-100/70 border-2 border-amber-300 rounded-2xl">
        <button
          id="btn-tab-admin-bi"
          onClick={() => setAdminSection('bi')}
          className={`flex-1 min-w-[170px] py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            adminSection === 'bi'
              ? 'bg-gradient-to-r from-purple-950 via-pink-900 to-rose-900 text-white shadow-md border-2 border-pink-400'
              : 'text-purple-950 hover:bg-amber-200/60 font-extrabold'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span>📊 BI & Planilhas (Financeiro)</span>
        </button>

        <button
          id="btn-tab-admin-orders"
          onClick={() => setAdminSection('orders')}
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            adminSection === 'orders'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-pink-400" />
          <span>🛍️ Pedidos Recebidos</span>
        </button>

        <button
          onClick={() => setAdminSection('products')}
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            adminSection === 'products'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Package className="w-4 h-4 text-amber-300" />
          <span>📦 Produtos ({products.length})</span>
        </button>

        <button
          onClick={() => setAdminSection('hero')}
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            adminSection === 'hero'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-amber-300" />
          <span>🖼️ Foto da Capa</span>
        </button>

        <button
          onClick={() => setAdminSection('hometexts')}
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            adminSection === 'hometexts'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Edit3 className="w-4 h-4 text-amber-300" />
          <span>📝 Textos da Home</span>
        </button>

        <button
          onClick={() => setAdminSection('about')}
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            adminSection === 'about'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Heart className="w-4 h-4 text-rose-300" />
          <span>🌸 Sobre Nós & História</span>
        </button>

        <button
          onClick={() => setAdminSection('reviews')}
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            adminSection === 'reviews'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <MessageCircle className="w-4 h-4 text-amber-300" />
          <span>💬 Depoimentos</span>
        </button>

        <button
          onClick={() => setAdminSection('contact')}
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            adminSection === 'contact'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Phone className="w-4 h-4 text-emerald-300" />
          <span>📞 Contato & Rodapé</span>
        </button>

        <button
          onClick={() => setAdminSection('categories')}
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            adminSection === 'categories'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Tag className="w-4 h-4 text-amber-300" />
          <span>🏷️ Categorias</span>
        </button>

        <button
          onClick={() => setAdminSection('filters')}
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            adminSection === 'filters'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-300" />
          <span>✨ Filtros de Preço</span>
        </button>

        <button
          id="admin-tab-coupons-btn"
          onClick={() => setAdminSection('coupons')}
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            adminSection === 'coupons'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Ticket className="w-4 h-4 text-amber-300" />
          <span>🎟️ Cupons ({coupons.length})</span>
        </button>
      </div>

      {/* BI & GESTÃO FINANCEIRA (PLANILHAS E APURAÇÃO) */}
      {adminSection === 'bi' && (
        <BiFinancialManager
          products={products}
          onSaveProduct={onSaveProduct}
          onDeleteProduct={onDeleteProduct}
          categories={categories}
          onViewProductLive={onViewProductLive}
          onGoToStorefront={onGoToStorefront}
          onNotify={(msg) => {
            setCopiedNotification(msg);
            setTimeout(() => setCopiedNotification(null), 4000);
          }}
        />
      )}

      {/* ORDERS MANAGER VIEW */}
      {adminSection === 'orders' && (
        <OrdersManager />
      )}

      {/* CATEGORY MANAGER VIEW */}
      {adminSection === 'categories' && (
        <CategoryManager
          categories={categories}
          products={products}
          onSaveCategories={(newCats) => {
            if (onUpdateCategories) {
              onUpdateCategories(newCats);
            }
            setCopiedNotification('Categorias da loja e opções do Rodapé salvas com sucesso! 🏷️🌸');
            setTimeout(() => setCopiedNotification(null), 3500);
          }}
          onResetCategories={() => {
            if (onResetCategories) {
              onResetCategories();
            }
            setCopiedNotification('Categorias restauradas para o padrão original da Lavistore!');
            setTimeout(() => setCopiedNotification(null), 3000);
          }}
          onGoToStorefront={onGoToStorefront}
        />
      )}

      {/* FILTER BAR MANAGER VIEW */}
      {adminSection === 'filters' && (
        <FilterBarManager
          config={filterBarConfig}
          onSaveConfig={(newCfg) => {
            if (onUpdateFilterBarConfig) {
              onUpdateFilterBarConfig(newCfg);
            }
            setCopiedNotification('Filtros de preço e ordenação salvos com sucesso! ✨');
            setTimeout(() => setCopiedNotification(null), 3500);
          }}
          onResetConfig={() => {
            if (onResetFilterBarConfig) {
              onResetFilterBarConfig();
            }
            setCopiedNotification('Configuração dos filtros restaurada para o padrão!');
            setTimeout(() => setCopiedNotification(null), 3000);
          }}
        />
      )}

      {/* HOME TEXTS & TYPOGRAPHY MANAGER VIEW */}
      {adminSection === 'hometexts' && (
        <HomeTextManager
          config={homePageConfig}
          onSaveConfig={(newCfg) => {
            if (onUpdateHomePageConfig) {
              onUpdateHomePageConfig(newCfg);
            }
            setCopiedNotification('Textos e tamanhos de fonte da Página Inicial atualizados com sucesso! 📝✨');
            setTimeout(() => setCopiedNotification(null), 3500);
          }}
          onResetDefaults={() => {
            if (onResetHomePageConfig) {
              onResetHomePageConfig();
            }
            setCopiedNotification('Textos da Página Inicial restaurados para o padrão original!');
            setTimeout(() => setCopiedNotification(null), 3000);
          }}
          onGoToStorefront={onGoToStorefront}
        />
      )}

      {/* ABOUT PAGE & FLORAL STORY MANAGER VIEW */}
      {adminSection === 'about' && (
        <AboutPageManager
          config={homePageConfig}
          onSaveConfig={(newCfg) => {
            if (onUpdateHomePageConfig) {
              onUpdateHomePageConfig(newCfg);
            }
            setCopiedNotification('Página "Sobre Nós", história e pilares atualizados com sucesso! 🌸✨');
            setTimeout(() => setCopiedNotification(null), 3500);
          }}
          onResetDefaults={() => {
            if (onResetHomePageConfig) {
              onResetHomePageConfig();
            }
            setCopiedNotification('Textos da página "Sobre Nós" restaurados para o padrão original!');
            setTimeout(() => setCopiedNotification(null), 3000);
          }}
          onGoToAboutPage={onGoToAboutPage}
        />
      )}

      {/* REVIEWS & TESTIMONIALS MANAGER VIEW */}
      {adminSection === 'reviews' && (
        <ReviewsManager
          config={homePageConfig}
          reviews={reviews}
          onSaveConfig={(newCfg) => {
            if (onUpdateHomePageConfig) {
              onUpdateHomePageConfig(newCfg);
            }
            setCopiedNotification('Textos e selos da seção de depoimentos atualizados com sucesso! 💬✨');
            setTimeout(() => setCopiedNotification(null), 3500);
          }}
          onSaveReviews={(newReviews) => {
            if (onUpdateReviews) {
              onUpdateReviews(newReviews);
            }
            setCopiedNotification('Lista de depoimentos das clientes atualizada com sucesso! ⭐');
            setTimeout(() => setCopiedNotification(null), 3500);
          }}
          onResetDefaults={() => {
            if (onResetReviews) {
              onResetReviews();
            }
            setCopiedNotification('Depoimentos restaurados para o padrão original!');
            setTimeout(() => setCopiedNotification(null), 3000);
          }}
        />
      )}

      {/* CONTACT & FOOTER & CHAT MANAGER VIEW */}
      {adminSection === 'contact' && (
        <ContactFooterManager
          config={homePageConfig}
          onSaveConfig={(newCfg) => {
            if (onUpdateHomePageConfig) {
              onUpdateHomePageConfig(newCfg);
            }
            setCopiedNotification('Informações de contato, WhatsApp e rodapé atualizadas com sucesso! 📞✨');
            setTimeout(() => setCopiedNotification(null), 3500);
          }}
          onResetDefaults={() => {
            if (onResetHomePageConfig) {
              onResetHomePageConfig();
            }
            setCopiedNotification('Contatos e rodapé restaurados para o padrão original!');
            setTimeout(() => setCopiedNotification(null), 3000);
          }}
        />
      )}

      {/* COUPON MANAGER VIEW */}
      {adminSection === 'coupons' && (
        <CouponManager
          coupons={coupons}
          onSaveCoupons={(newCoupons) => {
            if (onUpdateCoupons) {
              onUpdateCoupons(newCoupons);
            }
            setCopiedNotification('Cupons de desconto e frete grátis salvos com sucesso! 🎟️✨');
            setTimeout(() => setCopiedNotification(null), 3500);
          }}
          onResetCoupons={() => {
            if (onResetCoupons) {
              onResetCoupons();
            }
            setCopiedNotification('Cupons restaurados para o padrão original da Lavistore!');
            setTimeout(() => setCopiedNotification(null), 3000);
          }}
        />
      )}

      {/* HERO BANNER CUSTOMIZER VIEW */}
      {adminSection === 'hero' && (
        <div className="space-y-6">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border-2 border-amber-200 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-100 pb-5">
              <div>
                <h2 className="font-['Mali'] text-xl sm:text-2xl font-bold text-purple-950 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500 fill-amber-300" />
                  <span>Personalização da Foto de Capa (Página Principal)</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  Substitua a imagem de destaque do topo da loja e customize as frases de acolhimento.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetHero}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>Restaurar Foto Padrão</span>
                </button>

                {onGoToStorefront && (
                  <button
                    type="button"
                    onClick={onGoToStorefront}
                    className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-purple-950 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    <span>Ver na Loja</span>
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveHero} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Image Source & Text Customization */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Step 1: Image Source */}
                  <div className="bg-white/90 rounded-2xl p-4 sm:p-5 border-2 border-amber-200 shadow-sm space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider mb-1">
                        1. Escolha a Foto da Capa
                      </label>
                      <p className="text-[11px] text-slate-600">
                        Envie do seu celular/computador, cole um link ou escolha uma das fotos prontas.
                      </p>
                    </div>

                    {/* File Upload Button */}
                    <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-amber-300 hover:border-amber-400 bg-amber-50/50 hover:bg-amber-100/40 rounded-2xl cursor-pointer transition-all group text-center">
                      <div className="w-10 h-10 rounded-2xl bg-amber-200/80 flex items-center justify-center text-purple-950 group-hover:scale-110 transition-transform mb-2">
                        <Upload className="w-5 h-5 text-purple-950" />
                      </div>
                      <span className="text-xs font-bold text-purple-950">
                        📁 Selecionar Foto do Dispositivo
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1">
                        JPG, PNG ou WEBP
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {/* URL input */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                        <LinkIcon className="w-3 h-3 text-amber-500" />
                        <span>Ou cole o link direto (URL):</span>
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          placeholder="https://exemplo.com/foto.jpg"
                          className="flex-1 px-3 py-2 bg-amber-50/50 border-2 border-amber-200 rounded-xl text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (imageUrlInput.trim()) {
                              setHeroForm(prev => ({ ...prev, image: imageUrlInput.trim() }));
                              setImageUrlInput('');
                              setCopiedNotification('Link de foto aplicado ao preview!');
                              setTimeout(() => setCopiedNotification(null), 3000);
                            }
                          }}
                          className="px-3 py-2 bg-amber-400 hover:bg-amber-500 text-purple-950 font-bold text-xs rounded-xl shadow-2xs transition-colors"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>

                    {/* Preset Options */}
                    <div className="space-y-2 pt-2 border-t border-amber-100">
                      <label className="block text-[11px] font-bold text-purple-950">
                        Fotos de Exemplo Rápidas:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {presetCovers.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setHeroForm(prev => ({ ...prev, image: preset.url }));
                              setCopiedNotification(`Foto "${preset.name}" selecionada!`);
                              setTimeout(() => setCopiedNotification(null), 3000);
                            }}
                            className={`p-1.5 rounded-xl border-2 text-left flex items-center gap-2 transition-all overflow-hidden ${
                              heroForm.image === preset.url
                                ? 'border-amber-400 bg-amber-100/90 ring-2 ring-amber-300'
                                : 'border-amber-100 bg-white hover:bg-amber-50/70'
                            }`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.name}
                              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white"
                            />
                            <span className="text-[10px] font-bold text-purple-950 truncate">
                              {preset.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Text Customization */}
                  <div className="bg-white/90 rounded-2xl p-4 sm:p-5 border-2 border-amber-200 shadow-sm space-y-3">
                    <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider">
                      2. Textos da Capa (Opcional)
                    </label>

                    <div>
                      <label className="block text-[11px] font-bold text-purple-950 mb-1">
                        Selo Superior (Tag):
                      </label>
                      <input
                        type="text"
                        value={heroForm.badge}
                        onChange={(e) => setHeroForm(prev => ({ ...prev, badge: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-amber-50/50 border-2 border-amber-200 rounded-xl text-xs font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder="Ex: Presentes Criativos & Mimos com Amor 🌸"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-purple-950 mb-1">
                        Título Principal:
                      </label>
                      <textarea
                        value={heroForm.title}
                        onChange={(e) => setHeroForm(prev => ({ ...prev, title: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-1.5 bg-amber-50/50 border-2 border-amber-200 rounded-xl text-xs font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                        placeholder="Ex: Faça a diferença no dia de quem você ama..."
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-purple-950 mb-1">
                        Subtítulo / Texto de Apoio:
                      </label>
                      <textarea
                        value={heroForm.subtitle}
                        onChange={(e) => setHeroForm(prev => ({ ...prev, subtitle: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-1.5 bg-amber-50/50 border-2 border-amber-200 rounded-xl text-xs font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                        placeholder="Ex: A Lavistore nasce da vontade de empreender..."
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Interactive Preview & Adjustment Controls */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Top Preview Card */}
                  <div className="bg-white/95 rounded-3xl p-5 border-2 border-amber-200 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>3. Pré-Visualização no Formato Real da Loja</span>
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Formato exato 1:1 de como o cartão aparece na página principal
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-purple-950 bg-amber-100 font-bold px-2.5 py-1 rounded-full border border-amber-300">
                        <Crosshair className="w-3 h-3 text-purple-700" />
                        <span>X: {heroForm.imagePositionX ?? 50}% | Y: {heroForm.imagePositionY ?? 50}% | Zoom: {heroForm.imageScale || 100}%</span>
                      </div>
                    </div>

                    {/* Visual Interactive Preview Box - Matching Exact Store Showcase */}
                    <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-purple-100/70 via-amber-50/50 to-pink-100/70 border-2 border-amber-200 flex flex-col items-center justify-center relative overflow-hidden">
                      
                      {/* Drag Notice Banner */}
                      <div className="w-full max-w-sm mb-3 px-3 py-1.5 bg-white/90 backdrop-blur-xs rounded-xl border border-purple-100 flex items-center justify-between text-[11px] text-purple-900 font-bold shadow-xs">
                        <span className="flex items-center gap-1.5">
                          <Hand className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                          <span>Arraste com o mouse para posicionar</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">Formato Real da Loja</span>
                      </div>

                      {/* Store-Identical Showcase Card Frame */}
                      <div className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-square">
                        {/* Outer soft glow */}
                        <div className="absolute -inset-1.5 bg-gradient-to-tr from-amber-300/30 via-pink-300/30 to-purple-300/30 rounded-[36px] blur-sm -z-10" />
                        
                        <div 
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          className={`relative w-full h-full rounded-[28px] sm:rounded-[34px] overflow-hidden shadow-2xl shadow-purple-950/10 border-4 border-white bg-white flex items-center justify-center select-none touch-none ${
                            isDraggingHero ? 'cursor-grabbing ring-4 ring-purple-500/50' : 'cursor-grab hover:ring-2 hover:ring-purple-300'
                          }`}
                        >
                          <img
                            src={heroForm.image}
                            alt="Prévia da foto de capa"
                            draggable={false}
                            style={{
                              objectFit: heroForm.imageFit || 'cover',
                              objectPosition: `${heroForm.imagePositionX ?? 50}% ${heroForm.imagePositionY ?? 50}%`,
                              transform: (heroForm.imageScale && heroForm.imageScale !== 100) ? `scale(${heroForm.imageScale / 100})` : undefined,
                              transformOrigin: `${heroForm.imagePositionX ?? 50}% ${heroForm.imagePositionY ?? 50}%`,
                            }}
                            className="w-full h-full pointer-events-none transition-transform duration-75 select-none"
                          />
                        </div>
                      </div>

                      {/* Store Preview Hint */}
                      <p className="text-[11px] text-slate-600 font-medium mt-3 text-center">
                        ✨ O enquadramento acima reflete com exatidão como a imagem aparecerá para os clientes na loja.
                      </p>
                    </div>

                    {/* Sizing & Positioning Control Panels */}
                    <div className="space-y-4 pt-2">
                      
                      {/* Mode: Cover vs Contain */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-purple-950 flex items-center gap-1.5">
                            <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                            <span>Modo de Enquadramento da Imagem:</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setHeroForm(prev => ({
                                ...prev,
                                imageFit: 'cover',
                                imageScale: 100,
                                imagePosition: 'center',
                                imagePositionX: 50,
                                imagePositionY: 50,
                                bannerHeight: 'medium'
                              }));
                            }}
                            className="text-[10px] font-bold text-purple-700 hover:text-purple-900 underline"
                          >
                            Restaurar Padrão
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setHeroForm(prev => ({ ...prev, imageFit: 'cover' }))}
                            className={`p-2.5 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center justify-center text-center gap-0.5 ${
                              heroForm.imageFit !== 'contain'
                                ? 'border-purple-600 bg-purple-100 text-purple-950 shadow-xs ring-1 ring-purple-400'
                                : 'border-amber-200 bg-white text-slate-700 hover:bg-amber-50'
                            }`}
                          >
                            <span className="font-extrabold text-xs">🖼️ Preencher Espaço (Cover)</span>
                            <span className="text-[10px] text-slate-500 font-normal">Ocupa todo o banner (padrão)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setHeroForm(prev => ({ ...prev, imageFit: 'contain' }))}
                            className={`p-2.5 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center justify-center text-center gap-0.5 ${
                              heroForm.imageFit === 'contain'
                                ? 'border-purple-600 bg-purple-100 text-purple-950 shadow-xs ring-1 ring-purple-400'
                                : 'border-amber-200 bg-white text-slate-700 hover:bg-amber-50'
                            }`}
                          >
                            <span className="font-extrabold text-xs">🔍 Foto Inteira (Contain)</span>
                            <span className="text-[10px] text-slate-500 font-normal">Mostra sem cortar bordas</span>
                          </button>
                        </div>
                      </div>

                      {/* Zoom / Scale Slider */}
                      <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                            <ZoomIn className="w-3.5 h-3.5 text-amber-600" />
                            <span>Tamanho / Zoom da Imagem:</span>
                          </label>
                          <span className="text-xs font-black text-purple-950 bg-white px-2 py-0.5 rounded-md border border-amber-300">
                            {heroForm.imageScale || 100}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <ZoomOut className="w-4 h-4 text-purple-700 shrink-0" />
                          <input
                            type="range"
                            min="40"
                            max="200"
                            step="5"
                            value={heroForm.imageScale || 100}
                            onChange={(e) => setHeroForm(prev => ({ ...prev, imageScale: Number(e.target.value) }))}
                            className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                          <ZoomIn className="w-4 h-4 text-purple-700 shrink-0" />
                        </div>
                        <div className="flex items-center justify-between pt-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setHeroForm(prev => ({ ...prev, imageScale: Math.max(40, (prev.imageScale || 100) - 10) }))}
                            className="px-2 py-0.5 bg-white hover:bg-amber-100 rounded border border-amber-200 font-bold text-purple-900"
                          >
                            -10%
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeroForm(prev => ({ ...prev, imageScale: 100 }))}
                            className="px-2.5 py-0.5 bg-white hover:bg-amber-100 rounded border border-amber-200 font-bold text-purple-900"
                          >
                            100% (Normal)
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeroForm(prev => ({ ...prev, imageScale: 150 }))}
                            className="px-2.5 py-0.5 bg-white hover:bg-amber-100 rounded border border-amber-200 font-bold text-purple-900"
                          >
                            150%
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeroForm(prev => ({ ...prev, imageScale: Math.min(200, (prev.imageScale || 100) + 10) }))}
                            className="px-2 py-0.5 bg-white hover:bg-amber-100 rounded border border-amber-200 font-bold text-purple-900"
                          >
                            +10%
                          </button>
                        </div>
                      </div>

                      {/* Horizontal Focal Point Position (X-Axis) */}
                      <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                            <Move className="w-3.5 h-3.5 text-amber-600" />
                            <span>Posição Horizontal (Esquerda / Direita):</span>
                          </label>
                          <span className="text-xs font-black text-purple-950 bg-white px-2 py-0.5 rounded-md border border-amber-300">
                            {heroForm.imagePositionX ?? 50}%
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setHeroForm(prev => ({ ...prev, imagePositionX: 0 }))}
                            className={`py-1 px-2 rounded-lg border text-[11px] font-bold transition-all ${
                              heroForm.imagePositionX === 0
                                ? 'border-purple-600 bg-purple-100 text-purple-950'
                                : 'border-amber-200 bg-white text-slate-700 hover:bg-amber-50'
                            }`}
                          >
                            ⬅️ Esquerda (0%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeroForm(prev => ({ ...prev, imagePositionX: 50 }))}
                            className={`py-1 px-2 rounded-lg border text-[11px] font-bold transition-all ${
                              (heroForm.imagePositionX ?? 50) === 50
                                ? 'border-purple-600 bg-purple-100 text-purple-950'
                                : 'border-amber-200 bg-white text-slate-700 hover:bg-amber-50'
                            }`}
                          >
                            ⏹️ Centro (50%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeroForm(prev => ({ ...prev, imagePositionX: 100 }))}
                            className={`py-1 px-2 rounded-lg border text-[11px] font-bold transition-all ${
                              heroForm.imagePositionX === 100
                                ? 'border-purple-600 bg-purple-100 text-purple-950'
                                : 'border-amber-200 bg-white text-slate-700 hover:bg-amber-50'
                            }`}
                          >
                            ➡️ Direita (100%)
                          </button>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={heroForm.imagePositionX ?? 50}
                          onChange={(e) => setHeroForm(prev => ({ ...prev, imagePositionX: Number(e.target.value) }))}
                          className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                      </div>

                      {/* Vertical Focal Point Position (Y-Axis) */}
                      <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                            <Move className="w-3.5 h-3.5 text-amber-600" />
                            <span>Posição Vertical (Cima / Baixo):</span>
                          </label>
                          <span className="text-xs font-black text-purple-950 bg-white px-2 py-0.5 rounded-md border border-amber-300">
                            {heroForm.imagePositionY ?? 50}%
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setHeroForm(prev => ({ ...prev, imagePosition: 'top', imagePositionY: 0 }))}
                            className={`py-1 px-2 rounded-lg border text-[11px] font-bold transition-all ${
                              heroForm.imagePositionY === 0
                                ? 'border-purple-600 bg-purple-100 text-purple-950'
                                : 'border-amber-200 bg-white text-slate-700 hover:bg-amber-50'
                            }`}
                          >
                            ⬆️ Topo (0%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeroForm(prev => ({ ...prev, imagePosition: 'center', imagePositionY: 50 }))}
                            className={`py-1 px-2 rounded-lg border text-[11px] font-bold transition-all ${
                              (heroForm.imagePositionY ?? 50) === 50
                                ? 'border-purple-600 bg-purple-100 text-purple-950'
                                : 'border-amber-200 bg-white text-slate-700 hover:bg-amber-50'
                            }`}
                          >
                            ⏹️ Centro (50%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeroForm(prev => ({ ...prev, imagePosition: 'bottom', imagePositionY: 100 }))}
                            className={`py-1 px-2 rounded-lg border text-[11px] font-bold transition-all ${
                              heroForm.imagePositionY === 100
                                ? 'border-purple-600 bg-purple-100 text-purple-950'
                                : 'border-amber-200 bg-white text-slate-700 hover:bg-amber-50'
                            }`}
                          >
                            ⬇️ Base (100%)
                          </button>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={heroForm.imagePositionY ?? 50}
                          onChange={(e) => setHeroForm(prev => ({ ...prev, imagePositionY: Number(e.target.value) }))}
                          className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                      </div>

                      {/* Banner Height in Storefront */}
                      <div>
                        <label className="block text-[11px] font-bold text-purple-900 mb-1.5">
                          Altura do Banner na Loja:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'compact', label: '📱 Compacto', desc: '320px' },
                            { id: 'medium', label: '✨ Padrão', desc: '420px' },
                            { id: 'large', label: '🌟 Amplo', desc: '520px' }
                          ].map((h) => (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => setHeroForm(prev => ({ ...prev, bannerHeight: h.id as any }))}
                              className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center ${
                                (heroForm.bannerHeight || 'medium') === h.id
                                  ? 'border-purple-600 bg-purple-100 text-purple-950 shadow-2xs ring-1 ring-purple-400'
                                  : 'border-amber-200 bg-white text-slate-700 hover:bg-amber-50'
                              }`}
                            >
                              <span>{h.label}</span>
                              <span className="text-[10px] text-slate-500 font-normal">{h.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

              </div>

              {/* Bottom Submit Action */}
              <div className="pt-4 border-t border-amber-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-purple-900 font-medium">
                  💡 Após clicar em <strong>Salvar Alterações</strong>, a foto e o enquadramento serão salvos e atualizados imediatamente na loja!
                </p>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#F43F5E] via-[#FB923C] via-[#FACC15] to-[#06B6D4] hover:opacity-95 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 border-2 border-white/60 active:scale-95 transition-transform"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações na Capa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCTS CATALOG SECTION */}
      {adminSection === 'products' && (
        <div className="space-y-8">
          {/* Toolbar: Search, Filters, Export/Import/Reset */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-6 border-2 border-amber-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-amber-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, tag ou ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-amber-50/50 border-2 border-amber-200 rounded-2xl text-xs sm:text-sm font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-amber-50/50 border-2 border-amber-200 rounded-2xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="all">Todas as Categorias</option>
              {categories.filter(c => c.id !== 'todos').map(c => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-3.5 py-2.5 bg-amber-50/50 border-2 border-amber-200 rounded-2xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="all">Todos os Estoques</option>
              <option value="low">Estoque Baixo (&le; 5)</option>
              <option value="out">Esgotados (0)</option>
            </select>
          </div>

          {/* Backup / Export / Import / Reset Actions */}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <button
              onClick={handleExportFullStore}
              title="Baixar backup completo de toda a loja (fotos, frases, produtos, categorias e cupons) em JSON"
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Backup Loja Completa</span>
            </button>

            <button
              onClick={handleExportBackup}
              title="Baixar backup apenas dos produtos em formato JSON"
              className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-purple-600" />
              <span>Backup Produtos</span>
            </button>

            <label
              title="Importar produtos de um backup JSON"
              className="px-3.5 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-600" />
              <span>Importar JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setShowResetCatalogModal(true)}
              title="Restaurar lista padrão original"
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Restaurar Padrão</span>
            </button>
          </div>
        </div>
      </div>

      {/* Products Table List with Intelligent Pricing Overview */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border-2 border-amber-200 shadow-md overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-amber-100 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-['Mali'] text-lg font-bold text-purple-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Lista de Produtos & Precificação Inteligente ({filteredProducts.length})</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Apenas o <strong>Preço Final de Venda</strong> fica visível para o cliente na loja. Custo, mark-up e lucro são exclusivos do administrador.
            </p>
          </div>
          <button
            onClick={onAddProduct}
            className="self-start sm:self-auto px-4 py-2 bg-amber-400 hover:bg-amber-500 text-purple-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Produto</span>
          </button>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-bold text-purple-950">Nenhum produto encontrado com os filtros atuais.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setStockFilter('all');
              }}
              className="px-4 py-2 bg-amber-400 text-purple-950 font-bold rounded-xl text-xs"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-amber-100/70 border-b border-amber-200 text-purple-950 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Foto & ID</th>
                  <th className="py-3.5 px-4">Nome do Mimo</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4 text-center">Estoque (Atual / Inicial)</th>
                  <th className="py-3.5 px-4">Custo Unitário</th>
                  <th className="py-3.5 px-4">Preço de Venda</th>
                  <th className="py-3.5 px-4">Mark-up & Lucro Bruto</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 font-medium text-slate-700">
                {filteredProducts.map((p) => {
                  const discount = p.originalPrice 
                    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                    : null;

                  const unitCost = p.unitCost ?? (p.price * 0.4);
                  const grossProfit = p.grossProfit ?? (p.price - unitCost);
                  const markupPercent = p.markupPercent ?? (unitCost > 0 ? ((p.price - unitCost) / unitCost) * 100 : 0);
                  const grossMargin = p.grossMarginPercent ?? (p.price > 0 ? (grossProfit / p.price) * 100 : 0);

                  return (
                    <tr key={p.id} className="hover:bg-amber-50/50 transition-colors">
                      {/* Photo Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-200 shrink-0 bg-slate-100">
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            {p.images.length > 1 && (
                              <span className="absolute bottom-0.5 right-0.5 bg-purple-950/80 text-white text-[9px] px-1 rounded font-bold">
                                +{p.images.length - 1}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            {p.id}
                          </span>
                        </div>
                      </td>

                      {/* Name & Description Preview */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-bold text-purple-950 text-xs sm:text-sm line-clamp-1">{p.name}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 font-normal leading-relaxed">
                          {p.description}
                        </p>
                      </td>

                      {/* Category & Tag */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-[11px] font-bold">
                            {p.category}
                          </span>
                          {p.tag && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-pink-100 border border-pink-200 text-pink-900 text-[10px] font-bold">
                              {p.tag}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock (Current / Initial) */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            p.stock > 5 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : p.stock > 0
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {p.stock > 0 ? `${p.stock} un.` : 'Esgotado'}
                          </span>
                          {p.initialStock && p.initialStock !== p.stock && (
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Inicial: {p.initialStock} un.
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Unit Cost */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">
                            R$ {unitCost.toFixed(2)}
                          </span>
                          {p.acquisitionCostTotal && (
                            <span className="text-[10px] text-slate-400">
                              Total: R$ {p.acquisitionCostTotal.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Price (Sale Price to End User) */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col font-bold text-purple-950">
                          <span className="text-emerald-950 font-extrabold">
                            R$ {p.price.toFixed(2)}
                          </span>
                          {p.originalPrice && (
                            <span className="text-[10px] text-slate-400 line-through">
                              De R$ {p.originalPrice.toFixed(2)} (-{discount}%)
                            </span>
                          )}
                          <span className="text-[9px] text-slate-400 font-normal">
                            Preço público
                          </span>
                        </div>
                      </td>

                      {/* Markup & Gross Profit */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-emerald-800 text-xs">
                            +R$ {grossProfit.toFixed(2)} <span className="font-normal text-[10px] text-slate-500">/un</span>
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                            <span>Mark-up: {markupPercent.toFixed(1)}%</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">Margem: {grossMargin.toFixed(0)}%</span>
                          </div>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Live Preview Button */}
                          <button
                            onClick={() => onViewProductLive(p)}
                            title="Visualizar produto na loja"
                            className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicate Button */}
                          <button
                            onClick={() => onDuplicateProduct(p)}
                            title="Duplicar este produto para criar variação"
                            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => onEditProduct(p)}
                            title="Editar fotos, descrição, valores e dados"
                            className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-purple-950 font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          {/* Delete Button (Safe In-App Trigger) */}
                          <button
                            onClick={() => setProductToDelete(p)}
                            title="Excluir produto da loja"
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
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

        </div>
      )}

      {/* Helpful Admin Note Card */}
      <div className="bg-gradient-to-r from-amber-50 via-white to-pink-50 rounded-3xl p-6 border-2 border-amber-200/80 shadow-2xs space-y-2">
        <h3 className="font-['Mali'] text-base font-bold text-purple-950 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Dicas do Administrador Lavistore ✨</span>
        </h3>
        <ul className="text-xs text-slate-700 font-medium space-y-1.5 list-disc list-inside leading-relaxed">
          <li><strong>Foto da Página Principal (Capa):</strong> Você pode trocar a foto do banner de entrada da loja clicando na aba <strong>"🖼️ Foto & Textos do Banner Principal (Capa)"</strong> logo acima e enviando qualquer imagem do seu computador ou celular.</li>
          <li><strong>Precificação Inteligente:</strong> Ao cadastrar ou editar um produto, informe a quantidade inicial e o custo total de aquisição para calcular o custo unitário. Escolha entre aplicar uma margem de mark-up percentual ou definir o valor final manualmente.</li>
          <li><strong>Visibilidade Segura:</strong> O cliente final visualiza apenas o preço unitário final de venda. Todos os custos e lucros brutos ficam salvos exclusivamente para a administração.</li>
          <li><strong>Persistência Automática:</strong> Todas as alterações em produtos e fotos são salvas automaticamente no armazenamento do seu navegador.</li>
          <li><strong>Exportar Backup:</strong> Utilize o botão "Backup JSON" para salvar uma cópia do seu catálogo e transferi-la para qualquer outro dispositivo quando desejar.</li>
        </ul>
      </div>

      {/* CUSTOM IN-APP DELETE PRODUCT CONFIRMATION MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border-2 border-rose-200 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-['Mali'] text-lg font-bold text-purple-950">Excluir Produto da Loja?</h3>
                <p className="text-xs text-slate-500 font-medium">Esta ação removerá o item do catálogo.</p>
              </div>
            </div>

            {/* Product Card Preview */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center gap-3">
              <img
                src={productToDelete.images[0]}
                alt={productToDelete.name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover border border-amber-200 shrink-0 bg-white"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs sm:text-sm text-purple-950 truncate">{productToDelete.name}</h4>
                <p className="text-[11px] text-slate-500">{productToDelete.category} • {productToDelete.stock} un. em estoque</p>
                <p className="text-xs font-bold text-emerald-800">Preço: R$ {productToDelete.price.toFixed(2)}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Tem certeza que deseja excluir <strong>"{productToDelete.name}"</strong>? Os dados deste mimo serão excluídos do catálogo da loja.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const deletedName = productToDelete.name;
                  onDeleteProduct(productToDelete.id);
                  setProductToDelete(null);
                  setCopiedNotification(`Produto "${deletedName}" foi excluído com sucesso! 🗑️`);
                  setTimeout(() => setCopiedNotification(null), 3500);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir Produto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET CATALOG MODAL */}
      {showResetCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border-2 border-amber-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-100 rounded-2xl">
                <RotateCcw className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="font-['Mali'] text-lg font-bold text-purple-950">Restaurar Catálogo Padrão?</h3>
                <p className="text-xs text-slate-500 font-medium">Voltar aos produtos e fotos originais da Lavistore.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Esta ação redefinirá todos os produtos para a lista inicial original da Lavistore. Se desejar, faça um <strong>Backup JSON</strong> antes.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetCatalogModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetProducts();
                  setShowResetCatalogModal(false);
                  setCopiedNotification('Catálogo padrão original restaurado com sucesso! ✨');
                  setTimeout(() => setCopiedNotification(null), 3000);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-purple-950 font-bold text-xs shadow-md transition-colors"
              >
                Restaurar Catálogo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET HERO BANNER MODAL */}
      {showResetHeroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border-2 border-amber-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-100 rounded-2xl">
                <RotateCcw className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="font-['Mali'] text-lg font-bold text-purple-950">Restaurar Banner Principal?</h3>
                <p className="text-xs text-slate-500 font-medium">Voltar para a imagem e textos padrões de capa.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Deseja restaurar a foto do trio de florzinhas e textos padrões da capa da página inicial?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetHeroModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmResetHeroAction}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-purple-950 font-bold text-xs shadow-md transition-colors"
              >
                Restaurar Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
