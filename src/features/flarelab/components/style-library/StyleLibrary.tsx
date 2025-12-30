/**
 * Style Library
 * Main component for managing text styles and other creative assets
 */

import { useState } from 'react';
import { ArrowLeft, Type, Palette, Play, Package } from 'lucide-react';
import { TextStylesBrowser } from './TextStylesBrowser';

type StyleLibraryView = 'home' | 'text-styles';

interface AssetCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  count?: number;
  enabled: boolean;
}

export const StyleLibrary = () => {
  const [currentView, setCurrentView] = useState<StyleLibraryView>('home');
  const [textStylesCount, setTextStylesCount] = useState<number>(0);

  const assetCategories: AssetCategory[] = [
    {
      id: 'text-styles',
      name: 'Text Styles',
      description: 'Typography presets with gradients, shadows, and effects',
      icon: Type,
      count: textStylesCount,
      enabled: true,
    },
    {
      id: 'color-palettes',
      name: 'Color Palettes',
      description: 'Brand colors and theme palettes',
      icon: Palette,
      count: 0,
      enabled: false,
    },
    {
      id: 'motion-presets',
      name: 'Motion Presets',
      description: 'Animation and motion effect templates',
      icon: Play,
      count: 0,
      enabled: false,
    },
    {
      id: 'brand-kits',
      name: 'Brand Kits',
      description: 'Complete brand packages with styles and colors',
      icon: Package,
      count: 0,
      enabled: false,
    },
  ];

  const handleCategoryClick = (categoryId: string) => {
    if (categoryId === 'text-styles') {
      setCurrentView('text-styles');
    }
  };

  const handleBack = () => {
    setCurrentView('home');
  };

  if (currentView === 'text-styles') {
    return (
      <TextStylesBrowser
        onBack={handleBack}
        onCountChange={setTextStylesCount}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Style Library</h1>
        <p className="text-gray-400 mt-1">
          Manage reusable styles and presets across all your FlareLab projects
        </p>
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {assetCategories.map((category) => {
          const Icon = category.icon;
          const isEnabled = category.enabled;

          return (
            <button
              key={category.id}
              onClick={() => isEnabled && handleCategoryClick(category.id)}
              disabled={!isEnabled}
              className={`
                relative p-6 rounded-xl border text-left transition-all duration-200
                ${isEnabled
                  ? 'bg-[#141414] border-gray-800 hover:border-orange-500/50 hover:bg-[#1a1a1a] cursor-pointer'
                  : 'bg-[#0d0d0d] border-gray-800/50 cursor-not-allowed opacity-60'
                }
              `}
            >
              {/* Coming Soon Badge */}
              {!isEnabled && (
                <span className="absolute top-3 right-3 text-[10px] font-medium text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              )}

              {/* Icon */}
              <div className={`
                w-12 h-12 rounded-lg flex items-center justify-center mb-4
                ${isEnabled ? 'bg-orange-500/15' : 'bg-gray-800/30'}
              `}>
                <Icon className={`w-6 h-6 ${isEnabled ? 'text-orange-400' : 'text-gray-600'}`} />
              </div>

              {/* Content */}
              <h3 className={`font-semibold mb-1 ${isEnabled ? 'text-white' : 'text-gray-500'}`}>
                {category.name}
              </h3>
              <p className={`text-sm ${isEnabled ? 'text-gray-400' : 'text-gray-600'}`}>
                {category.description}
              </p>

              {/* Count Badge */}
              {isEnabled && category.count !== undefined && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {category.count} {category.count === 1 ? 'style' : 'styles'}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Tips */}
      <div className="mt-8 p-4 bg-[#141414] border border-gray-800 rounded-lg">
        <h3 className="text-sm font-medium text-white mb-2">Quick Tips</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>Create custom text styles that match your brand guidelines</li>
          <li>Favorite frequently used styles for quick access in Text Studio</li>
          <li>Duplicate system styles to create your own variations</li>
        </ul>
      </div>
    </div>
  );
};
