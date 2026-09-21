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
  PenTool,
  RotateCcw
} from 'lucide-react';
import { Product, BagType, RibbonOption } from '../types';
import { BAG_TYPES, RIBBON_OPTIONS, CARD_TEMPLATES } from '../data/categories';
import customBoxImg from '../assets/images/gift_box_custom_1788110261776.jpg';

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
  const [selectedItems, setSelectedItems] = useState<Product[]>([]);
  const [cardTheme, setCardTheme] = useState(CARD_TEMPLATES[0].theme);
  const [recipient, setRecipient] = useState('');
  const [sender, setSender] = useState('');
  const [message, setMessage] = useState(CARD_TEMPLATES[0].text);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Sync selected bag if list changes or selected bag was deleted
  useEffect(() => {
    if (currentBags.length > 0 && !currentBags.some(b => b.id === selectedBag?.id)) {
      setSelectedBag(currentBags[0]);
    }
  }, [currentBags, selectedBag]);

  // Sync selected ribbon if list changes or selected ribbon was deleted
  useEffect(() => {
    if (currentRibbons.length > 0 && !currentRibbons.some(r => r.id === selectedRibbon?.id)) {
      setSelectedRibbon(currentRibbons[0]);
    }
  }, [currentRibbons, selectedRibbon]);

  const toggleItemSelection = (product: Product) => {
    if (selectedItems.some(i => i.id === product.id)) {
      setSelectedItems(selectedItems.filter(i => i.id !== product.id));
    } else {
      setSelectedItems([...selectedItems, product]);
    }
  };

  const selectCardTemplate = (tpl: { theme: string; text: string }) => {
    setCardTheme(tpl.theme);
    setMessage(tpl.text);
  };

  const rawSubtotal = (selectedBag?.price || 0) + selectedItems.reduce((acc, item) => acc + item.price, 0);
  const discount = selectedItems.length > 0 ? rawSubtotal * 0.10 : 0; // 10% discount on custom kit combo!
  const finalPrice = Math.max(0, rawSubtotal - discount);

  const handleFinishKit = () => {
    if (selectedItems.length < 2) {
      alert('Por favor, selecione pelo menos 2 itens para compor sua sacolinha de presentes! 🎀');
      return;
    }

    const customKitProduct: Product = {
      id: `custom-kit-${Date.now()}`,
      name: `Sacolinha Amarela Personalizada: ${selectedBag.name} (${selectedItems.length} mimos)`,
      category: 'presentes-kits',
      price: finalPrice,
      originalPrice: rawSubtotal,
      rating: 5.0,
      reviewCount: 1,
      images: [selectedBag.image, customBoxImg],
      description: `Sacolinha amarela personalizada com ${selectedItems.map(i => i.name).join(', ')}. Fita: ${selectedRibbon.name}. Dedicatória: "${message}" (De: ${sender || 'Alguém especial'} Para: ${recipient || 'Pessoa amada'}).`,
      features: [
        `Sacolinha: ${selectedBag.name} (Amarela Exclusiva)`,
        `Fita: ${selectedRibbon.name}`,
        `Contém ${selectedItems.length} mimos escolhidos com amor`,
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
      selectedItems,
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
            Escolha o modelo da sacolinha amarela, selecione os mimos favoritos, a fita de cetim e uma dedicatória perfumada. Você ganha <strong className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">10% OFF</strong> no combo!
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
              className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
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
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-transform active:scale-95 border border-amber-300"
                  >
                    Avançar para Escolher Mimos →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Choose Products */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-['Mali'] text-lg sm:text-xl font-bold text-purple-950">
                      Passo 2: Escolha os mimos para a sacolinha (mínimo de 2 itens)
                    </h3>
                    <p className="text-xs text-slate-500">Selecione os itens que mais combinam com seu presente</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${
                    selectedItems.length >= 2
                      ? 'bg-amber-100 text-purple-950 border-amber-300'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {selectedItems.length} {selectedItems.length === 1 ? 'mimo selecionado' : 'mimos selecionados'} {selectedItems.length < 2 && '(mínimo 2)'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[480px] overflow-y-auto pr-1">
                  {products.map(prod => {
                    const isSelected = selectedItems.some(i => i.id === prod.id);
                    return (
                      <div
                        key={prod.id}
                        onClick={() => toggleItemSelection(prod)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between relative ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50/90 shadow-sm ring-1 ring-amber-300'
                            : 'border-amber-100 hover:border-amber-200 bg-white'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 text-purple-950 font-bold flex items-center justify-center shadow-xs z-10">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                        <img
                          src={prod.images[0]}
                          alt={prod.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-24 sm:h-28 object-cover rounded-xl mb-2"
                        />
                        <div>
                          <p className="text-xs font-semibold text-purple-950 line-clamp-2 leading-tight">
                            {prod.name}
                          </p>
                          <p className="text-xs font-bold text-pink-600 mt-1">
                            R$ {prod.price.toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          className={`mt-2 py-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                            isSelected
                              ? 'bg-amber-300 text-purple-950'
                              : 'bg-amber-50 text-purple-900 hover:bg-amber-100'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Na Sacolinha</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>Colocar na Sacolinha</span>
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
                    className="px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-amber-50 rounded-xl"
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
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-transform active:scale-95 border border-amber-300"
                  >
                    Avançar para Laço & Fita →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Choose Ribbon */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="font-['Mali'] text-lg sm:text-xl font-bold text-purple-950">
                  Passo 3: Escolha o acabamento com Laço de Cetim
                </h3>
                <p className="text-xs text-slate-500">O toque delicado que amarra o carinho na sua sacolinha amarela</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentRibbons.map(rib => {
                    const isSelected = selectedRibbon?.id === rib.id;
                    return (
                      <div
                        key={rib.id}
                        onClick={() => setSelectedRibbon(rib)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50 shadow-sm ring-1 ring-amber-300'
                            : 'border-amber-100 hover:border-amber-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full border-2 border-white shadow-xs"
                            style={{ backgroundColor: rib.color }}
                          />
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-purple-950">{rib.name}</p>
                            <p className="text-[11px] text-slate-500">Laço duplo clássico com ponteira</p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-amber-600" />}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-amber-50 rounded-xl"
                  >
                    ← Voltar
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-transform active:scale-95 border border-amber-300"
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
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
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
                    className="px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-amber-50 rounded-xl"
                  >
                    ← Voltar
                  </button>
                  <button
                    id="btn-finish-custom-kit"
                    onClick={handleFinishKit}
                    className="px-6 py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-2xl text-xs sm:text-sm shadow-lg shadow-amber-300/50 flex items-center gap-2 transition-transform active:scale-95 border-2 border-amber-300"
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

            {/* Items inside list */}
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
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-amber-600/20">
                      <span className="truncate max-w-[170px] text-purple-950 font-medium">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-950">R$ {item.price.toFixed(2)}</span>
                        <button
                          onClick={() => toggleItemSelection(item)}
                          className="text-purple-900 hover:text-rose-700 p-0.5 cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 className="w-3 h-3" />
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
              className="w-full py-3 bg-purple-950 hover:bg-purple-900 text-amber-300 font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 border border-amber-400"
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

