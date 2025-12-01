import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageChange: (file: File | null) => void;
  label?: string;
  aspectRatio?: 'square' | 'rectangle';
  placeholder?: string;
}

export const ImageUpload = ({
  currentImageUrl,
  onImageChange,
  label = 'Image',
  aspectRatio = 'square',
  placeholder,
}: ImageUploadProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentImageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Notify parent
      onImageChange(file);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(undefined);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const aspectClass = aspectRatio === 'square' ? 'aspect-square' : 'aspect-video';

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">{label}</label>

      <div className="space-y-3">
        {/* Image Preview */}
        {previewUrl ? (
          <div className={`relative ${aspectClass} w-full max-w-xs rounded-lg overflow-hidden bg-gray-800/50 border border-gray-700`}>
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  e.currentTarget.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>`;
                }
              }}
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            className={`${aspectClass} w-full max-w-xs rounded-lg bg-gray-800/50 border-2 border-dashed border-gray-700 hover:border-gray-600 transition-colors cursor-pointer flex flex-col items-center justify-center`}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="w-12 h-12 text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">
              {placeholder || 'Click to upload'}
            </p>
          </div>
        )}

        {/* File Input (Hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Upload/Change Button */}
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          <Upload className="w-4 h-4 mr-2" />
          {previewUrl ? 'Change Image' : 'Upload Image'}
        </Button>
      </div>
    </div>
  );
};
