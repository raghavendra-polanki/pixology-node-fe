import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Player } from '@/shared/services/teamsService';
import { ImageUpload } from '@/shared/components/ImageUpload';

interface PlayerFormModalProps {
  player: Player | null; // null for Add, Player for Edit
  open: boolean;
  onClose: () => void;
  onSave: (player: Partial<Player>) => Promise<void>;
}

export const PlayerFormModal = ({ player, open, onClose, onSave }: PlayerFormModalProps) => {
  const isEdit = !!player;
  const [formData, setFormData] = useState<Partial<Player>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [headshotFile, setHeadshotFile] = useState<File | null>(null);

  useEffect(() => {
    if (player) {
      setFormData(player);
    } else {
      setFormData({});
    }
  }, [player, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let playerData = { ...formData };

      // Upload headshot if a new file was selected
      if (headshotFile && formData.playerId) {
        const formDataToUpload = new FormData();
        formDataToUpload.append('image', headshotFile);
        formDataToUpload.append('assetType', 'player-headshot');
        formDataToUpload.append('entityId', formData.playerId);
        if (formData.images?.headshot) {
          formDataToUpload.append('oldImageUrl', formData.images.headshot);
        }

        const token = sessionStorage.getItem('authToken');
        const response = await fetch('/api/gamelab/teams/upload-asset', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: formDataToUpload,
        });

        if (response.ok) {
          const data = await response.json();
          playerData = {
            ...playerData,
            images: {
              ...playerData.images,
              headshot: data.url,
            },
          };
        } else {
          throw new Error('Failed to upload headshot');
        }
      }

      await onSave(playerData);
      onClose();
    } catch (error) {
      console.error('Error saving player:', error);
      alert('Failed to save player. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof Player, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Player' : 'Add Player'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Player Name *</label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., Connor McDavid"
                  required
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Jersey Number *</label>
                <Input
                  value={formData.jerseyNumber || ''}
                  onChange={(e) => updateField('jerseyNumber', e.target.value)}
                  placeholder="e.g., 97"
                  required
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Position *</label>
                <select
                  value={formData.position || ''}
                  onChange={(e) => updateField('position', e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
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
                <label className="block text-sm text-gray-400 mb-1.5">Shoots/Catches</label>
                <select
                  value={formData.shootsCatches || ''}
                  onChange={(e) => updateField('shootsCatches', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select</option>
                  <option value="L">Left</option>
                  <option value="R">Right</option>
                </select>
              </div>
            </div>
          </div>

          {/* Physical Stats */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Physical Stats</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Height</label>
                <Input
                  value={formData.height || ''}
                  onChange={(e) => updateField('height', e.target.value)}
                  placeholder={'e.g., 6\'1"'}
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Weight (lbs)</label>
                <Input
                  value={formData.weight || ''}
                  onChange={(e) => updateField('weight', e.target.value)}
                  placeholder="e.g., 192"
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Age</label>
                <Input
                  type="number"
                  value={formData.age || ''}
                  onChange={(e) => updateField('age', e.target.value)}
                  placeholder="e.g., 27"
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Birth Information */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Birth Information</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Birth Date</label>
                <Input
                  type="date"
                  value={formData.birthDate || ''}
                  onChange={(e) => updateField('birthDate', e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Birth City</label>
                <Input
                  value={formData.birthCity || ''}
                  onChange={(e) => updateField('birthCity', e.target.value)}
                  placeholder="e.g., Richmond Hill"
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Birth Country</label>
                <Input
                  value={formData.birthCountry || ''}
                  onChange={(e) => updateField('birthCountry', e.target.value)}
                  placeholder="e.g., Canada"
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Headshot Image */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Player Headshot</h3>
            <ImageUpload
              currentImageUrl={formData.images?.headshot}
              onImageChange={setHeadshotFile}
              label="Headshot Image"
              aspectRatio="square"
              placeholder="Upload player headshot"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : isEdit ? 'Update Player' : 'Add Player'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
