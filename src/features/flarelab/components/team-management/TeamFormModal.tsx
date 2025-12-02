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
import { Team } from '@/shared/services/teamsService';
import { ImageUpload } from '@/shared/components/ImageUpload';

interface TeamFormModalProps {
  team: Team | null; // null for Add, Team for Edit
  open: boolean;
  onClose: () => void;
  onSave: (team: Partial<Team>) => Promise<void>;
}

export const TeamFormModal = ({ team, open, onClose, onSave }: TeamFormModalProps) => {
  const isEdit = !!team;
  const [formData, setFormData] = useState<Partial<Team>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (team) {
      setFormData(team);
    } else {
      setFormData({
        colors: { primary: '#000000', secondary: '#FFFFFF' },
        logo: {},
        stadium: { name: '', capacity: 0 }
      });
    }
  }, [team, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let teamData = { ...formData };

      // Upload logo if a new file was selected
      if (logoFile && formData.teamId) {
        const formDataToUpload = new FormData();
        formDataToUpload.append('image', logoFile);
        formDataToUpload.append('assetType', 'team-logo');
        formDataToUpload.append('entityId', formData.teamId);
        if (formData.logo?.primary) {
          formDataToUpload.append('oldImageUrl', formData.logo.primary);
        }

        const token = sessionStorage.getItem('authToken');
        const response = await fetch('/api/flarelab/teams/upload-asset', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: formDataToUpload,
        });

        if (response.ok) {
          const data = await response.json();
          teamData = {
            ...teamData,
            logo: {
              ...teamData.logo,
              primary: data.url,
            },
          };
        } else {
          const errorData = await response.json();
          console.error('Upload error details:', errorData);
          throw new Error(`Failed to upload logo: ${errorData.details || errorData.error} (bucket: ${errorData.bucket})`);
        }
      }

      await onSave(teamData);
      onClose();
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Failed to save team. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof Team, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Team' : 'Add Team'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Team Name *</label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., Edmonton Oilers"
                  required
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">City *</label>
                <Input
                  value={formData.city || ''}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="e.g., Edmonton"
                  required
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Abbreviation *</label>
                <Input
                  value={formData.abbreviation || ''}
                  onChange={(e) => updateField('abbreviation', e.target.value)}
                  placeholder="e.g., EDM"
                  required
                  maxLength={3}
                  className="bg-gray-800/50 border-gray-700 text-white uppercase"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Founded</label>
                <Input
                  type="number"
                  value={formData.founded || ''}
                  onChange={(e) => updateField('founded', parseInt(e.target.value))}
                  placeholder="e.g., 1979"
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Conference & Division */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">League Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Conference</label>
                <select
                  value={formData.conference || ''}
                  onChange={(e) => updateField('conference', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Conference</option>
                  <option value="Western">Western</option>
                  <option value="Eastern">Eastern</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Division</label>
                <select
                  value={formData.division || ''}
                  onChange={(e) => updateField('division', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Division</option>
                  <option value="Pacific">Pacific</option>
                  <option value="Central">Central</option>
                  <option value="Atlantic">Atlantic</option>
                  <option value="Metropolitan">Metropolitan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Team Colors */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Team Colors</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.colors?.primary || '#000000'}
                    onChange={(e) => updateField('colors', { ...formData.colors, primary: e.target.value })}
                    className="h-10 w-16 rounded cursor-pointer"
                  />
                  <Input
                    value={formData.colors?.primary || '#000000'}
                    onChange={(e) => updateField('colors', { ...formData.colors, primary: e.target.value })}
                    placeholder="#000000"
                    className="flex-1 bg-gray-800/50 border-gray-700 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Secondary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.colors?.secondary || '#FFFFFF'}
                    onChange={(e) => updateField('colors', { ...formData.colors, secondary: e.target.value })}
                    className="h-10 w-16 rounded cursor-pointer"
                  />
                  <Input
                    value={formData.colors?.secondary || '#FFFFFF'}
                    onChange={(e) => updateField('colors', { ...formData.colors, secondary: e.target.value })}
                    placeholder="#FFFFFF"
                    className="flex-1 bg-gray-800/50 border-gray-700 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stadium */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Stadium Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Stadium Name</label>
                <Input
                  value={formData.stadium?.name || ''}
                  onChange={(e) => updateField('stadium', { ...formData.stadium, name: e.target.value })}
                  placeholder="e.g., Rogers Place"
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Capacity</label>
                <Input
                  type="number"
                  value={formData.stadium?.capacity || ''}
                  onChange={(e) => updateField('stadium', { ...formData.stadium, capacity: parseInt(e.target.value) })}
                  placeholder="e.g., 18347"
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Team Logo */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Team Logo</h3>
            <ImageUpload
              currentImageUrl={formData.logo?.primary}
              onImageChange={setLogoFile}
              label="Team Logo"
              aspectRatio="square"
              placeholder="Upload team logo"
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
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : isEdit ? 'Update Team' : 'Add Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
