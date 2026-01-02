import { Zap } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showTagline = false, className = '' }: LogoProps) {
  const sizes = {
    sm: {
      icon: 'w-5 h-5',
      container: 'w-9 h-9',
      text: 'text-xl',
      tagline: 'text-xs',
    },
    md: {
      icon: 'w-6 h-6',
      container: 'w-11 h-11',
      text: 'text-2xl',
      tagline: 'text-sm',
    },
    lg: {
      icon: 'w-7 h-7',
      container: 'w-13 h-13',
      text: 'text-3xl',
      tagline: 'text-base',
    },
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <div className={`${currentSize.container} rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20`}>
        <Zap className={`${currentSize.icon} text-white`} strokeWidth={2.5} />
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <h1 className={`${currentSize.text} font-bold text-white leading-none mb-0.5`}>
          Flare<span className="text-orange-400">Lab</span>
        </h1>
        {showTagline && (
          <p className={`${currentSize.tagline} text-gray-500 leading-none`}>
            by pixology.ai
          </p>
        )}
      </div>
    </div>
  );
}
