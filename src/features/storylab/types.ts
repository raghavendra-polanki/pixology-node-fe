/**
 * Extended Project type that includes workflow data
 */
export interface WorkflowData {
  campaignDetails?: {
    campaignName: string;
    productDescription: string;
    targetAudience: string;
    videoLength: string;
    callToAction: string;
  };
  personas?: any[];
  narrative?: any;
  storyboard?: any[];
  screenplay?: any[];
  video?: any;
}

export interface Project {
  id: string;
  name: string;
  status: 'draft' | 'complete' | 'generating';
  currentStage: number;
  createdAt: string;
  data: WorkflowData;
}
