/**
 * Text Styles Browser
 * Grid view for browsing, searching, and managing text styles
 */

import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  Star,
  StarOff,
  Copy,
  Trash2,
  Edit,
  MoreVertical,
  Filter,
  Lock,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import TextStylesService from '@/shared/services/textStylesService';
import { TextStyleEditor } from './TextStyleEditor';
import type { LibraryTextStyle, TextStyleCategory } from '../../types/project.types';

const textStylesService = new TextStylesService();

interface TextStylesBrowserProps {
  onBack: () => void;
  onCountChange?: (count: number) => void;
}

type FilterOption = TextStyleCategory | 'all' | 'favorites';

export const TextStylesBrowser = ({ onBack, onCountChange }: TextStylesBrowserProps) => {
  const [styles, setStyles] = useState<LibraryTextStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [editingStyle, setEditingStyle] = useState<LibraryTextStyle | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filterOptions: { id: FilterOption; label: string }[] = [
    { id: 'all', label: 'All Styles' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'headlines', label: 'Headlines' },
    { id: 'lower-thirds', label: 'Lower Thirds' },
    { id: 'scores', label: 'Scores' },
    { id: 'promo', label: 'Promo' },
    { id: 'custom', label: 'Custom' },
  ];

  const fetchStyles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await textStylesService.getTextStyles({
        category: activeFilter !== 'all' && activeFilter !== 'favorites' ? activeFilter : undefined,
        favorites: activeFilter === 'favorites' ? true : undefined,
        search: searchQuery || undefined,
      });
      setStyles(response.styles);
      onCountChange?.(response.total);
    } catch (err) {
      console.error('Error fetching text styles:', err);
      setError(err instanceof Error ? err.message : 'Failed to load text styles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStyles();
  }, [activeFilter, searchQuery]);

  // Group styles by system/user
  const { systemStyles, userStyles } = useMemo(() => {
    return {
      systemStyles: styles.filter(s => s.isSystem),
      userStyles: styles.filter(s => !s.isSystem),
    };
  }, [styles]);

  const handleToggleFavorite = async (style: LibraryTextStyle) => {
    try {
      const newStatus = await textStylesService.toggleFavorite(style.id);
      setStyles(prev =>
        prev.map(s => (s.id === style.id ? { ...s, isFavorite: newStatus } : s))
      );
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleDuplicate = async (style: LibraryTextStyle) => {
    try {
      const duplicated = await textStylesService.duplicateTextStyle(style.id);
      setStyles(prev => [duplicated, ...prev]);
      setEditingStyle(duplicated);
    } catch (err) {
      console.error('Error duplicating style:', err);
    }
  };

  const handleDelete = async (style: LibraryTextStyle) => {
    if (!confirm(`Are you sure you want to delete "${style.name}"?`)) return;
    try {
      await textStylesService.deleteTextStyle(style.id);
      setStyles(prev => prev.filter(s => s.id !== style.id));
    } catch (err) {
      console.error('Error deleting style:', err);
    }
  };

  const handleEdit = (style: LibraryTextStyle) => {
    if (style.isSystem) {
      // For system styles, duplicate first then edit
      handleDuplicate(style);
    } else {
      setEditingStyle(style);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
  };

  const handleEditorClose = () => {
    setEditingStyle(null);
    setIsCreating(false);
  };

  const handleEditorSave = async (savedStyle: LibraryTextStyle) => {
    if (isCreating) {
      setStyles(prev => [savedStyle, ...prev]);
    } else {
      setStyles(prev => prev.map(s => (s.id === savedStyle.id ? savedStyle : s)));
    }
    setEditingStyle(null);
    setIsCreating(false);
  };

  // Show editor if creating or editing
  if (isCreating || editingStyle) {
    return (
      <TextStyleEditor
        style={editingStyle || undefined}
        onSave={handleEditorSave}
        onCancel={handleEditorClose}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Text Styles</h1>
            <p className="text-gray-400 text-sm">
              {styles.length} {styles.length === 1 ? 'style' : 'styles'} available
            </p>
          </div>
        </div>
        <Button onClick={handleCreate} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Create Style
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search styles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#141414] border border-gray-800 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-500/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setActiveFilter(option.id)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${activeFilter === option.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#141414] text-gray-400 hover:bg-gray-800'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400">{error}</p>
          <button onClick={fetchStyles} className="text-red-400 underline mt-2">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && styles.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
            <Filter className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No styles found</h3>
          <p className="text-gray-400 mb-4">
            {searchQuery
              ? `No styles match "${searchQuery}"`
              : 'Create your first custom text style'}
          </p>
          <Button onClick={handleCreate} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Create Style
          </Button>
        </div>
      )}

      {/* Styles Grid */}
      {!isLoading && !error && styles.length > 0 && (
        <div className="space-y-8">
          {/* System Styles */}
          {systemStyles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                  System Styles ({systemStyles.length})
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {systemStyles.map((style) => (
                  <StyleCard
                    key={style.id}
                    style={style}
                    onToggleFavorite={handleToggleFavorite}
                    onDuplicate={handleDuplicate}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* User Styles */}
          {userStyles.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
                My Styles ({userStyles.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {userStyles.map((style) => (
                  <StyleCard
                    key={style.id}
                    style={style}
                    onToggleFavorite={handleToggleFavorite}
                    onDuplicate={handleDuplicate}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Style Card Component
 */
interface StyleCardProps {
  style: LibraryTextStyle;
  onToggleFavorite: (style: LibraryTextStyle) => void;
  onDuplicate: (style: LibraryTextStyle) => void;
  onEdit: (style: LibraryTextStyle) => void;
  onDelete: (style: LibraryTextStyle) => void;
}

const StyleCard = ({
  style,
  onToggleFavorite,
  onDuplicate,
  onEdit,
  onDelete,
}: StyleCardProps) => {
  // Generate CSS for style preview
  const previewStyles = useMemo(() => {
    const css: React.CSSProperties = {
      fontFamily: `"${style.fontFamily}", sans-serif`,
      fontWeight: style.fontWeight,
      fontSize: '24px',
      textTransform: style.textTransform as any,
      letterSpacing: `${style.letterSpacing}em`,
    };

    // Fill
    if (style.fill.type === 'solid') {
      css.color = style.fill.color;
    } else if (style.fill.type === 'gradient' && style.fill.gradient) {
      const stops = style.fill.gradient.stops
        .map((s) => `${s.color} ${s.position}%`)
        .join(', ');
      css.background = `linear-gradient(${style.fill.gradient.angle}deg, ${stops})`;
      css.WebkitBackgroundClip = 'text';
      css.WebkitTextFillColor = 'transparent';
      css.backgroundClip = 'text';
    }

    // Stroke
    if (style.stroke) {
      css.WebkitTextStroke = `${style.stroke.width}px ${style.stroke.color}`;
    }

    // Shadow
    if (style.shadows && style.shadows.length > 0) {
      css.textShadow = style.shadows
        .map(
          (s) =>
            `${s.offsetX}px ${s.offsetY}px ${s.blur}px rgba(${parseInt(s.color.slice(1, 3), 16)}, ${parseInt(s.color.slice(3, 5), 16)}, ${parseInt(s.color.slice(5, 7), 16)}, ${s.opacity / 100})`
        )
        .join(', ');
    }

    return css;
  }, [style]);

  return (
    <div className="group relative bg-[#141414] border border-gray-800 rounded-xl overflow-hidden hover:border-orange-500/50 transition-all duration-200">
      {/* Preview Area */}
      <div className="relative h-28 bg-[#0a0a0a] flex items-center justify-center p-4 overflow-hidden">
        <span style={previewStyles} className="truncate max-w-full">
          {style.name.split(' ')[0] || 'SAMPLE'}
        </span>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(style);
          }}
          className={`
            absolute top-2 right-2 p-1.5 rounded-lg transition-all
            ${style.isFavorite
              ? 'bg-yellow-500/20 text-yellow-500'
              : 'bg-black/40 text-gray-500 opacity-0 group-hover:opacity-100'
            }
          `}
        >
          {style.isFavorite ? (
            <Star className="w-4 h-4 fill-current" />
          ) : (
            <StarOff className="w-4 h-4" />
          )}
        </button>

        {/* System Badge */}
        {style.isSystem && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-gray-800 rounded text-[10px] text-gray-400 font-medium">
            SYSTEM
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-white text-sm truncate">{style.name}</h3>
          <p className="text-xs text-gray-500 capitalize">{style.category}</p>
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors opacity-0 group-hover:opacity-100">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-gray-800">
            <DropdownMenuItem onClick={() => onEdit(style)} className="text-gray-300">
              <Edit className="w-4 h-4 mr-2" />
              {style.isSystem ? 'Duplicate & Edit' : 'Edit'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(style)} className="text-gray-300">
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleFavorite(style)} className="text-gray-300">
              <Star className="w-4 h-4 mr-2" />
              {style.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </DropdownMenuItem>
            {!style.isSystem && (
              <>
                <DropdownMenuSeparator className="bg-gray-800" />
                <DropdownMenuItem
                  onClick={() => onDelete(style)}
                  className="text-red-400 focus:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
