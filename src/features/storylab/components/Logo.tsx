import { Beaker } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showTagline = false, className = '' }: LogoProps) {
  const sizes = {
    sm: {
      icon: 'w-6 h-6',
      container: 'w-10 h-10',
      text: 'text-xl',
      tagline: 'text-xs',
    },
    md: {
      icon: 'w-7 h-7',
      container: 'w-12 h-12',
      text: 'text-2xl',
      tagline: 'text-sm',
    },
    lg: {
      icon: 'w-8 h-8',
      container: 'w-14 h-14',
      text: 'text-3xl',
      tagline: 'text-base',
    },
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <div className={`${currentSize.container} rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-600/20`}>
        <Beaker className={`${currentSize.icon} text-white`} strokeWidth={2.5} />
      </div>
      
      {/* Brand Text */}
      <div className="flex flex-col">
        <h1 className={`${currentSize.text} text-white leading-none mb-0.5`}>
          Story<span className="text-blue-500">Lab</span>
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
