export interface ProductSizeVariant {
  id: string;
  label: string; // e.g. "P", "M", "G", "34-36", "Único", "15x21cm"
  stock: number;
  initialStock?: number;
  price?: number; // Custom price for this size, if different from product base price
  unitCost?: number; // Custom unit cost for this size
}

export interface ProductColorVariant {
  id?: string;
  name: string; // Descrição/nome da cor ou estampa (ex: "Rosa Bebê", "Lilás Lavanda", "Floral Vintage")
  imageUrl?: string; // Imagem/foto da cor ou textura da estampa
  hex?: string; // Código hexadecimal da cor (ex: "#F472B6")
  bgClass?: string;
  stock?: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  images: string[];
  description: string;
  features: string[];
  isNew?: boolean;
  isBestseller?: boolean;
  isFloralSpecial?: boolean;
  stock: number;
  hasColors?: boolean;
  colors?: ProductColorVariant[];
  tag?: string;
  dimensions?: string;
  weight?: number; // Peso em kg (ex: 0.3)
  width?: number;  // Largura em cm (ex: 16)
  height?: number; // Altura em cm (ex: 10)
  length?: number; // Comprimento em cm (ex: 20)
  imageFit?: 'cover' | 'contain';
  imagePosition?: 'center' | 'top' | 'bottom';
  imageScale?: number;
  // Size & Variant Management
  hasSizes?: boolean;
  sizePricingMode?: 'same' | 'custom';
  sizes?: ProductSizeVariant[];
  // Smart Pricing & Cost Fields (Admin Only)
  initialStock?: number;
  acquisitionCostTotal?: number;
  unitCost?: number;
  pricingMode?: 'markup' | 'manual';
  markupPercent?: number;
  grossProfit?: number;
  grossMarginPercent?: number;

  // Vitrine Integration & Inventory Sync
  biRecordId?: string; // ID correspondente na tabela de estoque/BI
  originTamCor?: string;
  isPublished?: boolean; // Ativo na vitrine para compra pelos clientes (padrão true)
  autoHideWhenOutOfStock?: boolean; // Ocultar automaticamente da vitrine se o saldo zerar
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  sizePrice?: number;
  isGiftWrapped?: boolean;
  customMessage?: string;
}

export interface FormattedText {
  text: string;
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  isBold?: boolean;
}

export interface HomePageConfig {
  // Top Announcement Bar
  announcementText?: string;
  announcementCoupon?: string;
  showAnnouncement?: boolean;

  // Hero section
  heroBadge: FormattedText;
  heroTitle: FormattedText;
  heroSubtitle: FormattedText;
  heroBtnPrimary: FormattedText;
  heroBtnSecondary: FormattedText;
  heroTrust1: FormattedText;
  heroTrust2: FormattedText;
  heroTrust3: FormattedText;

  // Brand perks
  perk1Icon?: string;
  perk1Title: FormattedText;
  perk1Desc: FormattedText;
  perk2Icon?: string;
  perk2Title: FormattedText;
  perk2Desc: FormattedText;
  perk3Icon?: string;
  perk3Title: FormattedText;
  perk3Desc: FormattedText;
  perk4Icon?: string;
  perk4Title: FormattedText;
  perk4Desc: FormattedText;

  // Catalog section
  catalogTitle: FormattedText;
  catalogSubtitle: FormattedText;

  // Custom Sacolinha Promo Banner
  promoBadge: FormattedText;
  promoTitle: FormattedText;
  promoDescription: FormattedText;
  promoButton: FormattedText;

  // Reviews section
  reviewsBadge: FormattedText;
  reviewsTitle: FormattedText;
  reviewsSubtitle: FormattedText;
  reviewsRatingSummary?: string;

  // Newsletter & Footer
  newsletterBadge?: FormattedText;
  newsletterTitle: FormattedText;
  newsletterSubtitle?: FormattedText;
  newsletterDesc?: FormattedText;
  footerDescription?: string;
  companyLegalText?: string;
  sslSecurityText?: string;
  pixDiscountText?: string;
  installmentText?: string;
  securityFooterNote?: string;

  // Contact info
  whatsappNumber?: string;
  contactEmail?: string;
  orderNotificationEmail?: string;
  pagSeguroPaymentUrl?: string;
  businessHours?: string;
  responseTime?: string;
  instagramHandle?: string;
  instagramUrl?: string;

  // Floating WhatsApp Chat
  chatConciergeName?: string;
  chatConciergeRole?: string;
  chatWelcomeTitle?: string;
  chatWelcomeBody?: string;
  chatButtonLabel?: string;

  // About page ("Sobre Nós")
  aboutHeroSlogan?: string;
  aboutHeroQuote?: string;
  aboutHeroDescription?: string;
  aboutTrioTitle?: string;
  aboutTrioSubtitle?: string;
  aboutFlower1Title?: string;
  aboutFlower1Subtitle?: string;
  aboutFlower1Desc?: string;
  aboutFlower2Title?: string;
  aboutFlower2Subtitle?: string;
  aboutFlower2Desc?: string;
  aboutFlower3Title?: string;
  aboutFlower3Subtitle?: string;
  aboutFlower3Desc?: string;
  aboutSolarTag?: string;
  aboutSolarTitle?: string;
  aboutSolarDesc?: string;
  aboutSolarBtnText?: string;
  aboutPillarsTitle?: string;
  aboutPillarsSubtitle?: string;
  aboutPillar1Icon?: string;
  aboutPillar1Title?: string;
  aboutPillar1Desc?: string;
  aboutPillar2Icon?: string;
  aboutPillar2Title?: string;
  aboutPillar2Desc?: string;
  aboutPillar3Icon?: string;
  aboutPillar3Title?: string;
  aboutPillar3Desc?: string;
  aboutPillar4Icon?: string;
  aboutPillar4Title?: string;
  aboutPillar4Desc?: string;
  aboutCtaBadge?: string;
  aboutCtaTitle?: string;
  aboutCtaDesc?: string;
  aboutCtaBtn1?: string;
  aboutCtaBtn2?: string;
}

export interface CustomKitSelection {
  boxType: {
    id: string;
    name: string;
    price: number;
    image: string;
    color: string;
  };
  bagType?: {
    id: string;
    name: string;
    price: number;
    image: string;
    color: string;
  };
  items: Product[];
  ribbon: {
    id: string;
    name: string;
    color: string;
  };
  card: {
    theme: string;
    recipient: string;
    sender: string;
    message: string;
  };
}

export interface HeroConfig {
  image: string;
  badge: string;
  title: string;
  subtitle: string;
  imageFit?: 'cover' | 'contain';
  imageScale?: number;
  imagePosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  imagePositionX?: number;
  imagePositionY?: number;
  bannerHeight?: 'compact' | 'medium' | 'large';
}

export interface PriceFilterRange {
  id: string;
  label: string;
  minPrice: number;
  maxPrice: number | null; // null means unbounded (above minPrice)
  enabled: boolean;
  colorTheme?: 'rose' | 'amber' | 'orange' | 'cyan' | 'purple' | 'emerald';
}

export interface FilterBarConfig {
  showPriceFilter: boolean;
  priceFilterTitle: string;
  priceRanges: PriceFilterRange[];
  showSortFilter: boolean;
  sortFilterTitle: string;
  enabledSortOptions: {
    featured: boolean;
    rating: boolean;
    priceAsc: boolean;
    priceDesc: boolean;
    nameAsc: boolean;
  };
}

export interface CustomerReview {
  id: string;
  author: string;
  city: string;
  rating: number;
  date: string;
  comment: string;
  productName: string;
  verified: boolean;
  avatar: string;
  photo?: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  deadline: string;
  deliveryDays?: number;
  carrier: string;
  carrierLogo?: string;
  companyName?: string;
  error?: string | null;
}

export type CouponType = 'percentage' | 'fixed' | 'free_shipping' | 'gift';

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: CouponType;
  discountValue: number; // Porcentagem, valor fixo, 0 para frete grátis ou brinde
  minOrderValue?: number; // Valor mínimo de pedido (opcional)
  isActive: boolean;
  timesUsed?: number;
  createdAt?: string;
}

export interface CouponEvaluation {
  code: string;
  isValid: boolean;
  isFreeShipping: boolean;
  isGift?: boolean;
  discountPercentage?: number;
  discountFixed?: number;
  calculatedDiscount: number;
  message: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  badge?: string;
  showInFooter?: boolean;
  showInFilter?: boolean;
  showInHeader?: boolean;
  color?: string;
}

export type ActiveTab = 
  | 'catalog'
  | 'kit-builder'
  | 'card-generator'
  | 'floral-collection'
  | 'about'
  | 'admin';

export interface OrderData {
  orderId: string;
  date: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf?: string;
  address: string;
  paymentMethod: string;
  shippingMethod: string;
  shippingDeadline?: string;
  shippingCost: number;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  couponApplied?: string | null;
  isFreeShippingApplied?: boolean;
  total: number;
  hidePrices?: boolean;
  pagSeguroUrl?: string;
  notes?: string;
  // Mercado Pago Checkout Transparente
  mercadoPagoPaymentId?: string;
  mercadoPagoStatus?: string;
  mercadoPagoStatusDetail?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  pixTicketUrl?: string;
  cardBrand?: string;
  cardLastFourDigits?: string;
  cardInstallments?: number;
}

export interface BiProductRowRaw {
  ano: number | string;
  mes: string;
  produto: string;
  tamCor: string;
  descricao: string;
  quantidadeComprada: number;
  custoTotal: number;
  precoVenda: number;
  quantidadeVendida: number;
  publishedToVitrine?: boolean;
  vitrineProductId?: string;
  autoHideWhenOutOfStock?: boolean;
  vitrineImageUrl?: string;
  vitrineCategory?: string;
  vitrineTag?: string;
}

export interface BiProductCalculatedRecord {
  id: string;
  ano: number;
  mes: string;
  produto: string;
  tamCor: string;
  descricao: string;
  quantidadeComprada: number;
  custoTotal: number;
  precoVenda: number;
  quantidadeVendida: number;
  
  // Indicadores calculados pelo motor de BI Financeiro
  custoUnitario: number; // Custo Total / Quantidade Comprada
  vendaTotal: number; // Faturamento = Quantidade Vendida * Preço de Venda
  custoVenda: number; // CPV = Quantidade Vendida * Custo Unitário
  lucroBruto: number; // Venda Total - Custo da Venda
  saldoEstoqueQtd: number; // Quantidade Comprada - Quantidade Vendida
  custoEstoque: number; // Capital Imobilizado = Saldo em Estoque * Custo Unitário
  margemLucro: number; // Margem Real (%) = (Lucro Bruto / Venda Total) * 100
  markupReal: number; // Mark-up Real (%)
  faturamentoPlanejado: number; // Quantidade Comprada * Preço de Venda
  lucroPlanejado: number; // Faturamento Planejado - Custo Total
  margemPlanejada: number; // Margem Planejada (%)
  atingimentoMeta: number; // Atingimento da Meta (%) = (Venda Total / Faturamento Planejado) * 100
  rentabilidade: number; // Rentabilidade (%) = (Lucro Bruto / Custo Total) * 100
  statusEstoque: 'ok' | 'baixo' | 'esgotado' | 'negativo';

  // Integração com a Vitrine do E-commerce
  publishedToVitrine?: boolean;
  vitrineProductId?: string;
  autoHideWhenOutOfStock?: boolean;
  vitrineImageUrl?: string;
  vitrineCategory?: string;
  vitrineTag?: string;
}

export interface BiConsolidatedKpis {
  faturamentoTotal: number;
  custoTotalCompras: number;
  cpvTotal: number;
  lucroBrutoTotal: number;
  valorTotalEstoque: number;
  saldoTotalEstoqueQtd: number;
  totalCompradoQtd: number;
  totalVendidoQtd: number;
  margemLucroMedia: number;
  faturamentoPlanejadoTotal: number;
  atingimentoGlobal: number;
}
