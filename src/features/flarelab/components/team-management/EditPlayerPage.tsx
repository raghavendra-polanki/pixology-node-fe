import { useState, useRef } from 'react';
import { ArrowLeft, Upload, Star, AlertCircle, Save, Trash2, Plus, Camera } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/features/flarelab/components/ui/input';
import { Label } from '@/features/flarelab/components/ui/label';
import { Player } from '@/shared/services/teamsService';

// Image type categories organized by group - easily extensible
export const IMAGE_TYPE_GROUPS = {
  headshots: {
    label: 'Headshots',
    description: 'Portrait photos for player cards',
    types: {
      'headshot-straight': { label: 'Straight', description: 'Front-facing' },
      'headshot-left': { label: 'Left Profile', description: 'Left side view' },
      'headshot-right': { label: 'Right Profile', description: 'Right side view' },
    },
  },
  bodyShots: {
    label: 'Body Shots',
    description: 'Different framing options',
    types: {
      'medium-shot': { label: 'Medium Shot', description: 'Upper body' },
      'long-shot': { label: 'Full Body', description: 'Head to toe' },
      'action-shot': { label: 'Action Shot', description: 'In-game action' },
    },
  },
  jerseys: {
    label: 'Jersey Variants',
    description: 'Different uniform styles',
    types: {
      'jersey-home': { label: 'Home Jersey', description: 'Home uniform' },
      'jersey-away': { label: 'Away Jersey', description: 'Away uniform' },
      'jersey-alternate': { label: 'Alternate', description: 'Third jersey' },
    },
  },
} as const;

// All image type keys
export type ImageType =
  | 'headshot-straight' | 'headshot-left' | 'headshot-right'
  | 'medium-shot' | 'long-shot' | 'action-shot'
  | 'jersey-home' | 'jersey-away' | 'jersey-alternate';

// Flatten for easy lookup
export const IMAGE_TYPES: Record<ImageType, { label: string; description: string }> = {
  'headshot-straight': { label: 'Straight', description: 'Front-facing' },
  'headshot-left': { label: 'Left Profile', description: 'Left side view' },
  'headshot-right': { label: 'Right Profile', description: 'Right side view' },
  'medium-shot': { label: 'Medium Shot', description: 'Upper body' },
  'long-shot': { label: 'Full Body', description: 'Head to toe' },
  'action-shot': { label: 'Action Shot', description: 'In-game action' },
  'jersey-home': { label: 'Home Jersey', description: 'Home uniform' },
  'jersey-away': { label: 'Away Jersey', description: 'Away uniform' },
  'jersey-alternate': { label: 'Alternate', description: 'Third jersey' },
};

interface PlayerImage {
  file?: File;
  url: string;
  type: ImageType;
  isPrimary: boolean;
  uploading?: boolean;
  isExisting?: boolean;
}

interface EditPlayerPageProps {
  player: Player;
  teamId: string;
  sport: string;
  onSave: (player: Player) => void;
  onCancel: () => void;
}

export const EditPlayerPage = ({ player, teamId, sport, onSave, onCancel }: EditPlayerPageProps) => {
  const isNewPlayer = player.playerId.startsWith('new-');

  const [name, setName] = useState(player.name);
  const [jerseyNumber, setJerseyNumber] = useState(player.jerseyNumber);
  const [position, setPosition] = useState(player.position);
  const [shootsCatches, setShootsCatches] = useState(player.shootsCatches || '');
  const [height, setHeight] = useState(player.height || '');
  const [weight, setWeight] = useState(player.weight || '');
  const [age, setAge] = useState(player.age || '');
  const [birthDate, setBirthDate] = useState(player.birthDate || '');
  const [birthCity, setBirthCity] = useState(player.birthCity || '');
  const [birthCountry, setBirthCountry] = useState(player.birthCountry || '');

  // Convert existing single image to multi-image format
  const [images, setImages] = useState<PlayerImage[]>(() => {
    if (player.images?.headshot) {
      return [{
        url: player.images.headshot,
        type: 'headshot-straight',
        isPrimary: true,
        isExisting: true,
      }];
    }
    return [];
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for file inputs (one per image type)
  const fileInputRefs = useRef<Record<ImageType, HTMLInputElement | null>>({} as any);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, imageType: ImageType) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: PlayerImage[] = Array.from(files).map((file) => ({
      file,
      url: URL.createObjectURL(file),
      type: imageType,
      isPrimary: images.length === 0, // First image is primary if no images exist
      uploading: false,
      isExisting: false,
    }));

    setImages(prev => [...prev, ...newImages]);

    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const triggerFileInput = (imageType: ImageType) => {
    fileInputRefs.current[imageType]?.click();
  };

  const handleRemoveImage = (index: number) => {
    const imageToRemove = images[index];

    // Revoke object URL to free memory (only for new uploads)
    if (!imageToRemove.isExisting && imageToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.url);
    }

    const newImages = images.filter((_, i) => i !== index);

    // If removed image was primary, make the first image primary
    if (imageToRemove.isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }

    setImages(newImages);
  };

  const handleSetPrimary = (index: number) => {
    setImages(prev =>
      prev.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      }))
    );
  };

  const uploadImageToGCS = async (image: PlayerImage): Promise<string> => {
    if (!image.file) {
      throw new Error('No file to upload');
    }

    const formData = new FormData();
    formData.append('image', image.file);
    formData.append('assetType', 'player-headshot');
    formData.append('entityId', player.playerId);
    formData.append('imageType', image.type); // Include image type for categorization

    const token = sessionStorage.getItem('authToken');
    const response = await fetch('/api/flarelab/teams/upload-asset', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to upload image');
    }

    const data = await response.json();
    return data.url;
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!jerseyNumber.trim()) {
      setError('Jersey number is required');
      return;
    }

    if (!position) {
      setError('Position is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Upload new images to GCS
      const processedImages = await Promise.all(
        images.map(async (image) => {
          if (image.isExisting) {
            // Keep existing image
            return {
              url: image.url,
              type: image.type,
              isPrimary: image.isPrimary,
            };
          } else {
            // Upload new image
            const url = await uploadImageToGCS(image);
            return {
              url,
              type: image.type,
              isPrimary: image.isPrimary,
            };
          }
        })
      );

      // Create updated player data
      const updatedPlayer: Player = {
        ...player,
        name: name.trim(),
        jerseyNumber: jerseyNumber.trim(),
        position,
        shootsCatches,
        height,
        weight,
        age,
        birthDate,
        birthCity,
        birthCountry,
        // For now, use primary image as the main headshot for backward compatibility
        images: {
          headshot: processedImages.find(img => img.isPrimary)?.url || processedImages[0]?.url || '',
          // Store all images in a new field for future use
          all: processedImages,
        } as any,
      };

      console.log('Saving player:', updatedPlayer);

      // Clean up object URLs
      images.forEach(img => {
        if (!img.isExisting && img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });

      onSave(updatedPlayer);
    } catch (err) {
      console.error('Error saving player:', err);
      setError(err instanceof Error ? err.message : 'Failed to save player');
    } finally {
      setIsSaving(false);
    }
  };

  // Group images by type for better organization
  const groupedImages = images.reduce((acc, img, index) => {
    if (!acc[img.type]) {
      acc[img.type] = [];
    }
    acc[img.type].push({ ...img, originalIndex: index });
    return acc;
  }, {} as Record<ImageType, Array<PlayerImage & { originalIndex: number }>>);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isSaving}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">
                {isNewPlayer ? 'Add New Player' : 'Edit Player'}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {isNewPlayer
                  ? 'Enter player details and upload photos'
                  : 'Update player information and manage photos'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !jerseyNumber.trim() || !position}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : isNewPlayer ? 'Add Player' : 'Save Changes'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Images (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hidden file inputs for each image type */}
            {(Object.keys(IMAGE_TYPES) as ImageType[]).map((imageType) => (
              <input
                key={imageType}
                ref={(el) => (fileInputRefs.current[imageType] = el)}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload(e, imageType)}
                className="hidden"
                disabled={isSaving}
              />
            ))}

            {/* Image Categories */}
            {Object.entries(IMAGE_TYPE_GROUPS).map(([groupKey, group]) => (
              <div key={groupKey} className="bg-[#151515] border border-gray-800 rounded-xl p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">{group.label}</h3>
                  <p className="text-sm text-gray-400">{group.description}</p>
                </div>

                {/* Grid of image type cards */}
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(group.types).map(([typeKey, typeInfo]) => {
                    const imageType = typeKey as ImageType;
                    const typeImages = groupedImages[imageType] || [];
                    const hasImages = typeImages.length > 0;

                    return (
                      <div
                        key={typeKey}
                        className="bg-[#1a1a1a] border border-gray-700 rounded-lg overflow-hidden"
                      >
                        {/* Card Header */}
                        <div className="px-3 py-2 border-b border-gray-700 bg-gray-800/30">
                          <h4 className="text-sm font-medium text-white">{typeInfo.label}</h4>
                          <p className="text-xs text-gray-500">{typeInfo.description}</p>
                        </div>

                        {/* Image Area */}
                        <div className="p-3">
                          {hasImages ? (
                            <div className="space-y-2">
                              {/* Primary image display */}
                              {typeImages.map((image) => (
                                <div
                                  key={image.originalIndex}
                                  className="relative group aspect-square rounded-lg overflow-hidden border border-gray-600"
                                >
                                  <img
                                    src={image.url}
                                    alt={typeInfo.label}
                                    className="w-full h-full object-cover"
                                  />
                                  {/* Overlay controls */}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleSetPrimary(image.originalIndex)}
                                      className={`p-1.5 rounded-full ${
                                        image.isPrimary
                                          ? 'bg-yellow-500 text-white'
                                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                      }`}
                                      title={image.isPrimary ? 'Primary image' : 'Set as primary'}
                                    >
                                      <Star className="w-3.5 h-3.5" fill={image.isPrimary ? 'currentColor' : 'none'} />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveImage(image.originalIndex)}
                                      className="p-1.5 rounded-full bg-red-500/80 text-white hover:bg-red-600"
                                      title="Remove image"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  {/* Badges */}
                                  {image.isPrimary && (
                                    <div className="absolute top-1 left-1 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                                      Primary
                                    </div>
                                  )}
                                  {!image.isExisting && (
                                    <div className="absolute top-1 right-1 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                                      New
                                    </div>
                                  )}
                                </div>
                              ))}
                              {/* Add more button */}
                              <button
                                onClick={() => triggerFileInput(imageType)}
                                className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-orange-500 hover:text-orange-400 transition-colors flex items-center justify-center gap-1.5 text-xs"
                                disabled={isSaving}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add More
                              </button>
                            </div>
                          ) : (
                            /* Empty upload zone */
                            <button
                              onClick={() => triggerFileInput(imageType)}
                              className="w-full aspect-square border-2 border-dashed border-gray-600 rounded-lg hover:border-orange-500 hover:bg-orange-500/5 transition-colors flex flex-col items-center justify-center gap-2 group"
                              disabled={isSaving}
                            >
                              <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                                <Camera className="w-5 h-5 text-gray-500 group-hover:text-orange-400" />
                              </div>
                              <span className="text-xs text-gray-500 group-hover:text-orange-400">
                                Click to upload
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Help text */}
            <p className="text-xs text-gray-500 px-1">
              Click the star icon to set an image as primary. The primary image will be displayed on player cards and thumbnails.
            </p>
          </div>

          {/* Right Column - Player Details (1/3 width) */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-[#151515] border border-gray-800 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>

              <div>
                <Label htmlFor="name" className="text-white">
                  Player Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Connor McDavid"
                  className="bg-gray-800/50 border-gray-700 text-white"
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="jerseyNumber" className="text-white">
                  Jersey Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="jerseyNumber"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  placeholder="e.g., 97"
                  className="bg-gray-800/50 border-gray-700 text-white"
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="position" className="text-white">
                  Position <span className="text-red-500">*</span>
                </Label>
                <select
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={isSaving}
                >
                  <option value="">Select Position</option>
                  <option value="C">Center (C)</option>
                  <option value="LW">Left Wing (LW)</option>
                  <option value="RW">Right Wing (RW)</option>
                  <option value="D">Defense (D)</option>
                  <option value="G">Goalie (G)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="shootsCatches" className="text-white">
                  Shoots/Catches
                </Label>
                <select
                  id="shootsCatches"
                  value={shootsCatches}
                  onChange={(e) => setShootsCatches(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={isSaving}
                >
                  <option value="">Select</option>
                  <option value="L">Left</option>
                  <option value="R">Right</option>
                </select>
              </div>
            </div>

            {/* Physical Stats */}
            <div className="bg-[#151515] border border-gray-800 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Physical Stats</h3>

              <div>
                <Label htmlFor="height" className="text-white">Height</Label>
                <Input
                  id="height"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder={'e.g., 6\'1"'}
                  className="bg-gray-800/50 border-gray-700 text-white"
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="weight" className="text-white">Weight (lbs)</Label>
                <Input
                  id="weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g., 192"
                  className="bg-gray-800/50 border-gray-700 text-white"
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="age" className="text-white">Age</Label>
                <Input
                  id="age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g., 27"
                  className="bg-gray-800/50 border-gray-700 text-white"
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Birth Information */}
            <div className="bg-[#151515] border border-gray-800 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Birth Information</h3>

              <div>
                <Label htmlFor="birthDate" className="text-white">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white"
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="birthCity" className="text-white">Birth City</Label>
                <Input
                  id="birthCity"
                  value={birthCity}
                  onChange={(e) => setBirthCity(e.target.value)}
                  placeholder="e.g., Richmond Hill"
                  className="bg-gray-800/50 border-gray-700 text-white"
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="birthCountry" className="text-white">Birth Country</Label>
                <Input
                  id="birthCountry"
                  value={birthCountry}
                  onChange={(e) => setBirthCountry(e.target.value)}
                  placeholder="e.g., Canada"
                  className="bg-gray-800/50 border-gray-700 text-white"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
