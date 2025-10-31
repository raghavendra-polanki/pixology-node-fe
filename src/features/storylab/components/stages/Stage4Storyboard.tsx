import { useState } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  Edit2, 
  Film, 
  Plus, 
  Trash2, 
  Grid3x3,
  LayoutList,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import type { Project } from '../../types';

interface Scene {
  id: string;
  number: number;
  title: string;
  description: string;
  visualNote: string;
  image: string;
}

interface Stage4Props {
  project: Project;
  onComplete: (data: any) => void;
}

const mockScenes: Scene[] = [
  {
    id: '1',
    number: 1,
    title: 'The Problem',
    description: 'Sarah struggles with overwhelming workload and cluttered workspace',
    visualNote: 'Medium shot, natural lighting, emphasize chaos and stress',
    image: 'https://images.unsplash.com/photo-1752650735615-9829d8008a01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHBlcnNvbiUyMHdvcmtpbmclMjBzdHJlc3N8ZW58MXx8fHwxNzYxODgyMDA2fDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: '2',
    number: 2,
    title: 'The Discovery',
    description: 'A moment of realization - finding the perfect solution',
    visualNote: 'Close-up, capture emotion, lightbulb moment',
    image: 'https://images.unsplash.com/photo-1758600588207-31e547985863?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXNjb3ZlcnklMjBsaWdodGJ1bGIlMjBtb21lbnR8ZW58MXx8fHwxNzYxODgyMDA2fDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: '3',
    number: 3,
    title: 'The Experience',
    description: 'Sarah effortlessly navigates the product, finding instant value',
    visualNote: 'Over-shoulder shot, screen visible, smooth interaction',
    image: 'https://images.unsplash.com/photo-1758611970342-675fed2dea68?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjB1c2luZyUyMGFwcCUyMGhhcHB5fGVufDF8fHx8MTc2MTg4MjAwN3ww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: '4',
    number: 4,
    title: 'The Transformation',
    description: 'Life is better - organized, efficient, and stress-free',
    visualNote: 'Wide shot, warm lighting, convey success and satisfaction',
    image: 'https://images.unsplash.com/photo-1758518731027-78a22c8852ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdWNjZXNzJTIwY2VsZWJyYXRpb24lMjBhY2hpZXZlbWVudHxlbnwxfHx8fDE3NjE4NDM4NjV8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: '5',
    number: 5,
    title: 'Team Collaboration',
    description: 'Sharing success with colleagues, demonstrating the impact',
    visualNote: 'Group shot, collaborative atmosphere, energetic vibe',
    image: 'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwY29sbGFib3JhdGlvbiUyMG1lZXRpbmd8ZW58MXx8fHwxNzYxNzgyNDA5fDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: '6',
    number: 6,
    title: 'Product Showcase',
    description: 'Highlighting key features and unique value propositions',
    visualNote: 'Product close-ups, clean aesthetics, feature highlights',
    image: 'https://images.unsplash.com/photo-1759491627968-3ca2247a31e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9kdWN0JTIwZGVtb25zdHJhdGlvbnxlbnwxfHx8fDE3NjE4ODIwMDh8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
];

type ViewMode = 'horizontal' | 'grid';

export function Stage4Storyboard({ project, onComplete }: Stage4Props) {
  const [scenes, setScenes] = useState<Scene[]>(project.data.storyboard || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('horizontal');

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setScenes(mockScenes);
      setIsGenerating(false);
    }, 2000);
  };

  const handleEditOpen = (scene: Scene) => {
    setEditingScene({ ...scene });
  };

  const handleEditSave = () => {
    if (editingScene) {
      setScenes(scenes.map(s => s.id === editingScene.id ? editingScene : s));
      setEditingScene(null);
    }
  };

  const handleEditChange = (field: keyof Scene, value: string | number) => {
    if (editingScene) {
      setEditingScene({ ...editingScene, [field]: value });
    }
  };

  const handleDelete = (id: string) => {
    const updatedScenes = scenes.filter(s => s.id !== id);
    setScenes(updatedScenes.map((s, i) => ({ ...s, number: i + 1 })));
  };

  const handleAddScene = () => {
    const newScene: Scene = {
      id: Date.now().toString(),
      number: scenes.length + 1,
      title: 'New Scene',
      description: 'Scene description',
      visualNote: 'Visual notes and camera direction',
      image: '',
    };
    setScenes([...scenes, newScene]);
    setEditingScene(newScene);
  };

  const handleSubmit = () => {
    onComplete({ storyboard: scenes });
  };

  return (
    <div className="max-w-7xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <Film className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-white">Build Storyboard</h2>
              <p className="text-gray-400">
                Visualize the main scenes based on your chosen narrative
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          {scenes.length > 0 && (
            <div className="flex items-center gap-2 bg-[#151515] border border-gray-800 rounded-lg p-1">
              <Button
                onClick={() => setViewMode('horizontal')}
                variant="ghost"
                size="sm"
                className={`rounded-md ${
                  viewMode === 'horizontal'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <LayoutList className="w-4 h-4 mr-2" />
                Horizontal
              </Button>
              <Button
                onClick={() => setViewMode('grid')}
                variant="ghost"
                size="sm"
                className={`rounded-md ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Grid3x3 className="w-4 h-4 mr-2" />
                Grid
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Generate Button */}
      {scenes.length === 0 && (
        <div className="mb-8">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                Generating Storyboard...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Storyboard
              </>
            )}
          </Button>
        </div>
      )}

      {/* Storyboard Scenes - Horizontal View */}
      {scenes.length > 0 && viewMode === 'horizontal' && (
        <>
          <ScrollArea className="mb-8">
            <div className="flex gap-6 pb-4">
              {scenes.map((scene) => (
                <Card
                  key={scene.id}
                  className="bg-[#151515] border-gray-800 rounded-xl overflow-hidden min-w-[340px] flex-shrink-0 group relative hover:border-gray-700 transition-all"
                >
                  {/* Scene Image */}
                  <div className="relative h-56 overflow-hidden bg-gray-900">
                    {scene.image ? (
                      <ImageWithFallback
                        src={scene.image}
                        alt={scene.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
                        <ImageIcon className="w-16 h-16 text-gray-700" />
                      </div>
                    )}
                    {/* Scene Number Badge */}
                    <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full">
                      Scene {scene.number}
                    </div>
                    {/* Action Buttons */}
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={() => handleEditOpen(scene)}
                        size="sm"
                        className="bg-gray-900/90 hover:bg-gray-800 text-white rounded-lg h-8 w-8 p-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(scene.id)}
                        size="sm"
                        className="bg-gray-900/90 hover:bg-red-600 text-white rounded-lg h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Scene Details */}
                  <div className="p-5 space-y-2">
                    <h3 className="text-white">{scene.title}</h3>
                    <p className="text-gray-400 line-clamp-2">{scene.description}</p>
                    <p className="text-gray-600 italic line-clamp-2">{scene.visualNote}</p>
                  </div>
                </Card>
              ))}

              {/* Add Scene Card */}
              <Card
                onClick={handleAddScene}
                className="bg-[#151515] border-gray-800 border-dashed rounded-xl min-w-[340px] flex-shrink-0 cursor-pointer hover:border-blue-500 transition-all flex items-center justify-center h-[380px]"
              >
                <div className="text-center">
                  <Plus className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">Add Scene</p>
                </div>
              </Card>
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              onClick={handleGenerate}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={scenes.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8"
              size="lg"
            >
              Continue to Screenplay
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </>
      )}

      {/* Storyboard Scenes - Grid View */}
      {scenes.length > 0 && viewMode === 'grid' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {scenes.map((scene) => (
              <Card
                key={scene.id}
                className="bg-[#151515] border-gray-800 rounded-xl overflow-hidden group relative hover:border-gray-700 transition-all"
              >
                {/* Scene Image */}
                <div className="relative h-56 overflow-hidden bg-gray-900">
                  {scene.image ? (
                    <ImageWithFallback
                      src={scene.image}
                      alt={scene.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
                      <ImageIcon className="w-16 h-16 text-gray-700" />
                    </div>
                  )}
                  {/* Scene Number Badge */}
                  <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full">
                    Scene {scene.number}
                  </div>
                  {/* Action Buttons */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      onClick={() => handleEditOpen(scene)}
                      size="sm"
                      className="bg-gray-900/90 hover:bg-gray-800 text-white rounded-lg h-8 w-8 p-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(scene.id)}
                      size="sm"
                      className="bg-gray-900/90 hover:bg-red-600 text-white rounded-lg h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Scene Details */}
                <div className="p-5 space-y-2">
                  <h3 className="text-white">{scene.title}</h3>
                  <p className="text-gray-400 line-clamp-2">{scene.description}</p>
                  <p className="text-gray-600 italic line-clamp-2">{scene.visualNote}</p>
                </div>
              </Card>
            ))}

            {/* Add Scene Card */}
            <Card
              onClick={handleAddScene}
              className="bg-[#151515] border-gray-800 border-dashed rounded-xl cursor-pointer hover:border-blue-500 transition-all flex items-center justify-center min-h-[380px]"
            >
              <div className="text-center">
                <Plus className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Add Scene</p>
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              onClick={handleGenerate}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={scenes.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8"
              size="lg"
            >
              Continue to Screenplay
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingScene} onOpenChange={() => setEditingScene(null)}>
        <DialogContent className="bg-[#151515] border-gray-800 text-white rounded-xl max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Scene {editingScene?.number}</DialogTitle>
          </DialogHeader>
          {editingScene && (
            <div className="space-y-4 mt-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-gray-300">Scene Title</Label>
                <Input
                  id="edit-title"
                  value={editingScene.title}
                  onChange={(e) => handleEditChange('title', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-gray-300">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingScene.description}
                  onChange={(e) => handleEditChange('description', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-20"
                />
              </div>

              {/* Visual Notes */}
              <div className="space-y-2">
                <Label htmlFor="edit-visual" className="text-gray-300">Visual Notes</Label>
                <Textarea
                  id="edit-visual"
                  value={editingScene.visualNote}
                  onChange={(e) => handleEditChange('visualNote', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-20"
                  placeholder="Camera angles, lighting, mood, etc."
                />
              </div>

              {/* Image URL */}
              <div className="space-y-2">
                <Label htmlFor="edit-image" className="text-gray-300">Image URL</Label>
                <Input
                  id="edit-image"
                  value={editingScene.image}
                  onChange={(e) => handleEditChange('image', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg"
                  placeholder="https://..."
                />
              </div>

              {/* Preview */}
              {editingScene.image && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Preview</Label>
                  <div className="relative h-48 rounded-lg overflow-hidden bg-gray-900">
                    <ImageWithFallback
                      src={editingScene.image}
                      alt={editingScene.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  onClick={() => setEditingScene(null)}
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
