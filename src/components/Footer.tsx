import React, { useState } from 'react';
import { 
  Send, 
  CreditCard, 
  QrCode, 
  Lock, 
  Instagram, 
  Mail, 
  Phone, 
  Sparkles, 
  Check, 
  Edit3,
  RotateCcw,
  ShieldCheck,
  Zap,
  Gamepad2
} from 'lucide-react';
import { UnlockedDoorLogo } from './UnlockedDoorLogo';
import { HomePageConfig, Category } from '../types';
import { getFontSizeClass, getFontWeightClass } from '../utils/textFormatter';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/categories';
import { playClickSound, playLootSound } from '../utils/soundSystem';

interface FooterProps {
  config?: HomePageConfig;
  categories?: Category[];
  isAdminEditing?: boolean;
  onEditField?: (fieldKey: keyof HomePageConfig, label: string) => void;
  onSelectCategory?: (categoryId: string) => void;
  onOpenCategoryManager?: () => void;
  onNavigateToAdmin?: () => void;
  onOpenReturnPolicy?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  config,
  categories = DEFAULT_CATEGORIES,
  isAdminEditing = false,
  onEditField,
  onSelectCategory,
  onOpenCategoryManager,
  onNavigateToAdmin,
  onOpenReturnPolicy
}) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const newsBadge = config?.newsletterBadge?.text || '• CLUBE DE AVENTUREIROS UNLOCKED DOOR •';
  const newsTitle = config?.newsletterTitle?.text || 'Receba Drops Semanais & 10% OFF na Primeira Compra! ⚔️';
  const newsDesc = config?.newsletterDesc?.text || 'Cadastre seu e-mail para receber alertas de drops raros, dados forjados e cupons secretos.';

  const nonTodosCategories = categories.filter((c) => c.id !== 'todos');
  const displayedCategories = nonTodosCategories.filter((c) => {
    if (nonTodosCategories.length <= 6) return true;
    return c.showInFooter !== false;
  });

  const handleCategoryClick = (e: React.MouseEvent, categoryId: string) => {
    e.preventDefault();
    playClickSound();
    if (onSelectCategory) {
      onSelectCategory(categoryId);
      const catalogEl = document.getElementById('catalog-section');
      if (catalogEl) {
        catalogEl.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 600, behavior: 'smooth' });
      }
    }
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      playLootSound();
      setNewsletterSubscribed(true);
    }
  };

  return (
    <footer className="bg-gradient-to-b from-[#080E1C] via-[#060B16] to-[#04070D] text-slate-300 pt-14 pb-8 border-t border-cyan-500/20 font-['Cinzel',serif]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Newsletter Box */}
        <div className="bg-gradient-to-r from-cyan-950/60 via-[#0A162C] to-[#061022] p-6 sm:p-10 rounded-3xl border border-cyan-500/30 shadow-[0_0_30px_rgba(0,0,0,0.6)] flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center lg:text-left">
            <div 
              onClick={() => isAdminEditing && onEditField && onEditField('newsletterBadge', 'Newsletter - Selo')}
              className={`inline-flex items-center gap-1.5 bg-[#050A14] px-3.5 py-1 rounded-full text-cyan-300 uppercase tracking-widest border border-cyan-500/40 shadow-xs ${getFontSizeClass(config?.newsletterBadge?.fontSize, 'text-xs')} ${getFontWeightClass(config?.newsletterBadge?.isBold, true)} ${isAdminEditing ? 'cursor-pointer hover:ring-2 hover:ring-cyan-400' : ''}`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>{newsBadge}</span>
              {isAdminEditing && <Edit3 className="w-3 h-3 ml-1" />}
            </div>
            <h3 
              onClick={() => isAdminEditing && onEditField && onEditField('newsletterTitle', 'Newsletter - Título')}
              className={`font-['Cinzel_Decorative',serif] text-white ${getFontSizeClass(config?.newsletterTitle?.fontSize, 'text-2xl')} ${getFontWeightClass(config?.newsletterTitle?.isBold, true)} ${isAdminEditing ? 'cursor-pointer hover:underline decoration-cyan-400 decoration-2' : ''}`}
            >
              {newsTitle}
            </h3>
            <p 
              onClick={() => isAdminEditing && onEditField && onEditField('newsletterDesc', 'Newsletter - Descrição')}
              className={`text-slate-400 ${getFontSizeClass(config?.newsletterDesc?.fontSize, 'text-sm')} ${getFontWeightClass(config?.newsletterDesc?.isBold, false)} ${isAdminEditing ? 'cursor-pointer hover:underline decoration-cyan-400 decoration-2' : ''}`}
            >
              {newsDesc}
            </p>
          </div>

          <div className="w-full lg:max-w-md">
            {newsletterSubscribed ? (
              <div className="bg-[#050A14] border border-cyan-400 p-4 rounded-2xl flex items-center gap-2 text-cyan-300 text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Bem-vindo à Guilda! Use o cupom <strong className="text-white underline">UNLOCKED10</strong> no seu checkout! 🛡️</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Digite seu melhor e-mail aqui..."
                  className="flex-1 px-4 py-3 bg-[#050A14] border border-cyan-500/40 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 shadow-inner font-['Plus_Jakarta_Sans',sans-serif]"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-xs sm:text-sm shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-transform active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Desbloquear</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Faixa Simplificada de Garantia e Troca Fácil (CDC) */}
        <div className="bg-[#09101F]/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-cyan-500/25 shadow-lg flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3.5 text-center sm:text-left flex-col sm:flex-row">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 text-cyan-300 flex items-center justify-center shrink-0 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <h4 className="font-bold text-white text-sm sm:text-base">
                  Garantia do Guardião & Troca Descomplicada
                </h4>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-500/40">
                  CDC Art. 49
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl mt-0.5">
                Você tem <strong>7 dias para arrependimento</strong> com reembolso 100% integral ou <strong>30 dias contra qualquer defeito</strong> de forja. Logística reversa ágil e suporte gamer!
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-footer-open-return-policy"
            onClick={onOpenReturnPolicy}
            className="px-5 py-2.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 font-bold rounded-2xl text-xs shadow-md transition-transform active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Ver Regras de Garantia</span>
          </button>
        </div>

        {/* Main Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-8 border-t border-cyan-500/20 text-xs">
          
          {/* Brand Info */}
          <div className="space-y-3">
            <div>
              <UnlockedDoorLogo variant="horizontal" size="sm" />
            </div>
            <p className="text-slate-400 text-xs leading-relaxed pt-1 font-['Plus_Jakarta_Sans',sans-serif]">
              {config?.footerDescription || 'Loja oficial gamer e de colecionáveis de alta precisão. Amuletos forjados, dados arcanos, roupas épicas e estátuas de edições raras.'}
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a 
                href={config?.instagramUrl || 'https://instagram.com/unlockeddoor.oficial'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-[#09101F] border border-cyan-500/30 text-slate-300 hover:text-cyan-300 hover:border-cyan-400 shadow-xs transition-colors" 
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a 
                href={`mailto:${config?.contactEmail || 'contato@unlockeddoor.com.br'}`} 
                className="p-2.5 rounded-xl bg-[#09101F] border border-cyan-500/30 text-slate-300 hover:text-cyan-300 hover:border-cyan-400 shadow-xs transition-colors" 
                aria-label="E-mail"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h5 className="font-bold text-white text-sm">Categorias & Drops</h5>
              {isAdminEditing && onOpenCategoryManager && (
                <button
                  type="button"
                  id="btn-edit-footer-categories"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenCategoryManager();
                  }}
                  className="px-2.5 py-1 rounded-full bg-cyan-950 hover:bg-cyan-900 text-cyan-300 transition-all text-[11px] font-bold flex items-center gap-1.5 cursor-pointer border border-cyan-500/40"
                  title="Clique para abrir o editor de categorias do rodapé"
                >
                  <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Editar</span>
                </button>
              )}
            </div>
            <ul className="space-y-2 text-slate-400 font-medium">
              {displayedCategories.length === 0 ? (
                <li className="text-slate-500 text-xs italic">Nenhuma categoria selecionada para o rodapé.</li>
              ) : (
                displayedCategories.map((cat) => (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={(e) => handleCategoryClick(e, cat.id)}
                      className="hover:text-cyan-300 transition-colors text-left flex items-center gap-1.5 group cursor-pointer"
                    >
                      <span>{cat.icon}</span>
                      <span className="group-hover:underline underline-offset-2">{cat.name}</span>
                      {cat.badge && (
                        <span className="text-[8px] font-bold bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded-full border border-cyan-500/40 uppercase">
                          {cat.badge}
                        </span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h5 className="font-bold text-white text-sm">Suporte do Guardião</h5>
            <ul className="space-y-2 text-slate-400 font-medium">
              <li className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span>WhatsApp: {config?.whatsappNumber || '(11) 98765-4321'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>{config?.contactEmail || 'contato@unlockeddoor.com.br'}</span>
              </li>
              <li><span>{config?.businessHours || 'Seg. a Sex.: 09h às 19h • Sáb.: 10h às 16h'}</span></li>
              <li><span className="text-emerald-400 font-bold">{config?.responseTime || 'Tempo médio de resposta: ~10 min'}</span></li>
              <li className="pt-1 border-t border-cyan-500/20">
                <button
                  type="button"
                  id="btn-footer-returns-link"
                  onClick={onOpenReturnPolicy}
                  className="hover:text-cyan-300 transition-colors text-left flex items-center gap-1.5 font-bold text-cyan-400 cursor-pointer group"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-[-45deg] transition-transform" />
                  <span className="underline underline-offset-2">Garantia & Devoluções (CDC 7 dias)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Security & Badges */}
          <div className="space-y-3">
            <h5 className="font-bold text-white text-sm">Segurança Arcana & Pagamento</h5>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="flex items-center gap-1 bg-[#09101F] px-2.5 py-1 rounded-lg border border-cyan-500/30 text-slate-200 font-bold shadow-xs">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>{config?.sslSecurityText || 'SSL 256 Bits Blindado'}</span>
              </span>
              <span className="flex items-center gap-1 bg-[#09101F] px-2.5 py-1 rounded-lg border border-cyan-500/30 text-slate-200 font-bold shadow-xs">
                <QrCode className="w-3 h-3 text-cyan-400" />
                <span>{config?.pixDiscountText || 'PIX Instantâneo'}</span>
              </span>
              <span className="flex items-center gap-1 bg-[#09101F] px-2.5 py-1 rounded-lg border border-cyan-500/30 text-slate-200 font-bold shadow-xs">
                <CreditCard className="w-3 h-3 text-amber-400" />
                <span>{config?.installmentText || 'Até 12x Cartão'}</span>
              </span>
              <button
                type="button"
                id="btn-footer-badge-returns"
                onClick={onOpenReturnPolicy}
                className="flex items-center gap-1 bg-[#09101F] px-2.5 py-1 rounded-lg border border-cyan-500/30 text-slate-200 font-bold shadow-xs hover:border-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                title="Clique para ver as regras de garantia simplificada"
              >
                <RotateCcw className="w-3 h-3 text-cyan-400" />
                <span>Garantia 7 Dias CDC</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-medium pt-1 font-['Plus_Jakarta_Sans',sans-serif]">
              {config?.securityFooterNote || 'Transações seguras com criptografia militar de ponta a ponta e antifraude.'}
            </p>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-cyan-500/20 text-center text-xs text-slate-400 font-medium flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
            <p>{config?.companyLegalText || '© 2026 Unlocked Door • Loja Oficial Gamer & Colecionáveis'}</p>
            <span className="hidden sm:inline text-slate-600">•</span>
            <button
              type="button"
              id="btn-footer-bottom-return-policy"
              onClick={onOpenReturnPolicy}
              className="text-slate-400 hover:text-cyan-300 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Termos de Garantia (CDC)
            </button>
            {onNavigateToAdmin && (
              <button
                type="button"
                id="btn-footer-admin-link"
                onClick={onNavigateToAdmin}
                className="text-[10px] text-slate-600 hover:text-cyan-400 transition-colors ml-1 cursor-pointer"
                title="Acesso de Gerência"
                aria-label="Gerência"
              >
                • Gerência
              </button>
            )}
          </div>
          <p className="flex items-center gap-1 text-slate-400 font-semibold">
            <span>Forjado para os verdadeiros</span>
            <span className="text-cyan-400 font-bold">Aventureiros & Colecionadores</span>
            <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 inline ml-1" />
          </p>
        </div>

      </div>
    </footer>
  );
};
