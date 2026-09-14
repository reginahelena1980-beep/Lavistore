import React from 'react';
import { Star, CheckCircle, Heart, Flower2, Sparkles, MessageCircleHeart, Edit3 } from 'lucide-react';
import { CUSTOMER_REVIEWS } from '../data/reviews';
import { HomePageConfig, CustomerReview } from '../types';
import { getFontSizeClass, getFontWeightClass } from '../utils/textFormatter';

interface ReviewsSectionProps {
  config?: HomePageConfig;
  reviews?: CustomerReview[];
  isAdminEditing?: boolean;
  onEditField?: (fieldKey: keyof HomePageConfig, label: string) => void;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  config,
  reviews,
  isAdminEditing = false,
  onEditField
}) => {
  const badgeText = config?.reviewsBadge?.text || 'Depoimentos Reais';
  const titleText = config?.reviewsTitle?.text || 'Avaliações dos Clientes';
  const subtitleText = config?.reviewsSubtitle?.text || 'Veja o que nossos clientes dizem sobre a experiência de compra e a qualidade dos nossos produtos.';
  const displayedReviews = reviews || [];

  if (displayedReviews.length === 0 && !isAdminEditing) {
    return null;
  }

  return (
    <section className="py-12 md:py-16 bg-white/40 backdrop-blur-sm border-t border-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div 
            onClick={() => isAdminEditing && onEditField && onEditField('reviewsBadge', 'Depoimentos - Selo')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 uppercase tracking-wider ${getFontSizeClass(config?.reviewsBadge?.fontSize, 'text-xs')} ${getFontWeightClass(config?.reviewsBadge?.isBold, true)} ${isAdminEditing ? 'cursor-pointer hover:ring-2 hover:ring-rose-400' : ''}`}
          >
            <MessageCircleHeart className="w-3.5 h-3.5 text-[#F43F5E]" />
            <span>{badgeText}</span>
            {isAdminEditing && <Edit3 className="w-3 h-3 ml-1" />}
          </div>

          <h2 
            onClick={() => isAdminEditing && onEditField && onEditField('reviewsTitle', 'Depoimentos - Título')}
            className={`font-['Mali'] text-purple-950 ${getFontSizeClass(config?.reviewsTitle?.fontSize, 'text-3xl')} ${getFontWeightClass(config?.reviewsTitle?.isBold, true)} ${isAdminEditing ? 'cursor-pointer hover:underline decoration-amber-400 decoration-2' : ''}`}
          >
            {titleText}
          </h2>

          <p 
            onClick={() => isAdminEditing && onEditField && onEditField('reviewsSubtitle', 'Depoimentos - Subtítulo')}
            className={`font-['Comfortaa'] text-slate-600 ${getFontSizeClass(config?.reviewsSubtitle?.fontSize, 'text-sm')} ${getFontWeightClass(config?.reviewsSubtitle?.isBold, false)} ${isAdminEditing ? 'cursor-pointer hover:underline decoration-amber-400 decoration-2' : ''}`}
          >
            {subtitleText}
          </p>

          <div className="pt-2 flex items-center justify-center gap-2">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400" />
              ))}
            </div>
            <span className="text-xs font-bold text-slate-700">
              {config?.reviewsAverageRatingText || '4.9 / 5.0 (Mais de 1.800 avaliações 5 estrelas)'}
            </span>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayedReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white/85 backdrop-blur-md p-5 rounded-3xl border border-white/90 shadow-2xs hover:shadow-lg hover:shadow-pink-500/10 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-400">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{rev.date}</span>
                </div>

                {/* Comment */}
                <p className="font-['Quicksand'] text-xs sm:text-sm text-slate-700 font-medium leading-relaxed italic">
                  "{rev.comment}"
                </p>

                {/* Product tagged */}
                <span className="inline-block text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100/60">
                  🌸 {rev.productName}
                </span>
              </div>

              {/* Author */}
              <div className="pt-4 mt-4 border-t border-purple-50 flex items-center gap-3">
                <img
                  src={rev.avatar}
                  alt={rev.author}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-purple-200"
                />
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-bold text-purple-950">{rev.author}</h4>
                    {rev.verified && (
                      <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" title="Compra Verificada" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">{rev.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Instagram Community Banner */}
        <div className="mt-12 bg-gradient-to-r from-purple-100 via-pink-100 to-purple-100 rounded-3xl p-6 sm:p-8 text-center border border-purple-200 flex flex-col items-center space-y-3">
          <div className="flex items-center gap-2 text-pink-600 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>{config?.reviewsInstagramTag || 'Comunidade Apaixonada'}</span>
          </div>
          <h3 className="font-['Playfair_Display'] text-xl sm:text-2xl font-bold text-purple-950">
            {config?.reviewsInstagramTitle || 'Compartilhe sua experiência no Instagram'}
          </h3>
          <p className="font-['Quicksand'] text-xs sm:text-sm text-purple-900 font-medium max-w-lg">
            {config?.reviewsInstagramSubtitle || 'Marque nosso perfil oficial em seus stories para aparecer em nosso feed de novidades!'}
          </p>
        </div>

      </div>
    </section>
  );
};
