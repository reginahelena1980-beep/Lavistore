import React, { useState } from 'react';
import { 
  Heart, 
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
  Truck
} from 'lucide-react';
import { LavistoreLogo } from './LavistoreLogo';
import { HomePageConfig, Category } from '../types';
import { getFontSizeClass, getFontWeightClass } from '../utils/textFormatter';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/categories';

interface FooterProps {
  config?: HomePageConfig;
  categories?: Category[];
  isAdminEditing?: boolean;
  onEditField?: (fieldKey: keyof HomePageConfig, label: string) => void;
  onSelectCategory?: (categoryId: string) => void;
  onOpenCategoryManager?: () => void;
  onNavigateToAdmin?: () => void;
  onOpenReturnPolicy?: () => void;
  isConfigLoading?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  config,
  categories = DEFAULT_CATEGORIES,
  isAdminEditing = false,
  onEditField,
  onSelectCategory,
  onOpenCategoryManager,
  onNavigateToAdmin,
  onOpenReturnPolicy,
  isConfigLoading = false
}) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const newsBadge = config?.newsletterBadge?.text || '';
  const newsTitle = config?.newsletterTitle?.text || '';
  const newsDesc = config?.newsletterDesc?.text || '';

  // List of valid categories for the store (excluding 'todos' which is just the full catalog filter)
  const nonTodosCategories = categories.filter((c) => c.id !== 'todos');

  // If the store has 6 or fewer categories, show ALL of them so no category registered by the merchant is missing!
  // If there are more than 6 categories, respect the showInFooter toggle.
  const displayedCategories = nonTodosCategories.filter((c) => {
    if (nonTodosCategories.length <= 6) {
      return true;
    }
    return c.showInFooter !== false;
  });

  const handleCategoryClick = (e: React.MouseEvent, categoryId: string) => {
    e.preventDefault();
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

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newsletterEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;

    setIsSubscribing(true);

    // 1. Persist to localStorage immediately for instant client-side offline support
    try {
      const LOCAL_KEY = 'lavistore_newsletter_leads';
      const existingRaw = localStorage.getItem(LOCAL_KEY);
      let localLeads = existingRaw ? JSON.parse(existingRaw) : [];
      if (!Array.isArray(localLeads)) localLeads = [];
      const alreadyExists = localLeads.some((l: any) => (l.email || '').toLowerCase() === cleanEmail);
      if (!alreadyExists) {
        localLeads.unshift({
          id: `lead-${Date.now()}`,
          email: cleanEmail,
          registeredAt: new Date().toISOString(),
          source: 'Clube de Mimos (Rodapé)',
          couponOffered: 'LAVI10',
          status: 'active'
        });
        localStorage.setItem(LOCAL_KEY, JSON.stringify(localLeads));
      }
    } catch (localErr) {
      console.warn('[Newsletter] Erro ao gravar lead no localStorage:', localErr);
    }

    // 2. Persist to Express backend /api/newsletter/subscribe
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          source: 'Clube de Mimos (Rodapé)',
          couponOffered: 'LAVI10'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.message) {
          setNewsletterMessage(result.message);
        }
      }
    } catch (apiErr) {
      console.warn('[Newsletter] Erro ao gravar lead no backend:', apiErr);
    } finally {
      setIsSubscribing(false);
      setNewsletterSubscribed(true);
    }
  };

  return (
    <footer className="bg-gradient-to-b from-[#F6EFFC] via-[#EFE6F8] to-[#E9DDF5] text-purple-950 pt-14 pb-8 border-t-2 border-purple-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Newsletter Box */}
        <div className="bg-gradient-to-r from-purple-200/90 via-pink-100/90 to-amber-100/90 p-6 sm:p-10 rounded-3xl border-2 border-purple-300 shadow-md flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center lg:text-left">
            {isConfigLoading ? (
              <div className="space-y-2">
                <div className="h-5 w-40 bg-purple-300/50 rounded-full animate-pulse" />
                <div className="h-7 w-72 bg-purple-300/50 rounded-lg animate-pulse" />
                <div className="h-4 w-60 bg-purple-300/50 rounded-lg animate-pulse" />
              </div>
            ) : (
              <>
                {(newsBadge || isAdminEditing) && (
                  <div 
                    onClick={() => isAdminEditing && onEditField && onEditField('newsletterBadge', 'Newsletter - Selo')}
                    className={`inline-flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-full text-purple-900 uppercase tracking-wider border border-purple-200 shadow-2xs ${getFontSizeClass(config?.newsletterBadge?.fontSize, 'text-xs')} ${getFontWeightClass(config?.newsletterBadge?.isBold, true)} ${isAdminEditing ? 'cursor-pointer hover:ring-2 hover:ring-amber-400' : ''}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-300" />
                    <span>{newsBadge || 'Selo Newsletter'}</span>
                    {isAdminEditing && <Edit3 className="w-3 h-3 ml-1" />}
                  </div>
                )}
                {(newsTitle || isAdminEditing) && (
                  <h3 
                    onClick={() => isAdminEditing && onEditField && onEditField('newsletterTitle', 'Newsletter - Título')}
                    className={`font-['Mali'] text-purple-950 ${getFontSizeClass(config?.newsletterTitle?.fontSize, 'text-2xl')} ${getFontWeightClass(config?.newsletterTitle?.isBold, true)} ${isAdminEditing ? 'cursor-pointer hover:underline decoration-amber-400 decoration-2' : ''}`}
                  >
                    {newsTitle || 'Título da Newsletter'}
                  </h3>
                )}
                {(newsDesc || isAdminEditing) && (
                  <p 
                    onClick={() => isAdminEditing && onEditField && onEditField('newsletterDesc', 'Newsletter - Descrição')}
                    className={`font-['Comfortaa'] text-purple-900 ${getFontSizeClass(config?.newsletterDesc?.fontSize, 'text-sm')} ${getFontWeightClass(config?.newsletterDesc?.isBold, false)} ${isAdminEditing ? 'cursor-pointer hover:underline decoration-amber-400 decoration-2' : ''}`}
                  >
                    {newsDesc || 'Descrição da Newsletter'}
                  </p>
                )}
              </>
            )}
          </div>


          <div className="w-full lg:max-w-md">
            {newsletterSubscribed ? (
              <div className="bg-white/95 border-2 border-emerald-300 p-3.5 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold shadow-sm animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{newsletterMessage || <>Bem-vinda ao Clube Lavistore! Fique atenta às novidades e mimos exclusivos! ✨</>}</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Seu melhor e-mail..."
                  disabled={isSubscribing}
                  className="flex-1 px-4 py-3 bg-white/95 border-2 border-purple-200 rounded-2xl text-xs sm:text-sm text-purple-950 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-2xs disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={isSubscribing}
                  className="px-5 py-3 bg-gradient-to-r from-[#F43F5E] via-[#FB923C] to-[#06B6D4] hover:opacity-95 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-transform active:scale-95 flex items-center gap-1.5 shrink-0 disabled:opacity-60 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">{isSubscribing ? 'Cadastrando...' : 'Cadastrar'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Faixa Simplificada de Garantia e Troca Fácil (CDC) */}
        <div className="bg-white/85 backdrop-blur-xs p-5 sm:p-6 rounded-3xl border border-purple-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3.5 text-center sm:text-left flex-col sm:flex-row">
            <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0 border border-pink-200 shadow-2xs">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <h4 className="font-bold font-['Mali'] text-purple-950 text-sm sm:text-base">
                  Troca Fácil & Compra 100% Segura
                </h4>
                <span className="text-[10px] bg-pink-100 text-pink-800 font-bold px-2 py-0.5 rounded-full border border-pink-200">
                  CDC Art. 49
                </span>
              </div>
              <p className="text-xs text-purple-900 leading-relaxed max-w-xl mt-0.5">
                Você tem <strong>7 dias para arrependimento</strong> com reembolso 100% integral ou <strong>30 dias contra defeitos</strong>. Frete reverso gratuito e sem burocracia!
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-footer-open-return-policy"
            onClick={onOpenReturnPolicy}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-900 hover:to-indigo-900 text-white font-bold rounded-2xl text-xs shadow-xs transition-transform active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-pink-300" />
            <span>Ver Política Simplificada</span>
          </button>
        </div>

        {/* Main Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-8 border-t-2 border-purple-200/80 text-xs">
          
          {/* Brand Info */}
          <div className="space-y-3">
            <div>
              <LavistoreLogo variant="horizontal" size="sm" isDarkTheme={false} />
            </div>
            {isConfigLoading ? (
              <div className="space-y-1.5 pt-1">
                <div className="h-3.5 w-48 bg-purple-200/60 rounded animate-pulse" />
                <div className="h-3.5 w-40 bg-purple-200/60 rounded animate-pulse" />
              </div>
            ) : config?.footerDescription?.trim() ? (
              <p className="text-purple-900 font-['Comfortaa'] text-xs leading-relaxed pt-1 font-medium">
                {config.footerDescription.trim()}
              </p>
            ) : null}
            {isConfigLoading ? (
              <div className="flex items-center gap-3 pt-1">
                <div className="w-8 h-8 rounded-xl bg-purple-200/60 animate-pulse" />
                <div className="w-8 h-8 rounded-xl bg-purple-200/60 animate-pulse" />
              </div>
            ) : (config?.instagramUrl?.trim() || config?.contactEmail?.trim()) ? (
              <div className="flex items-center gap-3 text-purple-950 pt-1">
                {config?.instagramUrl?.trim() ? (
                  <a 
                    href={config.instagramUrl.trim()} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-white border border-purple-200 hover:bg-rose-500 hover:text-white shadow-2xs transition-colors" 
                    aria-label="Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                ) : null}
                {config?.contactEmail?.trim() ? (
                  <a 
                    href={`mailto:${config.contactEmail.trim()}`} 
                    className="p-2.5 rounded-xl bg-white border border-purple-200 hover:bg-cyan-600 hover:text-white shadow-2xs transition-colors" 
                    aria-label="E-mail"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h5 className="font-['Mali'] font-bold text-purple-950 text-sm">Categorias Principais</h5>
              {isAdminEditing && onOpenCategoryManager && (
                <button
                  type="button"
                  id="btn-edit-footer-categories"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenCategoryManager();
                  }}
                  className="px-2.5 py-1 rounded-full bg-amber-200 hover:bg-amber-300 text-purple-950 transition-all shadow-2xs text-[11px] font-bold flex items-center gap-1.5 cursor-pointer border border-amber-300 active:scale-95"
                  title="Clique para abrir o editor de categorias do rodapé"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-900" />
                  <span>Editar</span>
                </button>
              )}
            </div>
            <ul className="space-y-2 text-purple-900 font-medium">
              {displayedCategories.length === 0 ? (
                <li className="text-slate-400 text-xs italic">Nenhuma categoria selecionada para o rodapé.</li>
              ) : (
                displayedCategories.map((cat) => (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={(e) => handleCategoryClick(e, cat.id)}
                      className="hover:text-rose-600 transition-colors text-left flex items-center gap-1.5 group cursor-pointer"
                    >
                      <span>{cat.icon}</span>
                      <span className="group-hover:underline underline-offset-2">{cat.name}</span>
                      {cat.badge && (
                        <span className="text-[8px] font-bold bg-amber-100 text-purple-950 px-1.5 py-0.2 rounded-full border border-amber-200">
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
            <h5 className="font-['Mali'] font-bold text-purple-950 text-sm">Atendimento</h5>
            {isConfigLoading ? (
              <ul className="space-y-2">
                <li className="h-3.5 w-36 bg-purple-200/60 rounded animate-pulse" />
                <li className="h-3.5 w-44 bg-purple-200/60 rounded animate-pulse" />
                <li className="h-3.5 w-32 bg-purple-200/60 rounded animate-pulse" />
              </ul>
            ) : (
              <ul className="space-y-2 text-purple-900 font-medium">
                {config?.whatsappNumber?.trim() ? (
                  <li className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-rose-500" />
                    <span>WhatsApp: {config.whatsappNumber.trim()}</span>
                  </li>
                ) : null}
                {config?.contactEmail?.trim() ? (
                  <li className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-600" />
                    <span>{config.contactEmail.trim()}</span>
                  </li>
                ) : null}
                {config?.businessHours?.trim() ? (
                  <li><span>{config.businessHours.trim()}</span></li>
                ) : null}
                {config?.responseTime?.trim() ? (
                  <li><span className="text-emerald-700 font-bold">{config.responseTime.trim()}</span></li>
                ) : null}
                {!config?.whatsappNumber?.trim() && !config?.contactEmail?.trim() && !config?.businessHours?.trim() && (
                  <li className="text-slate-400 text-xs italic">Canais de atendimento sob consulta.</li>
                )}
                <li className="pt-1 border-t border-purple-200/60">
                  <button
                    type="button"
                    id="btn-footer-returns-link"
                    onClick={onOpenReturnPolicy}
                    className="hover:text-pink-600 transition-colors text-left flex items-center gap-1.5 font-bold text-pink-700 cursor-pointer group"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-pink-500 group-hover:rotate-[-45deg] transition-transform" />
                    <span className="underline underline-offset-2">Trocas & Devoluções (CDC 7 dias)</span>
                  </button>
                </li>
              </ul>
            )}
          </div>

          {/* Security & Badges */}
          <div className="space-y-3">
            <h5 className="font-['Mali'] font-bold text-purple-950 text-sm">Segurança & Pagamento</h5>
            {isConfigLoading ? (
              <div className="flex flex-wrap gap-2">
                <div className="h-6 w-20 bg-purple-200/60 rounded-lg animate-pulse" />
                <div className="h-6 w-20 bg-purple-200/60 rounded-lg animate-pulse" />
                <div className="h-6 w-16 bg-purple-200/60 rounded-lg animate-pulse" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 text-[10px]">
                {config?.sslSecurityText?.trim() ? (
                  <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-purple-200 text-purple-950 font-bold shadow-2xs">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>{config.sslSecurityText.trim()}</span>
                  </span>
                ) : null}
                {config?.pixDiscountText?.trim() ? (
                  <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-purple-200 text-purple-950 font-bold shadow-2xs">
                    <QrCode className="w-3 h-3 text-cyan-600" />
                    <span>{config.pixDiscountText.trim()}</span>
                  </span>
                ) : null}
                {config?.installmentText?.trim() ? (
                  <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-purple-200 text-purple-950 font-bold shadow-2xs">
                    <CreditCard className="w-3 h-3 text-rose-500" />
                    <span>{config.installmentText.trim()}</span>
                  </span>
                ) : null}
                <button
                  type="button"
                  id="btn-footer-badge-returns"
                  onClick={onOpenReturnPolicy}
                  className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-purple-200 text-purple-950 font-bold shadow-2xs hover:border-pink-300 hover:text-pink-700 transition-colors cursor-pointer"
                  title="Clique para ver as regras de troca e devolução simplificada"
                >
                  <RotateCcw className="w-3 h-3 text-pink-500" />
                  <span>Troca Fácil 7 Dias</span>
                </button>
              </div>
            )}
            {config?.securityFooterNote?.trim() ? (
              <p className="text-[11px] text-purple-900 font-medium pt-1">
                {config.securityFooterNote.trim()}
              </p>
            ) : null}
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-purple-200 text-center text-xs text-purple-800 font-medium flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
            <p className="flex items-center gap-1">
              {onNavigateToAdmin ? (
                <button
                  type="button"
                  id="btn-footer-admin-secret"
                  onClick={onNavigateToAdmin}
                  className="hover:text-purple-950 transition-all hover:scale-110 active:scale-90 cursor-pointer select-none font-bold"
                  title="Acesso Administrativo"
                  aria-label="Acesso Administrativo"
                >
                  ©
                </button>
              ) : (
                <span>©</span>
              )}
              {isConfigLoading ? (
                <span className="h-3.5 w-48 bg-purple-200/60 rounded animate-pulse inline-block" />
              ) : (
                <span>
                  {config?.companyLegalText?.trim() ? config.companyLegalText.replace(/^©\s*/, '').trim() : 'Lavistore Presentes e Mimos Criativos'}
                </span>
              )}
            </p>
            <span className="hidden sm:inline text-purple-400">•</span>
            <button
              type="button"
              id="btn-footer-bottom-return-policy"
              onClick={onOpenReturnPolicy}
              className="text-purple-800 hover:text-pink-700 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Política de Troca e Devolução (CDC)
            </button>
          </div>
          {config?.showFooterCredits !== false && (
            <div className="flex items-center gap-1.5 text-purple-900 font-semibold">
              {(!config?.footerCreditsText || config?.footerCreditsText.toLowerCase().includes('3 florzinhas') || config?.footerCreditsText.toLowerCase().includes('3 flor zinhas')) ? (
                <p className="flex items-center gap-1">
                  <span>{config?.footerCreditsText ? config.footerCreditsText.replace(/3\s*flor\s*zinhas/i, '').trim() : 'Desenvolvido com o encanto das'}</span>
                  <span className="text-[#8B5CF6] font-bold">3</span>
                  <span className="text-[#06B6D4] font-bold">flor</span>
                  <span className="text-[#F43F5E] font-bold">zinhas</span>
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline ml-1" />
                </p>
              ) : (
                <p className="flex items-center gap-1">
                  <span>{config.footerCreditsText}</span>
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline ml-1" />
                </p>
              )}
              {isAdminEditing && onEditField && (
                <button
                  type="button"
                  onClick={() => onEditField('footerCreditsText', 'Texto de Créditos do Rodapé')}
                  className="p-1 bg-amber-200 hover:bg-amber-300 text-purple-950 rounded-md transition-colors"
                  title="Editar créditos do rodapé"
                >
                  <Edit3 className="w-3 h-3 text-purple-900" />
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </footer>
  );
};
