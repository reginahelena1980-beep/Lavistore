import storeState from './store_state.json';
import { BagType, RibbonOption } from '../types';

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

export const CATEGORIES: Category[] = (storeState && Array.isArray(storeState.categories) && storeState.categories.length > 0)
  ? (storeState.categories as unknown as Category[])
  : [
  {
    id: 'todos',
    name: 'Todos os Mimos',
    icon: '✨',
    description: 'Catálogo completo de fofuras e mimos',
    showInFooter: false,
    showInFilter: true,
  },
  {
    id: 'floral-special',
    name: 'Coleção 3 Flores (Exclusiva)',
    icon: '🌸',
    description: 'Produtos exclusivos com a identidade das 3 florzinhas',
    badge: 'Exclusivo',
    showInFooter: true,
    showInFilter: true,
  },
  {
    id: 'cadernos-planners',
    name: 'Cadernos & Planners Argolados',
    icon: '📖',
    description: 'Planners permanentes, blocos e cadernos argolados',
    badge: 'Mais Vendidos',
    showInFooter: true,
    showInFilter: true,
  },
  {
    id: 'canetas-marcadores',
    name: 'Canetas Gel & Marcadores Pastéis',
    icon: '🖊️',
    description: 'Canetas gel, marca-textos pastéis e corretivos fofos',
    showInFooter: true,
    showInFilter: true,
  },
  {
    id: 'washi-adesivos',
    name: 'Washi Tapes Botânicas',
    icon: '🎀',
    description: 'Fitas japonesas, cartelas florais e blocos translúcidos',
    showInFooter: true,
    showInFilter: true,
  },
  {
    id: 'presentes-kits',
    name: 'Caixas de Presente Prontas',
    icon: '🎁',
    description: 'Kits prontos, caixas aromáticas e presentes afetivos',
    badge: 'Popular',
    showInFooter: true,
    showInFilter: true,
  },
  {
    id: 'papelaria',
    name: 'Papelaria Fofa & Criativa',
    icon: '📔',
    description: 'Cadernos, planners, canetas gel e washi tapes',
    showInFooter: true,
    showInFilter: true,
  },
  {
    id: 'acessorios-mimos',
    name: 'Acessórios & Mimos',
    icon: '🌷',
    description: 'Luminárias de tulipa, estojos e garrafas térmicas',
    showInFooter: true,
    showInFilter: true,
  }
];

export const BAG_TYPES: BagType[] = [
  {
    id: 'bag-amarela-solar',
    name: 'Sacolinha Amarela Solar com Alça de Algodão',
    price: 16.90,
    color: '#FACC15',
    bgClass: 'from-amber-100 to-yellow-200 border-amber-300',
    description: 'Sacolinha especial em papel encorpado amarelo solar com alça macia e acabamento brilhante.',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'bag-amarela-floral',
    name: 'Sacolinha Amarela Floral Trio Lavistore',
    price: 18.90,
    color: '#FEF08A',
    bgClass: 'from-yellow-100 to-amber-200 border-yellow-300',
    description: 'Sacolinha amarela pastel com estampa delicada do trio de florzinhas (violeta, turquesa e rosa).',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'bag-amarela-kraft',
    name: 'Sacolinha Amarela Kraft Nobre & Laço',
    price: 16.90,
    color: '#FDE047',
    bgClass: 'from-amber-50 to-yellow-100 border-amber-300',
    description: 'Sacolinha amarela em kraft reforçado, com papel de seda floral e cheirinho doce artesanal.',
    image: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'bag-amarela-boutique',
    name: 'Sacolinha Amarela Boutique com Visor Transparente',
    price: 19.90,
    color: '#EAB308',
    bgClass: 'from-yellow-200 to-amber-300 border-yellow-400',
    description: 'Sacolinha amarela premium com visor para destacar os mimos florais escolhidos com amor.',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=400&q=80'
  }
];

export const BOX_TYPES = BAG_TYPES;

export const RIBBON_OPTIONS: RibbonOption[] = [
  { id: 'ribbon-lilas', name: 'Fita de Cetim Lilás Violeta', color: '#8B5CF6' },
  { id: 'ribbon-turquesa', name: 'Fita de Gorgurão Turquesa Tiffany', color: '#06B6D4' },
  { id: 'ribbon-rosa', name: 'Fita de Cetim Rosa Algodão Doce', color: '#EC4899' },
  { id: 'ribbon-dourado', name: 'Fio Metalizado Dourado Solar', color: '#FACC15' },
  { id: 'ribbon-organza', name: 'Fita de Organza com Brilho Pérola', color: '#FBCFE8' }
];

export const CARD_TEMPLATES = [
  {
    theme: 'Aniversário Encantado 🎂',
    text: 'Que o seu novo ciclo floresça com tanta beleza, doçura e momentos inesquecíveis quanto este presente! Parabéns com todo meu carinho.'
  },
  {
    theme: 'Amizade & Afeto 🌸',
    text: 'Um pequeno mimo para lembrar o quanto sua presença ilumina meus dias. Obrigada por ser essa pessoa tão especial e doce!'
  },
  {
    theme: 'Gratidão & Carinho 🌷',
    text: 'Palavras não são suficientes para agradecer seu apoio e gentileza. Que este presente traga um sorriso ao seu coração!'
  },
  {
    theme: 'Sucesso nos Estudos & Sonhos ✍️',
    text: 'Que cada página escrita seja um passo lindo em direção aos seus maiores sonhos. Você é capaz de coisas maravilhosas!'
  },
  {
    theme: 'Auto-cuidado & Amor Próprio 💖',
    text: 'Você merece momentos doces, pausas tranquilas e todo o carinho do mundo. Cuide-se com muito amor!'
  }
];
