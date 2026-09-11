import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryPills } from './components/CategoryPills';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { AdminProductModal } from './components/AdminProductModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { CartDrawer } from './components/CartDrawer';
import { FavoritesDrawer } from './components/FavoritesDrawer';
import { CustomKitBuilder } from './components/CustomKitBuilder';
import { GiftCardGenerator } from './components/GiftCardGenerator';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { ReturnPolicyModal } from './components/ReturnPolicyModal';
import { BrandPerks } from './components/BrandPerks';
import { Footer } from './components/Footer';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { ReviewsSection } from './components/ReviewsSection';

import { PRODUCTS } from './data/products';
import { CUSTOMER_REVIEWS } from './data/reviews';
import { DEFAULT_COUPONS } from './data/coupons';
import { Product, CartItem, ActiveTab, HeroConfig, HomePageConfig, FilterBarConfig, Category, CustomerReview, ShippingOption, Coupon } from './types';
import { CATEGORIES as DEFAULT_CATEGORIES } from './data/categories';
import storeState from './data/store_state.json';
import { evaluateCoupon } from './utils/couponUtils';
import { Sparkles, Flower2, Gift, ArrowRight, Edit3, ShoppingBag, Tag, Heart, Sun, Smile, Package, CheckCircle2 } from 'lucide-react';
import { LavistoreLogo, TrioFlowersIcon } from './components/LavistoreLogo';
import defaultHeroImg from './assets/images/lavistore_hero_1788110245812.jpg';
import { HomeTextEditorModal } from './components/HomeTextEditorModal';
import { CategoryEditorModal } from './components/CategoryEditorModal';
import { DEFAULT_HOME_PAGE_CONFIG, getFontSizeClass, getFontWeightClass } from './utils/textFormatter';
import { DEFAULT_FILTER_BAR_CONFIG } from './data/filterConfig';
import { safeSetItem, serializeCart, deserializeCart, serializeFavorites, deserializeFavorites } from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [priceFilter, setPriceFilter] = useState('all');
  const [isCategoryEditorOpen, setIsCategoryEditorOpen] = useState(false);
  const [isReturnPolicyOpen, setIsReturnPolicyOpen] = useState(false);

  // Categories Customization State (Persisted in localStorage)
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('lavistore_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Verify if it contains old default template categories (e.g. canetas-marcadores)
          const hasOldCategories = parsed.some((c: Category) => c.id === 'canetas-marcadores');
          if (!hasOldCategories) {
            const nonTodos = parsed.filter((c: Category) => c.id !== 'todos');
            if (nonTodos.length <= 6) {
              return parsed.map((c: Category) => c.id === 'todos' ? c : { ...c, showInFooter: true });
            }
            return parsed;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CATEGORIES;
  });

  // Home Page Typography & Text Customization State (Persisted in localStorage)
  const [homePageConfig, setHomePageConfig] = useState<HomePageConfig>(() => {
    try {
      const saved = localStorage.getItem('lavistore_home_page_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.pagSeguroPaymentUrl) {
          parsed.pagSeguroPaymentUrl = '';
        }
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_HOME_PAGE_CONFIG;
  });

  // Active inline field editing modal
  const [activeEditingField, setActiveEditingField] = useState<{
    fieldKey: keyof HomePageConfig;
    label: string;
  } | null>(null);

  // Hero Banner Customization State (Persisted in localStorage)
  const [heroConfig, setHeroConfig] = useState<HeroConfig>(() => {
    try {
      const saved = localStorage.getItem('lavistore_hero_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.title) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return (storeState.heroConfig as unknown as HeroConfig) || {
      image: defaultHeroImg,
      badge: "Presentes & Mimos Criativos 🌸",
      title: "Demonstre seu carinho com nossos mimos!",
      subtitle: "Presentes criativos, cheirinho doce artesanal e papelaria fofa que transformam pequenos momentos em pura alegria."
    };
  });

  // Editable Products State (Persisted in localStorage with default fallback)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('lavistore_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If cached products are the old template mock products (lav-01, lav-02), discard and use PRODUCTS
          const hasOldDummyProducts = parsed.some((p: Product) => p.id === 'lav-01' || p.id === 'lav-02');
          if (!hasOldDummyProducts) {
            return parsed;
          }
        }
      }
      return PRODUCTS;
    } catch {
      return PRODUCTS;
    }
  });

  // Admin Authentication state (Protected session, persisted safely in localStorage)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lavistore_admin_authenticated') === 'true';
    } catch {
      return false;
    }
  });

  // Editable Reviews State (Persisted in localStorage)
  const [reviews, setReviews] = useState<CustomerReview[]>(() => {
    try {
      const saved = localStorage.getItem('lavistore_reviews');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Remove any demonstration/example fake reviews
          const filtered = parsed.filter(
            (r: CustomerReview) => r && !['rev-1', 'rev-2', 'rev-3', 'rev-4'].includes(r.id)
          );
          return filtered;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return CUSTOMER_REVIEWS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('lavistore_reviews', JSON.stringify(reviews));
    } catch (e) {
      console.error(e);
    }
  }, [reviews]);

  // Admin Modals & Editing state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Interactive Product States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Cart State (Persisted in localStorage with quota-safe serializer)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('lavistore_cart');
      return deserializeCart(saved, products);
    } catch {
      return [];
    }
  });

  // Favorites State (Persisted in localStorage with quota-safe serializer)
  const [favorites, setFavorites] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('lavistore_favs');
      return deserializeFavorites(saved, products);
    } catch {
      return [PRODUCTS[0], PRODUCTS[3]].filter(Boolean);
    }
  });

  // Coupons State (Persisted in localStorage, managed by Admin)
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const saved = localStorage.getItem('lavistore_coupons');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasOldCoupons = parsed.some((c: Coupon) => c.code === 'LAVI10' || c.code === 'FLORZINHA');
          if (!hasOldCoupons) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.error('Error loading coupons from localStorage', e);
    }
    return DEFAULT_COUPONS;
  });

  // Coupons & Shipping (Melhor Envio)
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingOption | null>(null);
  const [destinationCep, setDestinationCep] = useState<string>('');

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedOrderData, setCompletedOrderData] = useState<any | null>(null);
  
  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Persist Coupons to localStorage
  useEffect(() => {
    safeSetItem('lavistore_coupons', JSON.stringify(coupons));
  }, [coupons]);

  // Persist Products to localStorage
  useEffect(() => {
    safeSetItem('lavistore_products', JSON.stringify(products));
  }, [products]);

  // Persist Admin Authentication status to localStorage
  useEffect(() => {
    safeSetItem('lavistore_admin_authenticated', isAdminAuthenticated.toString());
  }, [isAdminAuthenticated]);

  // Synchronize URL with Dedicated Admin Route (/admin) and Storefront
  useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (pathname === '/admin' || pathname.startsWith('/admin/') || hash === '#admin') {
        setActiveTab('admin');
      } else if (activeTab === 'admin') {
        setActiveTab('catalog');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Safe navigation helpers between Storefront and Admin area
  const navigateToAdmin = () => {
    try {
      if (window.location.pathname !== '/admin') {
        window.history.pushState({}, '', '/admin');
      }
    } catch {
      window.location.hash = 'admin';
    }
    setActiveTab('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToStorefront = (tab: ActiveTab = 'catalog') => {
    try {
      if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
        window.history.pushState({}, '', '/');
      }
    } catch {
      window.location.hash = '';
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Persist Cart with lightweight serialization to prevent quota exceeded errors
  useEffect(() => {
    safeSetItem('lavistore_cart', serializeCart(cartItems));
  }, [cartItems]);

  // Persist Favorites with lightweight serialization
  useEffect(() => {
    safeSetItem('lavistore_favs', serializeFavorites(favorites));
  }, [favorites]);

  // Persist Hero Banner Config
  useEffect(() => {
    safeSetItem('lavistore_hero_config', JSON.stringify(heroConfig));
  }, [heroConfig]);

  // Persist Categories to localStorage
  useEffect(() => {
    safeSetItem('lavistore_categories', JSON.stringify(categories));
  }, [categories]);

  // Persist Home Page Typography & Content Config
  useEffect(() => {
    safeSetItem('lavistore_home_page_config', JSON.stringify(homePageConfig));
  }, [homePageConfig]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sincronização persistente com o servidor para publicação oficial
  const handlePublishToServer = async (customPayload?: any, showFeedback = true): Promise<boolean> => {
    try {
      const payload = customPayload || {
        products,
        heroConfig,
        homePageConfig,
        categories,
        reviews,
        coupons
      };

      const res = await fetch('/api/store/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (showFeedback) {
          showToast('🌸 Todas as fotos, frases e produtos foram gravados no servidor com sucesso para publicação!');
        }
        return true;
      }
    } catch (err) {
      console.error('Erro ao sincronizar dados da loja:', err);
      if (showFeedback) {
        showToast('⚠️ Não foi possível sincronizar com o servidor no momento.');
      }
    }
    return false;
  };

  // Na inicialização da loja: carrega dados oficiais do servidor ou sincroniza edições locais
  useEffect(() => {
    const initStoreSync = async () => {
      try {
        let localProducts = localStorage.getItem('lavistore_products');
        let localHomeConfig = localStorage.getItem('lavistore_home_page_config');
        let localHeroConfig = localStorage.getItem('lavistore_hero_config');
        let localCategories = localStorage.getItem('lavistore_categories');
        let localReviews = localStorage.getItem('lavistore_reviews');
        let localCoupons = localStorage.getItem('lavistore_coupons');

        // Se o cache local continha os produtos de exemplo do template inicial, limpa para priorizar a loja real
        if (localProducts && (localProducts.includes('lav-01') || localProducts.includes('lav-02'))) {
          localStorage.removeItem('lavistore_products');
          localProducts = null;
        }
        if (localCategories && localCategories.includes('canetas-marcadores')) {
          localStorage.removeItem('lavistore_categories');
          localCategories = null;
        }
        if (localCoupons && (localCoupons.includes('LAVI10') || localCoupons.includes('FLORZINHA'))) {
          localStorage.removeItem('lavistore_coupons');
          localCoupons = null;
        }

        const hasLocalModifications = Boolean(localProducts || localHomeConfig || localHeroConfig || localCategories);

        const res = await fetch('/api/store/data');
        if (res.ok) {
          const json = await res.json();
          if (json?.hasCustomData && json?.data) {
            const d = json.data;
            if (!hasLocalModifications) {
              // Visitante novo ou cliente: carrega versão oficial gravada no servidor
              if (Array.isArray(d.products) && d.products.length > 0) setProducts(d.products);
              if (d.heroConfig) setHeroConfig(d.heroConfig);
              if (d.homePageConfig) setHomePageConfig(d.homePageConfig);
              if (Array.isArray(d.categories) && d.categories.length > 0) setCategories(d.categories);
              if (Array.isArray(d.reviews) && d.reviews.length > 0) setReviews(d.reviews);
              if (Array.isArray(d.coupons) && d.coupons.length > 0) setCoupons(d.coupons);
            }
          }
        }
      } catch (err) {
        console.warn('Store sync initialization notice:', err);
      }
    };

    initStoreSync();
  }, []);

  // CRUD Handlers for Administrator
  const handleSaveProduct = (productData: Product) => {
    setProducts(prev => {
      const existingIdx = prev.findIndex(p => p.id === productData.id);
      if (existingIdx >= 0) {
        // Update existing
        const updated = [...prev];
        updated[existingIdx] = productData;
        return updated;
      } else {
        // Insert new product at beginning of list
        return [productData, ...prev];
      }
    });

    // Also update any item in favorites or active view
    setFavorites(prev => prev.map(f => f.id === productData.id ? productData : f));
    if (selectedProduct && selectedProduct.id === productData.id) {
      setSelectedProduct(productData);
    }

    setIsCreatingProduct(false);
    setEditingProduct(null);
    showToast(`🌸 Mimo "${productData.name}" salvo com sucesso!`);
  };

  // Quick stock update handler for Administrator
  const handleQuickUpdateStock = (productId: string, newStock: number, sizeId?: string) => {
    setProducts(prev => {
      return prev.map(prod => {
        if (prod.id !== productId) return prod;

        if (sizeId && prod.sizes && prod.sizes.length > 0) {
          const updatedSizes = prod.sizes.map(s => {
            if (s.id === sizeId) {
              return { ...s, stock: Math.max(0, newStock) };
            }
            return s;
          });
          const autoSumStock = updatedSizes.reduce((acc, s) => acc + (Number(s.stock) || 0), 0);
          return {
            ...prod,
            sizes: updatedSizes,
            stock: autoSumStock
          };
        }

        const safeStock = Math.max(0, newStock);
        return {
          ...prod,
          stock: safeStock
        };
      });
    });
  };

  const handleDeleteProduct = (productId: string) => {
    const targetProduct = products.find(p => p.id === productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
    setFavorites(prev => prev.filter(p => p.id !== productId));
    setCartItems(prev => prev.filter(i => i.product.id !== productId));
    
    if (selectedProduct && selectedProduct.id === productId) {
      setSelectedProduct(null);
    }
    if (editingProduct && editingProduct.id === productId) {
      setEditingProduct(null);
      setIsCreatingProduct(false);
    }

    showToast(`🗑️ Mimo "${targetProduct?.name || productId}" excluído.`);
  };

  const handleDuplicateProduct = (product: Product) => {
    const duplicated: Product = {
      ...product,
      id: `${product.id}-copia-${Date.now().toString().slice(-4)}`,
      name: `${product.name} (Cópia)`,
      reviewCount: 0,
      rating: 5.0
    };
    setEditingProduct(duplicated);
    setIsCreatingProduct(false);
  };

  const handleResetProducts = () => {
    setProducts(PRODUCTS);
    showToast('Catálogo padrão original restaurado com sucesso! 🔄');
  };

  const handleImportProducts = (importedProducts: Product[]) => {
    setProducts(importedProducts);
    showToast(`Catálogo atualizado com ${importedProducts.length} produtos! 🎉`);
  };

  // Coupons Admin Handlers
  const handleUpdateCoupons = (newCoupons: Coupon[]) => {
    setCoupons(newCoupons);
    showToast(`Lista de cupons atualizada (${newCoupons.length} cupons)! 🎟️✨`);
  };

  const handleResetCoupons = () => {
    setCoupons(DEFAULT_COUPONS);
    showToast('Cupons restaurados para o padrão original da Lavistore! 🔄');
  };

  // Cart Handlers
  const handleAddToCart = (
    product: Product, 
    quantity = 1, 
    selectedColor?: string, 
    isGiftWrapped = false,
    selectedSize?: string,
    sizePrice?: number
  ) => {
    const hasSizes = Boolean(product.hasSizes && product.sizes && product.sizes.length > 0);
    const hasColors = Boolean(product.colors && product.colors.length > 0);

    // If options are required and missing, ensure customer selects them
    if ((hasSizes && !selectedSize) || (hasColors && !selectedColor)) {
      setSelectedProduct(product);
      return;
    }

    setCartItems(prev => {
      const existingIdx = prev.findIndex(
        item => item.product.id === product.id && 
                item.selectedColor === selectedColor &&
                item.selectedSize === selectedSize
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        if (isGiftWrapped) updated[existingIdx].isGiftWrapped = true;
        return updated;
      } else {
        return [...prev, { product, quantity, selectedColor, isGiftWrapped, selectedSize, sizePrice }];
      }
    });

    const sizeSuffix = selectedSize ? ` (Tam: ${selectedSize})` : '';
    showToast(`🌸 "${product.name.slice(0, 25)}${sizeSuffix}" adicionado à sua sacola!`);
  };

  const handleUpdateQuantity = (productId: string, quantity: number, color?: string, size?: string) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId, color, size);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.product.id === productId && item.selectedColor === color && item.selectedSize === size
          ? { ...item, quantity }
          : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string, color?: string, size?: string) => {
    setCartItems(prev =>
      prev.filter(item => !(item.product.id === productId && item.selectedColor === color && item.selectedSize === size))
    );
  };

  // Custom Kit Cart Handler
  const handleAddKitToCart = (customKitProduct: Product) => {
    handleAddToCart(customKitProduct, 1);
    setIsCartOpen(true);
  };

  // Favorites Handlers
  const handleToggleFavorite = (product: Product) => {
    const isFav = favorites.some(f => f.id === product.id);
    if (isFav) {
      setFavorites(prev => prev.filter(f => f.id !== product.id));
      showToast('Removido da sua lista de desejos.');
    } else {
      setFavorites(prev => [...prev, product]);
      showToast(`💖 "${product.name.slice(0, 25)}..." salvo nos favoritos!`);
    }
  };

  // Calculations
  const cartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);
  
  const rawCartSubtotal = cartItems.reduce((acc, item) => {
    const unitPrice = item.sizePrice ?? item.product.price;
    const itemCost = unitPrice * item.quantity;
    const wrapCost = item.isGiftWrapped ? 5.90 * item.quantity : 0;
    return acc + itemCost + wrapCost;
  }, 0);

  const couponEvaluation = useMemo(() => {
    return evaluateCoupon(appliedCoupon, rawCartSubtotal, selectedShippingOption?.price || 0, coupons);
  }, [appliedCoupon, rawCartSubtotal, selectedShippingOption, coupons]);

  const discountAmount = couponEvaluation.calculatedDiscount;

  // Filtered & Sorted Catalog
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Category Filter
    if (selectedCategory === 'floral-special') {
      list = list.filter(p => p.isFloralSpecial || p.category === 'floral-special');
    } else if (selectedCategory === 'papelaria') {
      list = list.filter(p => p.category === 'papelaria' || ['cadernos-planners', 'canetas-marcadores'].includes(p.category));
    } else if (selectedCategory === 'washi-adesivos') {
      list = list.filter(p => p.category === 'washi-adesivos' || p.category === 'acessorios-mimos');
    } else if (selectedCategory !== 'todos') {
      list = list.filter(p => p.category === selectedCategory);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.tag && p.tag.toLowerCase().includes(q))
      );
    }

    // Price Filter
    if (priceFilter === 'under50') {
      list = list.filter(p => p.price < 50);
    } else if (priceFilter === 'under100') {
      list = list.filter(p => p.price >= 50 && p.price <= 100);
    } else if (priceFilter === 'above100') {
      list = list.filter(p => p.price > 100);
    }

    // Sorting
    if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }, [products, selectedCategory, searchQuery, priceFilter, sortBy]);

  return (
    <div className="min-h-screen flex flex-col font-['Comfortaa'] lavistore-gradient-canvas text-slate-800 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-amber-950/95 backdrop-blur-md text-amber-100 px-5 py-3 rounded-2xl shadow-xl border-2 border-amber-400 text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Storefront Customer Header - Only shown on public pages, completely free of administrative controls */}
      {activeTab !== 'admin' && (
        <Header
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'admin') {
              navigateToAdmin();
            } else {
              navigateToStorefront(tab);
            }
          }}
          selectedCategory={selectedCategory}
          cartCount={cartCount}
          cartTotal={rawCartSubtotal - discountAmount}
          onOpenCart={() => setIsCartOpen(true)}
          favoritesCount={favorites.length}
          onOpenFavorites={() => setIsFavoritesOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectCategory={setSelectedCategory}
          products={products}
          onOpenProduct={setSelectedProduct}
          config={homePageConfig}
          onOpenReturnPolicy={() => setIsReturnPolicyOpen(true)}
        />
      )}

      {/* Main Content Areas based on Tab */}
      <main className="flex-1">
        
        {/* TAB: Dedicated Admin Area (Login-Protected or Dashboard) */}
        {activeTab === 'admin' && (
          <>
            {!isAdminAuthenticated ? (
              <AdminLogin
                onLoginSuccess={() => {
                  setIsAdminAuthenticated(true);
                  showToast('✨ Bem-vinda de volta à gerência da Lavistore!');
                }}
                onBackToStore={() => navigateToStorefront('catalog')}
              />
            ) : (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <AdminDashboard
                  products={products}
                  onAddProduct={() => {
                    setEditingProduct(null);
                    setIsCreatingProduct(true);
                  }}
                  onEditProduct={(prod) => {
                    setEditingProduct(prod);
                    setIsCreatingProduct(false);
                  }}
                  onDuplicateProduct={handleDuplicateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onResetProducts={handleResetProducts}
                  onImportProducts={handleImportProducts}
                  onQuickUpdateStock={handleQuickUpdateStock}
                  onExitAdmin={() => {
                    setIsAdminAuthenticated(false);
                    navigateToStorefront('catalog');
                    showToast('🔒 Sessão de gerência encerrada.');
                  }}
                  onViewProductLive={(prod) => {
                    setSelectedProduct(prod);
                    navigateToStorefront('catalog');
                  }}
                  heroConfig={heroConfig}
                  onUpdateHeroConfig={(newConfig) => {
                    setHeroConfig(newConfig);
                  }}
                  onResetHeroConfig={() => {
                    setHeroConfig({
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
                    showToast('Capa restaurada para o padrão!');
                  }}
                  homePageConfig={homePageConfig}
                  onUpdateHomePageConfig={(newCfg) => {
                    setHomePageConfig(newCfg);
                    showToast('✨ Textos da Página Inicial atualizados!');
                  }}
                  onResetHomePageConfig={() => {
                    setHomePageConfig(DEFAULT_HOME_PAGE_CONFIG);
                    showToast('🔄 Textos da Home restaurados para o padrão!');
                  }}
                  categories={categories}
                  onUpdateCategories={(newCats) => {
                    setCategories(newCats);
                    showToast('🏷️ Categorias e rodapé salvos com sucesso!');
                  }}
                  onResetCategories={() => {
                    setCategories(DEFAULT_CATEGORIES);
                    showToast('🔄 Categorias restauradas para o padrão!');
                  }}
                  reviews={reviews}
                  onUpdateReviews={(newRevs) => {
                    setReviews(newRevs);
                    showToast('⭐ Depoimentos atualizados com sucesso!');
                  }}
                  onResetReviews={() => {
                    setReviews(CUSTOMER_REVIEWS);
                    showToast('🔄 Depoimentos restaurados para o padrão original!');
                  }}
                  coupons={coupons}
                  onUpdateCoupons={handleUpdateCoupons}
                  onResetCoupons={handleResetCoupons}
                  onGoToStorefront={() => {
                    navigateToStorefront('catalog');
                  }}
                  onGoToAboutPage={() => {
                    navigateToStorefront('about');
                  }}
                  onPublishToServer={handlePublishToServer}
                />
              </div>
            )}
          </>
        )}

        {/* TAB: Catalog / Storefront */}
        {(activeTab === 'catalog' || activeTab === 'floral-special') && (
          <div className="space-y-10">
            {/* Hero Section */}
            <HeroBanner 
              setActiveTab={setActiveTab} 
              onSelectCategory={setSelectedCategory}
              heroImage={heroConfig.image}
              heroBadge={heroConfig.badge}
              heroTitle={heroConfig.title}
              heroSubtitle={heroConfig.subtitle}
              imageFit={heroConfig.imageFit}
              imageScale={heroConfig.imageScale}
              imagePosition={heroConfig.imagePosition}
              imagePositionX={heroConfig.imagePositionX}
              imagePositionY={heroConfig.imagePositionY}
              bannerHeight={heroConfig.bannerHeight}
              config={homePageConfig}
              isAdminEditing={false}
            />

            {/* Brand Perks Row */}
            <BrandPerks 
              config={homePageConfig}
              isAdminEditing={false}
            />

            {/* Catalog Section */}
            <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
              
              {/* Category Pills & Filters */}
              <CategoryPills
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                sortBy={sortBy}
                setSortBy={setSortBy}
                priceFilter={priceFilter}
                setPriceFilter={setPriceFilter}
              />

              {/* Section Title & Subtitle */}
              <div className="border-b border-amber-200/80 pb-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Flower2 className="w-5 h-5 text-amber-500 fill-amber-300 shrink-0" />
                    <h2 className={`font-['Mali'] text-purple-950 ${getFontSizeClass(homePageConfig.catalogTitle?.fontSize, '2xl')} ${getFontWeightClass(homePageConfig.catalogTitle?.isBold, true)}`}>
                      {selectedCategory === 'todos' 
                        ? (homePageConfig.catalogTitle?.text || 'Nossos Mimos Encantados ✨')
                        : (categories.find(c => c.id === selectedCategory)
                            ? `${categories.find(c => c.id === selectedCategory)?.icon} ${categories.find(c => c.id === selectedCategory)?.name}`
                            : 'Mimos Selecionados')}
                    </h2>
                    <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                      {filteredProducts.length} mimos
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {searchQuery && (
                      <p className="text-xs text-slate-500 font-medium">
                        Buscando por: <strong className="text-purple-950 font-bold">"{searchQuery}"</strong>
                      </p>
                    )}
                  </div>
                </div>

                {/* Catalog Subtitle */}
                {selectedCategory === 'todos' ? (
                  <p className={`font-['Comfortaa'] text-slate-600 ${getFontSizeClass(homePageConfig.catalogSubtitle?.fontSize, 'xs')} ${getFontWeightClass(homePageConfig.catalogSubtitle?.isBold, false)}`}>
                    {homePageConfig.catalogSubtitle?.text || 'Mimos artesanais e cheirinho doce que transformam pequenos momentos em pura magia.'}
                  </p>
                ) : (
                  categories.find(c => c.id === selectedCategory)?.description ? (
                    <p className="font-['Comfortaa'] text-slate-600 text-xs font-medium">
                      {categories.find(c => c.id === selectedCategory)?.description}
                    </p>
                  ) : null
                )}
              </div>

              {/* Products Grid */}
              {filteredProducts.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-md rounded-3xl border-2 border-amber-200 p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 mx-auto">
                    <Flower2 className="w-8 h-8 fill-amber-200" />
                  </div>
                  <h3 className="font-['Mali'] text-lg font-bold text-purple-950">
                    Nenhum mimo encontrado
                  </h3>
                  <p className="text-xs text-slate-600 font-['Comfortaa'] leading-relaxed">
                    Não encontramos produtos com os filtros selecionados. Que tal buscar outro termo ou limpar os filtros?
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory('todos');
                      setSearchQuery('');
                      setPriceFilter('all');
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-purple-950 font-bold rounded-2xl text-xs shadow-md hover:from-amber-500 hover:to-amber-600 transition-colors border border-amber-300"
                  >
                    Ver Todos os Produtos
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {filteredProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpenProduct={setSelectedProduct}
                      onAddToCart={(prod) => handleAddToCart(prod, 1)}
                      isFavorite={favorites.some(f => f.id === product.id)}
                      onToggleFavorite={handleToggleFavorite}
                      isAdminMode={false}
                    />
                  ))}
                </div>
              )}

              {/* Banner Call to Action for Custom Sacolinha Builder (Yellow Theme) */}
              <div className="mt-12 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-3xl p-6 sm:p-10 text-purple-950 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border-2 border-yellow-300">
                <div className="space-y-2 text-center md:text-left z-10 drop-shadow-xs flex-1">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <span className={`inline-flex items-center gap-1.5 bg-amber-900/10 px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs border border-amber-900/20 text-purple-950 ${getFontSizeClass(homePageConfig.promoBadge?.fontSize, 'xs')} ${getFontWeightClass(homePageConfig.promoBadge?.isBold, true)}`}>
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-800" />
                      <span>{homePageConfig.promoBadge?.text || 'Presenteie com Sacolinhas Amarelas ✨'}</span>
                    </span>
                  </div>

                  <h3 className={`font-['Mali'] text-purple-950 ${getFontSizeClass(homePageConfig.promoTitle?.fontSize, '2xl')} ${getFontWeightClass(homePageConfig.promoTitle?.isBold, true)}`}>
                    {homePageConfig.promoTitle?.text || 'Quer montar uma sacolinha de presente personalizada?'}
                  </h3>

                  <p className={`font-['Comfortaa'] text-purple-900 max-w-lg leading-relaxed ${getFontSizeClass(homePageConfig.promoDescription?.fontSize, 'xs')} ${getFontWeightClass(homePageConfig.promoDescription?.isBold, false)}`}>
                    {homePageConfig.promoDescription?.text || 'Nossas sacolinhas amarelas exclusivas com laço de cetim, mimos favoritos selecionados, cheirinho doce artesanal e dedicatória com 10% de desconto!'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 z-10">
                  <button
                    onClick={() => {
                      setActiveTab('kit-builder');
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                    className={`px-6 py-3.5 bg-purple-950 hover:bg-purple-900 text-yellow-300 rounded-2xl shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 border-2 border-yellow-400 ${getFontSizeClass(homePageConfig.promoButton?.fontSize, 'xs')} ${getFontWeightClass(homePageConfig.promoButton?.isBold, true)}`}
                  >
                    <ShoppingBag className="w-4 h-4 text-yellow-300" />
                    <span>{homePageConfig.promoButton?.text || 'Montar Sacolinha Agora'}</span>
                    <ArrowRight className="w-4 h-4 text-yellow-300" />
                  </button>
                </div>
              </div>

            </section>

            {/* Customer Reviews & Instagram Community Section */}
            {reviews && reviews.length > 0 && (
              <ReviewsSection 
                config={homePageConfig} 
                reviews={reviews} 
              />
            )}
          </div>
        )}

        {/* TAB: Custom Kit Builder */}
        {activeTab === 'kit-builder' && (
          <CustomKitBuilder
            products={products}
            onAddKitToCart={handleAddKitToCart}
          />
        )}

        {/* TAB: Dedication / Gift Card Generator */}
        {activeTab === 'card-generator' && (
          <GiftCardGenerator />
        )}

        {/* TAB: About Brand & Stories */}
        {activeTab === 'about' && (
          <div className="space-y-12 pb-12">
            {/* 1. Warm Hero Banner for Nossa História (Same tone & gradient as Homepage HeroBanner) */}
            <section className="relative overflow-hidden bg-gradient-to-r from-[#FDE8EB]/80 via-[#FFFBEB]/90 to-[#E0F2FE]/70 border-b border-amber-200/80 py-12 md:py-16 shadow-2xs">
              {/* Soft pastel ambient blurs identical to home page */}
              <div className="absolute top-0 left-0 -ml-20 -mt-20 w-80 h-80 rounded-full bg-rose-200/40 blur-3xl pointer-events-none" />
              <div className="absolute top-1/2 left-1/3 w-96 h-96 rounded-full bg-amber-200/35 blur-3xl pointer-events-none" />
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-sky-200/40 blur-3xl pointer-events-none" />

              <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center space-y-6">
                {/* Top Badge with 4-Color Palette Dots */}
                <div>
                  <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/95 border-2 border-amber-200 shadow-2xs text-purple-950 text-xs font-bold tracking-wide backdrop-blur-md">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] shadow-2xs" title="Céu Turquesa" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FB923C] shadow-2xs" title="Pêssego Quente" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FACC15] shadow-2xs" title="Amarelo Solar" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] shadow-2xs" title="Rosa Afeto" />
                    </div>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-300" />
                      <span>{homePageConfig.aboutHeroBadge || 'Nosso Propósito & Sonho'}</span>
                    </span>
                  </div>
                </div>

                {/* Logo Centerpiece */}
                <div className="flex justify-center">
                  <div className="p-3 sm:p-4 bg-white/90 backdrop-blur-md rounded-3xl border-2 border-amber-200 shadow-sm inline-block hover:scale-105 transition-transform">
                    <LavistoreLogo variant="stacked" size="lg" />
                  </div>
                </div>

                {/* Main Slogan & Mission */}
                <div className="space-y-4 max-w-3xl mx-auto">
                  <h1 className="font-['Mali'] text-3xl sm:text-4xl md:text-5xl font-bold text-purple-950 leading-tight">
                    {homePageConfig.aboutHeroTitle || 'A Lavistore nasce para fazer o mundo mais afetuoso, doce e colorido!'}
                  </h1>

                  {/* Inspirational Quote Box in Warm Amber & Cream */}
                  <div className="inline-block bg-white/95 backdrop-blur-md py-3.5 px-6 sm:px-8 rounded-2xl border-2 border-amber-200/90 shadow-2xs">
                    <p className="font-['Comfortaa'] text-base sm:text-lg text-purple-900 font-bold leading-relaxed">
                      "{homePageConfig.aboutQuote || homePageConfig.heroTitle?.text || 'Faça a diferença no dia de quem você ama, demonstre o seu carinho através dos nossos mimos!'}"
                    </p>
                  </div>

                  <p className="font-['Comfortaa'] text-sm sm:text-base text-slate-700 leading-relaxed max-w-2xl mx-auto font-medium">
                    {homePageConfig.aboutStoryText || 'Acreditamos que presentear é um ato de puro afeto. Cada detalhe da Lavistore — desde o traço desenhado à mão do nosso trio de florzinhas com centrinho amarelo ensolarado até o cheirinho doce borrifado nas caixas e sacolinhas amarelas — foi criado para espalhar sorrisos e momentos inesquecíveis!'}
                  </p>
                </div>
              </div>
            </section>

            {/* 2. Content Sections in Warm Neutral & Amber tones */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
              
              {/* Section Header: O Significado das 3 Florzinhas */}
              <div className="text-center space-y-2 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-2">
                  <Flower2 className="w-5 h-5 text-amber-500 fill-amber-300" />
                  <h2 className="font-['Mali'] text-2xl sm:text-3xl font-bold text-purple-950">
                    {homePageConfig.aboutFlowersSectionTitle || 'O Significado do Nosso Trio Floral'}
                  </h2>
                </div>
                <p className="font-['Comfortaa'] text-xs sm:text-sm text-slate-600 font-medium">
                  {homePageConfig.aboutFlowersSectionSubtitle || 'Inspiradas em traços livres de criança, cada florzinha traz uma energia especial de cuidado e carinho.'}
                </p>
              </div>

              {/* 3 Flowers Story Cards - In the exact warm sunny tone as Home Product Cards & BrandPerks */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                {/* 1. Violet Flower */}
                <div className="p-6 bg-white/90 backdrop-blur-md rounded-3xl border-2 border-amber-200/80 hover:border-amber-400 shadow-sm hover:shadow-xl transition-all space-y-3.5 relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-amber-50 border-2 border-amber-200 flex items-center justify-center shadow-2xs">
                      {/* Solar center flower icon */}
                      <span className="w-6 h-6 rounded-full bg-[#8B5CF6] border-2 border-amber-300 flex items-center justify-center text-white text-[10px] font-bold shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-[#FACC15]" />
                      </span>
                    </div>
                    <span className="bg-amber-100 text-purple-950 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-amber-200">
                      Flor 01
                    </span>
                  </div>

                  <div>
                    <h3 className="font-['Mali'] font-bold text-purple-950 text-xl">
                      {homePageConfig.aboutFlower1Title || 'Flor Violeta'}
                    </h3>
                    <p className="text-xs text-purple-800 font-bold uppercase tracking-wider">
                      {homePageConfig.aboutFlower1Subtitle || 'Criatividade & Calma'}
                    </p>
                  </div>

                  <p className="text-xs sm:text-[13px] text-slate-700 font-['Comfortaa'] leading-relaxed font-medium">
                    {homePageConfig.aboutFlower1Desc || 'Representa os momentos de imaginação, o foco sereno ao preencher um planner fofo e a liberdade para sonhar novos projetos com canetinhas coloridas.'}
                  </p>

                  <div className="pt-2.5 flex items-center justify-between text-[11px] text-purple-950 font-bold border-t border-amber-100">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] border border-amber-300" />
                      <span>Tom Lilás / Violeta</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">#8B5CF6</span>
                  </div>
                </div>

                {/* 2. Turquoise Flower */}
                <div className="p-6 bg-white/90 backdrop-blur-md rounded-3xl border-2 border-amber-200/80 hover:border-amber-400 shadow-sm hover:shadow-xl transition-all space-y-3.5 relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-100 to-amber-50 border-2 border-amber-200 flex items-center justify-center shadow-2xs">
                      {/* Solar center flower icon */}
                      <span className="w-6 h-6 rounded-full bg-[#06B6D4] border-2 border-amber-300 flex items-center justify-center text-white text-[10px] font-bold shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-[#FACC15]" />
                      </span>
                    </div>
                    <span className="bg-amber-100 text-cyan-950 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-amber-200">
                      Flor 02
                    </span>
                  </div>

                  <div>
                    <h3 className="font-['Mali'] font-bold text-purple-950 text-xl">
                      {homePageConfig.aboutFlower2Title || 'Flor Turquesa'}
                    </h3>
                    <p className="text-xs text-cyan-800 font-bold uppercase tracking-wider">
                      {homePageConfig.aboutFlower2Subtitle || 'Alegria & Frescor'}
                    </p>
                  </div>

                  <p className="text-xs sm:text-[13px] text-slate-700 font-['Comfortaa'] leading-relaxed font-medium">
                    {homePageConfig.aboutFlower2Desc || 'Traz a vitalidade dos dias ensolarados, o frescor de estrear um caderno novinho e o entusiasmo contagiante de trocar bilhetinhos de carinho.'}
                  </p>

                  <div className="pt-2.5 flex items-center justify-between text-[11px] text-purple-950 font-bold border-t border-amber-100">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] border border-amber-300" />
                      <span>Tom Turquesa Cyan</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">#06B6D4</span>
                  </div>
                </div>

                {/* 3. Pink Flower */}
                <div className="p-6 bg-white/90 backdrop-blur-md rounded-3xl border-2 border-amber-200/80 hover:border-amber-400 shadow-sm hover:shadow-xl transition-all space-y-3.5 relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-50 border-2 border-amber-200 flex items-center justify-center shadow-2xs">
                      {/* Solar center flower icon */}
                      <span className="w-6 h-6 rounded-full bg-[#F43F5E] border-2 border-amber-300 flex items-center justify-center text-white text-[10px] font-bold shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-[#FACC15]" />
                      </span>
                    </div>
                    <span className="bg-amber-100 text-rose-950 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-amber-200">
                      Flor 03
                    </span>
                  </div>

                  <div>
                    <h3 className="font-['Mali'] font-bold text-purple-950 text-xl">
                      {homePageConfig.aboutFlower3Title || 'Flor Rosa'}
                    </h3>
                    <p className="text-xs text-rose-800 font-bold uppercase tracking-wider">
                      {homePageConfig.aboutFlower3Subtitle || 'Afeto & Doçura'}
                    </p>
                  </div>

                  <p className="text-xs sm:text-[13px] text-slate-700 font-['Comfortaa'] leading-relaxed font-medium">
                    {homePageConfig.aboutFlower3Desc || 'Simboliza o amor colocado em cada laço de fita, a fragrância doce borrifada nas caixas e a sensação acolhedora de um abraço carinhoso.'}
                  </p>

                  <div className="pt-2.5 flex items-center justify-between text-[11px] text-purple-950 font-bold border-t border-amber-100">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] border border-amber-300" />
                      <span>Tom Rosa Candy</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">#F43F5E</span>
                  </div>
                </div>
              </div>

              {/* 3. Golden Yellow Feature Banner (Exact same golden tone as Homepage Sacolinhas CTA) */}
              <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-3xl p-6 sm:p-10 text-purple-950 shadow-xl border-2 border-yellow-300 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="p-3.5 bg-white/95 rounded-3xl border-2 border-yellow-300 shadow-md shrink-0 flex items-center justify-center">
                  <TrioFlowersIcon size={64} />
                </div>
                <div className="space-y-2 text-center md:text-left flex-1">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-purple-950/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-purple-950 border border-purple-950/20">
                      <Sun className="w-3.5 h-3.5 text-amber-900" />
                      <span>{homePageConfig.aboutSolarBadge || 'O Miolo Amarelo Solar ☀️'}</span>
                    </span>
                  </div>
                  <h3 className="font-['Mali'] text-2xl sm:text-3xl font-bold text-purple-950">
                    {homePageConfig.aboutSolarTitle || 'Traços Infantis Feitos com Amor & Energia Solar'}
                  </h3>
                  <p className="font-['Comfortaa'] text-xs sm:text-sm text-purple-900 leading-relaxed max-w-2xl font-medium">
                    {homePageConfig.aboutSolarDesc || 'O estilo de desenho de criança com sorrisinhos meigos e o miolo amarelo brilhante celebram a pureza, a imaginação e a alegria genuína. Cada sacolinha amarela carrega esse raio de sol até você!'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('catalog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-6 py-3.5 bg-purple-950 hover:bg-purple-900 text-yellow-300 rounded-2xl shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 border-2 border-yellow-400 text-xs font-bold shrink-0 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-yellow-300" />
                  <span>{homePageConfig.aboutSolarBtn || 'Conhecer Nossos Mimos'}</span>
                </button>
              </div>

              {/* 4. Pillars of Affection - Styled in the exact same format as Home Page BrandPerks */}
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="font-['Mali'] text-xl sm:text-2xl font-bold text-purple-950">
                    {homePageConfig.aboutPillarsTitle || 'Nossos 4 Toques de Afeto em Cada Envio'}
                  </h3>
                  <p className="text-xs text-slate-600 font-['Comfortaa']">
                    {homePageConfig.aboutPillarsSubtitle || 'Detalhes pensados com carinho para encantar todos os sentidos'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="p-5 bg-white/90 backdrop-blur-md rounded-3xl border-2 border-amber-200/80 shadow-sm hover:shadow-xl hover:border-amber-400 transition-all space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100/90 text-amber-900 border border-amber-300 flex items-center justify-center font-bold text-base shadow-2xs">
                      {homePageConfig.aboutPillar1Icon || '🍯'}
                    </div>
                    <h4 className="font-['Mali'] font-bold text-purple-950 text-base">
                      {homePageConfig.aboutPillar1Title || 'Cheirinho Artesanal'}
                    </h4>
                    <p className="text-xs text-slate-600 font-['Comfortaa'] leading-relaxed font-medium">
                      {homePageConfig.aboutPillar1Desc || 'Fragrância suave e doce com notas de baunilha e lavanda borrifada com carinho antes do envio.'}
                    </p>
                  </div>

                  <div className="p-5 bg-white/90 backdrop-blur-md rounded-3xl border-2 border-amber-200/80 shadow-sm hover:shadow-xl hover:border-amber-400 transition-all space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-yellow-100/90 text-yellow-900 border border-yellow-300 flex items-center justify-center font-bold text-base shadow-2xs">
                      {homePageConfig.aboutPillar2Icon || '🎀'}
                    </div>
                    <h4 className="font-['Mali'] font-bold text-purple-950 text-base">
                      {homePageConfig.aboutPillar2Title || 'Sacolinhas Amarelas'}
                    </h4>
                    <p className="text-xs text-slate-600 font-['Comfortaa'] leading-relaxed font-medium">
                      {homePageConfig.aboutPillar2Desc || 'Nossa embalagem amarela ensolarada com laço de cetim nobre, pronta para encantar antes mesmo de abrir.'}
                    </p>
                  </div>

                  <div className="p-5 bg-white/90 backdrop-blur-md rounded-3xl border-2 border-amber-200/80 shadow-sm hover:shadow-xl hover:border-amber-400 transition-all space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-rose-100/90 text-rose-900 border border-rose-300 flex items-center justify-center font-bold text-base shadow-2xs">
                      {homePageConfig.aboutPillar3Icon || '💌'}
                    </div>
                    <h4 className="font-['Mali'] font-bold text-purple-950 text-base">
                      {homePageConfig.aboutPillar3Title || 'Dedicatórias'}
                    </h4>
                    <p className="text-xs text-slate-600 font-['Comfortaa'] leading-relaxed font-medium">
                      {homePageConfig.aboutPillar3Desc || 'Cartinhas afetivas e bilhetinhos personalizados para emocionar e marcar memórias para sempre.'}
                    </p>
                  </div>

                  <div className="p-5 bg-white/90 backdrop-blur-md rounded-3xl border-2 border-amber-200/80 shadow-sm hover:shadow-xl hover:border-amber-400 transition-all space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-100/90 text-cyan-900 border border-cyan-300 flex items-center justify-center font-bold text-base shadow-2xs">
                      {homePageConfig.aboutPillar4Icon || '🌸'}
                    </div>
                    <h4 className="font-['Mali'] font-bold text-purple-950 text-base">
                      {homePageConfig.aboutPillar4Title || 'Surpresas Florais'}
                    </h4>
                    <p className="text-xs text-slate-600 font-['Comfortaa'] leading-relaxed font-medium">
                      {homePageConfig.aboutPillar4Desc || 'Adesivos colecionáveis das 3 florzinhas, marcadores de página e mimos extras em cada pedido.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Return to Catalog Call to Action */}
              <div className="bg-white/95 backdrop-blur-md rounded-3xl border-2 border-amber-200 p-8 sm:p-10 shadow-lg text-center space-y-4 max-w-2xl mx-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-300" />
                  {homePageConfig.aboutCtaBadge || 'Pronta para Encantar?'}
                </span>
                <h3 className="font-['Mali'] text-2xl sm:text-3xl font-bold text-purple-950">
                  {homePageConfig.aboutCtaTitle || 'Venha conhecer nossos mimos e presentes'}
                </h3>
                <p className="font-['Comfortaa'] text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto font-medium">
                  {homePageConfig.aboutCtaDesc || 'Navegue pela nossa vitrine de papelaria fofa, monte sacolinhas personalizadas e espalhe sorrisos por onde passar!'}
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setActiveTab('catalog');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-6 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all transform hover:scale-105 active:scale-95 border border-amber-300 flex items-center gap-2 cursor-pointer"
                  >
                    <Flower2 className="w-4 h-4 text-purple-950 fill-amber-300" />
                    <span>{homePageConfig.aboutCtaBtnPrimary || 'Ver Todos os Mimos no Catálogo'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('kit-builder');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-5 py-3.5 bg-white hover:bg-amber-50 text-purple-950 font-bold rounded-2xl text-xs sm:text-sm border-2 border-amber-200 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Gift className="w-4 h-4 text-amber-600" />
                    <span>{homePageConfig.aboutCtaBtnSecondary || 'Montar Sacolinha de Presente'}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Brand Perks Row identical to Home page */}
            <BrandPerks 
              config={homePageConfig}
              isAdminEditing={false}
            />
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          isFavorite={favorites.some(f => f.id === selectedProduct.id)}
          onToggleFavorite={handleToggleFavorite}
          isAdminMode={false}
          onOpenReturnPolicy={() => setIsReturnPolicyOpen(true)}
        />
      )}

      {/* Admin Product Editor / Creator Modal */}
      <AdminProductModal
        isOpen={isCreatingProduct || editingProduct !== null}
        productToEdit={editingProduct}
        onClose={() => {
          setEditingProduct(null);
          setIsCreatingProduct(false);
        }}
        onSaveProduct={handleSaveProduct}
        onDeleteProduct={handleDeleteProduct}
        categories={categories}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        appliedCoupon={appliedCoupon}
        setAppliedCoupon={setAppliedCoupon}
        discountAmount={discountAmount}
        selectedShippingOption={selectedShippingOption}
        setSelectedShippingOption={setSelectedShippingOption}
        destinationCep={destinationCep}
        setDestinationCep={setDestinationCep}
        availableCoupons={coupons}
      />

      {/* Favorites Drawer */}
      <FavoritesDrawer
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favorites}
        onRemoveFavorite={handleToggleFavorite}
        onAddToCart={(prod) => {
          handleAddToCart(prod, 1);
          setIsCartOpen(true);
        }}
        onOpenProduct={setSelectedProduct}
      />

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          items={cartItems}
          subtotal={rawCartSubtotal}
          discountAmount={discountAmount}
          appliedCoupon={appliedCoupon}
          setAppliedCoupon={setAppliedCoupon}
          selectedShippingOption={selectedShippingOption}
          setSelectedShippingOption={setSelectedShippingOption}
          destinationCep={destinationCep}
          setDestinationCep={setDestinationCep}
          availableCoupons={coupons}
          homePageConfig={homePageConfig}
          onOpenReturnPolicy={() => setIsReturnPolicyOpen(true)}
          onOrderSuccess={(orderData) => {
            setIsCheckoutOpen(false);

            // Disparar notificação automática para o backend (E-mail e registro)
            try {
              fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
              })
                .then(res => res.json())
                .then(resData => {
                  console.log('✅ Pedido transmitido ao backend com sucesso:', resData);
                })
                .catch(err => {
                  console.warn('⚠️ Backend offline ou resposta simulada para e-mail:', err);
                });
            } catch (networkErr) {
              console.warn('Erro ao disparar requisição de pedido:', networkErr);
            }

            // Automatically deduct purchased quantities from stock balance
            setProducts(prevProducts => {
              return prevProducts.map(prod => {
                const matchingOrderItems = (orderData.items as CartItem[]).filter(
                  item => item.product.id === prod.id
                );
                if (matchingOrderItems.length === 0) return prod;

                let updatedProduct = { ...prod };

                // If product has size variants
                if (updatedProduct.hasSizes && updatedProduct.sizes && updatedProduct.sizes.length > 0) {
                  const updatedSizes = updatedProduct.sizes.map(sizeVar => {
                    const itemsForThisSize = matchingOrderItems.filter(
                      item => item.selectedSize === sizeVar.label || item.selectedSize === sizeVar.id
                    );
                    const qtyBoughtForSize = itemsForThisSize.reduce((acc, item) => acc + item.quantity, 0);
                    if (qtyBoughtForSize > 0) {
                      return {
                        ...sizeVar,
                        stock: Math.max(0, (sizeVar.stock || 0) - qtyBoughtForSize)
                      };
                    }
                    return sizeVar;
                  });

                  const newTotalStock = updatedSizes.reduce((acc, s) => acc + (Number(s.stock) || 0), 0);
                  updatedProduct = {
                    ...updatedProduct,
                    sizes: updatedSizes,
                    stock: newTotalStock
                  };
                } else {
                  // Product without size variants
                  const totalQtyBought = matchingOrderItems.reduce((acc, item) => acc + item.quantity, 0);
                  updatedProduct = {
                    ...updatedProduct,
                    stock: Math.max(0, (updatedProduct.stock || 0) - totalQtyBought)
                  };
                }

                return updatedProduct;
              });
            });

            setCartItems([]);
            setCompletedOrderData(orderData);
            showToast('🛍️ Pedido confirmado! E-mail e notificações de venda geradas.');
          }}
        />
      )}

      {/* Order Success Modal */}
      {completedOrderData && (
        <OrderSuccessModal
          orderData={completedOrderData}
          homePageConfig={homePageConfig}
          onClose={() => setCompletedOrderData(null)}
        />
      )}

      {/* Storefront Customer Extras (WhatsApp Concierge & Footer) - Hidden in dedicated admin view */}
      {activeTab !== 'admin' && (
        <>
          {/* Floating Concierge WhatsApp */}
          <FloatingWhatsApp config={homePageConfig} />

          {/* Main Footer with discrete management access */}
          <Footer 
            config={homePageConfig}
            categories={categories}
            isAdminEditing={false}
            onSelectCategory={(catId) => {
              setSelectedCategory(catId);
              setActiveTab('catalog');
            }}
            onNavigateToAdmin={navigateToAdmin}
            onOpenReturnPolicy={() => setIsReturnPolicyOpen(true)}
          />
        </>
      )}

      {/* Category Editor & Footer Customization Modal */}
      <CategoryEditorModal
        isOpen={isCategoryEditorOpen}
        categories={categories}
        products={products}
        onClose={() => setIsCategoryEditorOpen(false)}
        onSave={(newCategories) => {
          setCategories(newCategories);
          showToast('🏷️ Categorias salvas e atualizadas no rodapé com sucesso!');
        }}
        onResetToDefault={() => {
          setCategories(DEFAULT_CATEGORIES);
          showToast('🔄 Categorias restauradas para o padrão!');
        }}
      />

      {/* Simplified Return & Exchange Policy Modal (CDC compliant) */}
      <ReturnPolicyModal
        isOpen={isReturnPolicyOpen}
        onClose={() => setIsReturnPolicyOpen(false)}
        config={homePageConfig}
      />

      {/* Home Page Content / Typography Editor Modal */}
      {activeEditingField && (
        <HomeTextEditorModal
          isOpen={activeEditingField !== null}
          fieldKey={activeEditingField.fieldKey}
          fieldLabel={activeEditingField.label}
          currentValue={homePageConfig[activeEditingField.fieldKey] || { text: '', fontSize: 'base', isBold: false }}
          onClose={() => setActiveEditingField(null)}
          onSave={(fKey, updated) => {
            setHomePageConfig(prev => ({
              ...prev,
              [fKey]: updated
            }));
            showToast(`✏️ Campo "${activeEditingField?.label}" atualizado com sucesso!`);
          }}
        />
      )}

    </div>
  );
}
