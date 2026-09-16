import React, { useState, useRef, useEffect } from 'react';
import { Search, Download, Upload, RotateCcw, Sparkles, Plus, Eye, Copy, Edit3, Trash2, ChevronDown, Database, X } from 'lucide-react';
import { Product, Category } from '../types';

interface AdminProductCatalogViewProps {
  products: Product[];
  filteredProducts: Product[];
  categories: Category[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  stockFilter: 'all' | 'low' | 'out';
  setStockFilter: (stock: 'all' | 'low' | 'out') => void;
  handleExportFullStore: () => void;
  handleExportBackup: () => void;
  handleImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setShowResetCatalogModal: (show: boolean) => void;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDuplicateProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onViewProductLive: (product: Product) => void;
}

export const AdminProductCatalogView: React.FC<AdminProductCatalogViewProps> = ({
  filteredProducts,
  categories,
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  stockFilter,
  setStockFilter,
  handleExportFullStore,
  handleImportBackup,
  setShowResetCatalogModal,
  onAddProduct,
  onEditProduct,
  onDuplicateProduct,
  onDeleteProduct,
  onViewProductLive
}) => {
  const [showDataMenu, setShowDataMenu] = useState(false);
  const dataMenuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu de dados ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dataMenuRef.current && !dataMenuRef.current.contains(event.target as Node)) {
        setShowDataMenu(false);
      }
    };
    if (showDataMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDataMenu]);

  const hasActiveFilters = searchTerm.trim() !== '' || categoryFilter !== 'all' || stockFilter !== 'all';

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Barra de Ferramentas Minimalista e Organizada */}
      <div className="relative z-30 bg-white/90 backdrop-blur-md rounded-2xl p-3 border border-amber-200/70 shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          
          {/* Grupo Esquerdo: Busca rápida e Filtros Essenciais */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Campo de Busca */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-amber-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar mimo ou código..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-purple-100 rounded-xl text-xs font-medium text-purple-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-300 transition-all shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-purple-900 cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filtro de Categoria */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-purple-100 rounded-xl text-xs font-medium text-purple-950 focus:outline-none focus:ring-1 focus:ring-amber-300 cursor-pointer shadow-2xs"
            >
              <option value="all">Todas as Categorias</option>
              {categories.filter(c => c.id !== 'todos').map(c => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>

            {/* Filtro de Estoque */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-purple-100 rounded-xl text-xs font-medium text-purple-950 focus:outline-none focus:ring-1 focus:ring-amber-300 cursor-pointer shadow-2xs"
            >
              <option value="all">Todo Estoque</option>
              <option value="low">⚠️ Estoque Baixo (&le; 5)</option>
              <option value="out">🛑 Esgotados (0)</option>
            </select>

            {/* Botão sutil para limpar filtros quando ativos */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setStockFilter('all');
                }}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-950 px-2 py-1 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Grupo Direito: Ação Principal (+ Novo Mimo) e Ações Técnicas Discretas */}
          <div className="flex items-center gap-2 justify-end shrink-0">
            {/* Menu Único e Discreto de Backup e Dados */}
            <div className="relative" ref={dataMenuRef}>
              <button
                type="button"
                onClick={() => setShowDataMenu(!showDataMenu)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                  showDataMenu
                    ? 'bg-purple-100 text-purple-950 border-purple-300'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-2xs'
                }`}
                title="Opções de Backup e Restauração de Dados"
              >
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Backup & Dados</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showDataMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Flutuante */}
              {showDataMenu && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-1.5 z-50 animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDataMenu(false);
                      handleExportFullStore();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-950 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold">Baixar Backup Geral</p>
                      <p className="text-[10px] text-slate-400 font-normal">Salva produtos, pedidos e loja</p>
                    </div>
                  </button>

                  <label className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-cyan-50 hover:text-cyan-950 flex items-center gap-2.5 transition-colors cursor-pointer">
                    <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">Restaurar Backup</p>
                      <p className="text-[10px] text-slate-400 font-normal">Importar arquivo .json</p>
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        setShowDataMenu(false);
                        handleImportBackup(e);
                      }}
                      className="hidden"
                    />
                  </label>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowDataMenu(false);
                      setShowResetCatalogModal(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold">Restaurar Padrão de Fábrica</p>
                      <p className="text-[10px] text-rose-400 font-normal">Retorna catálogo original</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Ação Primária em Destaque: Novo Mimo */}
            <button
              type="button"
              onClick={onAddProduct}
              className="px-3.5 py-1.5 bg-purple-950 hover:bg-purple-900 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Mimo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Produtos e Precificação Inteligente */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-amber-200/70 shadow-2xs overflow-hidden">
        <div className="p-3 sm:p-3.5 border-b border-amber-100/80 bg-amber-50/40 flex items-center justify-between gap-2">
          <div>
            <h2 className="font-['Mali'] text-sm sm:text-base font-bold text-purple-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Lista de Produtos & Precificação Inteligente ({filteredProducts.length})</span>
            </h2>
            <p className="text-[11px] text-slate-500 font-normal">
              Preço final público. Custo, mark-up e margem de lucro são exclusivos da administração.
            </p>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-10 text-center space-y-2.5">
            <p className="text-xs font-semibold text-purple-950">Nenhum produto encontrado com os filtros atuais.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setStockFilter('all');
              }}
              className="px-3 py-1.5 bg-amber-400 text-purple-950 font-semibold rounded-xl text-xs cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-amber-50/80 border-b border-amber-200/70 text-purple-950 font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Foto & ID</th>
                  <th className="py-2.5 px-3">Nome do Mimo</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3 text-center">Estoque</th>
                  <th className="py-2.5 px-3">Custo Unitário</th>
                  <th className="py-2.5 px-3">Preço de Venda</th>
                  <th className="py-2.5 px-3">Lucro & Mark-up</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/60 font-medium text-slate-700">
                {filteredProducts.map((p) => {
                  const discount = p.originalPrice 
                    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                    : null;

                  const unitCost = p.unitCost ?? (p.price * 0.4);
                  const grossProfit = p.grossProfit ?? (p.price - unitCost);
                  const markupPercent = p.markupPercent ?? (unitCost > 0 ? ((p.price - unitCost) / unitCost) * 100 : 0);
                  const grossMargin = p.grossMarginPercent ?? (p.price > 0 ? (grossProfit / p.price) * 100 : 0);

                  return (
                    <tr key={p.id} className="hover:bg-amber-50/40 transition-colors">
                      {/* Photo Thumbnail */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-amber-200 shrink-0 bg-slate-100">
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            {p.images.length > 1 && (
                              <span className="absolute bottom-0.5 right-0.5 bg-purple-950/80 text-white text-[8px] px-0.5 rounded font-bold">
                                +{p.images.length - 1}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {p.id}
                          </span>
                        </div>
                      </td>

                      {/* Name & Description Preview */}
                      <td className="py-2.5 px-3 max-w-xs">
                        <p className="font-bold text-purple-950 text-xs line-clamp-1">{p.name}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1 font-normal">
                          {p.description}
                        </p>
                      </td>

                      {/* Category & Tag */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-0.5 items-start">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-900 text-[10px] font-semibold">
                            {p.category}
                          </span>
                          {p.tag && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-pink-100 border border-pink-200 text-pink-900 text-[9px] font-semibold">
                              {p.tag}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock (Current / Initial) */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.stock > 5 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : p.stock > 0
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {p.stock > 0 ? `${p.stock} un.` : 'Esgotado'}
                          </span>
                          {p.initialStock && p.initialStock !== p.stock && (
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              Inicial: {p.initialStock} un.
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Unit Cost */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-xs">
                            R$ {unitCost.toFixed(2)}
                          </span>
                          {p.acquisitionCostTotal && (
                            <span className="text-[9px] text-slate-400">
                              Total: R$ {p.acquisitionCostTotal.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Price (Sale Price to End User) */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col font-semibold text-purple-950">
                          <span className="text-emerald-950 font-bold text-xs">
                            R$ {p.price.toFixed(2)}
                          </span>
                          {p.originalPrice && (
                            <span className="text-[9px] text-slate-400 line-through">
                              De R$ {p.originalPrice.toFixed(2)} (-{discount}%)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Markup & Gross Profit */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-emerald-800 text-xs">
                            +R$ {grossProfit.toFixed(2)} <span className="font-normal text-[9px] text-slate-500">/un</span>
                          </span>
                          <div className="flex items-center gap-1 text-[9px] text-slate-500">
                            <span>Mark-up: {markupPercent.toFixed(0)}%</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold">Margem: {grossMargin.toFixed(0)}%</span>
                          </div>
                        </div>
                      </td>

                      {/* Action buttons - Delicate, Smaller & Unified */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Live Preview Button */}
                          <button
                            onClick={() => onViewProductLive(p)}
                            title="Visualizar produto na loja"
                            className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/70 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicate Button */}
                          <button
                            onClick={() => onDuplicateProduct(p)}
                            title="Duplicar este produto"
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/70 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => onEditProduct(p)}
                            title="Editar fotos, descrição e valores"
                            className="px-2 py-1 rounded-lg bg-amber-300 hover:bg-amber-400 text-purple-950 font-semibold text-xs flex items-center gap-1 border border-amber-400/60 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => onDeleteProduct(p)}
                            title="Excluir produto"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/70 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
