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
  HelpCircle,
  FolderTree,
  Palette,
  ExternalLink
} from 'lucide-react';
import { Category, Product } from '../types';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/categories';

interface CategoryManagerProps {
  categories: Category[];
  products: Product[];
  onSaveCategories: (newCategories: Category[]) => void;
  onResetCategories: () => void;
  onGoToStorefront?: () => void;
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
  'Edição Limitada',
  'Oferta'
];

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  products,
  onSaveCategories,
  onResetCategories,
  onGoToStorefront
}) => {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // New Category Form state
  const [newCat, setNewCat] = useState<Partial<Category>>({
    name: '',
    icon: '🌸',
    id: '',
    description: '',
    badge: '',
    showInFooter: true,
    showInFilter: true,
  });

  // Sync if props change
  React.useEffect(() => {
    if (!hasUnsavedChanges) {
      setLocalCategories(categories);
    }
  }, [categories, hasUnsavedChanges]);

  const showNotification = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Update a single field in a category
  const handleUpdateCategory = (id: string, field: keyof Category, value: any) => {
    const updated = localCategories.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      return c;
    });
    setLocalCategories(updated);

    // If toggling visibility, apply immediately
    if (field === 'showInFooter') {
      onSaveCategories(updated);
      setHasUnsavedChanges(false);
    } else {
      setHasUnsavedChanges(true);
    }
  };

  // Move Category Up / Down
  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= localCategories.length) return;

    const updated = [...localCategories];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    setLocalCategories(updated);
    onSaveCategories(updated);
    setHasUnsavedChanges(false);
  };

  // Save changes
  const handleSaveAll = () => {
    onSaveCategories(localCategories);
    setHasUnsavedChanges(false);
    showNotification('Categorias e opções do Rodapé salvas com sucesso! 🌸');
  };

  // Add new Category
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name?.trim()) return;

    // Generate slug ID if empty
    const slug = newCat.id?.trim() 
      ? newCat.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
      : newCat.name.trim().toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-');

    const createdCategory: Category = {
      id: slug || `cat-${Date.now()}`,
      name: newCat.name.trim(),
      icon: newCat.icon?.trim() || '🌸',
      description: newCat.description?.trim() || '',
      badge: newCat.badge?.trim() || undefined,
      showInFooter: newCat.showInFooter ?? true,
      showInFilter: newCat.showInFilter ?? true,
    };

    const updated = [...localCategories, createdCategory];
    setLocalCategories(updated);
    onSaveCategories(updated);
    setHasUnsavedChanges(false);
    setShowAddModal(false);
    setNewCat({
      name: '',
      icon: '🌸',
      id: '',
      description: '',
      badge: '',
      showInFooter: true,
      showInFilter: true,
    });
    showNotification(`Categoria "${createdCategory.name}" adicionada com sucesso! ✨`);
  };

  // Confirm delete category
  const handleConfirmDelete = () => {
    if (!categoryToDelete) return;
    const updated = localCategories.filter(c => c.id !== categoryToDelete.id);
    setLocalCategories(updated);
    onSaveCategories(updated);
    setCategoryToDelete(null);
    setHasUnsavedChanges(false);
    showNotification(`Categoria "${categoryToDelete.name}" removida.`);
  };

  // Reset to original categories
  const handleConfirmReset = () => {
    onResetCategories();
    setLocalCategories(DEFAULT_CATEGORIES);
    setHasUnsavedChanges(false);
    setShowResetModal(false);
    showNotification('Categorias padrão restauradas para a configuração original! 🔄');
  };

  // Helper to count products in a category
  const getProductCount = (categoryId: string) => {
    if (categoryId === 'todos') return products.length;
    return products.filter(p => p.category === categoryId).length;
  };

  const nonTodos = localCategories.filter(c => c.id !== 'todos');
  const footerCategories = nonTodos.filter(c => {
    if (nonTodos.length <= 6) {
      return true;
    }
    return c.showInFooter !== false;
  });

  return (
    <div className="space-y-8 animate-in fade-in font-['Comfortaa']">
      
      {/* Top Banner & Instructions */}
      <div className="bg-white/85 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-amber-200/80 shadow-2xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-amber-100/80 text-purple-950 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-amber-200/80 shadow-2xs">
            <FolderTree className="w-3 h-3 text-amber-800" />
            <span>Personalização de Categorias & Rodapé</span>
          </div>
          <h2 className="font-['Mali'] text-xl sm:text-2xl font-bold text-purple-950">
            Editor de Categorias da Loja
          </h2>
          <p className="text-xs text-purple-900/80 font-normal leading-relaxed">
            Edite nomes, emojis, descrições e a ordem das categorias que aparecem na vitrine, no rodapé e no cadastro de produtos.
          </p>
        </div>

        {/* Header Action Buttons - Delicate & Smaller */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none px-3.5 py-1.5 bg-purple-950 hover:bg-purple-900 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Categoria</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-purple-900 hover:text-rose-700 rounded-xl text-xs font-medium border border-amber-200/80 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Restaurar lista original padrão"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restaurar Padrão</span>
          </button>

          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-3.5 py-1.5 bg-purple-950 hover:bg-purple-900 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs animate-pulse cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-amber-400" />
              <span>Salvar Alterações</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {saveToast && (
        <div className="bg-amber-100/90 border border-amber-300 text-purple-950 p-2.5 px-3.5 rounded-xl font-medium text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>{saveToast}</span>
          </div>
        </div>
      )}

      {/* Grid: Editor List & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Categories List (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border-2 border-amber-200 shadow-2xs text-xs font-bold text-purple-950">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-600" />
              <span>Categorias Cadastradas ({localCategories.length})</span>
            </div>
            <span className="text-[11px] text-purple-900 font-medium">
              💡 {footerCategories.length} exibidas no Rodapé
            </span>
          </div>

          <div className="space-y-3.5">
            {localCategories.map((cat, index) => {
              const count = getProductCount(cat.id);
              const isTodos = cat.id === 'todos';

              return (
                <div
                  key={cat.id || index}
                  className="bg-white rounded-2xl border-2 border-amber-200/90 hover:border-amber-400 p-4 shadow-xs transition-all space-y-3 relative group"
                >
                  {/* Top Row: Reorder, Icon, Title, Visibility & Delete */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3">
                    
                    {/* Left: Reorder arrows & Emoji Selector */}
                    <div className="flex items-center gap-2.5">
                      {/* Move Up/Down Controls */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveCategory(index, 'up')}
                          className={`p-1 rounded-md transition-colors ${
                            index === 0
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-purple-950 hover:bg-amber-100'
                          }`}
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === localCategories.length - 1}
                          onClick={() => handleMoveCategory(index, 'down')}
                          className={`p-1 rounded-md transition-colors ${
                            index === localCategories.length - 1
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-purple-950 hover:bg-amber-100'
                          }`}
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Emoji Display with Quick Input */}
                      <div className="relative">
                        <input
                          type="text"
                          value={cat.icon || '🌸'}
                          onChange={(e) => handleUpdateCategory(cat.id, 'icon', e.target.value)}
                          className="w-11 h-11 text-center text-xl bg-amber-50 border-2 border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-2xs font-bold"
                          title="Clique para digitar ou trocar o emoji"
                        />
                      </div>

                      {/* Title Input */}
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          value={cat.name}
                          onChange={(e) => handleUpdateCategory(cat.id, 'name', e.target.value)}
                          placeholder="Nome da Categoria..."
                          className="w-full px-3 py-1.5 bg-amber-50/40 border-2 border-amber-200 rounded-xl font-bold text-xs sm:text-sm text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                    </div>

                    {/* Right: Badges & Controls */}
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                      {/* Products Badge */}
                      <span className="text-[10px] font-bold text-purple-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                        <Package className="w-3 h-3 text-amber-700" />
                        <span>{count} mimos</span>
                      </span>

                      {/* Footer Visibility Toggle */}
                      {!isTodos && (
                        <button
                          type="button"
                          onClick={() => handleUpdateCategory(cat.id, 'showInFooter', !cat.showInFooter)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 border transition-colors ${
                            cat.showInFooter !== false
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-500 border-slate-300'
                          }`}
                          title="Alternar se esta categoria aparece na lista 'Categorias Principais' do Rodapé"
                        >
                          {cat.showInFooter !== false ? <Eye className="w-3 h-3 text-emerald-600" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                          <span>{cat.showInFooter !== false ? 'No Rodapé' : 'Oculta no Rodapé'}</span>
                        </button>
                      )}

                      {/* Delete button */}
                      {!isTodos && (
                        <button
                          type="button"
                          onClick={() => setCategoryToDelete(cat)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Excluir Categoria"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom Grid: Description, Slug & Highlight Badge */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 text-xs">
                    {/* Description */}
                    <div className="sm:col-span-6 space-y-1">
                      <label className="text-[10px] font-bold text-purple-900 block">
                        Descrição Curta (Exibida no catálogo):
                      </label>
                      <input
                        type="text"
                        value={cat.description || ''}
                        onChange={(e) => handleUpdateCategory(cat.id, 'description', e.target.value)}
                        placeholder="Ex: Cadernos, planners e bloquinhos..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    </div>

                    {/* Badge / Selo */}
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-purple-900 block">
                        Selo / Tag em Destaque:
                      </label>
                      <input
                        type="text"
                        value={cat.badge || ''}
                        onChange={(e) => handleUpdateCategory(cat.id, 'badge', e.target.value)}
                        placeholder="Ex: Exclusivo, Popular..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-purple-950 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    </div>

                    {/* Slug / ID */}
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block" title="Identificador interno usado nos produtos">
                        ID / Slug:
                      </label>
                      <input
                        type="text"
                        disabled={isTodos}
                        value={cat.id}
                        onChange={(e) => handleUpdateCategory(cat.id, 'id', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                        placeholder="id-da-categoria"
                        className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {/* Fast Emoji Bar for quick selection on hover/focus */}
                  <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-0.5 border-t border-amber-50">
                    <span className="text-[9px] font-bold text-slate-400 shrink-0 mr-1">Troca Rápida de Emoji:</span>
                    {POPULAR_EMOJIS.slice(0, 10).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleUpdateCategory(cat.id, 'icon', emoji)}
                        className={`px-1.5 py-0.5 rounded-lg text-xs hover:bg-amber-100 transition-transform ${cat.icon === emoji ? 'bg-amber-200 font-bold scale-110' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                </div>
              );
            })}
          </div>

          {/* Bottom Save Bar if unsaved */}
          <div className="p-4 bg-amber-100/80 rounded-2xl border-2 border-amber-300 flex items-center justify-between gap-4">
            <div className="text-xs text-purple-950 font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>As alterações são aplicadas e salvas no seu navegador.</span>
            </div>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-black rounded-xl text-xs shadow-sm border border-amber-300 transition-transform active:scale-95"
            >
              Salvar Categorias
            </button>
          </div>
        </div>

        {/* Right Column: Live Footer Preview & Tips (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Live Preview of Footer "Categorias Principais" */}
          <div className="bg-gradient-to-b from-[#F6EFFC] via-[#EFE6F8] to-[#E9DDF5] rounded-3xl p-5 border-2 border-purple-300 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-purple-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-400 text-purple-950 flex items-center justify-center font-bold text-xs">
                  👁️
                </div>
                <span className="text-xs font-bold text-purple-950">Prévia Real no Rodapé</span>
              </div>
              <span className="text-[9px] font-bold bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full">
                Ao Vivo
              </span>
            </div>

            <div className="bg-white/90 p-4 rounded-2xl border border-purple-200 shadow-2xs space-y-3">
              <h5 className="font-['Mali'] font-bold text-purple-950 text-sm">
                Categorias Principais
              </h5>
              <ul className="space-y-2 text-purple-900 font-medium text-xs">
                {footerCategories.length === 0 ? (
                  <li className="text-slate-400 italic text-[11px]">Nenhuma categoria marcada para exibir no rodapé.</li>
                ) : (
                  footerCategories.map((fc) => (
                    <li key={fc.id} className="flex items-center justify-between gap-1 group">
                      <span className="hover:text-rose-600 transition-colors flex items-center gap-1.5 truncate">
                        <span>{fc.icon}</span>
                        <span className="font-semibold">{fc.name}</span>
                      </span>
                      {fc.badge && (
                        <span className="text-[8px] font-bold bg-amber-100 text-purple-950 px-1.5 py-0.2 rounded-full border border-amber-200">
                          {fc.badge}
                        </span>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>

            <p className="text-[11px] text-purple-900 leading-relaxed font-medium">
              ✨ Ao clicar em qualquer uma das opções no rodapé da loja, a cliente será direcionada instantaneamente para os produtos daquela categoria!
            </p>
          </div>

          {/* Quick Guide Card */}
          <div className="bg-white rounded-3xl p-5 border-2 border-amber-200 shadow-xs space-y-3">
            <h4 className="font-['Mali'] font-bold text-purple-950 text-xs sm:text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>Dicas de Personalização</span>
            </h4>
            <ul className="space-y-2 text-[11px] text-slate-700 font-medium leading-relaxed divide-y divide-amber-100">
              <li className="pt-1">
                <strong>1. Ordem das Categorias:</strong> Use as setinhas ⬆️ e ⬇️ para colocar suas coleções favoritas no topo.
              </li>
              <li className="pt-2">
                <strong>2. Emojis Fofos:</strong> Clique no quadradinho do emoji para digitar qualquer símbolo ou use os botões rápidos.
              </li>
              <li className="pt-2">
                <strong>3. Ocultar do Rodapé:</strong> Se você tiver muitas categorias e quiser manter o rodapé enxuto (ex: apenas 5 principais), desative o botão <em>"No Rodapé"</em> nas categorias secundárias.
              </li>
              <li className="pt-2">
                <strong>4. Vinculação com Produtos:</strong> Ao cadastrar um produto, você pode selecionar qualquer uma das categorias criadas aqui!
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* MODAL: Adicionar Nova Categoria */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-purple-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div 
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-amber-300 p-6 text-slate-800 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-purple-950 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-['Mali'] text-base font-bold text-purple-950">
                    Cadastrar Nova Categoria
                  </h3>
                  <p className="text-[11px] text-purple-900 font-medium">
                    Crie uma nova seção para organizar seus mimos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-purple-950 p-1.5 rounded-full"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCategorySubmit} className="space-y-4 text-xs">
              {/* Category Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  value={newCat.name || ''}
                  onChange={(e) => setNewCat(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Canecas & Garrafas Térmicas, Agendas 2026..."
                  className="w-full px-3.5 py-2.5 bg-amber-50/50 border-2 border-amber-200 rounded-2xl font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                />
              </div>

              {/* Emoji Icon Picker */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950">Ícone / Emoji</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newCat.icon || '🌸'}
                    onChange={(e) => setNewCat(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-12 h-12 text-center text-2xl bg-amber-50 border-2 border-amber-300 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-2xs"
                  />
                  <div className="flex flex-wrap gap-1 flex-1">
                    {POPULAR_EMOJIS.slice(0, 16).map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setNewCat(prev => ({ ...prev, icon: em }))}
                        className={`p-1.5 rounded-xl hover:bg-amber-100 text-sm transition-transform ${newCat.icon === em ? 'bg-amber-300 scale-110 shadow-2xs' : ''}`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950">Descrição Curta (Opcional)</label>
                <input
                  type="text"
                  value={newCat.description || ''}
                  onChange={(e) => setNewCat(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Canecas de porcelana, copos térmicos com canudo..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              {/* Tag / Badge */}
              <div className="space-y-1.5">
                <label className="font-bold text-purple-950">Selo em Destaque (Opcional)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCat.badge || ''}
                    onChange={(e) => setNewCat(prev => ({ ...prev, badge: e.target.value }))}
                    placeholder="Ex: Lançamento ✨"
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-purple-950 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {PRESET_BADGES.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setNewCat(prev => ({ ...prev, badge: b }))}
                      className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-purple-950 text-[10px] font-bold rounded-lg border border-amber-200"
                    >
                      +{b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility Checkboxes */}
              <div className="pt-2 border-t border-amber-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-950">
                  <input
                    type="checkbox"
                    checked={newCat.showInFooter ?? true}
                    onChange={(e) => setNewCat(prev => ({ ...prev, showInFooter: e.target.checked }))}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400 accent-amber-500"
                  />
                  <span>Exibir na lista de "Categorias Principais" do Rodapé</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-950">
                  <input
                    type="checkbox"
                    checked={newCat.showInFilter ?? true}
                    onChange={(e) => setNewCat(prev => ({ ...prev, showInFilter: e.target.checked }))}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400 accent-amber-500"
                  />
                  <span>Exibir nos filtros de busca do Catálogo</span>
                </label>
              </div>

              {/* Submit / Cancel */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-purple-950 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-black rounded-2xl shadow-md border border-amber-300 transition-transform active:scale-95"
                >
                  Salvar Nova Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Delete */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-purple-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div 
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-2 border-rose-300 p-6 text-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-['Mali'] text-lg font-bold text-purple-950">
                Excluir Categoria?
              </h3>
              <p className="text-xs text-slate-600">
                Tem certeza que deseja remover a categoria <strong>"{categoryToDelete.icon} {categoryToDelete.name}"</strong>?
              </p>
              {getProductCount(categoryToDelete.id) > 0 && (
                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200 mt-2">
                  ⚠️ Há {getProductCount(categoryToDelete.id)} produto(s) associados a esta categoria. Eles continuarão existindo na loja.
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Reset */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-purple-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div 
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-2 border-amber-300 p-6 text-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-['Mali'] text-lg font-bold text-purple-950">
                Restaurar Categorias Originais?
              </h3>
              <p className="text-xs text-slate-600">
                Esta ação voltará as categorias da loja e do rodapé para os nomes e emojis padrão originais da Lavistore.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-purple-950 font-black rounded-xl text-xs shadow-md"
              >
                Restaurar Padrão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
