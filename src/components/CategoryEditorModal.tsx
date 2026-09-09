import React, { useState } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Package, 
  X,
  AlertCircle
} from 'lucide-react';
import { Category, Product } from '../types';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/categories';

interface CategoryEditorModalProps {
  isOpen: boolean;
  categories: Category[];
  products?: Product[];
  onClose: () => void;
  onSave: (updatedCategories: Category[]) => void;
  onResetToDefault: () => void;
}

const POPULAR_EMOJIS = [
  '🌸', '📖', '🖊️', '🎀', '🎁', '🌷', '📔', '✨', '💐', '🎂',
  '☕', '🧸', '🧦', '🕯️', '🍫', '🎒', '🎨', '💌', '💎', '🦄',
  '🌻', '🍓', '🧁', '⭐', '🌈', '✂️', '🏷️', '📦', '💖', '🌼'
];

const PRESET_BADGES = [
  'Exclusivo',
  'Popular',
  'Mais Vendidos',
  'Novidade ✨',
  'Destaque',
  'Edição Limitada'
];

export const CategoryEditorModal: React.FC<CategoryEditorModalProps> = ({
  isOpen,
  categories,
  products = [],
  onClose,
  onSave,
  onResetToDefault
}) => {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Category state
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🌸');
  const [newCatBadge, setNewCatBadge] = useState('');
  const [newCatDescription, setNewCatDescription] = useState('');
  const [newCatShowInFooter, setNewCatShowInFooter] = useState(true);

  // Sync with prop when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalCategories(categories);
      setIsAddingNew(false);
      setCategoryToDelete(null);
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateField = (id: string, field: keyof Category, value: any) => {
    setLocalCategories(prev => prev.map(cat => {
      if (cat.id === id) {
        return { ...cat, [field]: value };
      }
      return cat;
    }));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= localCategories.length) return;

    setLocalCategories(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
  };

  const handleDeleteCategory = (cat: Category) => {
    // If it's 'todos', don't allow delete
    if (cat.id === 'todos') return;
    setCategoryToDelete(cat);
  };

  const confirmDelete = () => {
    if (!categoryToDelete) return;
    const filtered = localCategories.filter(c => c.id !== categoryToDelete.id);
    setLocalCategories(filtered);
    setCategoryToDelete(null);
    showToast(`Categoria "${categoryToDelete.name}" removida com sucesso.`);
  };

  const handleCreateNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const slug = newCatName.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const newCategory: Category = {
      id: slug || `cat-${Date.now()}`,
      name: newCatName.trim(),
      icon: newCatIcon.trim() || '🌸',
      description: newCatDescription.trim(),
      badge: newCatBadge.trim() || undefined,
      showInFooter: newCatShowInFooter,
      showInFilter: true,
    };

    setLocalCategories(prev => [...prev, newCategory]);
    setNewCatName('');
    setNewCatIcon('🌸');
    setNewCatBadge('');
    setNewCatDescription('');
    setNewCatShowInFooter(true);
    setIsAddingNew(false);
    showToast(`Categoria "${newCategory.name}" incluída! ✨`);
  };

  const handleSaveAndClose = () => {
    onSave(localCategories);
    onClose();
  };

  const handleResetDefaults = () => {
    if (window.confirm('Deseja restaurar as categorias padrão da Lavistore?')) {
      onResetToDefault();
      setLocalCategories(DEFAULT_CATEGORIES);
      showToast('Categorias padrão restauradas! 🔄');
    }
  };

  const nonTodosInModal = localCategories.filter(c => c.id !== 'todos');
  const footerCount = nonTodosInModal.filter(c => nonTodosInModal.length <= 6 || c.showInFooter !== false).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-purple-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in font-['Comfortaa']">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border-2 border-amber-300 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-100 via-yellow-50 to-pink-100 border-b-2 border-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-400 text-purple-950 flex items-center justify-center font-bold shadow-xs">
              <Tag className="w-5 h-5 text-purple-950" />
            </div>
            <div>
              <h3 className="font-['Mali'] text-base sm:text-lg font-bold text-purple-950 flex items-center gap-2">
                <span>Editor de Categorias & Rodapé</span>
                <span className="text-[10px] font-bold bg-amber-200/90 text-purple-900 px-2 py-0.5 rounded-full border border-amber-300">
                  {footerCount} no Rodapé
                </span>
              </h3>
              <p className="text-[11px] text-purple-900 font-medium">
                Inclua, edite, ordene ou exclua as categorias exibidas na loja
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-purple-950 hover:bg-white/80 rounded-full transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {toastMessage && (
          <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-xs font-bold text-purple-950 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Body Content (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Quick Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-100">
            <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
              <span>Categorias Ativas ({localCategories.length})</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(!isAddingNew)}
                className="px-3 py-1.5 bg-gradient-to-r from-[#F43F5E] via-[#FB923C] to-[#FACC15] hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Incluir Nova Categoria</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Restaurar lista padrão"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar</span>
              </button>
            </div>
          </div>

          {/* Form to Add New Category (Collapsible) */}
          {isAddingNew && (
            <form 
              onSubmit={handleCreateNewCategory}
              className="p-4 bg-amber-50/90 rounded-2xl border-2 border-amber-300 space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-['Mali'] text-xs sm:text-sm font-bold text-purple-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Incluir Nova Categoria</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-slate-400 hover:text-purple-950 text-xs font-bold"
                >
                  ✕ Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
                {/* Emoji */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-purple-950 block mb-1">Ícone:</label>
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="w-full h-9 text-center text-lg bg-white border-2 border-amber-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-2xs"
                  />
                </div>

                {/* Name */}
                <div className="sm:col-span-6">
                  <label className="text-[10px] font-bold text-purple-950 block mb-1">Nome da Categoria *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Canecas & Térmicas, Agendas..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border-2 border-amber-200 rounded-xl font-bold text-purple-950 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* Badge */}
                <div className="sm:col-span-4">
                  <label className="text-[10px] font-bold text-purple-950 block mb-1">Selo / Tag (Opcional):</label>
                  <input
                    type="text"
                    placeholder="Ex: Lançamento ✨"
                    value={newCatBadge}
                    onChange={(e) => setNewCatBadge(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs text-purple-950 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Quick Emojis bar */}
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                <span className="text-[9px] font-bold text-slate-400 shrink-0 mr-1">Sugestões:</span>
                {POPULAR_EMOJIS.slice(0, 14).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewCatIcon(emoji)}
                    className={`px-1.5 py-0.5 rounded-lg text-xs hover:bg-amber-200 transition-transform ${newCatIcon === emoji ? 'bg-amber-300 scale-110 font-bold' : ''}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Checkboxes & Submit */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-amber-200">
                <label className="flex items-center gap-2 text-xs font-bold text-purple-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCatShowInFooter}
                    onChange={(e) => setNewCatShowInFooter(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400 accent-amber-500"
                  />
                  <span>Exibir na lista do Rodapé</span>
                </label>

                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-950 hover:bg-purple-900 text-amber-300 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Salvar Nova Categoria</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Existing Categories */}
          <div className="space-y-2.5">
            {localCategories.map((cat, index) => {
              const isTodos = cat.id === 'todos';
              return (
                <div
                  key={cat.id || index}
                  className="bg-white rounded-2xl border-2 border-amber-200/90 hover:border-amber-400 p-3 shadow-2xs transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    
                    {/* Left: Reorder & Emoji & Title */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Reorder Arrows */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMove(index, 'up')}
                          className={`p-0.5 rounded hover:bg-amber-100 ${index === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-purple-950'}`}
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === localCategories.length - 1}
                          onClick={() => handleMove(index, 'down')}
                          className={`p-0.5 rounded hover:bg-amber-100 ${index === localCategories.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-purple-950'}`}
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Emoji Input */}
                      <input
                        type="text"
                        value={cat.icon || '🌸'}
                        onChange={(e) => handleUpdateField(cat.id, 'icon', e.target.value)}
                        className="w-8 h-8 text-center text-base bg-amber-50 border border-amber-300 rounded-lg font-bold shrink-0 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        title="Alterar emoji"
                      />

                      {/* Name Input */}
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => handleUpdateField(cat.id, 'name', e.target.value)}
                        className="flex-1 px-2.5 py-1 bg-amber-50/30 border border-amber-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-1 focus:ring-amber-400 min-w-0"
                      />
                    </div>

                    {/* Right: Badge, Footer Toggle & Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      
                      {/* Badge / Tag Input */}
                      <input
                        type="text"
                        placeholder="Selo..."
                        value={cat.badge || ''}
                        onChange={(e) => handleUpdateField(cat.id, 'badge', e.target.value)}
                        className="w-24 sm:w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-purple-950 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400 hidden sm:block"
                        title="Selo em destaque (ex: Exclusivo, Popular)"
                      />

                      {/* Footer visibility toggle */}
                      {!isTodos && (
                        <button
                          type="button"
                          onClick={() => handleUpdateField(cat.id, 'showInFooter', !cat.showInFooter)}
                          className={`px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 border transition-colors ${
                            cat.showInFooter !== false
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}
                          title="Exibir ou ocultar no Rodapé"
                        >
                          {cat.showInFooter !== false ? <Eye className="w-3 h-3 text-emerald-600" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                          <span className="hidden md:inline">{cat.showInFooter !== false ? 'No Rodapé' : 'Oculta'}</span>
                        </button>
                      )}

                      {/* DELETE CATEGORY BUTTON */}
                      {!isTodos ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200"
                          title={`Excluir categoria "${cat.name}"`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 px-2 py-1 bg-slate-50 rounded-xl">
                          Principal
                        </span>
                      )}

                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer with Action Buttons */}
        <div className="p-4 bg-slate-50 border-t-2 border-amber-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-purple-950 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveAndClose}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-black rounded-2xl text-xs shadow-md border border-amber-300 transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 text-purple-950" />
            <span>Salvar e Aplicar</span>
          </button>
        </div>

      </div>

      {/* MODAL: Confirm Delete */}
      {categoryToDelete && (
        <div 
          className="fixed inset-0 z-60 bg-purple-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setCategoryToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border-2 border-rose-300 space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-['Mali'] text-base font-bold text-purple-950">
                Excluir Categoria?
              </h4>
              <p className="text-xs text-slate-600">
                Tem certeza que deseja remover <strong>"{categoryToDelete.icon} {categoryToDelete.name}"</strong>?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
