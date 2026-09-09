import { FormattedText, HomePageConfig } from '../types';
import storeState from '../data/store_state.json';

export const getFontSizeClass = (
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl',
  fallback: string = 'text-base'
): string => {
  switch (fontSize) {
    case 'xs':
      return 'text-xs';
    case 'sm':
      return 'text-sm';
    case 'base':
      return 'text-base';
    case 'lg':
      return 'text-lg';
    case 'xl':
      return 'text-xl';
    case '2xl':
      return 'text-2xl';
    case '3xl':
      return 'text-3xl';
    case '4xl':
      return 'text-4xl';
    case '5xl':
      return 'text-5xl';
    default:
      return fallback;
  }
};

export const getFontWeightClass = (isBold?: boolean, defaultBold: boolean = false): string => {
  if (typeof isBold === 'boolean') {
    return isBold ? 'font-bold' : 'font-normal';
  }
  return defaultBold ? 'font-bold' : 'font-normal';
};

export const DEFAULT_HOME_PAGE_CONFIG: HomePageConfig = {
  // Top Announcement Bar
  announcementText: 'Frete Grátis para todo o Brasil • Cupom 10% OFF: ',
  announcementCoupon: 'LAVI10',
  showAnnouncement: true,

  // Hero section
  heroBadge: {
    text: 'Presentes & Mimos Criativos 🌸',
    fontSize: 'xs',
    isBold: true
  },
  heroTitle: {
    text: 'Demonstre seu carinho com nossos mimos!',
    fontSize: '4xl',
    isBold: true
  },
  heroSubtitle: {
    text: 'A Lavistore nasce da vontade de transformar pequenos momentos em pura alegria! Presentes criativos, cheirinho doce artesanal e papelaria fofa com acabamento impecável.',
    fontSize: 'base',
    isBold: false
  },
  heroBtnPrimary: {
    text: 'Explorar nossos produtos',
    fontSize: 'sm',
    isBold: true
  },
  heroBtnSecondary: {
    text: 'Monte sua Sacolinha de Presente',
    fontSize: 'sm',
    isBold: true
  },
  heroTrust1: {
    text: 'Embalagens Exclusivas',
    fontSize: 'xs',
    isBold: true
  },
  heroTrust2: {
    text: 'Feito com Amor',
    fontSize: 'xs',
    isBold: true
  },
  heroTrust3: {
    text: 'Carinho em cada mimo!',
    fontSize: 'xs',
    isBold: true
  },

  // Brand perks
  perk1Icon: '🛍️',
  perk1Title: {
    text: 'Mimos Florais em Cada Sacolinha Amarela',
    fontSize: 'base',
    isBold: true
  },
  perk1Desc: {
    text: 'Você sempre ganha adesivos das 3 florzinhas, marcadores fofos e mini surpresas.',
    fontSize: 'xs',
    isBold: false
  },
  perk2Icon: '🍯',
  perk2Title: {
    text: 'Cheirinho Floral & Doce',
    fontSize: 'base',
    isBold: true
  },
  perk2Desc: {
    text: 'Cada sacolinha amarela é borrifada artesanalmente com nossa fragrância suave de lavanda e baunilha.',
    fontSize: 'xs',
    isBold: false
  },
  perk3Icon: '🚚',
  perk3Title: {
    text: 'Frete Grátis Especial',
    fontSize: 'base',
    isBold: true
  },
  perk3Desc: {
    text: 'Envio gratuito para todo o Brasil em compras a partir de R$ 149 com rastreamento detalhado.',
    fontSize: 'xs',
    isBold: false
  },
  perk4Icon: '🌸',
  perk4Title: {
    text: 'Feito com Amor & Afeto',
    fontSize: 'base',
    isBold: true
  },
  perk4Desc: {
    text: 'Produtos de papelaria selecionados a dedo com gramatura nobre e sacolinhas amarelas exclusivas.',
    fontSize: 'xs',
    isBold: false
  },

  // Catalog
  catalogTitle: {
    text: 'Nossos Mimos Encantados ✨',
    fontSize: '2xl',
    isBold: true
  },
  catalogSubtitle: {
    text: 'Encontre os mimos perfeitos com estoque atualizado em tempo real.',
    fontSize: 'sm',
    isBold: false
  },

  // Custom Sacolinha Promo Banner
  promoBadge: {
    text: 'Presenteie com Criatividade',
    fontSize: 'xs',
    isBold: true
  },
  promoTitle: {
    text: 'Quer montar uma sacolinha de presente personalizada?',
    fontSize: '3xl',
    isBold: true
  },
  promoDescription: {
    text: 'Escolha a sacolinha amarela exclusiva, selecione os mimos favoritos, adicione uma dedicatória e ganhe 10% de desconto no combo!',
    fontSize: 'sm',
    isBold: false
  },
  promoButton: {
    text: 'Montar Sacolinha Agora',
    fontSize: 'sm',
    isBold: true
  },

  // Reviews
  reviewsBadge: {
    text: 'Clientes Encantadas',
    fontSize: 'xs',
    isBold: true
  },
  reviewsTitle: {
    text: 'O que dizem sobre nossas sacolinhas & mimos',
    fontSize: '3xl',
    isBold: true
  },
  reviewsSubtitle: {
    text: 'Mais de 1.200 pedidos entregues com amor, papel de seda e o cheirinho inesquecível da Lavistore.',
    fontSize: 'base',
    isBold: false
  },
  reviewsRatingSummary: '4.9 / 5.0 (Mais de 1.800 avaliações 5 estrelas)',

  // Newsletter & Footer
  newsletterBadge: {
    text: 'Clube de Mimos Lavistore',
    fontSize: 'xs',
    isBold: true
  },
  newsletterTitle: {
    text: 'Ganhe 10% OFF na sua primeira compra! 🌸',
    fontSize: '2xl',
    isBold: true
  },
  newsletterSubtitle: {
    text: 'Cadastre seu e-mail para receber lançamentos florais e mimos exclusivos.',
    fontSize: 'sm',
    isBold: false
  },
  newsletterDesc: {
    text: 'Cadastre seu e-mail para receber lançamentos florais e mimos exclusivos.',
    fontSize: 'sm',
    isBold: false
  },
  footerDescription: 'Loja virtual brasileira focada em presentes criativos, papelaria fofa, mimos delicados e caixas afetivas inspiradas no trio de flores: violeta, turquesa e rosa.',
  companyLegalText: '© 2026 Lavistore Presentes e Mimos Criativos',
  sslSecurityText: 'SSL 256 Bits',
  pixDiscountText: 'PIX 5% OFF',
  installmentText: 'Até 12x',
  securityFooterNote: 'Todos os dados são criptografados e protegidos com tecnologia segura de ponta a ponta.',

  // Contact Info
  whatsappNumber: '(11) 98765-4321',
  contactEmail: 'contato@lavistore.com.br',
  orderNotificationEmail: 'reginahelena1980@gmail.com',
  pagSeguroPaymentUrl: '',
  businessHours: 'Seg. a Sex.: 09h às 18h',
  responseTime: 'Tempo médio de resposta: ~10 min',
  instagramHandle: '@lavistore.oficial',
  instagramUrl: 'https://instagram.com/lavistore.oficial',

  // Floating WhatsApp Chat Concierge
  chatConciergeName: 'Concierge Lavistore 🌸',
  chatConciergeRole: 'Atendimento Online • Suporte a Presentes',
  chatWelcomeTitle: 'Olá, bem-vinda à Lavistore! 🌷',
  chatWelcomeBody: 'Posso ajudar você a escolher um mimo perfeito, tirar dúvidas sobre o frete ou montar uma caixa personalizada?',
  chatButtonLabel: 'Dúvidas? Fale Conosco',

  // About Page ("Sobre Nós")
  aboutHeroSlogan: 'A Lavistore nasce para fazer o mundo mais afetuoso, doce e colorido!',
  aboutHeroQuote: 'Faça a diferença no dia de quem você ama, demonstre o seu carinho através dos nossos mimos!',
  aboutHeroDescription: 'Acreditamos que presentear é um ato de puro afeto. Cada detalhe da Lavistore — desde o traço desenhado à mão do nosso trio de florzinhas com centrinho amarelo ensolarado até o cheirinho doce borrifado nas caixas e sacolinhas amarelas — foi criado para espalhar sorrisos e momentos inesquecíveis!',
  aboutTrioTitle: 'O Significado do Nosso Trio Floral',
  aboutTrioSubtitle: 'Inspiradas em traços livres de criança, cada florzinha traz uma energia especial de cuidado e carinho.',
  aboutFlower1Title: 'Flor Violeta',
  aboutFlower1Subtitle: 'Criatividade & Calma',
  aboutFlower1Desc: 'Representa os momentos de imaginação, o foco sereno ao preencher um planner fofo e a liberdade para sonhar novos projetos com canetinhas coloridas.',
  aboutFlower2Title: 'Flor Turquesa',
  aboutFlower2Subtitle: 'Alegria & Frescor',
  aboutFlower2Desc: 'Traz a vitalidade dos dias ensolarados, o frescor de estrear um caderno novinho e o entusiasmo contagiante de trocar bilhetinhos de carinho.',
  aboutFlower3Title: 'Flor Rosa',
  aboutFlower3Subtitle: 'Afeto & Doçura',
  aboutFlower3Desc: 'Simboliza o amor colocado em cada laço de fita, a fragrância doce borrifada nas caixas e a sensação acolhedora de um abraço carinhoso.',
  aboutSolarTag: 'O Miolo Amarelo Solar ☀️',
  aboutSolarTitle: 'Traços Infantis Feitos com Amor & Energia Solar',
  aboutSolarDesc: 'O estilo de desenho de criança com sorrisinhos meigos e o miolo amarelo brilhante celebram a pureza, a imaginação e a alegria genuína. Cada sacolinha amarela carrega esse raio de sol até você!',
  aboutSolarBtnText: 'Conhecer Nossos Mimos',
  aboutPillarsTitle: 'Nossos 4 Toques de Afeto em Cada Envio',
  aboutPillarsSubtitle: 'Detalhes pensados com carinho para encantar todos os sentidos',
  aboutPillar1Icon: '🍯',
  aboutPillar1Title: 'Cheirinho Artesanal',
  aboutPillar1Desc: 'Fragrância suave e doce com notas de baunilha e lavanda borrifada com carinho antes do envio.',
  aboutPillar2Icon: '🎀',
  aboutPillar2Title: 'Sacolinhas Amarelas',
  aboutPillar2Desc: 'Nossa embalagem amarela ensolarada com laço de cetim nobre, pronta para encantar antes mesmo de abrir.',
  aboutPillar3Icon: '💌',
  aboutPillar3Title: 'Dedicatórias Fofas',
  aboutPillar3Desc: 'Cartinhas afetivas e bilhetinhos personalizados para emocionar e marcar memórias para sempre.',
  aboutPillar4Icon: '🌸',
  aboutPillar4Title: 'Surpresas Florais',
  aboutPillar4Desc: 'Adesivos colecionáveis das 3 florzinhas, marcadores de página e mimos extras em cada pedido.',
  aboutCtaBadge: 'Pronta para Encantar?',
  aboutCtaTitle: 'Venha conhecer nossos mimos e presentes',
  aboutCtaDesc: 'Navegue pela nossa vitrine de papelaria fofa, monte sacolinhas personalizadas e espalhe sorrisos por onde passar!',
  aboutCtaBtn1: 'Ver Todos os Mimos no Catálogo',
  aboutCtaBtn2: 'Montar Sacolinha de Presente',
  ...((storeState?.homePageConfig as unknown as Partial<HomePageConfig>) || {})
};
