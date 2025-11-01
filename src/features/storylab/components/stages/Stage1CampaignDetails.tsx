import { useState, useEffect } from 'react';
import { ArrowRight, Target } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card } from '../ui/card';
import { StoryLabProject, CreateProjectInput, UserInputCampaignDetails } from '../../types/project.types';

interface Stage1Props {
  project: StoryLabProject | null;
  createProject: (input: CreateProjectInput) => Promise<StoryLabProject>;
  loadProject: (projectId: string) => Promise<StoryLabProject>;
  updateCampaignDetails: (details: Partial<UserInputCampaignDetails>) => Promise<void>;
  markStageCompleted: (stageName: string, data?: any) => Promise<void>;
  advanceToNextStage: (projectToAdvance?: StoryLabProject) => Promise<void>;
}

export function Stage1CampaignDetails({
  project,
  createProject,
  loadProject,
  updateCampaignDetails,
  markStageCompleted,
  advanceToNextStage,
}: Stage1Props) {
  const [isSaving, setIsSaving] = useState(false);

  // Local form state
  const [formData, setFormData] = useState({
    campaignName: '',
    productDescription: '',
    targetAudience: '',
    videoLength: '30s',
    callToAction: 'Visit Website',
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
      });
    } else if (project === null) {
      // For new/temp projects, initialize with empty form (project will be created later)
      setFormData({
        campaignName: '',
        productDescription: '',
        targetAudience: '',
        videoLength: '30s',
        callToAction: 'Visit Website',
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
          const loadedProject = await loadProject(newProject.id);
          // Advance to next stage - pass the loaded project to avoid timing issues
          await advanceToNextStage(loadedProject);
        }
      } else {
        // Update campaign details for existing projects
        await updateCampaignDetails(formData);
        // Mark stage as completed for existing projects
        await markStageCompleted('campaign-details');
        // Advance to next stage
        await advanceToNextStage(project);
      }
    } catch (error) {
      console.error('Failed to save campaign details:', error);
    } finally {
      setIsSaving(false);
    }
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
