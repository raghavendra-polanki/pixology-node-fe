import { useState } from 'react';
import { ArrowRight, Sparkles, RefreshCw, Edit2, User, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import type { Project } from '../../types';

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
  project: Project;
  onComplete: (data: any) => void;
}

const mockPersonas: Persona[] = [
  {
    id: '1',
    name: 'Sarah Martinez',
    age: '32',
    demographic: 'Young Professional, Urban',
    motivation: 'Seeking work-life balance and efficiency',
    bio: 'A busy marketing manager who values products that save time and enhance productivity. Always looking for innovative solutions.',
    image: 'https://images.unsplash.com/photo-1581065178026-390bc4e78dad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc2MTgyOTAyNHww&ixlib=rb-4.1.0&q=80&w=1080',
    selected: true,
  },
  {
    id: '2',
    name: 'David Chen',
    age: '28',
    demographic: 'Tech-Savvy Millennial',
    motivation: 'Early adopter of new technology',
    bio: 'Software engineer who appreciates cutting-edge features and seamless user experiences. Values quality over price.',
    image: 'https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjE4NjAzNDd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    selected: true,
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    age: '45',
    demographic: 'Small Business Owner',
    motivation: 'Growing business efficiently',
    bio: 'Runs a local boutique and needs scalable solutions that deliver ROI. Prioritizes reliability and customer support.',
    image: 'https://images.unsplash.com/photo-1758887261865-a2b89c0f7ac5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMG93bmVyJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzYxODA5NDg0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    selected: false,
  },
];

export function Stage2Personas({ project, onComplete }: Stage2Props) {
  const [personas, setPersonas] = useState<Persona[]>(
    project.data.personas || mockPersonas
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setPersonas(mockPersonas.map(p => ({ ...p, id: Date.now() + p.id })));
      setIsGenerating(false);
    }, 1500);
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

  const handleSubmit = () => {
    const selectedPersonas = personas.filter(p => p.selected);
    if (selectedPersonas.length > 0) {
      onComplete({ personas: selectedPersonas });
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

      {/* Personas Grid */}
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
            <div className="relative h-64 overflow-hidden bg-gray-900">
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

              {/* Motivation */}
              <div>
                <Label className="text-gray-500">Motivation</Label>
                <p className="text-gray-300 mt-1">{persona.motivation}</p>
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

      {/* Summary & Submit */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400">
          {selectedCount} {selectedCount === 1 ? 'persona' : 'personas'} selected
        </p>
        <Button
          onClick={handleSubmit}
          disabled={!canProceed}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8"
          size="lg"
        >
          Continue with Selected Personas
          <ArrowRight className="w-5 h-5 ml-2" />
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
