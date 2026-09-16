import React, { useState, useRef } from 'react';
import { 
  ShoppingBag, 
  Gift, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Copy, 
  RotateCcw, 
  Sparkles, 
  X, 
  Image as ImageIcon, 
  Upload, 
  Palette, 
  AlertCircle 
} from 'lucide-react';
import { BagType, RibbonOption } from '../types';
import { BAG_TYPES, RIBBON_OPTIONS } from '../data/categories';

interface PackagingRibbonManagerProps {
  bagTypes: BagType[];
  onUpdateBagTypes: (newBags: BagType[]) => void;
  onResetBagTypes: () => void;
  ribbonOptions: RibbonOption[];
  onUpdateRibbonOptions: (newRibbons: RibbonOption[]) => void;
  onResetRibbonOptions: () => void;
}

const PRESET_BAG_IMAGES = [
  { label: 'Amarela Solar', url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=400&q=80' },
  { label: 'Floral Delicado', url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80' },
  { label: 'Kraft & Laço', url: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=400&q=80' },
  { label: 'Caixa & Mimo', url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80' }
];

const PRESET_RIBBON_COLORS = [
  { name: 'Lilás Violeta', hex: '#8B5CF6' },
  { name: 'Turquesa Tiffany', hex: '#06B6D4' },
  { name: 'Rosa Algodão Doce', hex: '#EC4899' },
  { name: 'Dourado Solar', hex: '#FACC15' },
  { name: 'Organza Pérola', hex: '#FBCFE8' },
  { name: 'Vermelho Paixão', hex: '#EF4444' },
  { name: 'Verde Alecrim', hex: '#10B981' },
  { name: 'Azul Céu', hex: '#38BDF8' }
];

export const PackagingRibbonManager: React.FC<PackagingRibbonManagerProps> = ({
  bagTypes,
  onUpdateBagTypes,
  onResetBagTypes,
  ribbonOptions,
  onUpdateRibbonOptions,
  onResetRibbonOptions
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'bags' | 'ribbons'>('bags');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State for Bag
  const [showBagModal, setShowBagModal] = useState(false);
  const [editingBag, setEditingBag] = useState<BagType | null>(null);
  const [bagName, setBagName] = useState('');
  const [bagPrice, setBagPrice] = useState<string>('16.90');
  const [bagDescription, setBagDescription] = useState('');
  const [bagImage, setBagImage] = useState('');
  const [bagColor, setBagColor] = useState('#FACC15');
  const [bagError, setBagError] = useState<string | null>(null);
  const bagFileInputRef = useRef<HTMLInputElement>(null);

  // Modal State for Ribbon
  const [showRibbonModal, setShowRibbonModal] = useState(false);
  const [editingRibbon, setEditingRibbon] = useState<RibbonOption | null>(null);
  const [ribbonName, setRibbonName] = useState('');
  const [ribbonColor, setRibbonColor] = useState('#8B5CF6');
  const [ribbonError, setRibbonError] = useState<string | null>(null);

  // Delete confirmations
  const [bagToDelete, setBagToDelete] = useState<BagType | null>(null);
  const [ribbonToDelete, setRibbonToDelete] = useState<RibbonOption | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // --- BAG HANDLERS ---
  const handleOpenAddBag = () => {
    setEditingBag(null);
    setBagName('');
    setBagPrice('16.90');
    setBagDescription('Sacolinha especial com acabamento artesanal e alça macia.');
    setBagImage(PRESET_BAG_IMAGES[0].url);
    setBagColor('#FACC15');
    setBagError(null);
    setShowBagModal(true);
  };

  const handleOpenEditBag = (bag: BagType) => {
    setEditingBag(bag);
    setBagName(bag.name);
    setBagPrice(bag.price.toString());
    setBagDescription(bag.description || '');
    setBagImage(bag.image);
    setBagColor(bag.color || '#FACC15');
    setBagError(null);
    setShowBagModal(true);
  };

  const handleDuplicateBag = (bag: BagType) => {
    const newBag: BagType = {
      ...bag,
      id: `bag-${Date.now()}`,
      name: `${bag.name} (Cópia)`
    };
    onUpdateBagTypes([...bagTypes, newBag]);
    showToast(`Modelo "${newBag.name}" duplicado com sucesso!`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setBagError('A foto deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setBagImage(result);
        setBagError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBag = (e: React.FormEvent) => {
    e.preventDefault();
    setBagError(null);

    if (!bagName.trim()) {
      setBagError('Por favor, informe o nome do modelo de sacolinha.');
      return;
    }

    const parsedPrice = parseFloat(bagPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setBagError('Informe um valor de venda válido (ex: 16.90).');
      return;
    }

    if (!bagImage.trim()) {
      setBagError('Por favor, insira a URL de uma imagem ou faça upload da foto.');
      return;
    }

    if (editingBag) {
      // Update
      const updated = bagTypes.map(b => 
        b.id === editingBag.id 
          ? {
              ...b,
              name: bagName.trim(),
              price: parsedPrice,
              description: bagDescription.trim(),
              image: bagImage.trim(),
              color: bagColor
            }
          : b
      );
      onUpdateBagTypes(updated);
      showToast('Modelo de sacolinha atualizado com sucesso! ✨');
    } else {
      // Add
      const newBag: BagType = {
        id: `bag-${Date.now()}`,
        name: bagName.trim(),
        price: parsedPrice,
        description: bagDescription.trim(),
        image: bagImage.trim(),
        color: bagColor,
        bgClass: 'from-amber-100 to-yellow-200 border-amber-300'
      };
      onUpdateBagTypes([...bagTypes, newBag]);
      showToast('Novo modelo de sacolinha cadastrado com sucesso! 🛍️');
    }

    setShowBagModal(false);
  };

  const handleConfirmDeleteBag = () => {
    if (!bagToDelete) return;
    if (bagTypes.length <= 1) {
      alert('A loja precisa ter pelo menos 1 modelo de sacolinha ativo para os clientes.');
      setBagToDelete(null);
      return;
    }

    const updated = bagTypes.filter(b => b.id !== bagToDelete.id);
    onUpdateBagTypes(updated);
    showToast(`Modelo "${bagToDelete.name}" excluído.`);
    setBagToDelete(null);
  };

  // --- RIBBON HANDLERS ---
  const handleOpenAddRibbon = () => {
    setEditingRibbon(null);
    setRibbonName('');
    setRibbonColor('#8B5CF6');
    setRibbonError(null);
    setShowRibbonModal(true);
  };

  const handleOpenEditRibbon = (rib: RibbonOption) => {
    setEditingRibbon(rib);
    setRibbonName(rib.name);
    setRibbonColor(rib.color);
    setRibbonError(null);
    setShowRibbonModal(true);
  };

  const handleSaveRibbon = (e: React.FormEvent) => {
    e.preventDefault();
    setRibbonError(null);

    if (!ribbonName.trim()) {
      setRibbonError('Por favor, informe o nome ou cor da fita.');
      return;
    }

    if (editingRibbon) {
      const updated = ribbonOptions.map(r => 
        r.id === editingRibbon.id 
          ? { ...r, name: ribbonName.trim(), color: ribbonColor }
          : r
      );
      onUpdateRibbonOptions(updated);
      showToast('Opção de fita atualizada com sucesso! 🎀');
    } else {
      const newRibbon: RibbonOption = {
        id: `ribbon-${Date.now()}`,
        name: ribbonName.trim(),
        color: ribbonColor
      };
      onUpdateRibbonOptions([...ribbonOptions, newRibbon]);
      showToast('Nova cor de fita cadastrada com sucesso! 🎀');
    }

    setShowRibbonModal(false);
  };

  const handleConfirmDeleteRibbon = () => {
    if (!ribbonToDelete) return;
    if (ribbonOptions.length <= 1) {
      alert('A loja precisa ter pelo menos 1 cor de fita cadastrada para os laços dos presentes.');
      setRibbonToDelete(null);
      return;
    }

    const updated = ribbonOptions.filter(r => r.id !== ribbonToDelete.id);
    onUpdateRibbonOptions(updated);
    showToast(`Fita "${ribbonToDelete.name}" excluída.`);
    setRibbonToDelete(null);
  };

  const handleConfirmResetAll = () => {
    onResetBagTypes();
    onResetRibbonOptions();
    setShowResetConfirm(false);
    showToast('Embalagens e fitas restauradas para o padrão de fábrica!');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-purple-950 text-amber-300 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-amber-300/40 animate-in slide-in-from-bottom-3">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header & Tab Switcher */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-amber-200/70 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
              <span>Experiência Personalizada de Presentes</span>
            </div>
            <h2 className="font-['Mali'] text-lg sm:text-xl font-bold text-purple-950 mt-1">
              Personalização de Sacolinhas & Fitas
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl">
              Gerencie livremente quais modelos de sacolinhas amarelas e opções de fitas de cetim estarão disponíveis para os clientes escolherem na aba <strong>"Monte sua Sacolinha"</strong>.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Restaurar sacolinhas e fitas originais"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Restaurar Padrão</span>
            </button>

            {activeSubTab === 'bags' ? (
              <button
                type="button"
                onClick={handleOpenAddBag}
                className="px-3.5 py-1.5 bg-purple-950 hover:bg-purple-900 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Sacolinha</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenAddRibbon}
                className="px-3.5 py-1.5 bg-purple-950 hover:bg-purple-900 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Fita</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-tabs Selector */}
        <div className="flex items-center gap-2 border-t border-amber-100 pt-3">
          <button
            type="button"
            onClick={() => setActiveSubTab('bags')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'bags'
                ? 'bg-amber-400 text-purple-950 shadow-2xs border border-amber-500'
                : 'bg-white hover:bg-amber-50 text-purple-900 border border-amber-200/70'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Modelos de Sacolinhas ({bagTypes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ribbons')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'ribbons'
                ? 'bg-amber-400 text-purple-950 shadow-2xs border border-amber-500'
                : 'bg-white hover:bg-amber-50 text-purple-900 border border-amber-200/70'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-pink-600" />
            <span>Cores de Fitas & Laços ({ribbonOptions.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: SACONLHAS (BAG MODELS) */}
      {activeSubTab === 'bags' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bagTypes.map((bag, idx) => (
              <div 
                key={bag.id}
                className="bg-white rounded-2xl border-2 border-amber-200/80 shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-all group"
              >
                {/* Image & Price Overlay - Formato quadrado para melhor visualização */}
                <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                  <img
                    src={bag.image}
                    alt={bag.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-400/95 backdrop-blur-xs text-purple-950 font-bold text-xs shadow-xs">
                      R$ {bag.price.toFixed(2)}
                    </span>
                    <span 
                      className="w-4 h-4 rounded-full border border-white shadow-xs" 
                      style={{ backgroundColor: bag.color }}
                      title={`Cor de destaque: ${bag.color}`}
                    />
                  </div>
                  <span className="absolute bottom-2 right-2 text-[10px] font-mono text-purple-950 bg-white/90 px-1.5 py-0.5 rounded-md font-semibold">
                    #{idx + 1}
                  </span>
                </div>

                {/* Bag Info */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3 className="font-bold text-sm text-purple-950 leading-tight">
                      {bag.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {bag.description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-3 bg-slate-50/80 border-t border-amber-100 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => handleDuplicateBag(bag)}
                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-purple-900 border border-amber-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Duplicar modelo"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Duplicar</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditBag(bag)}
                      className="px-3 py-1.5 rounded-xl bg-amber-300 hover:bg-amber-400 text-purple-950 text-xs font-bold flex items-center gap-1 border border-amber-400 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBagToDelete(bag)}
                      disabled={bagTypes.length <= 1}
                      className={`p-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                        bagTypes.length <= 1
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer'
                      }`}
                      title={bagTypes.length <= 1 ? 'Mínimo de 1 modelo obrigatório' : 'Excluir sacolinha'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: FITAS & LAÇOS (RIBBONS) */}
      {activeSubTab === 'ribbons' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ribbonOptions.map((rib, idx) => (
              <div
                key={rib.id}
                className="bg-white rounded-2xl border-2 border-amber-200/80 p-4 shadow-2xs flex items-center justify-between gap-3 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  {/* Ribbon color swatch */}
                  <div
                    className="w-10 h-10 rounded-full border-2 border-white shadow-sm ring-2 ring-amber-200/60 shrink-0"
                    style={{ backgroundColor: rib.color }}
                  />
                  <div>
                    <h3 className="font-bold text-sm text-purple-950">
                      {rib.name}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 uppercase">
                      {rib.color}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Laço duplo clássico com ponteira
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditRibbon(rib)}
                    className="p-1.5 rounded-xl bg-amber-300 hover:bg-amber-400 text-purple-950 text-xs font-bold border border-amber-400 transition-colors cursor-pointer"
                    title="Editar fita"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setRibbonToDelete(rib)}
                    disabled={ribbonOptions.length <= 1}
                    className={`p-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      ribbonOptions.length <= 1
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer'
                    }`}
                    title={ribbonOptions.length <= 1 ? 'Mínimo de 1 cor obrigatória' : 'Excluir fita'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MODAL: CADASTRO / EDIÇÃO DE SACOLINHA --- */}
      {showBagModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 border-2 border-amber-300 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-['Mali'] text-base sm:text-lg font-bold text-purple-950">
                    {editingBag ? 'Editar Modelo de Sacolinha' : 'Nova Sacolinha Amarela'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Personalize fotos, valores e acabamento</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBagModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-purple-950 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bagError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{bagError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBag} className="space-y-3.5 text-xs">
              {/* Nome do modelo */}
              <div>
                <label className="block font-bold text-purple-950 mb-1">
                  Nome do Modelo da Sacolinha *
                </label>
                <input
                  type="text"
                  value={bagName}
                  onChange={(e) => setBagName(e.target.value)}
                  placeholder="Ex: Sacolinha Amarela Floral Trio Lavistore"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-400 text-purple-950 font-medium"
                />
              </div>

              {/* Preço e Cor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Preço da Embalagem (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={bagPrice}
                    onChange={(e) => setBagPrice(e.target.value)}
                    placeholder="16.90"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-400 text-purple-950 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Tom / Cor de Destaque
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bagColor}
                      onChange={(e) => setBagColor(e.target.value)}
                      className="w-9 h-9 p-0.5 rounded-lg border border-slate-200 cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={bagColor}
                      onChange={(e) => setBagColor(e.target.value)}
                      className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-purple-950 font-bold text-center uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block font-bold text-purple-950 mb-1">
                  Descrição do Acabamento
                </label>
                <textarea
                  rows={2}
                  value={bagDescription}
                  onChange={(e) => setBagDescription(e.target.value)}
                  placeholder="Ex: Sacolinha especial em papel encorpado com alça macia e seda floral perfumada..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-400 text-purple-950 font-medium"
                />
              </div>

              {/* Foto da Sacolinha */}
              <div>
                <label className="block font-bold text-purple-950 mb-1">
                  Foto da Embalagem *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bagImage}
                    onChange={(e) => setBagImage(e.target.value)}
                    placeholder="Cole a URL da foto ou selecione um arquivo..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-400 text-purple-950 text-xs font-mono"
                  />
                  <input
                    type="file"
                    ref={bagFileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => bagFileInputRef.current?.click()}
                    className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-xl flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">Fotos prontas:</span>
                  {PRESET_BAG_IMAGES.map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setBagImage(preset.url)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-purple-950 font-medium shrink-0 cursor-pointer border border-slate-200"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Live Photo Preview */}
                {bagImage && (
                  <div className="mt-2 relative aspect-square max-h-48 mx-auto rounded-xl border border-amber-200 overflow-hidden bg-slate-50">
                    <img
                      src={bagImage}
                      alt="Preview da sacolinha"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 text-[9px] bg-purple-950/80 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                      Prévia quadrada (1:1)
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-amber-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBagModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 text-amber-300 font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Modelo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CADASTRO / EDIÇÃO DE FITA --- */}
      {showRibbonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 border-2 border-amber-300 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-['Mali'] text-base sm:text-lg font-bold text-purple-950">
                    {editingRibbon ? 'Editar Fita & Laço' : 'Nova Cor de Fita de Cetim'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Escolha o nome e o tom exato da fita</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRibbonModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-purple-950 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {ribbonError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{ribbonError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRibbon} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-purple-950 mb-1">
                  Nome da Fita / Acabamento *
                </label>
                <input
                  type="text"
                  value={ribbonName}
                  onChange={(e) => setRibbonName(e.target.value)}
                  placeholder="Ex: Fita de Gorgurão Turquesa Tiffany"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-400 text-purple-950 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-purple-950 mb-1">
                  Cor da Fita (Selecione ou digite o Hexadecimal) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={ribbonColor}
                    onChange={(e) => setRibbonColor(e.target.value)}
                    className="w-12 h-12 p-1 rounded-2xl border border-slate-200 cursor-pointer bg-white shadow-2xs"
                  />
                  <input
                    type="text"
                    value={ribbonColor}
                    onChange={(e) => setRibbonColor(e.target.value)}
                    placeholder="#8B5CF6"
                    className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-purple-950 font-bold uppercase"
                  />
                </div>
              </div>

              {/* Cores sugeridas da identidade visual */}
              <div>
                <span className="block font-bold text-purple-950 mb-1.5">
                  Sugestões da Paleta Lavistore:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_RIBBON_COLORS.map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => {
                        setRibbonColor(preset.hex);
                        if (!ribbonName) {
                          setRibbonName(`Fita de Cetim ${preset.name}`);
                        }
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 flex items-center gap-1.5 text-slate-700 font-medium cursor-pointer"
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview de como aparece no Kit Builder */}
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80">
                <span className="text-[10px] font-bold text-purple-950 block mb-1">
                  Prévia no Passo 3 do Cliente:
                </span>
                <div className="p-2.5 rounded-xl border border-amber-300 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full border-2 border-white shadow-xs"
                      style={{ backgroundColor: ribbonColor }}
                    />
                    <div>
                      <p className="font-bold text-purple-950">{ribbonName || 'Nome da fita'}</p>
                      <p className="text-[10px] text-slate-400">Laço duplo clássico com ponteira</p>
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-amber-600" />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-amber-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRibbonModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 text-amber-300 font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Fita</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUSÃO DE SACOLINHA */}
      {bagToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 border-2 border-rose-300 shadow-2xl space-y-3 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-['Mali'] text-base font-bold text-purple-950">
              Excluir este Modelo?
            </h3>
            <p className="text-xs text-slate-600">
              Deseja remover a embalagem <strong>"{bagToDelete.name}"</strong>? Ela deixará de aparecer para os clientes montarem novos kits.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setBagToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBag}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUSÃO DE FITA */}
      {ribbonToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 border-2 border-rose-300 shadow-2xl space-y-3 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-['Mali'] text-base font-bold text-purple-950">
              Excluir esta Fita?
            </h3>
            <p className="text-xs text-slate-600">
              Deseja remover a fita <strong>"{ribbonToDelete.name}"</strong>?
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setRibbonToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRibbon}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESTAURAR PADRÃO DE FÁBRICA */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 border-2 border-amber-300 shadow-2xl space-y-3 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="font-['Mali'] text-base font-bold text-purple-950">
              Restaurar Modelos Originais?
            </h3>
            <p className="text-xs text-slate-600">
              Isso voltará a lista de sacolinhas amarelas e fitas para as opções originais de fábrica da Lavistore.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetAll}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-500 text-purple-950 shadow-md cursor-pointer"
              >
                Sim, Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
