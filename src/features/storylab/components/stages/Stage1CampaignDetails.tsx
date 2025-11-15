import { useState, useEffect } from 'react';
import { ArrowRight, Target, Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { StoryLabProject, CreateProjectInput, UserInputCampaignDetails } from '../../types/project.types';
import { authService } from '@/shared/services/authService';

interface Stage1Props {
  project: StoryLabProject | null;
  createProject: (input: CreateProjectInput) => Promise<StoryLabProject>;
  loadProject: (projectId: string) => Promise<StoryLabProject>;
  updateCampaignDetails: (details: Partial<UserInputCampaignDetails>) => Promise<void>;
  markStageCompleted: (stageName: string, data?: any) => Promise<void>;
  advanceToNextStage: (projectToAdvance?: StoryLabProject) => Promise<void>;
  navigateToStage?: (stageId: number) => void;
}

export function Stage1CampaignDetails({
  project,
  createProject,
  loadProject,
  updateCampaignDetails,
  markStageCompleted,
  advanceToNextStage,
  navigateToStage,
}: Stage1Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Local form state
  const [formData, setFormData] = useState({
    campaignName: '',
    productDescription: '',
    targetAudience: '',
    videoLength: '30s',
    callToAction: 'Visit Website',
    productImageUrl: '',
  });

  // Sync form with project data when it loads
  useEffect(() => {
    if (project?.campaignDetails) {
      // Load existing campaign details
      setFormData({
        campaignName: project.campaignDetails.campaignName || '',
        productDescription: project.campaignDetails.productDescription || '',
        targetAudience: project.campaignDetails.targetAudience || '',
        videoLength: project.campaignDetails.videoLength || '30s',
        callToAction: project.campaignDetails.callToAction || 'Visit Website',
        productImageUrl: project.campaignDetails.productImageUrl || '',
      });
      if (project.campaignDetails.productImageUrl) {
        setImagePreview(project.campaignDetails.productImageUrl);
      }
    } else if (project === null) {
      // For new/temp projects, initialize with empty form (project will be created later)
      setFormData({
        campaignName: '',
        productDescription: '',
        targetAudience: '',
        videoLength: '30s',
        callToAction: 'Visit Website',
        productImageUrl: '',
      });
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      // For new projects (project is null), create the project first
      if (!project) {
        const newProject = await createProject({
          name: formData.campaignName || 'New Campaign',
          description: '',
          campaignDetails: formData,
        });
        // After creating, reload the project to get full data with stage executions
        if (newProject) {
          await loadProject(newProject.id);
          // Navigate to next stage (Stage 2 - Personas)
          if (navigateToStage) {
            navigateToStage(2);
          }
        }
      } else {
        // Update campaign details and mark stage as completed in a single save
        await markStageCompleted('campaign-details', undefined, {
          campaignDetails: formData,
        });
        // Navigate to next stage (Stage 2 - Personas)
        if (navigateToStage) {
          navigateToStage(2);
        }
      }
    } catch (error) {
      console.error('Failed to save campaign details:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size must be less than 10MB');
      return;
    }

    try {
      setIsUploadingImage(true);
      setUploadError(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = (e.target?.result as string).split(',')[1];
        setImagePreview(e.target?.result as string);

        // Only upload if project exists (not a temporary project)
        if (project && project.id && !project.id.startsWith('temp-')) {
          try {
            const token = authService.getToken();

            if (!token) {
              setUploadError('Authentication token not found. Please log in again.');
              setImagePreview(null);
              return;
            }

            const response = await fetch(
              `/api/projects/${project.id}/upload-product-image`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  imageBase64: base64Data,
                  fileName: file.name,
                }),
              }
            );

            const data = await response.json();

            if (data.success) {
              setFormData({ ...formData, productImageUrl: data.imageUrl });
              console.log('Image uploaded successfully:', data.imageUrl);
            } else {
              setUploadError(data.error || 'Failed to upload image');
              setImagePreview(null);
            }
          } catch (error) {
            console.error('Error uploading image:', error);
            setUploadError('Failed to upload image to server');
            setImagePreview(null);
          }
        } else {
          // For temporary projects, just store the preview
          setFormData({ ...formData, productImageUrl: e.target?.result as string });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      setUploadError('Failed to process image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData({ ...formData, productImageUrl: '' });
    setUploadError(null);
  };

  const isFormValid = formData.campaignName && formData.productDescription && formData.targetAudience;

  return (
    <div className="max-w-4xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
            <Target className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-white">Campaign Details & Objectives</h2>
            <p className="text-gray-400">
              Provide essential information to ground the AI generation
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="bg-[#151515] border-gray-800 rounded-xl p-8">
          <div className="space-y-6">
            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="campaignName" className="text-gray-300">
                Campaign Name
              </Label>
              <Input
                id="campaignName"
                value={formData.campaignName}
                onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                placeholder="e.g., Summer Product Launch 2025"
                className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg focus:border-blue-500"
              />
            </div>

            {/* Product/Service Description */}
            <div className="space-y-2">
              <Label htmlFor="productDescription" className="text-gray-300">
                Product/Service Description
              </Label>
              <Textarea
                id="productDescription"
                value={formData.productDescription}
                onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                placeholder="Describe your product or service in detail. What problem does it solve? What makes it unique?"
                className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-32 focus:border-blue-500"
              />
            </div>

            {/* Product Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="productImage" className="text-gray-300">
                Product Image (Optional)
              </Label>
              <div className="bg-[#0a0a0a] border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="max-h-48 mx-auto rounded-lg object-contain"
                    />
                    <Button
                      type="button"
                      onClick={handleRemoveImage}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800/50"
                    >
                      <X className="w-4 h-4" />
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      id="productImage"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-500" />
                      <div className="text-gray-400">
                        <p className="font-medium">Click to upload or drag and drop</p>
                        <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    </div>
                  </label>
                )}
              </div>
              {isUploadingImage && (
                <p className="text-sm text-blue-400 flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                  Uploading image...
                </p>
              )}
              {uploadError && (
                <Alert className="bg-red-900/20 border-red-800">
                  <AlertDescription className="text-red-400">{uploadError}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="targetAudience" className="text-gray-300">
                Target Audience Description
              </Label>
              <Textarea
                id="targetAudience"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                placeholder="Describe your target audience. Include demographics, pain points, and desired outcomes."
                className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-32 focus:border-blue-500"
              />
            </div>

            {/* Video Length & CTA Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Video Length */}
              <div className="space-y-2">
                <Label htmlFor="videoLength" className="text-gray-300">
                  Desired Video Length
                </Label>
                <Select
                  value={formData.videoLength}
                  onValueChange={(value) => setFormData({ ...formData, videoLength: value })}
                >
                  <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-gray-700 text-white rounded-lg">
                    <SelectItem value="15s">15 seconds</SelectItem>
                    <SelectItem value="30s">30 seconds</SelectItem>
                    <SelectItem value="60s">60 seconds</SelectItem>
                    <SelectItem value="90s">90 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Call to Action */}
              <div className="space-y-2">
                <Label htmlFor="callToAction" className="text-gray-300">
                  Primary Call-to-Action
                </Label>
                <Select
                  value={formData.callToAction}
                  onValueChange={(value) => setFormData({ ...formData, callToAction: value })}
                >
                  <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-gray-700 text-white rounded-lg">
                    <SelectItem value="Visit Website">Visit Website</SelectItem>
                    <SelectItem value="Buy Now">Buy Now</SelectItem>
                    <SelectItem value="Sign Up">Sign Up</SelectItem>
                    <SelectItem value="Learn More">Learn More</SelectItem>
                    <SelectItem value="Download App">Download App</SelectItem>
                    <SelectItem value="Contact Us">Contact Us</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <div className="mt-8">
          <Button
            type="submit"
            disabled={!isFormValid || isSaving}
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
                Save & Proceed
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
