/**
 * Utility functions for StoryLab Project operations
 */

import {
  StoryLabProject,
  DEFAULT_WORKFLOW_STAGES,
  UserInputCampaignDetails,
  AIGeneratedPersonas,
  AIGeneratedNarrative,
  AIGeneratedStoryboard,
  AIGeneratedScreenplay,
  VideoProductionData,
  StageExecution,
} from '../types/project.types';

/**
 * Create an empty stage execution record
 */
export function createEmptyStageExecutions(): Record<string, StageExecution> {
  const executions: Record<string, StageExecution> = {};
  DEFAULT_WORKFLOW_STAGES.forEach((stage) => {
    executions[stage.name] = {
      stageName: stage.name,
      status: 'pending',
    };
  });
  return executions;
}

/**
 * Calculate project completion percentage
 */
export function calculateCompletionPercentage(stageExecutions: Record<string, StageExecution>): number {
  const totalStages = DEFAULT_WORKFLOW_STAGES.length;
  const completedStages = Object.values(stageExecutions).filter((exec) => exec.status === 'completed').length;
  return Math.round((completedStages / totalStages) * 100);
}

/**
 * Get current stage from project
 */
export function getCurrentStage(project: StoryLabProject) {
  return DEFAULT_WORKFLOW_STAGES[project.currentStageIndex] || null;
}

/**
 * Get next stage
 */
export function getNextStage(currentStageIndex: number) {
  if (currentStageIndex >= DEFAULT_WORKFLOW_STAGES.length - 1) return null;
  return DEFAULT_WORKFLOW_STAGES[currentStageIndex + 1];
}

/**
 * Get previous stage
 */
export function getPreviousStage(currentStageIndex: number) {
  if (currentStageIndex <= 0) return null;
  return DEFAULT_WORKFLOW_STAGES[currentStageIndex - 1];
}

/**
 * Check if a stage can be accessed
 */
export function canAccessStage(project: StoryLabProject, stageIndex: number): boolean {
  const stage = DEFAULT_WORKFLOW_STAGES[stageIndex];
  if (!stage) return false;
  if (!stage.requiresPreviousCompletion) return true;

  const previousStage = DEFAULT_WORKFLOW_STAGES[stageIndex - 1];
  if (!previousStage) return true;

  const previousExecution = project.stageExecutions[previousStage.name];
  return previousExecution?.status === 'completed';
}

/**
 * Check if a stage is completed
 */
export function isStagePending(project: StoryLabProject, stageName: string): boolean {
  const execution = project.stageExecutions[stageName];
  return execution?.status === 'pending';
}

/**
 * Check if a stage is in progress
 */
export function isStageInProgress(project: StoryLabProject, stageName: string): boolean {
  const execution = project.stageExecutions[stageName];
  return execution?.status === 'in_progress';
}

/**
 * Check if a stage is completed
 */
export function isStageCompleted(project: StoryLabProject, stageName: string): boolean {
  const execution = project.stageExecutions[stageName];
  return execution?.status === 'completed';
}

/**
 * Check if a stage has failed
 */
export function isStageFailed(project: StoryLabProject, stageName: string): boolean {
  const execution = project.stageExecutions[stageName];
  return execution?.status === 'failed';
}

/**
 * Get stage execution
 */
export function getStageExecution(project: StoryLabProject, stageName: string): StageExecution | undefined {
  return project.stageExecutions[stageName];
}

/**
 * Check if project can be advanced
 */
export function canAdvanceProject(project: StoryLabProject): boolean {
  const currentStage = DEFAULT_WORKFLOW_STAGES[project.currentStageIndex];
  if (!currentStage) return false;
  if (project.currentStageIndex >= DEFAULT_WORKFLOW_STAGES.length - 1) return false;

  const stageExecution = project.stageExecutions[currentStage.name];
  return stageExecution?.status === 'completed';
}

/**
 * Check if all required user inputs are provided
 */
export function hasCampaignDetails(project: StoryLabProject): boolean {
  return !!(
    project.campaignDetails &&
    project.campaignDetails.campaignName &&
    project.campaignDetails.productDescription &&
    project.campaignDetails.targetAudience &&
    project.campaignDetails.videoLength &&
    project.campaignDetails.callToAction
  );
}

/**
 * Check if personas have been generated
 */
export function hasPersonas(project: StoryLabProject): boolean {
  return !!(project.aiGeneratedPersonas && project.aiGeneratedPersonas.personas.length > 0);
}

/**
 * Check if narrative has been generated
 */
export function hasNarrative(project: StoryLabProject): boolean {
  return !!(project.aiGeneratedNarrative && project.aiGeneratedNarrative.fullNarrative);
}

/**
 * Check if storyboard has been generated
 */
export function hasStoryboard(project: StoryLabProject): boolean {
  return !!(project.aiGeneratedStoryboard && project.aiGeneratedStoryboard.scenes.length > 0);
}

/**
 * Check if screenplay has been generated
 */
export function hasScreenplay(project: StoryLabProject): boolean {
  return !!(project.aiGeneratedScreenplay && project.aiGeneratedScreenplay.fullText);
}

/**
 * Check if video has been created
 */
export function hasVideo(project: StoryLabProject): boolean {
  return !!(project.videoProduction && project.videoProduction.videoUrl);
}

/**
 * Get all generated AI content
 */
export function getGeneratedContent(project: StoryLabProject) {
  return {
    personas: project.aiGeneratedPersonas,
    narrative: project.aiGeneratedNarrative,
    storyboard: project.aiGeneratedStoryboard,
    screenplay: project.aiGeneratedScreenplay,
    video: project.videoProduction,
  };
}

/**
 * Get all user inputs
 */
export function getUserInputs(project: StoryLabProject) {
  return {
    campaignDetails: project.campaignDetails,
    narrativePreferences: project.narrativePreferences,
    visualDirection: project.visualDirection,
    scriptPreferences: project.scriptPreferences,
    personaSelection: project.userPersonaSelection,
  };
}

/**
 * Export project as JSON string
 */
export function exportProjectAsJSON(project: StoryLabProject): string {
  return JSON.stringify(project, null, 2);
}

/**
 * Get project summary
 */
export function getProjectSummary(project: StoryLabProject) {
  return {
    id: project.id,
    name: project.name,
    campaignName: project.campaignDetails.campaignName,
    status: project.status,
    completionPercentage: project.completionPercentage,
    currentStage: getCurrentStage(project),
    stageCount: DEFAULT_WORKFLOW_STAGES.length,
    hasPersonas: hasPersonas(project),
    hasNarrative: hasNarrative(project),
    hasStoryboard: hasStoryboard(project),
    hasScreenplay: hasScreenplay(project),
    hasVideo: hasVideo(project),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

/**
 * Merge projects (for versioning)
 */
export function mergeProjects(base: StoryLabProject, updates: Partial<StoryLabProject>): StoryLabProject {
  return {
    ...base,
    ...updates,
    // Don't override these
    id: base.id,
    ownerId: base.ownerId,
    createdAt: base.createdAt,
  };
}

/**
 * Clone project for versioning
 */
export function cloneProjectForVersion(project: StoryLabProject, description: string): Partial<StoryLabProject> {
  return {
    name: `${project.name} (v${(project.versions?.length || 0) + 1})`,
    description: description,
    status: project.status,
    currentStageIndex: project.currentStageIndex,
    completionPercentage: project.completionPercentage,
    campaignDetails: project.campaignDetails,
    aiGeneratedPersonas: project.aiGeneratedPersonas,
    userPersonaSelection: project.userPersonaSelection,
    narrativePreferences: project.narrativePreferences,
    aiGeneratedNarrative: project.aiGeneratedNarrative,
    visualDirection: project.visualDirection,
    aiGeneratedStoryboard: project.aiGeneratedStoryboard,
    storyboardCustomizations: project.storyboardCustomizations,
    scriptPreferences: project.scriptPreferences,
    aiGeneratedScreenplay: project.aiGeneratedScreenplay,
    screenplayCustomizations: project.screenplayCustomizations,
    videoProduction: project.videoProduction,
    metadata: project.metadata,
  };
}

/**
 * Get stage index by name
 */
export function getStageIndexByName(stageName: string): number {
  const stage = DEFAULT_WORKFLOW_STAGES.find((s) => s.name === stageName);
  return stage ? stage.index : -1;
}

/**
 * Get stage name by index
 */
export function getStageNameByIndex(index: number): string | null {
  return DEFAULT_WORKFLOW_STAGES[index]?.name || null;
}

/**
 * Get stage by name
 */
export function getStageByStageName(stageName: string) {
  return DEFAULT_WORKFLOW_STAGES.find((s) => s.name === stageName);
}

/**
 * Check if stage requires user input
 */
export function stageRequiresUserInput(stageName: string): boolean {
  const stage = getStageByStageName(stageName);
  return stage?.isUserInput || false;
}

/**
 * Check if stage allows customization
 */
export function stageAllowsCustomization(stageName: string): boolean {
  const stage = getStageByStageName(stageName);
  return stage?.allowsCustomization || false;
}

/**
 * Get stage estimated duration
 */
export function getStageEstimatedDuration(stageName: string): number | null {
  const stage = getStageByStageName(stageName);
  return stage?.estimatedDuration || null;
}

/**
 * Format stage name for display
 */
export function formatStageName(stageName: string): string {
  const stage = getStageByStageName(stageName);
  return stage?.displayName || stageName;
}

/**
 * Get workflow progress
 */
export function getWorkflowProgress(project: StoryLabProject) {
  const stages = DEFAULT_WORKFLOW_STAGES.map((stage) => {
    const execution = project.stageExecutions[stage.name];
    return {
      ...stage,
      status: execution?.status || 'pending',
      isCurrentStage: project.currentStageIndex === stage.index,
      canAccess: true, // Would use canAccessStage() with project context
    };
  });

  return {
    currentStageIndex: project.currentStageIndex,
    totalStages: stages.length,
    completionPercentage: project.completionPercentage,
    stages,
  };
}
