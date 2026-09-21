import React from 'react';

interface LavistoreLogoProps {
  variant?: 'horizontal' | 'stacked' | 'icon-only' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
  isDarkTheme?: boolean;
}

/**
 * Hand-drawn children style trio flowers icon
 * Illustrated with soft organic hand-drawn strokes, cute smiling faces and warm sunny center
 */
export const TrioFlowersIcon: React.FC<{ size?: number; className?: string }> = ({ 
  size = 48, 
  className = '' 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${className}`}
      aria-label="Logo Trio Florzinhas Desenho de Criança Lavistore Kids"
    >
      <defs>
        {/* Soft drop shadow */}
        <filter id="crayon-shadow" x="-15%" y="-15%" width="135%" height="135%">
          <feDropShadow dx="1.5" dy="3" stdDeviation="2" floodColor="#78350f" floodOpacity="0.3" />
        </filter>

        {/* Deeper Sunny Golden Gradient for centers */}
        <linearGradient id="sunny-yellow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Crayon Turquoise */}
        <linearGradient id="kid-turquoise" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="60%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0891B2" />
        </linearGradient>

        {/* Crayon Rose/Pink */}
        <linearGradient id="kid-pink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDA4AF" />
          <stop offset="60%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>

        {/* Crayon Violet */}
        <linearGradient id="kid-violet" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="60%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>

        {/* Wood base / Craft board with deeper warm yellow tone */}
        <linearGradient id="craft-wood" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Decorative hand-drawn sparkles around flowers in dark golden yellow */}
      <g stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
        <path d="M 12 28 Q 14 22 16 28 M 10 25 Q 16 25 18 25" />
        <path d="M 106 18 Q 108 12 110 18 M 104 15 Q 110 15 112 15" />
        <path d="M 98 100 Q 100 94 102 100 M 96 97 Q 102 97 104 97" />
      </g>

      <g filter="url(#crayon-shadow)">
        {/* ======================================================== */}
        {/* 1. TOP-LEFT FLOWER: Pink Crayon Hand-Drawn Daisy         */}
        {/* ======================================================== */}
        <g transform="translate(36, 36) scale(0.76) rotate(-12)">
          {/* Wood contour offset in deep amber yellow */}
          <path
            d="M0 -32 C9 -33, 16 -24, 16 -15 C26 -19, 34 -11, 33 -2 C41 4, 41 15, 35 22 C29 29, 18 29, 13 23 C7 32, -3 34, -10 30 C-17 26, -19 16, -15 9 C-25 10, -32 2, -32 -7 C-32 -16, -24 -21, -15 -19 C-17 -28, -9 -32 0 -32 Z"
            fill="url(#craft-wood)"
            stroke="#B45309"
            strokeWidth="2.5"
            strokeLinejoin="round"
            transform="translate(3, 4)"
          />
          {/* Child-like Hand drawn Petals */}
          <path
            d="M0 -32 C9 -33, 16 -24, 16 -15 C26 -19, 34 -11, 33 -2 C41 4, 41 15, 35 22 C29 29, 18 29, 13 23 C7 32, -3 34, -10 30 C-17 26, -19 16, -15 9 C-25 10, -32 2, -32 -7 C-32 -16, -24 -21, -15 -19 C-17 -28, -9 -32 0 -32 Z"
            fill="url(#kid-pink)"
            stroke="#BE123C"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Petal stroke creases */}
          <path d="M 0 -26 L 0 -15 M 24 0 L 14 0 M 18 18 L 10 10 M -18 18 L -10 10 M -24 0 L -14 0" stroke="#FFE4E6" strokeWidth="2.5" strokeLinecap="round" />
          {/* Deep Sunny Gold Center with cute face */}
          <circle cx="0" cy="0" r="12" fill="url(#sunny-yellow-grad)" stroke="#B45309" strokeWidth="2.5" />
          {/* Cute hand-drawn eyes and smile */}
          <circle cx="-4" cy="-2" r="1.8" fill="#451A03" />
          <circle cx="4" cy="-2" r="1.8" fill="#451A03" />
          <path d="M -4 3 Q 0 7 4 3" stroke="#451A03" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Rosy cheeks */}
          <circle cx="-7" cy="1.5" r="2.2" fill="#F43F5E" opacity="0.6" />
          <circle cx="7" cy="1.5" r="2.2" fill="#F43F5E" opacity="0.6" />
        </g>

        {/* ======================================================== */}
        {/* 2. TOP-RIGHT FLOWER: Violet Crayon Hand-Drawn Daisy      */}
        {/* ======================================================== */}
        <g transform="translate(80, 38) scale(0.88) rotate(14)">
          {/* Wood contour offset in deep amber yellow */}
          <path
            d="M0 -32 C9 -33, 16 -24, 16 -15 C26 -19, 34 -11, 33 -2 C41 4, 41 15, 35 22 C29 29, 18 29, 13 23 C7 32, -3 34, -10 30 C-17 26, -19 16, -15 9 C-25 10, -32 2, -32 -7 C-32 -16, -24 -21, -15 -19 C-17 -28, -9 -32 0 -32 Z"
            fill="url(#craft-wood)"
            stroke="#B45309"
            strokeWidth="2.5"
            strokeLinejoin="round"
            transform="translate(3.5, 4.5)"
          />
          {/* Violet Petals */}
          <path
            d="M0 -32 C9 -33, 16 -24, 16 -15 C26 -19, 34 -11, 33 -2 C41 4, 41 15, 35 22 C29 29, 18 29, 13 23 C7 32, -3 34, -10 30 C-17 26, -19 16, -15 9 C-25 10, -32 2, -32 -7 C-32 -16, -24 -21, -15 -19 C-17 -28, -9 -32 0 -32 Z"
            fill="url(#kid-violet)"
            stroke="#5B21B6"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Petal shine strokes */}
          <path d="M 0 -26 L 0 -15 M 24 0 L 14 0 M 18 18 L 10 10 M -18 18 L -10 10 M -24 0 L -14 0" stroke="#EDE9FE" strokeWidth="2.5" strokeLinecap="round" />
          {/* Deep Sunny Gold Center with cute face */}
          <circle cx="0" cy="0" r="13" fill="url(#sunny-yellow-grad)" stroke="#B45309" strokeWidth="2.5" />
          {/* Happy winking eyes */}
          <path d="M -6 -2 Q -4 -5 -2 -2" stroke="#451A03" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="4" cy="-2" r="1.8" fill="#451A03" />
          <path d="M -4 3.5 Q 0 8 4 3.5" stroke="#451A03" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Cheeks */}
          <circle cx="-7.5" cy="2" r="2.5" fill="#FB7185" opacity="0.6" />
          <circle cx="7.5" cy="2" r="2.5" fill="#FB7185" opacity="0.6" />
        </g>

        {/* ======================================================== */}
        {/* 3. BOTTOM-CENTER FLOWER: Turquoise Crayon Daisy          */}
        {/* ======================================================== */}
        <g transform="translate(48, 80) scale(0.94) rotate(-6)">
          {/* Wood contour offset in deep amber yellow */}
          <path
            d="M0 -32 C9 -33, 16 -24, 16 -15 C26 -19, 34 -11, 33 -2 C41 4, 41 15, 35 22 C29 29, 18 29, 13 23 C7 32, -3 34, -10 30 C-17 26, -19 16, -15 9 C-25 10, -32 2, -32 -7 C-32 -16, -24 -21, -15 -19 C-17 -28, -9 -32 0 -32 Z"
            fill="url(#craft-wood)"
            stroke="#B45309"
            strokeWidth="2.5"
            strokeLinejoin="round"
            transform="translate(3.5, 4.5)"
          />
          {/* Turquoise Petals */}
          <path
            d="M0 -32 C9 -33, 16 -24, 16 -15 C26 -19, 34 -11, 33 -2 C41 4, 41 15, 35 22 C29 29, 18 29, 13 23 C7 32, -3 34, -10 30 C-17 26, -19 16, -15 9 C-25 10, -32 2, -32 -7 C-32 -16, -24 -21, -15 -19 C-17 -28, -9 -32 0 -32 Z"
            fill="url(#kid-turquoise)"
            stroke="#0E7490"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Shine strokes */}
          <path d="M 0 -26 L 0 -15 M 24 0 L 14 0 M 18 18 L 10 10 M -18 18 L -10 10 M -24 0 L -14 0" stroke="#CFFAFE" strokeWidth="2.5" strokeLinecap="round" />
          {/* Deep Sunny Gold Center with cute face */}
          <circle cx="0" cy="0" r="13" fill="url(#sunny-yellow-grad)" stroke="#B45309" strokeWidth="2.5" />
          {/* Joyful open mouth face */}
          <circle cx="-4" cy="-2" r="1.8" fill="#451A03" />
          <circle cx="4" cy="-2" r="1.8" fill="#451A03" />
          <path d="M -4 3 Q 0 8 4 3 Z" fill="#E11D48" stroke="#451A03" strokeWidth="1.6" strokeLinejoin="round" />
          {/* Cheeks */}
          <circle cx="-7.5" cy="1.5" r="2.5" fill="#F43F5E" opacity="0.55" />
          <circle cx="7.5" cy="1.5" r="2.5" fill="#F43F5E" opacity="0.55" />
        </g>
      </g>
    </svg>
  );
};

export const LavistoreLogo: React.FC<LavistoreLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showTagline = true,
  isDarkTheme = false
}) => {
  // Size mapping
  const iconSizes = {
    xs: 38,
    sm: 50,
    md: 66,
    lg: 84,
    xl: 110
  };

  // Original Mali Font sizing
  const titleSizes = {
    xs: 'text-xl',
    sm: 'text-2xl sm:text-3xl',
    md: 'text-3xl sm:text-4xl lg:text-[2.6rem]',
    lg: 'text-4xl sm:text-5xl lg:text-6xl',
    xl: 'text-5xl sm:text-6xl lg:text-7xl'
  };

  const subtitleSizes = {
    xs: 'text-[9px]',
    sm: 'text-[11px]',
    md: 'text-xs sm:text-[13px]',
    lg: 'text-sm sm:text-base',
    xl: 'text-base sm:text-lg'
  };

  if (variant === 'icon-only') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <div className="relative p-2 rounded-2xl bg-[#FEDE76] shadow-sm border-2 border-[#F5B800]">
          <TrioFlowersIcon size={iconSizes[size]} />
        </div>
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 shadow-xs backdrop-blur-md ${
        isDarkTheme 
          ? 'bg-purple-950/90 border-[#F5B800] text-white' 
          : 'bg-[#FEDE76] border-[#F5B800] text-purple-950 shadow-amber-300/30'
      } ${className}`}>
        <div className="p-0.5 rounded-lg bg-[#FEDE76]">
          <TrioFlowersIcon size={24} />
        </div>
        <span className="font-['Mali'] font-bold text-base tracking-wide whitespace-nowrap">
          Lavi<span className="text-[#F43F5E]">store</span>{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] via-[#F43F5E] to-[#8B5CF6] font-extrabold">Kids</span>
        </span>
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center text-center gap-3 group ${className}`}>
        {/* Attachment Yellow Tone Background Container for the Trio Flowers */}
        <div className="relative p-2.5 sm:p-3 rounded-3xl bg-[#FEDE76] shadow-md shadow-amber-300/30 border-2 border-[#F5B800] group-hover:scale-105 transition-transform duration-300">
          <TrioFlowersIcon size={iconSizes[size]} />
        </div>
        <div>
          <div className="flex items-baseline justify-center gap-1.5 flex-wrap">
            <span className={`font-['Mali'] font-bold tracking-tight whitespace-nowrap ${titleSizes[size]} ${
              isDarkTheme ? 'text-white' : 'text-purple-950'
            }`}>
              Lavi<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F43F5E] via-[#FB923C] to-[#06B6D4]">store</span>{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] via-[#E11D48] to-[#8B5CF6] font-extrabold">Kids</span>
            </span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#F5B800] animate-bounce shadow-xs border border-white" />
          </div>
          {showTagline && (
            <p className={`font-['Comfortaa'] font-bold tracking-wider mt-0.5 ${subtitleSizes[size]} ${
              isDarkTheme ? 'text-amber-200' : 'text-purple-900'
            }`}>
              Presentes e Mimos Criativos
            </p>
          )}
        </div>
      </div>
    );
  }

  // Default 'horizontal'
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3.5 group ${className}`}>
      {/* Attachment Yellow Tone Background Container for the Trio Flowers */}
      <div className="relative p-1.5 sm:p-2 rounded-2xl bg-[#FEDE76] shadow-sm border-2 border-[#F5B800] group-hover:scale-105 group-hover:shadow-md group-hover:shadow-amber-300/40 transition-all duration-300">
        <TrioFlowersIcon size={iconSizes[size]} />
      </div>
      <div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className={`font-['Mali'] font-bold tracking-tight whitespace-nowrap ${titleSizes[size]} ${
            isDarkTheme ? 'text-white' : 'text-purple-950'
          }`}>
            Lavi<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F43F5E] via-[#FB923C] to-[#06B6D4]">store</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] via-[#E11D48] to-[#8B5CF6] font-extrabold">Kids</span>
          </span>
          <div className="flex items-center gap-1 -translate-y-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#F5B800] shadow-2xs border border-white" title="Flor Amarela" />
            <span className="inline-block w-2 h-2 rounded-full bg-[#06B6D4] shadow-2xs border border-white" title="Flor Turquesa" />
            <span className="inline-block w-2 h-2 rounded-full bg-[#F43F5E] shadow-2xs border border-white" title="Flor Rosa" />
          </div>
        </div>
        {showTagline && (
          <p className={`font-['Comfortaa'] font-bold tracking-normal ${subtitleSizes[size]} ${
            isDarkTheme ? 'text-amber-300' : 'text-purple-900'
          }`}>
            Presentes e Mimos Criativos
          </p>
        )}
      </div>
    </div>
  );
};

