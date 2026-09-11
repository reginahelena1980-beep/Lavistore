import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  AlertTriangle,
  Store,
  Sparkles,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Package,
  Layers,
  ShoppingBag,
  Eye,
  EyeOff,
  RefreshCw,
  Info
} from 'lucide-react';
import { BiProductCalculatedRecord, Product } from '../types';
import { CATEGORIES } from '../data/categories';

interface PublishToVitrineModalProps {
  record: BiProductCalculatedRecord;
  existingProduct?: Product | null;
  onClose: () => void;
  onPublish: (updatedRecord: BiProductCalculatedRecord, productData: Partial<Product>) => void;
  onUnpublish?: (recordId: string, productId?: string) => void;
  onViewLiveProduct?: (product: Product) => void;
}

// Sugestões de fotos padrão de alta qualidade para produtos populares da Lavistore
const SUGGESTED_PRODUCT_PHOTOS: Record<string, string[]> = {
  'panda': [
    'https://images.unsplash.com/photo-1582966770380-921587181f82?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=800&auto=format&fit=crop&q=80'
  ],
  'unicornio': [
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80'
  ],
  'caneta': [
    'https://images.unsplash.com/photo-1585336261026-418041a0e980?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=800&auto=format&fit=crop&q=80'
  ],
  'pulseira': [
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop&q=80'
  ],
  'anel': [
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80'
  ],
  'squish': [
    'https://images.unsplash.com/photo-1558877385-81a1c7e67d72?w=800&auto=format&fit=crop&q=80'
  ],
  'sabao': [
    'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&auto=format&fit=crop&q=80'
  ],
  'default': [
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80'
  ]
};

export const PublishToVitrineModal: React.FC<PublishToVitrineModalProps> = ({
  record,
  existingProduct,
  onClose,
  onPublish,
  onUnpublish,
  onViewLiveProduct
}) => {
  // Preenchimento automático dos dados a partir da linha de apuração da planilha
  const initialName = existingProduct?.name || (
    record.tamCor && record.tamCor.toLowerCase() !== 'único' && record.tamCor.toLowerCase() !== 'unico'
      ? `${record.produto} - ${record.tamCor}`
      : record.produto
  );

  const initialDesc = existingProduct?.description || record.descricao || (
    `Lindo mimo ${record.produto} da Lavistore! Perfeito para presentear quem você ama com muito afeto, delicadeza e encanto. ✨💖`
  );

  const initialPrice = existingProduct ? existingProduct.price : record.precoVenda;
  const initialStock = existingProduct ? existingProduct.stock : record.saldoEstoqueQtd;
  const initialImage = (existingProduct?.images && existingProduct.images[0]) || record.vitrineImageUrl || '';
  const initialCategory = existingProduct?.category || record.vitrineCategory || 'papelaria';
  const initialAutoHide = existingProduct?.autoHideWhenOutOfStock !== undefined 
    ? existingProduct.autoHideWhenOutOfStock 
    : (record.autoHideWhenOutOfStock !== undefined ? record.autoHideWhenOutOfStock : true);

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDesc);
  const [price, setPrice] = useState(initialPrice);
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(
    existingProduct?.originalPrice !== undefined ? existingProduct.originalPrice : undefined
  );
  const [category, setCategory] = useState(initialCategory);
  const [imageUrl, setImageUrl] = useState(initialImage);
  const [autoHide, setAutoHide] = useState(initialAutoHide);
  const [tag, setTag] = useState(existingProduct?.tag || record.vitrineTag || 'Novidade ✨');
  const [isNew, setIsNew] = useState(existingProduct?.isNew ?? true);
  const [isBestseller, setIsBestseller] = useState(existingProduct?.isBestseller ?? false);

  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determinar sugestão de imagem com base nas palavras-chave do produto
  const getSuggestedPhoto = () => {
    const text = (record.produto + ' ' + record.descricao).toLowerCase();
    for (const key of Object.keys(SUGGESTED_PRODUCT_PHOTOS)) {
      if (text.includes(key)) {
        return SUGGESTED_PRODUCT_PHOTOS[key][0];
      }
    }
    return SUGGESTED_PRODUCT_PHOTOS['default'][0];
  };

  // Se não houver imagem inicial, define a sugestão correspondente para ajudar o usuário
  useEffect(() => {
    if (!imageUrl) {
      const suggested = getSuggestedPhoto();
      if (suggested) {
        setImageUrl(suggested);
      }
    }
  }, []);

  // Upload e leitura da foto do produto via <input type="file">
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  const processImageFile = (file: File) => {
    setImageUploadError(null);

    // Validação de tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setImageUploadError('Por favor selecione um arquivo de imagem válido (JPG, PNG, WEBP).');
      return;
    }

    // Validação de tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError('A imagem é muito pesada (máx: 5MB). Dica: use uma foto otimizada.');
      return;
    }

    setImageUploadLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setImageUrl(result);
        setImageUploadLoading(false);
      }
    };
    reader.onerror = () => {
      setImageUploadError('Erro ao carregar a imagem. Tente novamente ou use um link direto.');
      setImageUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Salvar / Publicar na Vitrine
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Por favor, informe o nome do produto para a vitrine.');
      return;
    }

    if (price <= 0) {
      alert('O preço de venda deve ser maior que zero.');
      return;
    }

    const finalImage = imageUrl.trim() || getSuggestedPhoto();

    const updatedRecord: BiProductCalculatedRecord = {
      ...record,
      publishedToVitrine: true,
      autoHideWhenOutOfStock: autoHide,
      vitrineImageUrl: finalImage,
      vitrineCategory: category,
      vitrineTag: tag
    };

    const productPayload: Partial<Product> = {
      name: name.trim(),
      category: category,
      price: Number(price),
      originalPrice: originalPrice && originalPrice > 0 ? Number(originalPrice) : undefined,
      stock: record.saldoEstoqueQtd, // Sincronizado em tempo real com o saldo apurado
      images: [finalImage],
      description: description.trim(),
      features: [
        `Tam/Cor: ${record.tamCor}`,
        'Item original e selecionado com carinho pela Lavistore',
        'Embalado com todo o cuidado e cheirinho doce especial',
        'Pronta entrega em estoque real'
      ],
      tag: tag || 'Novidade ✨',
      isNew: isNew,
      isBestseller: isBestseller,
      biRecordId: record.id,
      originTamCor: record.tamCor,
      isPublished: true,
      autoHideWhenOutOfStock: autoHide
    };

    onPublish(updatedRecord, productPayload);
  };

  // Status de Estoque calculado
  const isOutOfStock = record.saldoEstoqueQtd <= 0;
  const isLowStock = record.saldoEstoqueQtd > 0 && record.saldoEstoqueQtd <= 5;
  const isAlreadyPublished = Boolean(record.publishedToVitrine || existingProduct);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-purple-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-2xl w-full border-2 border-amber-300 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Cabeçalho do Modal com Identidade Visual Lavistore */}
        <div className="flex items-start justify-between border-b border-amber-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-400 via-purple-500 to-amber-300 text-white flex items-center justify-center shadow-md">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Mali'] text-base sm:text-lg font-bold text-purple-950">
                  {isAlreadyPublished ? 'Atualizar Mimo na Vitrine' : 'Publicar Mimo na Vitrine'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-100 text-pink-700 border border-pink-200">
                  Integração Direta
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Replica os dados da planilha para a loja virtual com foto personalizada e sincronização de estoque.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerta e Card em Destaque do Produto Selecionado da Planilha */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border-2 border-pink-200/80 shadow-xs space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-extrabold text-pink-600 uppercase tracking-wider flex items-center gap-1">
                <Package className="w-3 h-3 text-pink-500" />
                Mimo Selecionado da Planilha para a Vitrine:
              </span>
              <h4 className="font-['Mali'] text-base sm:text-lg font-bold text-purple-950 flex items-center gap-2 flex-wrap">
                <span>{record.produto}</span>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-purple-200 text-purple-800 text-xs font-extrabold shadow-2xs">
                  {record.tamCor}
                </span>
              </h4>
            </div>

            {isOutOfStock ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 shrink-0">
                <AlertTriangle className="w-3 h-3" /> Esgotado
              </span>
            ) : isLowStock ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shrink-0">
                <AlertTriangle className="w-3 h-3" /> Restam {record.saldoEstoqueQtd} un.
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                <Check className="w-3 h-3" /> {record.saldoEstoqueQtd} em estoque
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-pink-200/60 text-[11px]">
            <div className="bg-white/85 p-2 rounded-xl border border-pink-100 shadow-2xs">
              <span className="text-slate-400 block text-[10px]">Preço de Venda</span>
              <strong className="text-purple-950 font-bold">R$ {record.precoVenda.toFixed(2)}</strong>
            </div>
            <div className="bg-white/85 p-2 rounded-xl border border-pink-100 shadow-2xs">
              <span className="text-slate-400 block text-[10px]">Custo Unitário</span>
              <strong className="text-slate-700 font-bold">R$ {record.custoUnitario.toFixed(2)}</strong>
            </div>
            <div className="bg-white/85 p-2 rounded-xl border border-pink-100 shadow-2xs">
              <span className="text-slate-400 block text-[10px]">Saldo Estoque</span>
              <strong className="text-emerald-700 font-bold">{record.saldoEstoqueQtd} unidades</strong>
            </div>
            <div className="bg-white/85 p-2 rounded-xl border border-pink-100 shadow-2xs">
              <span className="text-slate-400 block text-[10px]">Apuração</span>
              <strong className="text-purple-900 font-bold">{record.mes}/{record.ano}</strong>
            </div>
          </div>
        </div>

        {/* Formulário de Edição Rápida */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {/* SEÇÃO 1: FOTO DA VITRINE (Requisito 2 da solicitação) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-purple-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-pink-600" />
                <span>Foto Bonita para a Vitrine (Upload ou Link):</span>
              </span>
              <span className="text-[10px] font-normal text-slate-500">
                Formatos: JPG, PNG, WEBP (até 5MB)
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Preview da Imagem */}
              <div className="sm:col-span-1">
                <div className="relative aspect-square rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 overflow-hidden flex flex-col items-center justify-center p-2 group shadow-inner">
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt="Preview da Vitrine"
                        className="w-full h-full object-cover rounded-xl"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        title="Remover imagem"
                        className="absolute top-2 right-2 p-1 bg-white/90 hover:bg-rose-500 hover:text-white text-slate-600 rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-3 text-slate-400">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <p className="text-[10px] font-medium">Sem imagem definida</p>
                    </div>
                  )}

                  {imageUploadLoading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-pink-600 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Upload e Ações */}
              <div className="sm:col-span-2 space-y-2 flex flex-col justify-between">
                {/* Botão de Upload com Input type=file */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                    isDragOver 
                      ? 'border-purple-600 bg-purple-50/60' 
                      : 'border-pink-200 hover:border-pink-400 bg-pink-50/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-purple-950">
                      Clique para escolher a foto no seu computador
                    </p>
                    <p className="text-[10px] text-slate-500">
                      ou arraste e solte o arquivo aqui
                    </p>
                  </div>
                </div>

                {imageUploadError && (
                  <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {imageUploadError}
                  </p>
                )}

                {/* Opção alternativa: Colar URL direta da imagem */}
                <div>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Ou cole o link direto da imagem (URL https://...)"
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-200 rounded-xl text-xs text-purple-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>

                {/* Sugestões rápidas de fotos fofas para esse produto */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400">Sugestão:</span>
                  <button
                    type="button"
                    onClick={() => setImageUrl(getSuggestedPhoto())}
                    className="text-[10px] font-bold text-pink-700 bg-pink-100/70 hover:bg-pink-200 px-2 py-0.5 rounded-md transition-colors"
                  >
                    ✨ Aplicar Foto Sugerida ({record.produto})
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: DADOS DO PRODUTO (Preenchidos automaticamente da planilha) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-100">
            {/* Nome do Produto */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-purple-950 mb-1">
                Nome do Produto na Vitrine:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  required
                />
                {record.tamCor && (
                  <span className="self-center px-2.5 py-1.5 bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-[10px] font-extrabold whitespace-nowrap">
                    Tam/Cor: {record.tamCor}
                  </span>
                )}
              </div>
            </div>

            {/* Preço de Venda cadastrado */}
            <div>
              <label className="block text-[11px] font-bold text-purple-950 mb-1">
                Preço de Venda (Por R$):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Custo Unitário da Planilha: <strong>R$ {record.custoUnitario.toFixed(2)}</strong>
              </p>
            </div>

            {/* Preço Original Riscado De */}
            <div>
              <label className="block text-[11px] font-bold text-purple-950 mb-1 flex items-center justify-between">
                <span>Preço Original "De" (R$):</span>
                <span className="text-[9px] text-slate-400 font-normal">Opcional</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={originalPrice ?? ''}
                  onChange={(e) => setOriginalPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="Ex: 59.90"
                  className="w-full pl-9 pr-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Aparece riscado na vitrine em promoções
              </p>
            </div>

            {/* Categoria na Vitrine */}
            <div>
              <label className="block text-[11px] font-bold text-purple-950 mb-1">
                Categoria da Vitrine:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-300 cursor-pointer"
              >
                {CATEGORIES.filter(c => c.id !== 'todos').map(c => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selo / Tag Comercial */}
            <div>
              <label className="block text-[11px] font-bold text-purple-950 mb-1">
                Selo / Tag de Destaque:
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Ex: Fofura 💖, Novidade ✨, Exclusivo 🌸"
                className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            {/* Flags adicionais */}
            <div className="flex items-center gap-4 pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-purple-950">
                <input
                  type="checkbox"
                  checked={isNew}
                  onChange={(e) => setIsNew(e.target.checked)}
                  className="rounded text-pink-600 focus:ring-pink-400"
                />
                <span>Marcar como Novidade</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-purple-950">
                <input
                  type="checkbox"
                  checked={isBestseller}
                  onChange={(e) => setIsBestseller(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Destaque Favorito</span>
              </label>
            </div>
          </div>

          {/* Descrição fofinha formatada */}
          <div className="pt-2 border-t border-amber-100">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-purple-950">
                Descrição Encantadora da Vitrine (com emojis):
              </label>
              <span className="text-[10px] text-slate-400">{description.length} caracteres</span>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o produto com todo o carinho e encanto da Lavistore..."
              className="w-full px-3.5 py-2.5 bg-amber-50/50 border border-amber-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-300 leading-relaxed resize-none"
              required
            />
          </div>

          {/* SEÇÃO 3: REGRAS DE SINCRONIZAÇÃO DE ESTOQUE (Requisito 3 da solicitação) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 space-y-2">
            <div className="flex items-start gap-2.5">
              <input
                id="checkbox-auto-hide"
                type="checkbox"
                checked={autoHide}
                onChange={(e) => setAutoHide(e.target.checked)}
                className="mt-0.5 rounded text-pink-600 focus:ring-pink-400 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="checkbox-auto-hide" className="text-xs text-purple-950 cursor-pointer">
                <strong className="block font-bold">
                  Ocultar automaticamente da vitrine se o estoque for esgotado
                </strong>
                <span className="text-[11px] text-slate-600 block leading-tight mt-0.5">
                  Quando um cliente comprar e o saldo no estoque zerar (0 un.), o produto sairá da visualização dos clientes automaticamente para evitar vendas sem estoque físico.
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-purple-900 font-semibold pl-6">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Cada venda concluída no checkout abaterá o saldo em tempo real na planilha de apuração.
              </span>
            </div>
          </div>

          {/* Ações do Rodapé do Modal */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-amber-100">
            <div>
              {isAlreadyPublished && onUnpublish && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Deseja realmente despublicar e remover este produto da vitrine dos clientes?')) {
                      onUnpublish(record.id, existingProduct?.id || record.vitrineProductId);
                    }
                  }}
                  className="px-3.5 py-2 text-rose-700 hover:text-rose-900 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Despublicar da Vitrine</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              {isAlreadyPublished && existingProduct && onViewLiveProduct && (
                <button
                  type="button"
                  onClick={() => {
                    onViewLiveProduct(existingProduct);
                  }}
                  className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  title="Visualizar como os clientes veem na loja"
                >
                  <Eye className="w-3.5 h-3.5 text-purple-700" />
                  <span>Ver na Loja</span>
                </button>
              )}

              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>{isAlreadyPublished ? 'Salvar & Atualizar Vitrine' : 'Publicar na Vitrine 🌸'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
