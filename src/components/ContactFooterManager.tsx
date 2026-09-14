import React, { useState } from 'react';
import { 
  Phone, 
  Mail, 
  Clock, 
  Instagram, 
  ShieldCheck, 
  CreditCard, 
  Lock, 
  Save, 
  RotateCcw, 
  Check, 
  MessageCircle, 
  Building, 
  FileText,
  Sparkles,
  QrCode,
  Heart
} from 'lucide-react';
import { HomePageConfig } from '../types';
import { DEFAULT_HOME_PAGE_CONFIG } from '../utils/textFormatter';

interface ContactFooterManagerProps {
  config: HomePageConfig;
  onSaveConfig: (newConfig: HomePageConfig) => void;
  onResetDefaults: () => void;
}

export const ContactFooterManager: React.FC<ContactFooterManagerProps> = ({
  config,
  onSaveConfig,
  onResetDefaults
}) => {
  const [formData, setFormData] = useState<HomePageConfig>(config);
  const [savedToast, setSavedToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'contact' | 'footer' | 'chat'>('contact');

  const updateField = (fieldKey: keyof HomePageConfig, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Deseja restaurar as informações de contato, redes, rodapé e chat para o padrão original da Lavistore?')) {
      const resetData: HomePageConfig = {
        ...formData,
        whatsappNumber: DEFAULT_HOME_PAGE_CONFIG.whatsappNumber,
        contactEmail: DEFAULT_HOME_PAGE_CONFIG.contactEmail,
        businessHours: DEFAULT_HOME_PAGE_CONFIG.businessHours,
        responseTime: DEFAULT_HOME_PAGE_CONFIG.responseTime,
        instagramHandle: DEFAULT_HOME_PAGE_CONFIG.instagramHandle,
        instagramUrl: DEFAULT_HOME_PAGE_CONFIG.instagramUrl,
        footerDescription: DEFAULT_HOME_PAGE_CONFIG.footerDescription,
        companyLegalText: DEFAULT_HOME_PAGE_CONFIG.companyLegalText,
        sslSecurityText: DEFAULT_HOME_PAGE_CONFIG.sslSecurityText,
        pixDiscountText: DEFAULT_HOME_PAGE_CONFIG.pixDiscountText,
        installmentText: DEFAULT_HOME_PAGE_CONFIG.installmentText,
        securityFooterNote: DEFAULT_HOME_PAGE_CONFIG.securityFooterNote,
        chatConciergeName: DEFAULT_HOME_PAGE_CONFIG.chatConciergeName,
        chatConciergeRole: DEFAULT_HOME_PAGE_CONFIG.chatConciergeRole,
        chatWelcomeTitle: DEFAULT_HOME_PAGE_CONFIG.chatWelcomeTitle,
        chatWelcomeBody: DEFAULT_HOME_PAGE_CONFIG.chatWelcomeBody,
        chatButtonLabel: DEFAULT_HOME_PAGE_CONFIG.chatButtonLabel,
        orderNotificationEmail: DEFAULT_HOME_PAGE_CONFIG.orderNotificationEmail,
        pagSeguroPaymentUrl: DEFAULT_HOME_PAGE_CONFIG.pagSeguroPaymentUrl,
      };
      setFormData(resetData);
      onSaveConfig(resetData);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    }
  };

  return (
    <div className="space-y-6 font-['Comfortaa'] animate-in fade-in">
      
      {/* Header Info */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border-2 border-amber-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-purple-950 text-xs font-bold uppercase tracking-wider border border-amber-300">
            <Phone className="w-3.5 h-3.5 text-amber-600" />
            <span>Central de Contato & Configurações da Loja</span>
          </div>
          <h2 className="font-['Mali'] text-xl sm:text-2xl font-bold text-purple-950">
            Contato, WhatsApp, Redes Sociais & Rodapé
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl">
            Personalize o número do WhatsApp comercial, e-mail de atendimento, dados da empresa, links de redes sociais e os textos do chat flutuante.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 border border-amber-300"
          >
            <Save className="w-4 h-4 text-purple-950" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {savedToast && (
        <div className="bg-emerald-100 border-2 border-emerald-400 text-emerald-950 p-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-600" />
          <span>Informações de contato e rodapé salvas com sucesso! ✨</span>
        </div>
      )}

      {/* Section Subtabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-amber-100/70 border-2 border-amber-300 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'contact'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Phone className="w-3.5 h-3.5 text-rose-300" />
          <span>1. Canais de Atendimento & Redes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'chat'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
          <span>2. Chat Flutuante do WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('footer')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'footer'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Building className="w-3.5 h-3.5 text-amber-300" />
          <span>3. Dados Institucionais do Rodapé</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* TAB 1: CANAIS DE ATENDIMENTO & REDES */}
        {activeTab === 'contact' && (
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-lg font-bold text-purple-950 flex items-center gap-2">
              <Phone className="w-4 h-4 text-rose-500" />
              <span>Canais de Atendimento e Redes Sociais</span>
            </h3>

            <div className="p-5 rounded-2xl bg-white/95 border-2 border-amber-200 shadow-2xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 mb-1">
                    <Phone className="w-3.5 h-3.5 text-rose-500" />
                    <span>WhatsApp da Loja (Exibição & Contato)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.whatsappNumber || DEFAULT_HOME_PAGE_CONFIG.whatsappNumber}
                    onChange={(e) => updateField('whatsappNumber', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    placeholder="Ex: (11) 98765-4321"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Este número é exibido no rodapé e utilizado para abrir conversas de atendimento.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5 text-cyan-600" />
                    <span>E-mail Oficial de Atendimento</span>
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail || DEFAULT_HOME_PAGE_CONFIG.contactEmail}
                    onChange={(e) => updateField('contactEmail', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    placeholder="Ex: contato@lavistore.com.br"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    <span>Horário de Funcionamento</span>
                  </label>
                  <input
                    type="text"
                    value={formData.businessHours || DEFAULT_HOME_PAGE_CONFIG.businessHours}
                    onChange={(e) => updateField('businessHours', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    placeholder="Ex: Seg. a Sex.: 09h às 18h"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tempo Médio de Resposta</span>
                  </label>
                  <input
                    type="text"
                    value={formData.responseTime || DEFAULT_HOME_PAGE_CONFIG.responseTime}
                    onChange={(e) => updateField('responseTime', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    placeholder="Ex: Tempo médio de resposta: ~10 min"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-amber-100">
                <div>
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 mb-1">
                    <Instagram className="w-3.5 h-3.5 text-pink-600" />
                    <span>Perfil do Instagram (@)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.instagramHandle || DEFAULT_HOME_PAGE_CONFIG.instagramHandle}
                    onChange={(e) => updateField('instagramHandle', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    placeholder="Ex: @lavistore.oficial"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 mb-1">
                    <Instagram className="w-3.5 h-3.5 text-pink-600" />
                    <span>Link Completo do Instagram (URL)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.instagramUrl || DEFAULT_HOME_PAGE_CONFIG.instagramUrl}
                    onChange={(e) => updateField('instagramUrl', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    placeholder="Ex: https://instagram.com/lavistore.oficial"
                  />
                </div>
              </div>

              {/* Checkout & Notificação de Pedidos */}
              <div className="pt-4 border-t-2 border-purple-100 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                    Notificações de Vendas
                  </h4>
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5 text-pink-600" />
                    <span>E-mail para Receber Notificações de Vendas</span>
                  </label>
                  <input
                    type="email"
                    value={formData.orderNotificationEmail || DEFAULT_HOME_PAGE_CONFIG.orderNotificationEmail || ''}
                    onChange={(e) => updateField('orderNotificationEmail', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-pink-50/40 border-2 border-pink-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium focus:ring-2 focus:ring-pink-400 focus:outline-none"
                    placeholder="Ex: reginahelena1980@gmail.com"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Para este e-mail serão disparados os relatórios de pedidos gerados na loja com dados completos.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CHAT FLUTUANTE DO WHATSAPP */}
        {activeTab === 'chat' && (
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-lg font-bold text-purple-950 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-500" />
              <span>Personalização do Balão de Chat WhatsApp Flutuante</span>
            </h3>

            <div className="p-5 rounded-2xl bg-white/95 border-2 border-amber-200 shadow-2xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Nome do Concierge / Atendente</label>
                  <input
                    type="text"
                    value={formData.chatConciergeName || DEFAULT_HOME_PAGE_CONFIG.chatConciergeName}
                    onChange={(e) => updateField('chatConciergeName', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium"
                    placeholder="Ex: Concierge Lavistore 🌸"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Status / Cargo</label>
                  <input
                    type="text"
                    value={formData.chatConciergeRole || DEFAULT_HOME_PAGE_CONFIG.chatConciergeRole}
                    onChange={(e) => updateField('chatConciergeRole', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium"
                    placeholder="Ex: Atendimento Online • Suporte a Presentes"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">Mensagem de Boas-Vindas</label>
                <input
                  type="text"
                  value={formData.chatWelcomeTitle || DEFAULT_HOME_PAGE_CONFIG.chatWelcomeTitle}
                  onChange={(e) => updateField('chatWelcomeTitle', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium"
                  placeholder="Ex: Olá, bem-vinda à Lavistore! 🌷"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">Texto de Apoio / Pergunta</label>
                <textarea
                  rows={2}
                  value={formData.chatWelcomeBody || DEFAULT_HOME_PAGE_CONFIG.chatWelcomeBody}
                  onChange={(e) => updateField('chatWelcomeBody', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium"
                  placeholder="Ex: Posso ajudar você a escolher um mimo perfeito, tirar dúvidas sobre o frete ou montar uma caixa personalizada?"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">Rótulo do Botão Flutuante (Launcher)</label>
                <input
                  type="text"
                  value={formData.chatButtonLabel || DEFAULT_HOME_PAGE_CONFIG.chatButtonLabel}
                  onChange={(e) => updateField('chatButtonLabel', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium"
                  placeholder="Ex: Dúvidas? Fale Conosco"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DADOS INSTITUCIONAIS DO RODAPÉ */}
        {activeTab === 'footer' && (
          <div className="space-y-4">
            <h3 className="font-['Mali'] text-lg font-bold text-purple-950 flex items-center gap-2">
              <Building className="w-4 h-4 text-purple-600" />
              <span>Textos Institucionais, Selos e Dados Jurídicos</span>
            </h3>

            <div className="p-5 rounded-2xl bg-white/95 border-2 border-amber-200 shadow-2xs space-y-4">
              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">
                  Breve Apresentação da Marca (Abaixo do Logo no Rodapé)
                </label>
                <textarea
                  rows={3}
                  value={formData.footerDescription || DEFAULT_HOME_PAGE_CONFIG.footerDescription}
                  onChange={(e) => updateField('footerDescription', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium"
                  placeholder="Descrição institucional curta da Lavistore..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">
                  Razão Social, CNPJ e Direitos Autorais (Barra Inferior do Rodapé)
                </label>
                <input
                  type="text"
                  value={formData.companyLegalText || DEFAULT_HOME_PAGE_CONFIG.companyLegalText}
                  onChange={(e) => updateField('companyLegalText', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium"
                  placeholder="Ex: © 2026 Lavistore Presentes e Mimos Criativos"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-purple-950 flex items-center gap-1 mb-1">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>Selo de Segurança</span>
                  </label>
                  <input
                    type="text"
                    value={formData.sslSecurityText || DEFAULT_HOME_PAGE_CONFIG.sslSecurityText}
                    onChange={(e) => updateField('sslSecurityText', e.target.value)}
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-purple-950 flex items-center gap-1 mb-1">
                    <QrCode className="w-3 h-3 text-cyan-600" />
                    <span>Selo Desconto PIX</span>
                  </label>
                  <input
                    type="text"
                    value={formData.pixDiscountText || DEFAULT_HOME_PAGE_CONFIG.pixDiscountText}
                    onChange={(e) => updateField('pixDiscountText', e.target.value)}
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-purple-950 flex items-center gap-1 mb-1">
                    <CreditCard className="w-3 h-3 text-rose-500" />
                    <span>Selo Parcelamento</span>
                  </label>
                  <input
                    type="text"
                    value={formData.installmentText || DEFAULT_HOME_PAGE_CONFIG.installmentText}
                    onChange={(e) => updateField('installmentText', e.target.value)}
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">
                  Nota Explicativa de Segurança de Dados
                </label>
                <input
                  type="text"
                  value={formData.securityFooterNote || DEFAULT_HOME_PAGE_CONFIG.securityFooterNote}
                  onChange={(e) => updateField('securityFooterNote', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl text-xs sm:text-sm text-purple-950 font-medium"
                  placeholder="Ex: Todos os dados são criptografados e protegidos com tecnologia segura de ponta a ponta."
                />
              </div>

              {/* Card de Política Simplificada de Troca e Devolução (CDC) */}
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-pink-50/80 via-purple-50/80 to-indigo-50/80 border-2 border-pink-200 space-y-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-pink-600" />
                  <h4 className="font-bold text-xs sm:text-sm text-purple-950">
                    Política de Troca e Devolução Ativa (Conforme Código de Defesa do Consumidor)
                  </h4>
                </div>
                <p className="text-xs text-purple-900 leading-relaxed">
                  Sua loja possui uma política simplificada em conformidade com a <strong>Lei Federal nº 8.078/90 (CDC Artigo 49)</strong> e <strong>Decreto do E-commerce nº 7.962/13</strong>:
                </p>
                <ul className="text-xs text-purple-950 space-y-1 list-disc list-inside">
                  <li><strong>7 dias corridos:</strong> Direito de arrependimento da cliente com reembolso integral (produto + frete).</li>
                  <li><strong>30 dias corridos:</strong> Troca garantida sem burocracia por avaria no frete ou defeito.</li>
                  <li><strong>Logística Reversa Grátis:</strong> Código de postagem sem custo para a cliente.</li>
                  <li><strong>Canais Automáticos:</strong> As solicitações de troca são direcionadas para o seu WhatsApp (<strong>{formData.whatsappNumber || '(11) 98765-4321'}</strong>) e e-mail (<strong>{formData.contactEmail || 'contato@lavistore.com.br'}</strong>).</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Action Button at bottom */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-amber-200">
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 border border-amber-300 cursor-pointer"
          >
            <Save className="w-4 h-4 text-purple-950" />
            <span>Salvar Informações de Contato & Rodapé</span>
          </button>
        </div>

      </form>
    </div>
  );
};
