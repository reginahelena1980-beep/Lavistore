import React, { useState } from 'react';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Copy, 
  RotateCcw, 
  Sparkles, 
  Truck, 
  Percent, 
  DollarSign, 
  AlertCircle,
  X,
  Power,
  Gift
} from 'lucide-react';
import { Coupon, CouponType } from '../types';
import { DEFAULT_COUPONS } from '../data/coupons';

interface CouponManagerProps {
  coupons: Coupon[];
  onSaveCoupons: (newCoupons: Coupon[]) => void;
  onResetCoupons: () => void;
}

export const CouponManager: React.FC<CouponManagerProps> = ({
  coupons,
  onSaveCoupons,
  onResetCoupons
}) => {
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<Coupon | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for creating / editing
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<CouponType>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(10);
  const [formMinOrderValue, setFormMinOrderValue] = useState<string>('0');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormCode('');
    setFormDescription('');
    setFormType('percentage');
    setFormDiscountValue(10);
    setFormMinOrderValue('0');
    setFormIsActive(true);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormCode(coupon.code);
    setFormDescription(coupon.description || '');
    setFormType(coupon.type);
    setFormDiscountValue(coupon.discountValue || 0);
    setFormMinOrderValue(coupon.minOrderValue ? coupon.minOrderValue.toString() : '0');
    setFormIsActive(coupon.isActive);
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = formCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanCode) {
      setFormError('Por favor, informe o nome ou código do cupom.');
      return;
    }

    // Check duplicate code (excluding current editing coupon)
    const duplicate = coupons.find(c => 
      c.code.toUpperCase() === cleanCode && (!editingCoupon || c.id !== editingCoupon.id)
    );
    if (duplicate) {
      setFormError(`Já existe um cupom cadastrado com o código "${cleanCode}". Escolha outro nome.`);
      return;
    }

    const minOrder = parseFloat(formMinOrderValue) || 0;
    const discountVal = (formType === 'free_shipping' || formType === 'gift') ? 0 : Number(formDiscountValue);

    if (formType === 'percentage' && (discountVal <= 0 || discountVal > 100)) {
      setFormError('Para cupom percentual, o desconto deve estar entre 1% e 100%.');
      return;
    }

    if (formType === 'fixed' && discountVal <= 0) {
      setFormError('Para cupom de valor fixo, o desconto em R$ deve ser maior que zero.');
      return;
    }

    if (editingCoupon) {
      // Update existing coupon
      const updatedList = coupons.map(c => {
        if (c.id === editingCoupon.id) {
          return {
            ...c,
            code: cleanCode,
            description: formDescription.trim() || getDefaultDescription(formType, discountVal, cleanCode),
            type: formType,
            discountValue: discountVal,
            minOrderValue: minOrder > 0 ? minOrder : undefined,
            isActive: formIsActive
          };
        }
        return c;
      });

      onSaveCoupons(updatedList);
      showToast(`✨ Cupom "${cleanCode}" alterado com sucesso!`);
    } else {
      // Create new coupon
      const newCoupon: Coupon = {
        id: `coupon-${Date.now()}`,
        code: cleanCode,
        description: formDescription.trim() || getDefaultDescription(formType, discountVal, cleanCode),
        type: formType,
        discountValue: discountVal,
        minOrderValue: minOrder > 0 ? minOrder : undefined,
        isActive: formIsActive,
        timesUsed: 0,
        createdAt: new Date().toISOString().slice(0, 10)
      };

      onSaveCoupons([newCoupon, ...coupons]);
      showToast(`🎉 Novo cupom "${cleanCode}" criado com sucesso!`);
    }

    setShowModal(false);
  };

  const getDefaultDescription = (type: CouponType, val: number, code: string) => {
    if (type === 'gift') return `Cupom Especial de Brinde: Compra 100% Grátis (Total R$ 0,00)`;
    if (type === 'free_shipping') return `Frete Grátis garantido para todo o Brasil com o cupom ${code}`;
    if (type === 'percentage') return `${val}% de desconto no valor total dos mimos`;
    return `R$ ${val.toFixed(2)} de desconto especial no seu pedido`;
  };

  const handleToggleActive = (coupon: Coupon) => {
    const updatedList = coupons.map(c => {
      if (c.id === coupon.id) {
        return { ...c, isActive: !c.isActive };
      }
      return c;
    });
    onSaveCoupons(updatedList);
    showToast(
      !coupon.isActive 
        ? `🟢 Cupom "${coupon.code}" ativado para clientes!` 
        : `⏸️ Cupom "${coupon.code}" pausado temporariamente.`
    );
  };

  const handleDeleteCoupon = () => {
    if (!showDeleteConfirmModal) return;
    const deletedCode = showDeleteConfirmModal.code;
    const updatedList = coupons.filter(c => c.id !== showDeleteConfirmModal.id);
    onSaveCoupons(updatedList);
    setShowDeleteConfirmModal(null);
    showToast(`🗑️ Cupom "${deletedCode}" foi excluído.`);
  };

  const handleConfirmReset = () => {
    onResetCoupons();
    setShowResetConfirmModal(false);
    showToast('🔄 Cupons restaurados para o padrão original da loja!');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`📋 Código "${code}" copiado para a área de transferência!`);
  };

  // Metrics
  const activeCouponsCount = coupons.filter(c => c.isActive).length;
  const freeShippingCouponsCount = coupons.filter(c => c.type === 'free_shipping').length;
  const giftCouponsCount = coupons.filter(c => c.type === 'gift').length;
  const discountCouponsCount = coupons.filter(c => c.type === 'percentage' || c.type === 'fixed').length;

  return (
    <div className="space-y-6 font-['Comfortaa'] animate-in fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-purple-950 text-amber-300 px-5 py-3 rounded-2xl font-bold text-xs shadow-2xl border-2 border-amber-400 flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Quick Metrics */}
      <div className="bg-gradient-to-r from-amber-100/90 via-white to-pink-100/80 rounded-3xl p-6 sm:p-8 border-2 border-amber-300 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-200/80 text-purple-950 text-xs font-bold border border-amber-300">
              <Ticket className="w-3.5 h-3.5 text-amber-700" />
              <span>Gerenciamento de Cupons & Promoções</span>
            </div>
            <h2 className="font-['Mali'] text-2xl sm:text-3xl font-bold text-purple-950">
              Cupons de Desconto & Frete Grátis 🎟️
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 max-w-2xl font-medium leading-relaxed">
              Crie, edite e ative os cupons da sua loja. Você pode criar cupons de <strong>Frete Grátis</strong> (que zeram o frete real), cupons de <strong>Brinde (Compra R$ 0,00)</strong> ou cupons de <strong>Porcentagem (%)</strong> e <strong>Valor Fixo (R$)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="admin-create-coupon-btn"
              onClick={handleOpenCreateModal}
              className="px-5 py-3 bg-purple-950 hover:bg-purple-900 text-amber-300 font-bold rounded-2xl text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 border border-amber-400 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Criar Novo Cupom</span>
            </button>

            <button
              id="admin-reset-coupons-btn"
              onClick={() => setShowResetConfirmModal(true)}
              className="px-4 py-3 bg-white hover:bg-amber-50 text-purple-950 font-bold rounded-2xl text-xs border-2 border-amber-200 shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
              title="Restaurar lista de cupons originais"
            >
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span>Restaurar Padrão</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-amber-200/80">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 border-2 border-amber-200 shadow-2xs space-y-1">
            <span className="text-[11px] text-slate-500 font-bold block">Total de Cupons</span>
            <p className="font-['Mali'] text-2xl font-bold text-purple-950">{coupons.length}</p>
            <span className="text-[10px] text-amber-700 font-medium">Cadastrados no sistema</span>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 border-2 border-emerald-200 shadow-2xs space-y-1">
            <span className="text-[11px] text-emerald-800 font-bold block">Cupons Ativos</span>
            <p className="font-['Mali'] text-2xl font-bold text-emerald-600">{activeCouponsCount}</p>
            <span className="text-[10px] text-emerald-700 font-medium">Disponíveis aos clientes</span>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 border-2 border-sky-200 shadow-2xs space-y-1">
            <span className="text-[11px] text-sky-800 font-bold block">Frete Grátis</span>
            <p className="font-['Mali'] text-2xl font-bold text-sky-700">{freeShippingCouponsCount}</p>
            <span className="text-[10px] text-sky-700 font-medium">Zeram o frete real</span>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3.5 border-2 border-pink-200 shadow-2xs space-y-1">
            <span className="text-[11px] text-pink-800 font-bold block">Brindes (R$ 0,00)</span>
            <p className="font-['Mali'] text-2xl font-bold text-pink-600">{giftCouponsCount}</p>
            <span className="text-[10px] text-pink-700 font-medium">{discountCouponsCount} com %/R$ OFF</span>
          </div>
        </div>
      </div>

      {/* Informative Guidance Banner */}
      <div className="bg-amber-50/90 border-2 border-amber-200/90 rounded-2xl p-4 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Como funciona para os clientes:</strong> Ao digitar o cupom na Sacolinha ou no Checkout, o sistema valida automaticamente o código em letras maiúsculas e sem acentos. Se o cupom for de <strong>Frete Grátis</strong>, o valor da transportadora é zerado automaticamente para <strong>R$ 0,00</strong>!
          </p>
        </div>
      </div>

      {/* Coupons List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-['Mali'] text-lg font-bold text-purple-950 flex items-center gap-2">
            <span>Cupons Cadastrados ({coupons.length})</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Clique no ícone de editar para alterar nome, valor ou regras
          </span>
        </div>

        {coupons.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-amber-200 space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl">
              🎟️
            </div>
            <div className="space-y-1">
              <h4 className="font-['Mali'] text-lg font-bold text-purple-950">Nenhum cupom cadastrado</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Você ainda não possui cupons cadastrados ou excluiu todos. Crie um novo cupom ou restaure os padrões da loja.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2.5 bg-purple-950 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Primeiro Cupom</span>
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2.5 bg-amber-100 text-purple-950 font-bold rounded-xl text-xs border border-amber-300"
              >
                Restaurar Padrão
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coupons.map((coupon) => (
              <div 
                key={coupon.id}
                className={`bg-white rounded-3xl p-5 border-2 transition-all shadow-xs hover:shadow-md relative overflow-hidden flex flex-col justify-between gap-4 ${
                  coupon.isActive 
                    ? 'border-amber-200/90 hover:border-amber-400' 
                    : 'border-slate-200 bg-slate-50/70 opacity-75'
                }`}
              >
                {/* Header of card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Code Badge */}
                      <span className="font-mono font-black text-sm sm:text-base tracking-wider px-3 py-1 rounded-xl bg-purple-950 text-amber-300 border border-purple-900 shadow-2xs flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5 text-amber-300" />
                        <span>{coupon.code}</span>
                      </span>

                      {/* Quick copy button */}
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-950 hover:bg-amber-100 transition-colors"
                        title="Copiar código do cupom"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Status indicator */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        coupon.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border-slate-300'
                      }`}>
                        {coupon.isActive ? '● Ativo' : '○ Pausado'}
                      </span>
                    </div>

                    {/* Type and value highlight */}
                    <div className="flex items-center gap-2 pt-1">
                      {coupon.type === 'gift' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-pink-900 bg-pink-100/90 px-2.5 py-0.5 rounded-lg border border-pink-300">
                          <Gift className="w-3.5 h-3.5 text-pink-600" />
                          <span>Brinde (Compra R$ 0,00)</span>
                        </span>
                      )}

                      {coupon.type === 'free_shipping' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                          <Truck className="w-3.5 h-3.5 text-sky-600" />
                          <span>Frete Grátis (R$ 0,00)</span>
                        </span>
                      )}

                      {coupon.type === 'percentage' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-lg border border-amber-300">
                          <Percent className="w-3.5 h-3.5 text-amber-700" />
                          <span>{coupon.discountValue}% de Desconto</span>
                        </span>
                      )}

                      {coupon.type === 'fixed' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-900 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                          <span>R$ {coupon.discountValue.toFixed(2)} OFF</span>
                        </span>
                      )}

                      {coupon.minOrderValue && coupon.minOrderValue > 0 ? (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          Mín. R$ {coupon.minOrderValue.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          Sem pedido mínimo
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 font-medium leading-relaxed pt-1">
                      {coupon.description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    {coupon.createdAt && (
                      <span>Criado em {coupon.createdAt}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Toggle Active / Paused */}
                    <button
                      onClick={() => handleToggleActive(coupon)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
                        coupon.isActive
                          ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      }`}
                      title={coupon.isActive ? 'Pausar cupom' : 'Ativar cupom'}
                    >
                      <Power className="w-3 h-3" />
                      <span>{coupon.isActive ? 'Pausar' : 'Ativar'}</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEditModal(coupon)}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-950 font-bold rounded-xl text-xs border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Editar cupom"
                    >
                      <Edit2 className="w-3 h-3 text-purple-700" />
                      <span>Editar</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => setShowDeleteConfirmModal(coupon)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Excluir cupom"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT COUPON MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-amber-300 relative space-y-5 animate-in zoom-in-95">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-purple-950 p-1 rounded-full hover:bg-amber-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                <Ticket className="w-3.5 h-3.5 text-amber-700" />
                <span>{editingCoupon ? 'Editar Cupom' : 'Novo Cupom da Loja'}</span>
              </div>
              <h3 className="font-['Mali'] text-2xl font-bold text-purple-950">
                {editingCoupon ? `Alterar Cupom: ${editingCoupon.code}` : 'Criar Novo Cupom'}
              </h3>
              <p className="text-xs text-slate-500">
                Preencha o código e as regras de desconto para seus clientes.
              </p>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCoupon} className="space-y-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1">
                  Nome / Código do Cupom *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="Digite o código do cupom aqui"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-hidden font-mono font-bold text-purple-950 text-sm tracking-wider uppercase"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  O código será digitado pelos clientes no carrinho ou checkout. Sem espaços ou acentos.
                </p>
              </div>

              {/* Type Selection */}
              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1.5">
                  Tipo de Cupom *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('gift')}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      formType === 'gift'
                        ? 'border-pink-500 bg-pink-50 text-pink-950 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-pink-200 text-slate-600'
                    }`}
                  >
                    <Gift className="w-5 h-5 mx-auto mb-1 text-pink-600" />
                    <span className="text-xs block font-bold">Brinde (R$ 0,00)</span>
                    <span className="text-[10px] text-slate-500 block">Zera toda a compra</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('free_shipping')}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      formType === 'free_shipping'
                        ? 'border-sky-500 bg-sky-50 text-sky-950 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-amber-200 text-slate-600'
                    }`}
                  >
                    <Truck className="w-5 h-5 mx-auto mb-1 text-sky-600" />
                    <span className="text-xs block font-bold">Frete Grátis</span>
                    <span className="text-[10px] text-slate-500 block">Zera o frete real</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('percentage')}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      formType === 'percentage'
                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-amber-200 text-slate-600'
                    }`}
                  >
                    <Percent className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                    <span className="text-xs block font-bold">Porcentagem (%)</span>
                    <span className="text-[10px] text-slate-500 block">Ex: 10%, 15% OFF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('fixed')}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      formType === 'fixed'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-amber-200 text-slate-600'
                    }`}
                  >
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                    <span className="text-xs block font-bold">Valor Fixo (R$)</span>
                    <span className="text-[10px] text-slate-500 block">Ex: R$ 15,00 OFF</span>
                  </button>
                </div>
              </div>

              {/* Guidance for gift coupon */}
              {formType === 'gift' && (
                <div className="p-4 bg-gradient-to-r from-pink-50 via-purple-50 to-amber-50 rounded-2xl border-2 border-pink-300 text-xs text-purple-950 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-pink-700">
                    <Gift className="w-4 h-4 text-pink-600 shrink-0" />
                    <span>Opção Cupom BRINDE (Compra 100% Grátis)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Quando este cupom for aplicado na Sacola ou Checkout, o valor dos produtos e do frete serão zerados (<strong>Total: R$ 0,00</strong>). O cliente não precisará pagar nada.
                  </p>
                </div>
              )}

              {/* Value (only if percentage or fixed) */}
              {formType !== 'free_shipping' && formType !== 'gift' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-purple-950 mb-1">
                      {formType === 'percentage' ? 'Desconto em Porcentagem (%) *' : 'Desconto em Reais (R$) *'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={formType === 'percentage' ? '100' : '9999'}
                        step={formType === 'percentage' ? '1' : '0.50'}
                        required
                        value={formDiscountValue}
                        onChange={(e) => setFormDiscountValue(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-hidden font-bold text-purple-950 text-sm"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                        {formType === 'percentage' ? '%' : 'R$'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-950 mb-1">
                      Pedido Mínimo (R$, opcional)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formMinOrderValue}
                        onChange={(e) => setFormMinOrderValue(e.target.value)}
                        placeholder="Digite o valor mínimo do pedido aqui"
                        className="w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-hidden text-slate-700 text-sm"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-slate-400">
                        R$
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Min order for free shipping */}
              {formType === 'free_shipping' && (
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1">
                    Valor Mínimo do Pedido para Frete Grátis (R$, opcional)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formMinOrderValue}
                      onChange={(e) => setFormMinOrderValue(e.target.value)}
                      placeholder="Digite o valor mínimo para frete grátis aqui"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-hidden text-slate-700 text-sm"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400">
                      R$
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Deixe em 0 para frete grátis em qualquer valor de pedido.
                  </p>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1">
                  Descrição / Mensagem de Sucesso (Opcional)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Escreva a mensagem de desconto do cupom aqui"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-hidden text-xs text-slate-700"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Mensagem carinhosa exibida ao cliente quando o cupom for validado com sucesso.
                </p>
              </div>

              {/* Status Switch */}
              <div className="flex items-center justify-between p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200">
                <div>
                  <p className="text-xs font-bold text-purple-950">Status do Cupom</p>
                  <p className="text-[11px] text-slate-500">
                    {formIsActive ? 'Ativo e aceito no carrinho e checkout' : 'Pausado (clientes não conseguirão aplicar)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    formIsActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      formIsActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-950 hover:bg-purple-900 text-amber-300 font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{editingCoupon ? 'Salvar Alterações' : 'Cadastrar Cupom'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-rose-300 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-['Mali'] text-xl font-bold text-purple-950">
                Excluir Cupom?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tem certeza que deseja excluir o cupom <strong className="text-purple-950 font-mono">"{showDeleteConfirmModal.code}"</strong>? Os clientes não poderão mais utilizá-lo.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => setShowDeleteConfirmModal(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteCoupon}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                Sim, Excluir Cupom
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-amber-300 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-['Mali'] text-xl font-bold text-purple-950">
                Restaurar Cupons Originais?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Isso restaurará os cupons padrões da loja: <strong className="text-purple-950 font-mono">FRETEGRATIS, DESCONTO10, BEMVINDO e PRIMEIRACOMPRA</strong>.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-5 py-2.5 bg-purple-950 hover:bg-purple-900 text-amber-300 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                Sim, Restaurar Padrão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
