import { useState } from 'react';
import { ArrowRight, Target } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card } from '../ui/card';
import type { Project } from '../../types';

interface Stage1Props {
  project: Project;
  onComplete: (data: any) => void;
}

export function Stage1CampaignDetails({ project, onComplete }: Stage1Props) {
  const [formData, setFormData] = useState({
    campaignName: project.data.campaignDetails?.campaignName || '',
    productDescription: project.data.campaignDetails?.productDescription || '',
    targetAudience: project.data.campaignDetails?.targetAudience || '',
    videoLength: project.data.campaignDetails?.videoLength || '30s',
    callToAction: project.data.campaignDetails?.callToAction || 'Visit Website',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ campaignDetails: formData });
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
            disabled={!isFormValid}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8"
            size="lg"
          >
            Save & Proceed
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
}
