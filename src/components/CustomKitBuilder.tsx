import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  Flower2, 
  Heart,
  Ruler,
  CheckCircle2
} from 'lucide-react';
import { Product, ProductSizeVariant, ProductColorVariant, BagType, RibbonOption } from '../types';
import { BAG_TYPES, RIBBON_OPTIONS, CARD_TEMPLATES } from '../data/categories';
import { getGroupingKey } from '../utils/productGroupingEngine';
import customBoxImg from '../assets/images/gift_box_custom_1788110261776.jpg';

export interface SelectedKitItem {
  id: string;
  product: Product;
  selectedSize?: string;
  selectedSizeId?: string;
  selectedColor?: string;
  price: number;
}

interface CustomKitBuilderProps {
  products: Product[];
  onAddKitToCart: (customKitProduct: Product, kitDetails: any) => void;
  bagTypes?: BagType[];
  ribbonOptions?: RibbonOption[];
}

export const CustomKitBuilder: React.FC<CustomKitBuilderProps> = ({
  products,
  onAddKitToCart,
  bagTypes = BAG_TYPES,
  ribbonOptions = RIBBON_OPTIONS
}) => {
  const currentBags = bagTypes && bagTypes.length > 0 ? bagTypes : BAG_TYPES;
  const currentRibbons = ribbonOptions && ribbonOptions.length > 0 ? ribbonOptions : RIBBON_OPTIONS;

  const [selectedBag, setSelectedBag] = useState<BagType>(currentBags[0]);
  const [selectedRibbon, setSelectedRibbon] = useState<RibbonOption>(currentRibbons[0]);
  const [selectedItems, setSelectedItems] = useState<SelectedKitItem[]>([]);
  const [cardTheme, setCardTheme] = useState(CARD_TEMPLATES[0].theme);
  const [recipient, setRecipient] = useState('');
  const [sender, setSender] = useState('');
  const [message, setMessage] = useState(CARD_TEMPLATES[0].text);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Estados de seleção pendente de Tamanho e Cor por produto
  const [pendingSizes, setPendingSizes] = useState<Record<string, { sizeLabel: string; sizeId?: string }>>({});
  const [pendingColors, setPendingColors] = useState<Record<string, string>>({});

  // Sincroniza sacola se mudou ou foi deletada
  useEffect(() => {
    if (currentBags.length > 0 && !currentBags.some(b => b.id === selectedBag?.id)) {
      setSelectedBag(currentBags[0]);
    }
  }, [currentBags, selectedBag]);

  // Sincroniza fita se mudou ou foi deletada
  useEffect(() => {
    if (currentRibbons.length > 0 && !currentRibbons.some(r => r.id === selectedRibbon?.id)) {
      setSelectedRibbon(currentRibbons[0]);
    }
  }, [currentRibbons, selectedRibbon]);

  // Helper inteligente para extrair tamanhos disponíveis (do produto, do BI de estoque ou padrão para meias)
  const getAvailableSizesForProduct = (product: Product): ProductSizeVariant[] => {
    // 1. Já possui tamanhos cadastrados no produto
    if (product.sizes && product.sizes.length > 0) {
      return product.sizes;
    }

    // 2. Busca na base de registros do BI (importada pelo Google Sheets / Drive)
    try {
      const rawBi = localStorage.getItem('lavistore_bi_records');
      if (rawBi) {
        const records = JSON.parse(rawBi);
        if (Array.isArray(records)) {
          const pKey = getGroupingKey(product.name);
          const matches = records.filter((r: any) => 
            getGroupingKey(r.produto || '') === pKey && 
            r.tamCor && 
            r.tamCor.trim().toLowerCase() !== 'único'
          );
          if (matches.length > 0) {
            const map = new Map<string, ProductSizeVariant>();
            for (const m of matches) {
              const label = m.tamCor.trim();
              if (!map.has(label.toLowerCase())) {
                map.set(label.toLowerCase(), {
                  id: m.id || `sz-${label.toLowerCase()}`,
                  label,
                  stock: m.saldoEstoqueQtd ?? 10,
                  price: m.precoVenda ?? product.price,
                  biRecordId: m.id
                });
              }
            }
            if (map.size > 0) {
              return Array.from(map.values());
            }
          }
        }
      }
    } catch {
      // Ignora erro de parsing
    }

    // 3. Fallback dedicado para Meias (P, M, G, GG) se ainda não houver tamanhos definidos
    const lower = product.name.toLowerCase();
    if (lower.includes('meia') || lower.includes('meias')) {
      return [
        { id: 'size-p', label: 'P', stock: 10 },
        { id: 'size-m', label: 'M', stock: 10 },
        { id: 'size-g', label: 'G', stock: 10 },
        { id: 'size-gg', label: 'GG', stock: 10 }
      ];
    }

    return [];
  };

  // Helper para cores disponíveis
  const getAvailableColorsForProduct = (product: Product): ProductColorVariant[] => {
    return product.colors && product.colors.length > 0 ? product.colors : [];
  };

  // Seleciona tamanho para um produto (e se já estiver na sacolinha, atualiza imediatamente)
  const handleSelectSizeForProduct = (product: Product, sizeLabel: string, sizeId?: string) => {
    setPendingSizes(prev => ({
      ...prev,
      [product.id]: { sizeLabel, sizeId }
    }));

    // Se o item já estiver na sacolinha, atualiza o tamanho dele na hora!
    setSelectedItems(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id);
      if (idx > -1) {
        const sizes = getAvailableSizesForProduct(product);
        const sz = sizes.find(s => s.id === sizeId || s.label.toLowerCase() === sizeLabel.toLowerCase());
        const newPrice = sz?.price ?? product.price;
        const newKey = `${product.id}-${sizeLabel}-${prev[idx].selectedColor || 'default'}`;

        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          id: newKey,
          selectedSize: sizeLabel,
          selectedSizeId: sizeId,
          price: newPrice
        };
        return updated;
      }
      return prev;
    });
  };

  // Seleciona cor para um produto
  const handleSelectColorForProduct = (product: Product, colorName: string) => {
    setPendingColors(prev => ({
      ...prev,
      [product.id]: colorName
    }));

    setSelectedItems(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id);
      if (idx > -1) {
        const newKey = `${product.id}-${prev[idx].selectedSize || 'default'}-${colorName}`;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          id: newKey,
          selectedColor: colorName
        };
        return updated;
      }
      return prev;
    });
  };

  // Alterna produto na sacolinha (adiciona ou remove)
  const handleToggleProductInKit = (
    product: Product,
    sizeToUse?: { label: string; id?: string },
    colorToUse?: string
  ) => {
    const sizes = getAvailableSizesForProduct(product);
    const chosenSizeLabel = sizeToUse?.label || pendingSizes[product.id]?.sizeLabel || (sizes.length > 0 ? sizes[0].label : undefined);
    const chosenSizeId = sizeToUse?.id || pendingSizes[product.id]?.sizeId || (sizes.length > 0 ? sizes[0].id : undefined);

    const colors = getAvailableColorsForProduct(product);
    const chosenColor = colorToUse || pendingColors[product.id] || (colors.length > 0 ? colors[0].name : undefined);

    // Se já estiver na sacolinha com este produto, remove
    const existingIndex = selectedItems.findIndex(i => i.product.id === product.id);
    if (existingIndex > -1) {
      setSelectedItems(selectedItems.filter((_, idx) => idx !== existingIndex));
    } else {
      // Adiciona na sacolinha com o tamanho escolhido
      let unitPrice = product.price;
      if (chosenSizeId && sizes.length > 0) {
        const found = sizes.find(s => s.id === chosenSizeId);
        if (found?.price) unitPrice = found.price;
      }

      const itemKey = `${product.id}-${chosenSizeLabel || 'default'}-${chosenColor || 'default'}`;
      const newItem: SelectedKitItem = {
        id: itemKey,
        product,
        selectedSize: chosenSizeLabel,
        selectedSizeId: chosenSizeId,
        selectedColor: chosenColor,
        price: unitPrice
      };

      setSelectedItems([...selectedItems, newItem]);
    }
  };

  const handleRemoveItemFromKit = (itemId: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== itemId));
  };

  const selectCardTemplate = (tpl: { theme: string; text: string }) => {
    setCardTheme(tpl.theme);
    setMessage(tpl.text);
  };

  const rawSubtotal = (selectedBag?.price || 0) + selectedItems.reduce((acc, item) => acc + item.price, 0);
  const discount = selectedItems.length > 0 ? rawSubtotal * 0.10 : 0; // 10% de desconto no combo da sacolinha!
  const finalPrice = Math.max(0, rawSubtotal - discount);

  const handleFinishKit = () => {
    if (selectedItems.length < 2) {
      alert('Por favor, selecione pelo menos 2 itens para compor sua sacolinha de presentes! 🎀');
      return;
    }

    const itemsSummaryList = selectedItems.map(i => {
      const parts = [i.product.name];
      if (i.selectedSize) parts.push(`Tam: ${i.selectedSize}`);
      if (i.selectedColor) parts.push(`Cor: ${i.selectedColor}`);
      return parts.join(' - ');
    });

    const customKitProduct: Product = {
      id: `custom-kit-${Date.now()}`,
      name: `Sacolinha Amarela Personalizada: ${selectedBag.name} (${selectedItems.length} mimos)`,
      category: 'presentes-kits',
      price: finalPrice,
      originalPrice: rawSubtotal,
      rating: 5.0,
      reviewCount: 1,
      images: [selectedBag.image, customBoxImg],
      description: `Sacolinha amarela personalizada com: ${itemsSummaryList.join(', ')}. Fita: ${selectedRibbon.name}. Dedicatória: "${message}" (De: ${sender || 'Alguém especial'} Para: ${recipient || 'Pessoa amada'}).`,
      features: [
        `Sacolinha: ${selectedBag.name} (Amarela Exclusiva)`,
        `Fita: ${selectedRibbon.name}`,
        `Contém ${selectedItems.length} mimos: ${itemsSummaryList.join(', ')}`,
        'Embalada com carinho e de forma artesanal',
        `Cartão com mensagem dedicada incluído`
      ],
      stock: 50,
      isFloralSpecial: true,
      tag: 'Sacolinha Amarela 🛍️'
    };

    onAddKitToCart(customKitProduct, {
      boxType: selectedBag,
      bagType: selectedBag,
      selectedRibbon,
      selectedItems: selectedItems.map(i => ({
        ...i.product,
        selectedSize: i.selectedSize,
        selectedSizeId: i.selectedSizeId,
        selectedColor: i.selectedColor,
        price: i.price
      })),
      recipient,
      sender,
      message
    });
  };

  return (
    <section className="py-8 md:py-12 bg-gradient-to-b from-amber-50/70 via-yellow-50/40 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Title */}
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200/90 text-amber-950 text-xs font-bold uppercase tracking-wider border border-amber-300 shadow-2xs">
            <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
            <span>Experiência Exclusiva Lavistore</span>
          </div>
          <h2 className="font-['Mali'] text-2xl sm:text-4xl font-bold text-purple-950">
            Monte sua Sacolinha Amarela de Presente
          </h2>
          <p className="font-['Comfortaa'] text-sm sm:text-base text-slate-600 font-medium">
            Escolha o modelo da sacolinha amarela, selecione os mimos favoritos com os tamanhos ideais, a fita de cetim e uma dedicatória perfumada. Você ganha <strong className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">10% OFF</strong> no combo!
          </p>
        </div>

        {/* Steps Breadcrumbs */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8 overflow-x-auto pb-2">
          {[
            { step: 1, title: '1. Sacolinha Amarela' },
            { step: 2, title: `2. Selecione os Mimos (${selectedItems.length})` },
            { step: 3, title: '3. Fita & Laço' },
            { step: 4, title: '4. Cartão & Finalizar' }
          ].map(s => (
            <button
              key={s.step}
              onClick={() => setCurrentStep(s.step as any)}
              className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                currentStep === s.step
                  ? 'bg-amber-400 text-purple-950 border-2 border-amber-500 shadow-md shadow-amber-200'
                  : currentStep > s.step
                  ? 'bg-amber-100 text-purple-950 border border-amber-300'
                  : 'bg-white text-slate-500 border border-amber-200'
              }`}
            >
              <span>{s.title}</span>
              {currentStep > s.step && <Check className="w-3.5 h-3.5 text-emerald-700" />}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left / Main Step View */}
          <div className="lg:col-span-8 bg-white p-5 sm:p-8 rounded-3xl border-2 border-amber-200 shadow-sm space-y-6">
            
            {/* STEP 1: Choose Bag */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Mali'] text-lg sm:text-xl font-bold text-purple-950">
                    Passo 1: Selecione o modelo da Sacolinha Amarela
                  </h3>
                  <span className="text-xs text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">Sempre em Amarelo Solar ☀️</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentBags.map(bag => {
                    const isSelected = selectedBag?.id === bag.id;
                    const bgClass = bag.bgClass || 'from-amber-100 to-yellow-200 border-amber-300';
                    return (
                      <div
                        key={bag.id}
                        onClick={() => setSelectedBag(bag)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative bg-gradient-to-b ${
                          isSelected
                            ? `${bgClass} shadow-md scale-102 ring-2 ring-amber-400 border-amber-400`
                            : 'border-amber-100 hover:border-amber-300 bg-amber-50/30'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 text-purple-950 font-bold flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 shadow-inner bg-slate-100">
                          <img 
                            src={bag.image} 
                            alt={bag.name} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <h4 className="text-sm font-bold text-purple-950">{bag.name}</h4>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{bag.description}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-lg">R$ {bag.price.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-transform active:scale-95 border border-amber-300 cursor-pointer"
                  >
                    Avançar para Escolher Mimos →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Choose Products & Select Sizes */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-['Mali'] text-lg sm:text-xl font-bold text-purple-950">
                      Passo 2: Escolha os mimos para a sacolinha (mínimo de 2 itens)
                    </h3>
                    <p className="text-xs text-slate-500">Selecione os itens e seus tamanhos ideais (como P, M, G para as meias)</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${
                    selectedItems.length >= 2
                      ? 'bg-amber-100 text-purple-950 border-amber-300'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {selectedItems.length} {selectedItems.length === 1 ? 'mimo selecionado' : 'mimos selecionados'} {selectedItems.length < 2 && '(mínimo 2)'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[520px] overflow-y-auto pr-1">
                  {products.map(prod => {
                    const sizes = getAvailableSizesForProduct(prod);
                    const colors = getAvailableColorsForProduct(prod);
                    const hasSizes = sizes.length > 0;
                    const hasColors = colors.length > 0;

                    // Verifica se já está na sacolinha
                    const itemInKit = selectedItems.find(i => i.product.id === prod.id);
                    const isSelected = Boolean(itemInKit);

                    // Tamanho ativo atual
                    const activeSize = itemInKit?.selectedSize || pendingSizes[prod.id]?.sizeLabel || (hasSizes ? sizes[0].label : undefined);
                    const activeSizeId = itemInKit?.selectedSizeId || pendingSizes[prod.id]?.sizeId || (hasSizes ? sizes[0].id : undefined);
                    const activeColor = itemInKit?.selectedColor || pendingColors[prod.id] || (hasColors ? colors[0].name : undefined);

                    return (
                      <div
                        key={prod.id}
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between relative bg-white ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50/70 shadow-sm ring-1 ring-amber-300'
                            : 'border-amber-100 hover:border-amber-300 hover:shadow-xs'
                        }`}
                      >
                        {/* Selo de item na sacolinha */}
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-400 text-purple-950 font-bold flex items-center justify-center shadow-xs z-10">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}

                        {/* Imagem do Produto */}
                        <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2 bg-amber-50/40">
                          <img
                            src={prod.images[0]}
                            alt={prod.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          {/* Badge de tamanho selecionado visível sobre a imagem */}
                          {isSelected && itemInKit?.selectedSize && (
                            <span className="absolute bottom-1.5 left-1.5 bg-purple-950/90 text-amber-300 font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs">
                              Tam: {itemInKit.selectedSize}
                            </span>
                          )}
                        </div>

                        {/* Título e Preço */}
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-purple-950 line-clamp-2 leading-tight">
                            {prod.name}
                          </p>
                          <p className="text-xs font-black text-pink-600">
                            R$ {prod.price.toFixed(2)}
                          </p>

                          {/* Seletor de Tamanhos na Sacolinha (Ex: Meias P, M, G, GG) */}
                          {hasSizes && (
                            <div className="mt-2 pt-2 border-t border-dashed border-amber-200/90 space-y-1" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-purple-950 flex items-center gap-1">
                                  <Ruler className="w-3 h-3 text-pink-500" />
                                  <span>Tamanho:</span>
                                </span>
                                {activeSize && (
                                  <span className="text-[10px] font-extrabold text-purple-950 bg-amber-200/90 px-1.5 py-0.5 rounded-md border border-amber-300">
                                    {activeSize}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {sizes.map((sz) => {
                                  const isSzActive = activeSize === sz.label;
                                  return (
                                    <button
                                      key={sz.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectSizeForProduct(prod, sz.label, sz.id);
                                      }}
                                      title={`Tamanho ${sz.label}`}
                                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                        isSzActive
                                          ? 'bg-purple-950 text-amber-300 border-purple-950 shadow-xs scale-105 ring-1 ring-amber-300'
                                          : 'bg-white hover:bg-amber-100 text-purple-900 border-amber-200 hover:border-amber-400'
                                      }`}
                                    >
                                      {sz.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Seletor de Cores / Estampas */}
                          {hasColors && (
                            <div className="mt-1.5 pt-1.5 border-t border-dashed border-amber-200/90 space-y-1" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-purple-950">Cor:</span>
                                <span className="text-[10px] font-bold text-purple-900">{activeColor}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {colors.map((c) => {
                                  const isCActive = activeColor === c.name;
                                  return (
                                    <button
                                      key={c.name}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectColorForProduct(prod, c.name);
                                      }}
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all border cursor-pointer ${
                                        isCActive
                                          ? 'bg-pink-600 text-white border-pink-700 shadow-xs'
                                          : 'bg-white text-purple-900 border-purple-200 hover:bg-pink-50'
                                      }`}
                                    >
                                      {c.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Botão de Ação: Adicionar / Na Sacolinha */}
                        <button
                          type="button"
                          onClick={() => handleToggleProductInKit(prod, { label: activeSize || '', id: activeSizeId }, activeColor)}
                          className={`mt-2.5 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-300 hover:bg-amber-400 text-purple-950 shadow-xs'
                              : 'bg-amber-100/90 hover:bg-amber-200 text-purple-950 hover:shadow-xs'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-800" />
                              <span>Na Sacolinha {itemInKit?.selectedSize ? `(${itemInKit.selectedSize})` : ''}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 text-purple-900" />
                              <span>Colocar na Sacolinha {activeSize ? `(${activeSize})` : ''}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-amber-50 rounded-xl cursor-pointer"
                  >
                    ← Voltar
                  </button>
                  <button
                    onClick={() => {
                      if (selectedItems.length < 2) {
                        alert('Selecione pelo menos 2 itens para continuar! 🌸');
                        return;
                      }
                      setCurrentStep(3);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-transform active:scale-95 border border-amber-300 cursor-pointer"
                  >
                    Avançar para Laço & Fita →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Choose Ribbon */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Mali'] text-lg sm:text-xl font-bold text-purple-950">
                    Passo 3: Escolha a Fita de Cetim e o Laço Artesanal
                  </h3>
                  <span className="text-xs text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">Toque de Seda ✨</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentRibbons.map(ribbon => {
                    const isSelected = selectedRibbon?.id === ribbon.id;
                    return (
                      <div
                        key={ribbon.id}
                        onClick={() => setSelectedRibbon(ribbon)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 relative ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-300'
                            : 'border-amber-100 hover:border-amber-300 bg-white'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 text-purple-950 font-bold flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {ribbon.image ? (
                          <img 
                            src={ribbon.image} 
                            alt={ribbon.name} 
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 object-cover rounded-xl shadow-xs shrink-0" 
                          />
                        ) : (
                          <div 
                            className="w-16 h-16 rounded-xl shadow-xs flex items-center justify-center shrink-0 border border-black/10"
                            style={{ backgroundColor: ribbon.color }}
                          >
                            <Sparkles className="w-6 h-6 text-white drop-shadow-xs" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-purple-950">{ribbon.name}</h4>
                          {ribbon.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{ribbon.description}</p>
                          )}
                          <span className="inline-block mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Incluso no Kit
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-amber-50 rounded-xl cursor-pointer"
                  >
                    ← Voltar
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-transform active:scale-95 border border-amber-300 cursor-pointer"
                  >
                    Avançar para o Cartão & Finalizar →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Message Card */}
            {currentStep === 4 && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h3 className="font-['Mali'] text-lg sm:text-xl font-bold text-purple-950">
                    Passo 4: Cartãozinho de Dedicatória com Cheirinho
                  </h3>
                  <p className="text-xs text-slate-500">Personalize a mensagem que irá impressa no cartão floral com caligrafia</p>
                </div>

                {/* Quick Templates */}
                <div>
                  <label className="text-xs font-bold text-purple-900 mb-2 block">
                    Sugestões de Mensagens:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CARD_TEMPLATES.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectCardTemplate(tpl)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          cardTheme === tpl.theme
                            ? 'bg-amber-400 text-purple-950 border-amber-500 font-bold shadow-xs'
                            : 'bg-amber-50 text-purple-900 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {tpl.theme}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Names */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-purple-900 block mb-1">Para (Nome do Presenteado):</label>
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="Ex: Beatriz / Melhor Amiga"
                      className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-purple-900 block mb-1">De (Seu Nome):</label>
                    <input
                      type="text"
                      value={sender}
                      onChange={(e) => setSender(e.target.value)}
                      placeholder="Ex: Com amor, Mariana"
                      className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Textarea for card */}
                <div>
                  <label className="text-xs font-bold text-purple-900 block mb-1">Mensagem do Cartão:</label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 leading-relaxed font-['Comfortaa'] font-medium"
                    placeholder="Escreva algo do fundo do coração..."
                  />
                </div>

                <div className="pt-3 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-amber-50 rounded-xl cursor-pointer"
                  >
                    ← Voltar
                  </button>
                  <button
                    id="btn-finish-custom-kit"
                    onClick={handleFinishKit}
                    className="px-6 py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-2xl text-xs sm:text-sm shadow-lg shadow-amber-300/50 flex items-center gap-2 transition-transform active:scale-95 border-2 border-amber-300 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-purple-950" />
                    <span>Adicionar Sacolinha Completa ao Carrinho</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Right Summary Preview Column */}
          <div className="lg:col-span-4 bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 text-purple-950 p-5 sm:p-6 rounded-3xl shadow-xl space-y-5 sticky top-28 border-2 border-amber-300">
            <div className="flex items-center justify-between border-b border-amber-600/30 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-purple-950" />
                <h4 className="font-['Mali'] font-bold text-base text-purple-950">Resumo da Sacolinha</h4>
              </div>
              <span className="bg-purple-950 text-amber-300 text-[8px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-400">
                -10% OFF NO COMBO
              </span>
            </div>

            {/* Selected Bag */}
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-xs p-2.5 rounded-2xl border border-white/60">
              <img 
                src={selectedBag.image} 
                alt="Sacolinha Amarela" 
                referrerPolicy="no-referrer" 
                className="w-12 h-12 object-cover rounded-xl shrink-0" 
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-purple-950 truncate">{selectedBag.name}</p>
                <p className="text-[11px] text-purple-900 font-semibold">R$ {selectedBag.price.toFixed(2)}</p>
              </div>
            </div>

            {/* Items inside list with sizes displayed */}
            <div>
              <p className="text-xs font-bold text-purple-950 mb-2">
                Itens na Sacolinha ({selectedItems.length}):
              </p>
              {selectedItems.length === 0 ? (
                <div className="bg-white/40 border border-white/60 rounded-xl p-3 text-center">
                  <p className="text-xs text-purple-950 font-medium">Nenhum mimo selecionado ainda.</p>
                  <p className="text-[11px] text-purple-900/80 mt-0.5">Avance para o Passo 2 para escolher seus mimos favoritos.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs py-1.5 px-2 bg-white/50 rounded-xl border border-amber-600/20">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="truncate text-purple-950 font-bold">{item.product.name}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {item.selectedSize && (
                            <span className="text-[10px] font-extrabold text-purple-950 bg-amber-200/90 px-1.5 py-0.2 rounded-md border border-amber-300">
                              Tam: {item.selectedSize}
                            </span>
                          )}
                          {item.selectedColor && (
                            <span className="text-[10px] font-bold text-pink-900 bg-pink-100/90 px-1.5 py-0.2 rounded-md border border-pink-200">
                              Cor: {item.selectedColor}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-purple-950">R$ {item.price.toFixed(2)}</span>
                        <button
                          onClick={() => handleRemoveItemFromKit(item.id)}
                          className="text-purple-900 hover:text-rose-700 p-1 cursor-pointer transition-colors"
                          title="Remover este item da sacolinha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ribbon & Card details */}
            <div className="text-xs space-y-1 text-purple-950 border-t border-amber-600/30 pt-3 font-medium">
              <p>🎀 <strong>Fita:</strong> {selectedRibbon.name}</p>
              <p>💌 <strong>Para:</strong> {recipient || '(A preencher no passo 4)'}</p>
            </div>

            {/* Pricing Total */}
            <div className="border-t border-amber-600/30 pt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-purple-900 font-medium">
                <span>Subtotal avulso:</span>
                <span className={discount > 0 ? "line-through" : ""}>R$ {rawSubtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-purple-950 font-bold bg-white/40 px-2 py-1 rounded-lg">
                  <span>Desconto especial combo (10%):</span>
                  <span>- R$ {discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-sm font-bold text-purple-950">Total da Sacolinha:</span>
                <span className="text-2xl font-black text-purple-950 font-mono">
                  R$ {finalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={handleFinishKit}
              className="w-full py-3 bg-purple-950 hover:bg-purple-900 text-amber-300 font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 border border-amber-400 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Colocar Sacolinha no Carrinho</span>
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
