import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, RefreshCw, Edit2, User, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ImageWithFallback } from '../figma/ImageWithFallback';

// UI representation of persona (different from PersonaData in data model)
interface Persona {
  id: string;
  name: string;
  age: string;
  demographic: string;
  motivation: string;
  bio: string;
  image: string;
  selected: boolean;
}

interface Stage2Props {
  project: any;
  updateAIPersonas: (personas: any) => Promise<void>;
  updatePersonaSelection: (selection: any) => Promise<void>;
  markStageCompleted: (stageName: string, data?: any) => Promise<void>;
  advanceToNextStage: (projectToAdvance?: any) => Promise<void>;
}

export function Stage2Personas({ project, updateAIPersonas, updatePersonaSelection, markStageCompleted, advanceToNextStage }: Stage2Props) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Sync personas with project data when loaded - only if they've been generated
  useEffect(() => {
    if (project?.aiGeneratedPersonas?.personas && project.aiGeneratedPersonas.personas.length > 0) {
      // Convert PersonaData to UI Persona format
      const loadedPersonas: Persona[] = project.aiGeneratedPersonas.personas.map(p => ({
        id: p.id,
        name: (p.coreIdentity as any)?.name || 'Unknown',
        age: (p.coreIdentity as any)?.age || '',
        demographic: (p.coreIdentity as any)?.demographic || '',
        motivation: (p.coreIdentity as any)?.motivation || '',
        bio: (p.coreIdentity as any)?.bio || '',
        image: (p.image as any)?.url || (p.image as any) || '',
        selected: project.userPersonaSelection?.selectedPersonaIds?.includes(p.id) || false
      }));
      setPersonas(loadedPersonas);
      setHasGenerated(true);
    }
  }, [project?.aiGeneratedPersonas, project?.userPersonaSelection]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Get auth token from sessionStorage
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Call the persona generation API
      const response = await fetch('/api/personas/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          campaignDetails: project.campaignDetails,
          numberOfPersonas: 3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate personas');
      }

      const data = await response.json();

      if (!data.success || !data.personas) {
        throw new Error('Invalid response from persona generation API');
      }

      // Convert API response personas to UI format
      const generatedPersonas: Persona[] = data.personas.map((p: any) => ({
        id: p.id,
        name: p.coreIdentity?.name || 'Unknown',
        age: String(p.coreIdentity?.age || ''),
        demographic: p.coreIdentity?.demographic || '',
        motivation: p.coreIdentity?.motivation || '',
        bio: p.coreIdentity?.bio || '',
        image: p.image?.url || '',
        selected: false,
      }));

      // Log for debugging
      console.log('Generated personas:', generatedPersonas);
      generatedPersonas.forEach((p, idx) => {
        console.log(`Persona ${idx + 1} image URL:`, p.image);
      });

      setPersonas(generatedPersonas);
      setHasGenerated(true);

      // Save generated personas to project via updateAIPersonas
      await updateAIPersonas({
        personas: data.personas,
        generatedAt: new Date(),
        generationRecipeId: 'persona-generation-v1',
        generationExecutionId: data.project?.aiGeneratedPersonas?.generationExecutionId || `exec-${Date.now()}`,
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        count: generatedPersonas.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate personas';
      console.error('Error generating personas:', errorMessage);
      // Optionally show error toast to user
      alert(`Failed to generate personas: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setPersonas(personas.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const handleEditOpen = (persona: Persona) => {
    setEditingPersona({ ...persona });
  };

  const handleEditSave = () => {
    if (editingPersona) {
      setPersonas(personas.map(p => p.id === editingPersona.id ? editingPersona : p));
      setEditingPersona(null);
    }
  };

  const handleEditChange = (field: keyof Persona, value: string) => {
    if (editingPersona) {
      setEditingPersona({ ...editingPersona, [field]: value });
    }
  };

  const handleSubmit = async () => {
    const selectedPersonas = personas.filter(p => p.selected);
    if (selectedPersonas.length > 0) {
      try {
        setIsSaving(true);
        // Save persona selection
        await updatePersonaSelection({
          selectedPersonaIds: selectedPersonas.map(p => p.id),
          primaryPersonaId: selectedPersonas[0]?.id,
        });
        // Mark stage as completed
        await markStageCompleted('personas');
        // Advance to next stage
        await advanceToNextStage(project);
      } catch (error) {
        console.error('Failed to save persona selection:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const selectedCount = personas.filter(p => p.selected).length;
  const canProceed = selectedCount > 0;

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
            <User className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-white">Generate Campaign Personas</h2>
            <p className="text-gray-400">
              AI creates detailed character personas based on your target audience
            </p>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="mb-8">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl"
          size="lg"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Generating Personas...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Personas
            </>
          )}
        </Button>
      </div>

      {/* Empty State - No Personas Generated Yet */}
      {!hasGenerated && personas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-8 border border-dashed border-gray-700 rounded-xl bg-gray-900/30 mb-8">
          <User className="w-16 h-16 text-gray-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No Personas Generated Yet</h3>
          <p className="text-gray-400 text-center max-w-md mb-6">
            Click the "Generate Personas" button above to create AI-powered personas based on your campaign details.
          </p>
        </div>
      )}

      {/* Personas Grid */}
      {personas.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {personas.map((persona) => (
          <Card
            key={persona.id}
            onClick={() => handleToggleSelect(persona.id)}
            className={`bg-[#151515] border-gray-800 rounded-xl overflow-hidden transition-all cursor-pointer group relative ${
              persona.selected ? 'ring-2 ring-blue-500' : 'hover:border-gray-700'
            }`}
          >
            {/* Selected Indicator */}
            {persona.selected && (
              <div className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                <Check className="w-5 h-5 text-white" />
              </div>
            )}

            {/* Persona Image */}
            <div className="relative h-96 overflow-hidden bg-gray-900">
              <ImageWithFallback
                src={persona.image}
                alt={persona.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-transparent opacity-80" />
            </div>

            {/* Persona Details */}
            <div className="p-5 space-y-3">
              {/* Name and Age */}
              <div>
                <h3 className="text-white mb-1">{persona.name}</h3>
                <div className="flex items-center gap-2 text-gray-400">
                  <span>Age {persona.age}</span>
                  <span>•</span>
                  <span className="text-blue-400">{persona.demographic}</span>
                </div>
              </div>

              {/* Bio */}
              <div>
                <Label className="text-gray-500">Bio</Label>
                <p className="text-gray-400 mt-1 line-clamp-3">{persona.bio}</p>
              </div>

              {/* Edit Button */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditOpen(persona);
                }}
                variant="outline"
                size="sm"
                className="w-full mt-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Details
              </Button>
            </div>
          </Card>
        ))}
      </div>
      )}

      {/* Summary & Submit */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400">
          {selectedCount} {selectedCount === 1 ? 'persona' : 'personas'} selected
        </p>
        <Button
          onClick={handleSubmit}
          disabled={!canProceed || isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8"
          size="lg"
        >
          {isSaving ? (
            <>
              <div className="animate-spin mr-2">⏳</div>
              Saving...
            </>
          ) : (
            <>
              Continue with Selected Personas
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPersona} onOpenChange={() => setEditingPersona(null)}>
        <DialogContent className="bg-[#151515] border-gray-800 text-white rounded-xl max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Persona Details</DialogTitle>
          </DialogHeader>
          {editingPersona && (
            <div className="space-y-4 mt-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-gray-300">Name</Label>
                <Input
                  id="edit-name"
                  value={editingPersona.name}
                  onChange={(e) => handleEditChange('name', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg"
                />
              </div>

              {/* Age and Demographic */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-age" className="text-gray-300">Age</Label>
                  <Input
                    id="edit-age"
                    value={editingPersona.age}
                    onChange={(e) => handleEditChange('age', e.target.value)}
                    className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-demographic" className="text-gray-300">Demographic</Label>
                  <Input
                    id="edit-demographic"
                    value={editingPersona.demographic}
                    onChange={(e) => handleEditChange('demographic', e.target.value)}
                    className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg"
                  />
                </div>
              </div>

              {/* Motivation */}
              <div className="space-y-2">
                <Label htmlFor="edit-motivation" className="text-gray-300">Motivation</Label>
                <Input
                  id="edit-motivation"
                  value={editingPersona.motivation}
                  onChange={(e) => handleEditChange('motivation', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="edit-bio" className="text-gray-300">Bio</Label>
                <Textarea
                  id="edit-bio"
                  value={editingPersona.bio}
                  onChange={(e) => handleEditChange('bio', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-24"
                />
              </div>

              {/* Image URL */}
              <div className="space-y-2">
                <Label htmlFor="edit-image" className="text-gray-300">Image URL</Label>
                <Input
                  id="edit-image"
                  value={editingPersona.image}
                  onChange={(e) => handleEditChange('image', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg"
                  placeholder="https://..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  onClick={() => setEditingPersona(null)}
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
