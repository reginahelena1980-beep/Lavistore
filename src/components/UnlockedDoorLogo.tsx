import React from 'react';

interface UnlockedDoorLogoProps {
  variant?: 'horizontal' | 'stacked' | 'icon-only' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

/**
 * Mystic Keyhole Portal Emblem Icon:
 * Gothic archway "U" with an illuminated glowing cyan keyhole.
 */
export const KeyholeEmblemIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 36,
  className = ''
}) => {
  return (
    <div 
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center rounded-xl bg-gradient-to-b from-[#0F172A] via-[#0A0F1D] to-[#040711] border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.35)] shrink-0 overflow-hidden ${className}`}
    >
      {/* Subtle background radial glow */}
      <div className="absolute inset-0 bg-radial from-cyan-500/20 via-transparent to-transparent opacity-80" />

      {/* SVG Arcane Keyhole & Arch */}
      <svg 
        width={size * 0.65} 
        height={size * 0.65} 
        viewBox="0 0 40 44" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]"
      >
        <defs>
          <linearGradient id="cyan-glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A5F3FC" />
            <stop offset="50%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Gothic Archway / "U" Frame */}
        <path
          d="M 6 12 C 6 4, 34 4, 34 12 L 34 32 C 34 39, 6 39, 6 32 Z"
          stroke="url(#cyan-glow-grad)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter="url(#neon-glow)"
        />

        {/* Inner Arch Line */}
        <path
          d="M 11 15 C 11 9, 29 9, 29 15 L 29 29 C 29 34, 11 34, 11 29 Z"
          stroke="#38BDF8"
          strokeWidth="1.2"
          strokeOpacity="0.6"
          fill="none"
        />

        {/* Arcane Keyhole Shape */}
        <circle cx="20" cy="19" r="4" fill="url(#cyan-glow-grad)" />
        <path 
          d="M 18 21 L 22 21 L 23.5 28 C 23.5 29, 16.5 29, 16.5 28 Z" 
          fill="url(#cyan-glow-grad)" 
        />
        {/* Core light spark */}
        <circle cx="20" cy="19" r="1.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

export const UnlockedDoorLogo: React.FC<UnlockedDoorLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showTagline = true
}) => {
  const iconSizes = {
    xs: 28,
    sm: 34,
    md: 44,
    lg: 56,
    xl: 72
  };

  const titleSizes = {
    xs: 'text-base',
    sm: 'text-lg sm:text-xl',
    md: 'text-xl sm:text-2xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-4xl sm:text-5xl'
  };

  const subtitleSizes = {
    xs: 'text-[8px]',
    sm: 'text-[9px]',
    md: 'text-[10px] sm:text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm'
  };

  if (variant === 'icon-only') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <KeyholeEmblemIcon size={iconSizes[size]} />
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center text-center gap-2 group cursor-pointer ${className}`}>
        <KeyholeEmblemIcon size={iconSizes[size]} className="group-hover:scale-105 transition-transform duration-300" />
        <div>
          <h1 className={`font-['Cinzel_Decorative',serif] font-bold tracking-wider text-slate-100 uppercase ${titleSizes[size]}`}>
            UNLOCKED <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">DOOR</span>
          </h1>
          {showTagline && (
            <p className={`font-['Cinzel',serif] tracking-[0.25em] text-cyan-300/80 font-semibold uppercase ${subtitleSizes[size]}`}>
              ENTER • EXPLORE • DISCOVER
            </p>
          )}
        </div>
      </div>
    );
  }

  // Default 'horizontal'
  return (
    <div className={`flex items-center gap-3 sm:gap-3.5 group cursor-pointer ${className}`}>
      <KeyholeEmblemIcon size={iconSizes[size]} className="group-hover:scale-105 transition-transform duration-300" />
      <div className="flex flex-col">
        <span className={`font-['Cinzel_Decorative',serif] font-bold tracking-widest text-slate-100 uppercase leading-none ${titleSizes[size]}`}>
          UNLOCKED <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">DOOR</span>
        </span>
        {showTagline && (
          <span className={`font-['Cinzel',serif] tracking-[0.25em] text-cyan-300/80 font-medium uppercase mt-1 leading-none ${subtitleSizes[size]}`}>
            ENTER • EXPLORE • DISCOVER
          </span>
        )}
      </div>
    </div>
  );
};
