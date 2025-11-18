import { useState, useEffect } from 'react';
import { X, User, Loader2, AlertCircle, Star } from 'lucide-react';
import { Button } from '../ui/button';

interface RealPersona {
  id: string;
  name: string;
  age?: number;
  demographic: string;
  motivation: string;
  bio: string;
  images: {
    url: string;
    isPrimary: boolean;
  }[];
  createdAt: Date;
}

interface ChooseRealPersonaProps {
  onSelect: (persona: RealPersona) => void;
  onCancel: () => void;
}

export function ChooseRealPersona({ onSelect, onCancel }: ChooseRealPersonaProps) {
  const [personas, setPersonas] = useState<RealPersona[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

  useEffect(() => {
    loadRealPersonas();
  }, []);

  const loadRealPersonas = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/real-personas');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load real personas');
      }

      const data = await response.json();
      setPersonas(data.personas);
    } catch (err) {
      console.error('Error loading real personas:', err);
      setError(err instanceof Error ? err.message : 'Failed to load real personas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPersona = (persona: RealPersona) => {
    setSelectedPersonaId(persona.id);
  };

  const handleConfirmSelection = () => {
    const selected = personas.find(p => p.id === selectedPersonaId);
    if (selected) {
      onSelect(selected);
    }
  };

  const getPrimaryImage = (persona: RealPersona): string => {
    const primaryImage = persona.images.find(img => img.isPrimary);
    return primaryImage?.url || persona.images[0]?.url || '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading real personas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-400 font-semibold mb-1">Error Loading Personas</h3>
            <p className="text-red-300 text-sm">{error}</p>
            <Button
              variant="outline"
              onClick={loadRealPersonas}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Choose Real Persona</h2>
          <p className="text-sm text-gray-400 mt-1">
            Select a previously saved real persona to use in your campaign
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {personas.length === 0 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
          <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No Real Personas Yet</h3>
          <p className="text-gray-500 mb-6">
            You haven't created any real personas yet. Create one to get started.
          </p>
          <Button variant="outline" onClick={onCancel}>
            Go Back
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personas.map((persona) => {
              const primaryImageUrl = getPrimaryImage(persona);
              const isSelected = selectedPersonaId === persona.id;

              return (
                <div
                  key={persona.id}
                  onClick={() => handleSelectPersona(persona)}
                  className={`group cursor-pointer rounded-xl overflow-hidden transition-all ${
                    isSelected
                      ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20'
                      : 'border border-gray-700 hover:border-gray-600 hover:shadow-lg'
                  }`}
                >
                  {/* Image */}
                  <div className="relative aspect-square bg-gray-800">
                    {primaryImageUrl ? (
                      <img
                        src={primaryImageUrl}
                        alt={persona.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-16 h-16 text-gray-600" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-blue-500 text-white p-2 rounded-full shadow-lg">
                        <Star className="w-4 h-4" fill="currentColor" />
                      </div>
                    )}
                    {persona.images.length > 1 && (
                      <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        +{persona.images.length - 1} more
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-4 bg-gray-900">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {persona.name}
                      {persona.age && (
                        <span className="text-gray-400 text-sm ml-2">({persona.age})</span>
                      )}
                    </h3>
                    {persona.demographic && (
                      <p className="text-sm text-gray-400 mb-2">{persona.demographic}</p>
                    )}
                    {persona.bio && (
                      <p className="text-xs text-gray-500 line-clamp-2">{persona.bio}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-800">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSelection} disabled={!selectedPersonaId}>
              Use Selected Persona
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
