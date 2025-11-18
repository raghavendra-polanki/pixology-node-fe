import { useState } from 'react';
import { Upload, X, Star, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface RealPersonaImage {
  file?: File;
  url: string;
  isPrimary: boolean;
  uploading?: boolean;
}

interface CreateRealPersonaProps {
  onSave: (persona: any) => void;
  onCancel: () => void;
}

export function CreateRealPersona({ onSave, onCancel }: CreateRealPersonaProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [demographic, setDemographic] = useState('');
  const [motivation, setMotivation] = useState('');
  const [bio, setBio] = useState('');
  const [images, setImages] = useState<RealPersonaImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: RealPersonaImage[] = Array.from(files).map((file, index) => ({
      file,
      url: URL.createObjectURL(file),
      isPrimary: images.length === 0 && index === 0, // First image is primary by default
      uploading: false,
    }));

    setImages(prev => [...prev, ...newImages]);
  };

  const handleRemoveImage = (index: number) => {
    const imageToRemove = images[index];

    // Revoke object URL to free memory
    if (imageToRemove.url.startsWith('blob:')) {
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

  const uploadImageToGCS = async (image: RealPersonaImage): Promise<string> => {
    if (!image.file) {
      throw new Error('No file to upload');
    }

    const formData = new FormData();
    formData.append('image', image.file);
    formData.append('personaName', name || 'unnamed');

    const response = await fetch('/api/real-personas/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to upload image');
    }

    const data = await response.json();
    return data.imageUrl;
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (images.length === 0) {
      setError('At least one image is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Upload all images to GCS
      console.log('Uploading images to GCS...');
      const uploadedImages = await Promise.all(
        images.map(async (image) => {
          const url = await uploadImageToGCS(image);
          return {
            url,
            isPrimary: image.isPrimary,
          };
        })
      );

      // Create persona data
      const personaData = {
        name: name.trim(),
        age: age === '' ? null : Number(age),
        demographic: demographic.trim(),
        motivation: motivation.trim(),
        bio: bio.trim(),
        images: uploadedImages,
      };

      console.log('Saving real persona to database...');

      // Save to database
      const response = await fetch('/api/real-personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personaData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save persona');
      }

      const data = await response.json();
      console.log('Real persona saved successfully:', data.persona.id);

      // Clean up object URLs
      images.forEach(img => {
        if (img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });

      onSave(data.persona);
    } catch (err) {
      console.error('Error saving real persona:', err);
      setError(err instanceof Error ? err.message : 'Failed to save persona');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Create Real Persona</h2>
          <p className="text-sm text-gray-400 mt-1">
            Upload photos and details of a real person to use in your campaigns
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
          <X className="w-5 h-5" />
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

      {/* Image Upload Section */}
      <div className="space-y-3">
        <Label className="text-white">
          Photos <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-700 hover:border-blue-500 transition-colors"
            >
              <img
                src={image.url}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => handleSetPrimary(index)}
                  className={`p-2 rounded-full ${
                    image.isPrimary
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title={image.isPrimary ? 'Primary image' : 'Set as primary'}
                >
                  <Star className="w-4 h-4" fill={image.isPrimary ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {image.isPrimary && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                  Primary
                </div>
              )}
            </div>
          ))}

          {/* Upload Button */}
          <label className="aspect-square border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-colors">
            <Upload className="w-6 h-6 text-gray-400" />
            <span className="text-sm text-gray-400">Upload Photos</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              disabled={isSaving}
            />
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Click the star icon to set an image as primary. The primary image will be used in your campaigns.
        </p>
      </div>

      {/* Persona Details Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-white">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter persona name"
            className="bg-gray-900 border-gray-700 text-white"
            disabled={isSaving}
          />
        </div>

        <div>
          <Label htmlFor="age" className="text-white">
            Age
          </Label>
          <Input
            id="age"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Enter age (optional)"
            className="bg-gray-900 border-gray-700 text-white"
            disabled={isSaving}
          />
        </div>

        <div>
          <Label htmlFor="demographic" className="text-white">
            Demographic
          </Label>
          <Input
            id="demographic"
            value={demographic}
            onChange={(e) => setDemographic(e.target.value)}
            placeholder="e.g., Professional, Student, Entrepreneur (optional)"
            className="bg-gray-900 border-gray-700 text-white"
            disabled={isSaving}
          />
        </div>

        <div>
          <Label htmlFor="motivation" className="text-white">
            Motivation
          </Label>
          <Input
            id="motivation"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="What motivates this person? (optional)"
            className="bg-gray-900 border-gray-700 text-white"
            disabled={isSaving}
          />
        </div>

        <div>
          <Label htmlFor="bio" className="text-white">
            Bio
          </Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Brief description of the person (optional)"
            className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-800">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !name.trim() || images.length === 0}>
          {isSaving ? 'Saving...' : 'Save Persona'}
        </Button>
      </div>
    </div>
  );
}
