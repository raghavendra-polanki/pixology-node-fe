import { useState, useEffect } from 'react';
import { User, Loader2, AlertCircle, Check, Edit2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { EditRealPersona } from './EditRealPersona';

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

interface RealPersonaSelectorProps {
  onSelect: (persona: RealPersona) => void;
  initialSelectedId?: string | null;
}

export function RealPersonaSelector({ onSelect, initialSelectedId }: RealPersonaSelectorProps) {
  const [personas, setPersonas] = useState<RealPersona[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(initialSelectedId || null);
  const [editingPersona, setEditingPersona] = useState<RealPersona | null>(null);

  useEffect(() => {
    loadRealPersonas();
  }, []);

  // Update selected ID when prop changes
  useEffect(() => {
    if (initialSelectedId) {
      setSelectedPersonaId(initialSelectedId);
    }
  }, [initialSelectedId]);

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

  const handleSelectPersona = async (persona: RealPersona) => {
    setSelectedPersonaId(persona.id);
    onSelect(persona);
  };

  const handleEditOpen = (persona: RealPersona, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPersona(persona);
  };

  const handleEditSave = (updatedPersona: RealPersona) => {
    // Update local state with the updated persona
    setPersonas(prev =>
      prev.map(p => (p.id === updatedPersona.id ? updatedPersona : p))
    );
    setEditingPersona(null);
  };

  const handleEditCancel = () => {
    setEditingPersona(null);
  };

  const getPrimaryImage = (persona: RealPersona): string => {
    const primaryImage = persona.images.find(img => img.isPrimary);
    return primaryImage?.url || persona.images[0]?.url || '';
  };

  // Show edit view if editing a persona
  if (editingPersona) {
    return (
      <EditRealPersona
        persona={editingPersona}
        onSave={handleEditSave}
        onCancel={handleEditCancel}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading real personas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (personas.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
        <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">No Real Personas Yet</h3>
        <p className="text-gray-500 mb-6">
          Click "Create New Real Persona" above to create your first real persona.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personas.map((persona) => {
          const primaryImageUrl = getPrimaryImage(persona);
          const isSelected = selectedPersonaId === persona.id;

          return (
            <div
              key={persona.id}
              onClick={() => handleSelectPersona(persona)}
              className={`group cursor-pointer bg-[#151515] border rounded-xl overflow-hidden transition-all relative ${
                isSelected
                  ? 'ring-2 ring-blue-500 border-gray-800'
                  : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}

              {/* Image */}
              <div className="relative h-96 overflow-hidden bg-gray-900">
                {primaryImageUrl ? (
                  <>
                    <img
                      src={primaryImageUrl}
                      alt={persona.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-transparent opacity-80" />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-600" />
                  </div>
                )}
                {persona.images.length > 1 && (
                  <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    +{persona.images.length - 1} more
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-5 space-y-3">
                {/* Name and Age */}
                <div>
                  <h3 className="text-white mb-1">{persona.name}</h3>
                  <div className="flex items-center gap-2 text-gray-400">
                    {persona.age && <span>Age {persona.age}</span>}
                    {persona.age && persona.demographic && <span>•</span>}
                    {persona.demographic && (
                      <span className="text-blue-400">{persona.demographic}</span>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {persona.bio && (
                  <div>
                    <Label className="text-gray-500">Bio</Label>
                    <p className="text-gray-400 mt-1 line-clamp-3">{persona.bio}</p>
                  </div>
                )}

                {/* Edit Button */}
                <Button
                  onClick={(e) => handleEditOpen(persona, e)}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Details
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
