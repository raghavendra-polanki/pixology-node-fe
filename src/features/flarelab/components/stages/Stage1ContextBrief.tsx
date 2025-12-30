import { useState, useEffect } from 'react';
import { ArrowRight, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import TeamsService, { Team } from '@/shared/services/teamsService';
import type { FlareLabProject, ContextPill, CampaignGoal, CreateProjectInput } from '../../types/project.types';

interface Stage1Props {
  project: FlareLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<FlareLabProject | null>;
  loadProject: (projectId: string) => Promise<FlareLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<FlareLabProject | null>;
  updateContextBrief: (contextBrief: any, projectId?: string) => Promise<FlareLabProject | null>;
}

const teamsService = new TeamsService();

const CONTEXT_PILLS = ['Playoff Intensity', 'Rivalry Game', 'Holiday Special', 'Buzzer Beater'];
const CAMPAIGN_GOALS = [
  'Social Media Hype',
  'Broadcast B-Roll',
  'Stadium Ribbon Display',
  'Post-Game Highlights'
];

export const Stage1ContextBrief = ({
  project,
  navigateToStage,
  createProject,
  loadProject,
  markStageCompleted
}: Stage1Props) => {
  const [projectName, setProjectName] = useState(project?.name || '');
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [homeTeamId, setHomeTeamId] = useState<string | null>(null);
  const [awayTeamId, setAwayTeamId] = useState<string | null>(null);
  const [contextPills, setContextPills] = useState<string[]>(['Playoff Intensity', 'Rivalry Game']);
  const [campaignGoal, setCampaignGoal] = useState('Broadcast B-Roll');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch teams from database
  useEffect(() => {
    const loadTeams = async () => {
      try {
        setIsLoadingTeams(true);
        const teamsData = await teamsService.getTeams('hockey');
        setTeams(teamsData);

        // Set default selections if available
        if (teamsData.length >= 2) {
          // Restore from project if exists, otherwise use first two teams
          const existingHome = project?.contextBrief?.homeTeam?.teamId;
          const existingAway = project?.contextBrief?.awayTeam?.teamId;

          if (existingHome && teamsData.find(t => t.teamId === existingHome)) {
            setHomeTeamId(existingHome);
          } else {
            setHomeTeamId(teamsData[0].teamId);
          }

          if (existingAway && teamsData.find(t => t.teamId === existingAway)) {
            setAwayTeamId(existingAway);
          } else {
            setAwayTeamId(teamsData[1].teamId);
          }
        }
      } catch (error) {
        console.error('[Stage1] Failed to load teams:', error);
      } finally {
        setIsLoadingTeams(false);
      }
    };

    loadTeams();
  }, [project?.contextBrief]);

  // Restore other fields from project
  useEffect(() => {
    if (project?.contextBrief) {
      if (project.contextBrief.contextPills) {
        setContextPills(project.contextBrief.contextPills);
      }
      if (project.contextBrief.campaignGoal) {
        setCampaignGoal(project.contextBrief.campaignGoal);
      }
    }
  }, [project?.contextBrief]);

  const togglePill = (pill: string) => {
    setContextPills(prev =>
      prev.includes(pill) ? prev.filter(p => p !== pill) : [...prev, pill]
    );
  };

  // Get team objects by ID
  const homeTeam = teams.find(t => t.teamId === homeTeamId);
  const awayTeam = teams.find(t => t.teamId === awayTeamId);

  const handleContinue = async () => {
    if (!homeTeam || !awayTeam) {
      alert('Please select both home and away teams');
      return;
    }

    try {
      setIsSaving(true);

      // Store full team data including teamId for player fetching in Stage 3
      const contextBriefData = {
        homeTeam: {
          teamId: homeTeam.teamId,
          name: homeTeam.name,
          city: homeTeam.city,
          abbreviation: homeTeam.abbreviation,
          logoUrl: homeTeam.logo?.primary,
          colors: homeTeam.colors,
        },
        awayTeam: {
          teamId: awayTeam.teamId,
          name: awayTeam.name,
          city: awayTeam.city,
          abbreviation: awayTeam.abbreviation,
          logoUrl: awayTeam.logo?.primary,
          colors: awayTeam.colors,
        },
        contextPills: contextPills as ContextPill[],
        campaignGoal: campaignGoal as CampaignGoal,
        updatedAt: new Date(),
      };

      // For NEW projects (id starts with "temp-" or project is null)
      if (!project || project.id.startsWith('temp-')) {
        console.log('[Stage1] Creating new project...');

        // Create the project with context brief
        const newProject = await createProject({
          name: projectName || 'New Campaign',
          description: '',
          contextBrief: contextBriefData,
        });

        // After creating, reload the project and mark stage as completed
        if (newProject) {
          await loadProject(newProject.id);
          // Mark stage as completed to set currentStageIndex to 1
          // This will trigger WorkflowView to advance to stage 2
          await markStageCompleted('context-brief');
        }
      } else {
        // Update context brief and mark stage as completed in a single save
        await markStageCompleted('context-brief', undefined, {
          name: projectName || project.name,
          contextBrief: contextBriefData,
        });
        // Navigate to next stage (Stage 2 - Concept Gallery)
        if (navigateToStage) {
          navigateToStage(2);
        }
      }
    } catch (error) {
      console.error('[Stage1] Failed to save context brief:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg text-white">Setup Project</h2>
              <p className="text-sm text-gray-400">Define the match-up and game context</p>
            </div>
          </div>
          <Button
            onClick={handleContinue}
            disabled={!projectName.trim() || isSaving}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl"
            size="lg"
          >
            {isSaving ? 'Saving...' : 'Continue to Themes'}
            {!isSaving && <ArrowRight className="w-5 h-5 ml-2" />}
          </Button>
        </div>
      </div>

      {/* Project Name */}
      <div className="mb-6">
        <Label htmlFor="projectName" className="text-white mb-2 block">Project Name</Label>
        <Input
          id="projectName"
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Enter project name (e.g., Avalanche vs Lightning Hype)"
          className="bg-[#151515] border-gray-800 text-white placeholder:text-gray-500 focus-visible:border-orange-500 focus-visible:ring-orange-500/50"
        />
      </div>

      {/* Match-up Section */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-white mb-3">Match-up</h3>

        {isLoadingTeams ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
            <span className="ml-3 text-gray-400">Loading teams...</span>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p>No teams available. Please add teams in Team Management first.</p>
          </div>
        ) : (
          <>
            {/* Team Grid */}
            <div className="grid grid-cols-2 gap-6 mb-5">
              <div>
                <div className="text-xs text-slate-500 uppercase mb-2">Home Team</div>
                <div className="grid grid-cols-2 gap-3">
                  {teams.map(team => {
                    const isDisabled = team.teamId === awayTeamId;
                    const isSelected = team.teamId === homeTeamId;
                    return (
                    <button
                      key={`home-${team.teamId}`}
                      onClick={() => !isDisabled && setHomeTeamId(team.teamId)}
                      disabled={isDisabled}
                      className={`relative p-3 rounded-xl border-2 transition-all overflow-hidden ${
                        isSelected
                          ? 'border-orange-500 ring-2 ring-orange-500'
                          : isDisabled
                          ? 'border-gray-800 bg-[#151515] opacity-40 cursor-not-allowed'
                          : 'border-gray-800 bg-[#151515] hover:border-gray-700'
                      }`}
                    >
                      <div className="w-20 h-20 mx-auto mb-2 rounded-lg flex items-center justify-center bg-white p-2">
                        {team.logo?.primary ? (
                          <img src={team.logo.primary} alt={team.name} className="w-full h-full object-contain" />
                        ) : (
                          <Shield className="w-10 h-10 text-gray-400" />
                        )}
                      </div>
                      <div className="text-sm font-semibold text-white text-center">{team.city}</div>
                      <div className="text-xs text-gray-400 text-center">{team.name}</div>
                    </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 uppercase mb-2">Away Team</div>
                <div className="grid grid-cols-2 gap-3">
                  {teams.map(team => {
                    const isDisabled = team.teamId === homeTeamId;
                    const isSelected = team.teamId === awayTeamId;
                    return (
                    <button
                      key={`away-${team.teamId}`}
                      onClick={() => !isDisabled && setAwayTeamId(team.teamId)}
                      disabled={isDisabled}
                      className={`relative p-3 rounded-xl border-2 transition-all overflow-hidden ${
                        isSelected
                          ? 'border-orange-500 ring-2 ring-orange-500'
                          : isDisabled
                          ? 'border-gray-800 bg-[#151515] opacity-40 cursor-not-allowed'
                          : 'border-gray-800 bg-[#151515] hover:border-gray-700'
                      }`}
                    >
                      <div className="w-20 h-20 mx-auto mb-2 rounded-lg flex items-center justify-center bg-white p-2">
                        {team.logo?.primary ? (
                          <img src={team.logo.primary} alt={team.name} className="w-full h-full object-contain" />
                        ) : (
                          <Shield className="w-10 h-10 text-gray-400" />
                        )}
                      </div>
                      <div className="text-sm font-semibold text-white text-center">{team.city}</div>
                      <div className="text-xs text-gray-400 text-center">{team.name}</div>
                    </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Match-up Preview Card */}
            {homeTeam && awayTeam && (
              <div className="mt-4 p-5 rounded-xl border-2 border-slate-700 bg-slate-900/50">
                <div className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-3">Match-up Preview</div>
                <div className="flex items-center justify-center gap-12">
                  {/* Home Team */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-white p-2 mb-2">
                      {homeTeam.logo?.primary ? (
                        <img
                          src={homeTeam.logo.primary}
                          alt={homeTeam.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Shield className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="text-white font-semibold text-center">
                      {homeTeam.city} {homeTeam.name}
                    </div>
                    <div className="text-xs text-gray-400 uppercase mt-1">Home</div>
                  </div>

                  {/* VS */}
                  <div className="text-2xl font-bold text-orange-500">VS</div>

                  {/* Away Team */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-white p-2 mb-2">
                      {awayTeam.logo?.primary ? (
                        <img
                          src={awayTeam.logo.primary}
                          alt={awayTeam.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Shield className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="text-white font-semibold text-center">
                      {awayTeam.city} {awayTeam.name}
                    </div>
                    <div className="text-xs text-gray-400 uppercase mt-1">Away</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Game Context */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-white mb-3">Game Context (Optional)</h3>
        <div className="flex flex-wrap gap-2">
          {CONTEXT_PILLS.map(pill => (
            <button
              key={pill}
              onClick={() => togglePill(pill)}
              className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                contextPills.includes(pill)
                  ? 'border-orange-500 bg-orange-950/30 text-white'
                  : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700'
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Goal */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-white mb-3">Campaign Goal</h3>
        <div className="grid grid-cols-4 gap-3">
          {CAMPAIGN_GOALS.map(goal => (
            <button
              key={goal}
              onClick={() => setCampaignGoal(goal)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                campaignGoal === goal
                  ? 'border-orange-500 bg-orange-950/30'
                  : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
              }`}
            >
              <div className="text-sm font-medium text-white">{goal}</div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
