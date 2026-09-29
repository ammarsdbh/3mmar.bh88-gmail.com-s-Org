import React from 'react';

interface NatanLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showText?: boolean;
  withGlow?: boolean;
}

export const NatanLogo: React.FC<NatanLogoProps> = ({
  size = 'md',
  className = '',
  withGlow = true,
}) => {
  const sizeClasses = {
    xs: 'w-7 h-7 rounded-lg',
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-12 h-12 rounded-2xl',
    lg: 'w-16 h-16 rounded-2xl',
    xl: 'w-20 h-20 rounded-2xl',
    '2xl': 'w-24 h-24 rounded-3xl',
  };

  return (
    <div
      className={`relative shrink-0 select-none transition-transform hover:scale-105 duration-200 overflow-hidden shadow-xl shadow-cyan-950/60 border border-cyan-500/30 bg-slate-950 flex items-center justify-center ${
        sizeClasses[size]
      } ${withGlow ? 'drop-shadow-[0_0_16px_rgba(6,182,212,0.35)]' : ''} ${className}`}
    >
      <img
        src="/app-icon.png"
        alt="NATAN Ninja Shifts Logo"
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
