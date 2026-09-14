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
  announcementText: 'Escreva o aviso da barra de destaque aqui (ex: Frete Grátis acima de R$ 149)',
  announcementCoupon: 'SEUCUPOM',
  showAnnouncement: true,

  // Hero section
  heroBadge: {
    text: 'Escreva a tag ou selo superior aqui',
    fontSize: 'xs',
    isBold: true
  },
  heroTitle: {
    text: 'Escreva o título principal de destaque aqui',
    fontSize: '4xl',
    isBold: true
  },
  heroSubtitle: {
    text: 'Escreva a descrição da loja aqui',
    fontSize: 'base',
    isBold: false
  },
  heroBtnPrimary: {
    text: 'Escreva o texto do botão principal aqui',
    fontSize: 'sm',
    isBold: true
  },
  heroBtnSecondary: {
    text: 'Escreva o texto do botão secundário aqui',
    fontSize: 'sm',
    isBold: true
  },
  heroTrust1: {
    text: 'Escreva o diferencial 1 aqui',
    fontSize: 'xs',
    isBold: true
  },
  heroTrust2: {
    text: 'Escreva o diferencial 2 aqui',
    fontSize: 'xs',
    isBold: true
  },
  heroTrust3: {
    text: 'Escreva o diferencial 3 aqui',
    fontSize: 'xs',
    isBold: true
  },

  // Brand perks
  perk1Icon: '🛍️',
  perk1Title: {
    text: 'Escreva o título da vantagem 1 aqui',
    fontSize: 'base',
    isBold: true
  },
  perk1Desc: {
    text: 'Escreva a descrição da vantagem 1 aqui',
    fontSize: 'xs',
    isBold: false
  },
  perk2Icon: '🍯',
  perk2Title: {
    text: 'Escreva o título da vantagem 2 aqui',
    fontSize: 'base',
    isBold: true
  },
  perk2Desc: {
    text: 'Escreva a descrição da vantagem 2 aqui',
    fontSize: 'xs',
    isBold: false
  },
  perk3Icon: '🚚',
  perk3Title: {
    text: 'Escreva o título da vantagem 3 aqui',
    fontSize: 'base',
    isBold: true
  },
  perk3Desc: {
    text: 'Escreva a descrição da vantagem 3 aqui',
    fontSize: 'xs',
    isBold: false
  },
  perk4Icon: '🌸',
  perk4Title: {
    text: 'Escreva o título da vantagem 4 aqui',
    fontSize: 'base',
    isBold: true
  },
  perk4Desc: {
    text: 'Escreva a descrição da vantagem 4 aqui',
    fontSize: 'xs',
    isBold: false
  },

  // Catalog
  catalogTitle: {
    text: 'Escreva o título da vitrine de produtos aqui',
    fontSize: '2xl',
    isBold: true
  },
  catalogSubtitle: {
    text: 'Escreva a descrição ou subtítulo da vitrine aqui',
    fontSize: 'sm',
    isBold: false
  },

  // Custom Sacolinha Promo Banner
  promoBadge: {
    text: 'Escreva o selo do banner promocional aqui',
    fontSize: 'xs',
    isBold: true
  },
  promoTitle: {
    text: 'Escreva o título da chamada promocional aqui',
    fontSize: '3xl',
    isBold: true
  },
  promoDescription: {
    text: 'Escreva a descrição da promoção ou serviço especial aqui',
    fontSize: 'sm',
    isBold: false
  },
  promoButton: {
    text: 'Escreva o texto do botão de ação aqui',
    fontSize: 'sm',
    isBold: true
  },

  // Reviews
  reviewsBadge: {
    text: 'Escreva o selo da seção de avaliações aqui',
    fontSize: 'xs',
    isBold: true
  },
  reviewsTitle: {
    text: 'Escreva o título da seção de avaliações aqui',
    fontSize: '3xl',
    isBold: true
  },
  reviewsSubtitle: {
    text: 'Escreva a descrição ou introdução das avaliações aqui',
    fontSize: 'base',
    isBold: false
  },
  reviewsRatingSummary: 'Escreva o resumo de avaliação aqui (Ex: 4.9 / 5.0 estrelas)',

  // Newsletter & Footer
  newsletterBadge: {
    text: 'Escreva o selo da newsletter aqui',
    fontSize: 'xs',
    isBold: true
  },
  newsletterTitle: {
    text: 'Escreva o título de convite da newsletter aqui',
    fontSize: '2xl',
    isBold: true
  },
  newsletterSubtitle: {
    text: 'Escreva o subtítulo ou benefício da newsletter aqui',
    fontSize: 'sm',
    isBold: false
  },
  newsletterDesc: {
    text: 'Escreva a descrição ou benefício da newsletter aqui',
    fontSize: 'sm',
    isBold: false
  },
  footerDescription: 'Escreva a descrição da loja aqui',
  companyLegalText: 'Escreva a razão social, CNPJ e direitos autorais aqui',
  sslSecurityText: 'Certificado de Segurança SSL',
  pixDiscountText: 'Desconto no PIX',
  installmentText: 'Parcelamento no Cartão',
  securityFooterNote: 'Escreva a nota de segurança e privacidade do rodapé aqui',

  // Contact Info
  whatsappNumber: 'Digite o WhatsApp da loja com DDD aqui',
  contactEmail: 'Digite o e-mail oficial de atendimento aqui',
  orderNotificationEmail: 'Digite o e-mail para receber notificações de vendas aqui',
  pagSeguroPaymentUrl: '',
  businessHours: 'Digite os horários de atendimento da loja aqui',
  responseTime: 'Digite o tempo estimado de resposta aqui',
  instagramHandle: 'Digite o @ do Instagram aqui',
  instagramUrl: 'Cole o link do perfil do Instagram aqui',

  // Floating WhatsApp Chat Concierge
  chatConciergeName: 'Digite o nome do atendente ou concierge aqui',
  chatConciergeRole: 'Digite o cargo ou status de atendimento aqui',
  chatWelcomeTitle: 'Escreva a mensagem de boas-vindas do chat aqui',
  chatWelcomeBody: 'Escreva a pergunta inicial ou instrução para o cliente aqui',
  chatButtonLabel: 'Digite o texto do botão de atendimento aqui',

  // About Page ("Sobre Nós")
  aboutHeroSlogan: 'Escreva o slogan principal da página Sobre Nós aqui',
  aboutHeroQuote: 'Escreva a frase de impacto ou missão da loja aqui',
  aboutHeroDescription: 'Escreva a história e apresentação institucional da loja aqui',
  aboutTrioTitle: 'Escreva o título da primeira seção institucional aqui',
  aboutTrioSubtitle: 'Escreva o subtítulo da primeira seção institucional aqui',
  aboutFlower1Title: 'Digite o título do item 1 aqui',
  aboutFlower1Subtitle: 'Digite o subtítulo do item 1 aqui',
  aboutFlower1Desc: 'Escreva a descrição detalhada do item 1 aqui',
  aboutFlower2Title: 'Digite o título do item 2 aqui',
  aboutFlower2Subtitle: 'Digite o subtítulo do item 2 aqui',
  aboutFlower2Desc: 'Escreva a descrição detalhada do item 2 aqui',
  aboutFlower3Title: 'Digite o título do item 3 aqui',
  aboutFlower3Subtitle: 'Digite o subtítulo do item 3 aqui',
  aboutFlower3Desc: 'Escreva a descrição detalhada do item 3 aqui',
  aboutSolarTag: 'Digite a etiqueta ou selo em destaque aqui',
  aboutSolarTitle: 'Digite o título em destaque aqui',
  aboutSolarDesc: 'Escreva a descrição em destaque aqui',
  aboutSolarBtnText: 'Digite o texto do botão aqui',
  aboutPillarsTitle: 'Digite o título dos pilares da loja aqui',
  aboutPillarsSubtitle: 'Digite o subtítulo dos pilares da loja aqui',
  aboutPillar1Icon: '⭐',
  aboutPillar1Title: 'Digite o título do pilar 1 aqui',
  aboutPillar1Desc: 'Escreva a descrição do pilar 1 aqui',
  aboutPillar2Icon: '🎁',
  aboutPillar2Title: 'Digite o título do pilar 2 aqui',
  aboutPillar2Desc: 'Escreva a descrição do pilar 2 aqui',
  aboutPillar3Icon: '💌',
  aboutPillar3Title: 'Digite o título do pilar 3 aqui',
  aboutPillar3Desc: 'Escreva a descrição do pilar 3 aqui',
  aboutPillar4Icon: '✨',
  aboutPillar4Title: 'Digite o título do pilar 4 aqui',
  aboutPillar4Desc: 'Escreva a descrição do pilar 4 aqui',
  aboutCtaBadge: 'Digite o selo da chamada final aqui',
  aboutCtaTitle: 'Digite o título da chamada final aqui',
  aboutCtaDesc: 'Escreva a descrição da chamada final aqui',
  aboutCtaBtn1: 'Digite o texto do botão 1 aqui',
  aboutCtaBtn2: 'Digite o texto do botão 2 aqui',
  ...((storeState?.homePageConfig as unknown as Partial<HomePageConfig>) || {})
};
