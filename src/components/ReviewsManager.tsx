import React, { useState } from 'react';
import { 
  Star, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  RotateCcw, 
  Check, 
  CheckCircle, 
  MessageCircleHeart,
  User,
  MapPin,
  Package,
  Calendar,
  Image as ImageIcon,
  Type,
  Bold
} from 'lucide-react';
import { CustomerReview, HomePageConfig, FormattedText } from '../types';
import { CUSTOMER_REVIEWS } from '../data/reviews';
import { getFontSizeClass, getFontWeightClass } from '../utils/textFormatter';

interface ReviewsManagerProps {
  config: HomePageConfig;
  reviews: CustomerReview[];
  onSaveConfig: (newConfig: HomePageConfig) => void;
  onSaveReviews: (newReviews: CustomerReview[]) => void;
  onResetDefaults: () => void;
}

export const ReviewsManager: React.FC<ReviewsManagerProps> = ({
  config,
  reviews,
  onSaveConfig,
  onSaveReviews,
  onResetDefaults
}) => {
  const [configData, setConfigData] = useState<HomePageConfig>(config);
  const [reviewsList, setReviewsList] = useState<CustomerReview[]>(reviews);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingReviewForm, setEditingReviewForm] = useState<Partial<CustomerReview>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'section_texts' | 'review_list'>('section_texts');

  const fontSizes: Array<{ value: FormattedText['fontSize']; label: string }> = [
    { value: 'xs', label: 'Muito Pequena (xs)' },
    { value: 'sm', label: 'Pequena (sm)' },
    { value: 'base', label: 'Normal / Média (base)' },
    { value: 'lg', label: 'Grande (lg)' },
    { value: 'xl', label: 'Muito Grande (xl)' },
    { value: '2xl', label: 'Título 2X (2xl)' },
    { value: '3xl', label: 'Título 3X (3xl)' },
    { value: '4xl', label: 'Destaque 4X (4xl)' }
  ];

  const updateConfigField = (
    fieldKey: 'reviewsBadge' | 'reviewsTitle' | 'reviewsSubtitle',
    partial: Partial<FormattedText>
  ) => {
    setConfigData(prev => {
      const current = prev[fieldKey] || { text: '', fontSize: 'base', isBold: false };
      return {
        ...prev,
        [fieldKey]: {
          ...current,
          ...partial
        }
      };
    });
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(configData);
    onSaveReviews(reviewsList);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleStartEditReview = (rev: CustomerReview) => {
    setEditingReviewId(rev.id);
    setEditingReviewForm({ ...rev });
    setIsCreating(false);
  };

  const handleStartCreateReview = () => {
    setIsCreating(true);
    setEditingReviewId(null);
    setEditingReviewForm({
      id: `rev-${Date.now()}`,
      author: '',
      city: '',
      rating: 5,
      date: 'Recente',
      comment: '',
      productName: '',
      verified: true,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
    });
  };

  const handleSaveReviewForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReviewForm.author || !editingReviewForm.comment) {
      alert('Por favor, preencha pelo menos o Nome da Cliente e o Comentário.');
      return;
    }

    if (isCreating) {
      const newReview = editingReviewForm as CustomerReview;
      const updated = [newReview, ...reviewsList];
      setReviewsList(updated);
      onSaveReviews(updated);
      setIsCreating(false);
      setEditingReviewForm({});
    } else if (editingReviewId) {
      const updated = reviewsList.map(r => 
        r.id === editingReviewId ? ({ ...r, ...editingReviewForm } as CustomerReview) : r
      );
      setReviewsList(updated);
      onSaveReviews(updated);
      setEditingReviewId(null);
      setEditingReviewForm({});
    }

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleDeleteReview = (id: string) => {
    if (confirm('Tem certeza de que deseja remover este depoimento?')) {
      const updated = reviewsList.filter(r => r.id !== id);
      setReviewsList(updated);
      onSaveReviews(updated);
      if (editingReviewId === id) {
        setEditingReviewId(null);
        setEditingReviewForm({});
      }
    }
  };

  const handleResetToDefaultReviews = () => {
    if (confirm('Deseja restaurar a lista de depoimentos e os textos da seção para os originais?')) {
      setReviewsList(CUSTOMER_REVIEWS);
      onSaveReviews(CUSTOMER_REVIEWS);
      onResetDefaults();
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    }
  };

  return (
    <div className="space-y-6 font-['Comfortaa'] animate-in fade-in">
      
      {/* Header Info */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border-2 border-amber-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider border border-rose-300">
            <MessageCircleHeart className="w-3.5 h-3.5 text-rose-600" />
            <span>Gerenciador de Prova Social</span>
          </div>
          <h2 className="font-['Mali'] text-xl sm:text-2xl font-bold text-purple-950">
            Depoimentos & Avaliações de Clientes
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl">
            Edite todos os textos da seção, média de avaliações e gerencie cada depoimento com foto, cidade, comentário e estrelas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefaultReviews}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 border border-amber-300"
          >
            <Save className="w-4 h-4 text-purple-950" />
            <span>Salvar Tudo</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {savedToast && (
        <div className="bg-emerald-100 border-2 border-emerald-400 text-emerald-950 p-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-600" />
          <span>Alterações em Depoimentos salvas com sucesso! ⭐</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-amber-100/70 border-2 border-amber-300 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('section_texts')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'section_texts'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Type className="w-3.5 h-3.5 text-amber-300" />
          <span>1. Título & Média de Avaliações</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('review_list')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'review_list'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-purple-950 hover:bg-amber-200/60'
          }`}
        >
          <Star className="w-3.5 h-3.5 text-yellow-300" />
          <span>2. Lista de Depoimentos ({reviewsList.length})</span>
        </button>
      </div>

      {/* TAB 1: SECTION TEXTS */}
      {activeTab === 'section_texts' && (
        <form onSubmit={handleSaveAll} className="space-y-5">
          <div className="p-6 rounded-3xl bg-white/95 border-2 border-amber-200 shadow-2xs space-y-5">
            <h3 className="font-['Mali'] text-lg font-bold text-purple-950 flex items-center gap-2">
              <MessageCircleHeart className="w-4 h-4 text-rose-500" />
              <span>Textos de Cabeçalho da Seção de Depoimentos</span>
            </h3>

            {/* Badge */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-950">Selo Superior (Badge)</label>
                <button
                  type="button"
                  onClick={() => updateConfigField('reviewsBadge', { isBold: !configData.reviewsBadge?.isBold })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border ${
                    configData.reviewsBadge?.isBold 
                      ? 'bg-purple-950 text-white border-purple-950' 
                      : 'bg-white text-slate-700 border-amber-300'
                  }`}
                >
                  <Bold className="w-3 h-3" />
                  <span>{configData.reviewsBadge?.isBold ? 'Negrito' : 'Normal'}</span>
                </button>
              </div>
              <input
                type="text"
                value={configData.reviewsBadge?.text || ''}
                onChange={(e) => updateConfigField('reviewsBadge', { text: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs sm:text-sm text-purple-950 font-medium"
                placeholder="Digite o selo da seção aqui"
              />
            </div>

            {/* Title */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-950">Título Principal da Seção</label>
                <button
                  type="button"
                  onClick={() => updateConfigField('reviewsTitle', { isBold: !configData.reviewsTitle?.isBold })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border ${
                    configData.reviewsTitle?.isBold 
                      ? 'bg-purple-950 text-white border-purple-950' 
                      : 'bg-white text-slate-700 border-amber-300'
                  }`}
                >
                  <Bold className="w-3 h-3" />
                  <span>{configData.reviewsTitle?.isBold ? 'Negrito' : 'Normal'}</span>
                </button>
              </div>
              <input
                type="text"
                value={configData.reviewsTitle?.text || ''}
                onChange={(e) => updateConfigField('reviewsTitle', { text: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs sm:text-sm text-purple-950 font-medium"
                placeholder="Digite o título principal da seção aqui"
              />
            </div>

            {/* Subtitle */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-950">Subtítulo Explicativo</label>
                <button
                  type="button"
                  onClick={() => updateConfigField('reviewsSubtitle', { isBold: !configData.reviewsSubtitle?.isBold })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border ${
                    configData.reviewsSubtitle?.isBold 
                      ? 'bg-purple-950 text-white border-purple-950' 
                      : 'bg-white text-slate-700 border-amber-300'
                  }`}
                >
                  <Bold className="w-3 h-3" />
                  <span>{configData.reviewsSubtitle?.isBold ? 'Negrito' : 'Normal'}</span>
                </button>
              </div>
              <textarea
                rows={2}
                value={configData.reviewsSubtitle?.text || ''}
                onChange={(e) => updateConfigField('reviewsSubtitle', { text: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs sm:text-sm text-purple-950 font-medium"
                placeholder="Escreva a descrição ou subtítulo dos depoimentos aqui"
              />
            </div>

            {/* Rating Summary Text */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-2">
              <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span>Texto do Resumo de Avaliação (Estrelinhas no Topo)</span>
              </label>
              <input
                type="text"
                value={configData.reviewsRatingSummary || '4.9 / 5.0 (Mais de 1.800 avaliações 5 estrelas)'}
                onChange={(e) => setConfigData(prev => ({ ...prev, reviewsRatingSummary: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs sm:text-sm text-purple-950 font-medium"
                placeholder="Digite o texto de resumo de avaliação aqui"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 border border-amber-300 cursor-pointer"
              >
                <Save className="w-4 h-4 text-purple-950" />
                <span>Salvar Textos da Seção de Depoimentos</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: REVIEWS LIST & CRUD */}
      {activeTab === 'review_list' && (
        <div className="space-y-6">

          {/* Add Review Button */}
          {!isCreating && !editingReviewId && (
            <div className="flex justify-between items-center bg-white/95 p-4 rounded-2xl border-2 border-amber-200">
              <span className="text-xs sm:text-sm font-bold text-purple-950">
                Total de Depoimentos Cadastrados: {reviewsList.length}
              </span>
              <button
                type="button"
                onClick={handleStartCreateReview}
                className="px-4 py-2 bg-purple-950 hover:bg-purple-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-300" />
                <span>Adicionar Novo Depoimento</span>
              </button>
            </div>
          )}

          {/* Review Form (Create or Edit) */}
          {(isCreating || editingReviewId) && (
            <form onSubmit={handleSaveReviewForm} className="p-6 rounded-3xl bg-white/95 border-2 border-amber-300 shadow-md space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-amber-200">
                <h3 className="font-['Mali'] text-base font-bold text-purple-950 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <span>{isCreating ? 'Novo Depoimento de Cliente' : 'Editar Depoimento'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditingReviewId(null); setEditingReviewForm({}); }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Nome da Cliente</label>
                  <input
                    type="text"
                    required
                    value={editingReviewForm.author || ''}
                    onChange={(e) => setEditingReviewForm(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="Digite o nome da cliente aqui"
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Cidade / Estado</label>
                  <input
                    type="text"
                    value={editingReviewForm.city || ''}
                    onChange={(e) => setEditingReviewForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Digite a cidade e estado aqui"
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Data / Tempo Decorrido</label>
                  <input
                    type="text"
                    value={editingReviewForm.date || ''}
                    onChange={(e) => setEditingReviewForm(prev => ({ ...prev, date: e.target.value }))}
                    placeholder="Digite a data ou período aqui"
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Produto Associado / Comprado</label>
                  <input
                    type="text"
                    value={editingReviewForm.productName || ''}
                    onChange={(e) => setEditingReviewForm(prev => ({ ...prev, productName: e.target.value }))}
                    placeholder="Digite o nome do produto avaliado aqui"
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs text-purple-950 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-950 block mb-1">Nota em Estrelas (1 a 5)</label>
                  <div className="flex items-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setEditingReviewForm(prev => ({ ...prev, rating: starVal }))}
                        className={`p-1.5 rounded-lg border transition-all ${
                          (editingReviewForm.rating || 5) >= starVal 
                            ? 'bg-amber-100 border-amber-400 text-amber-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-300'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${(editingReviewForm.rating || 5) >= starVal ? 'fill-amber-400' : ''}`} />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-purple-950 ml-2">
                      {editingReviewForm.rating || 5} Estrelas
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-purple-950 block mb-1">Depoimento da Cliente</label>
                <textarea
                  rows={3}
                  required
                  value={editingReviewForm.comment || ''}
                  onChange={(e) => setEditingReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Escreva o depoimento da cliente aqui"
                  className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs sm:text-sm text-purple-950 font-medium"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingReviewForm.verified ?? true}
                    onChange={(e) => setEditingReviewForm(prev => ({ ...prev, verified: e.target.checked }))}
                    className="w-4 h-4 rounded text-purple-950 focus:ring-amber-400"
                  />
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Compra Verificada</span>
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsCreating(false); setEditingReviewId(null); setEditingReviewForm({}); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 text-purple-950 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isCreating ? 'Adicionar Depoimento' : 'Atualizar Depoimento'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Reviews Cards List */}
          {reviewsList.length === 0 ? (
            <div className="text-center p-8 bg-white/95 rounded-2xl border-2 border-dashed border-amber-200 text-slate-500 space-y-2">
              <MessageCircleHeart className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-xs sm:text-sm font-bold text-purple-950">Nenhum depoimento cadastrado no momento.</p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Todos os depoimentos de demonstração foram removidos. Clique em "Adicionar Novo Depoimento" acima para cadastrar avaliações reais das suas clientes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewsList.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white/95 rounded-2xl p-4 border-2 border-amber-200 shadow-2xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {rev.avatar ? (
                        <img
                          src={rev.avatar}
                          alt={rev.author}
                          className="w-10 h-10 rounded-full object-cover border border-amber-300 shadow-2xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-purple-950 font-bold text-xs border border-amber-300">
                          {rev.author.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-purple-950 flex items-center gap-1.5">
                          <span>{rev.author}</span>
                          {rev.verified && (
                            <CheckCircle className="w-3 h-3 text-emerald-500" title="Compra Verificada" />
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-500">{rev.city} • {rev.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditReview(rev)}
                        className="p-1.5 text-slate-600 hover:text-purple-950 hover:bg-amber-100 rounded-lg transition-colors"
                        title="Editar Depoimento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(rev.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir Depoimento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex text-amber-400">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>

                  <p className="text-xs text-slate-700 italic font-medium leading-relaxed">
                    "{rev.comment}"
                  </p>

                  {rev.productName && (
                    <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60 w-fit">
                      🌸 {rev.productName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
