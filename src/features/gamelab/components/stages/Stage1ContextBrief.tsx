import { useState } from 'react';
import { ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { GameLabProject, ContextPill, CampaignGoal, CreateProjectInput } from '../../types/project.types';

interface Stage1Props {
  project: GameLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<GameLabProject | null>;
  loadProject: (projectId: string) => Promise<GameLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<GameLabProject | null>;
  updateContextBrief: (contextBrief: any, projectId?: string) => Promise<GameLabProject | null>;
}

const TEAMS = [
  {
    id: 'colorado',
    name: 'Colorado',
    subtitle: 'Avalanche',
    emoji: '🏔️',
    color: 'from-blue-600 to-lime-400',
    logo: '/images/teams/colorado-avalanche.png'
  },
  {
    id: 'tampa',
    name: 'Tampa Bay',
    subtitle: 'Lightning',
    emoji: '⚡',
    color: 'from-blue-500 to-blue-700',
    logo: '/images/teams/tampa-bay-lightning.png'
  },
  {
    id: 'boston',
    name: 'Boston',
    subtitle: 'Bruins',
    emoji: '🐻',
    color: 'from-yellow-600 to-black',
    logo: '/images/teams/boston-bruins.png'
  },
  {
    id: 'toronto',
    name: 'Toronto',
    subtitle: 'Maple Leafs',
    emoji: '🍁',
    color: 'from-blue-600 to-white',
    logo: '/images/teams/toronto-maple-leafs.png'
  },
];

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
  const [homeTeam, setHomeTeam] = useState(TEAMS[0].id);
  const [awayTeam, setAwayTeam] = useState(TEAMS[1].id);
  const [contextPills, setContextPills] = useState<string[]>(['Playoff Intensity', 'Rivalry Game']);
  const [campaignGoal, setCampaignGoal] = useState('Broadcast B-Roll');
  const [isSaving, setIsSaving] = useState(false);

  const togglePill = (pill: string) => {
    setContextPills(prev =>
      prev.includes(pill) ? prev.filter(p => p !== pill) : [...prev, pill]
    );
  };

  const handleContinue = async () => {
    try {
      setIsSaving(true);

      const contextBriefData = {
        homeTeam: {
          id: homeTeam,
          name: TEAMS.find(t => t.id === homeTeam)?.name || '',
          logoUrl: TEAMS.find(t => t.id === homeTeam)?.logo,
        },
        awayTeam: {
          id: awayTeam,
          name: TEAMS.find(t => t.id === awayTeam)?.name || '',
          logoUrl: TEAMS.find(t => t.id === awayTeam)?.logo,
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
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg text-white">Setup Project</h2>
            <p className="text-sm text-gray-400">Define the match-up and game context</p>
          </div>
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
          className="bg-[#151515] border-gray-800 text-white placeholder:text-gray-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/50"
        />
      </div>

      {/* Match-up Section */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-white mb-3">Match-up</h3>

        {/* Team Grid */}
        <div className="grid grid-cols-2 gap-6 mb-5">
          <div>
            <div className="text-xs text-slate-500 uppercase mb-2">Home Team</div>
            <div className="grid grid-cols-2 gap-3">
              {TEAMS.map(team => {
                const isDisabled = team.id === awayTeam;
                return (
                <button
                  key={`home-${team.id}`}
                  onClick={() => !isDisabled && setHomeTeam(team.id)}
                  disabled={isDisabled}
                  className={`relative p-3 rounded-xl border-2 transition-all overflow-hidden ${
                    homeTeam === team.id
                      ? 'border-emerald-500 ring-2 ring-emerald-500'
                      : isDisabled
                      ? 'border-gray-800 bg-[#151515] opacity-40 cursor-not-allowed'
                      : 'border-gray-800 bg-[#151515] hover:border-gray-700'
                  }`}
                >
                  {team.logo && (
                    <div className="w-20 h-20 mx-auto mb-2 rounded-lg flex items-center justify-center bg-white p-2">
                      <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="text-sm font-semibold text-white text-center">{team.name}</div>
                  <div className="text-xs text-gray-400 text-center">{team.subtitle}</div>
                </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 uppercase mb-2">Away Team</div>
            <div className="grid grid-cols-2 gap-3">
              {TEAMS.map(team => {
                const isDisabled = team.id === homeTeam;
                return (
                <button
                  key={`away-${team.id}`}
                  onClick={() => !isDisabled && setAwayTeam(team.id)}
                  disabled={isDisabled}
                  className={`relative p-3 rounded-xl border-2 transition-all overflow-hidden ${
                    awayTeam === team.id
                      ? 'border-emerald-500 ring-2 ring-emerald-500'
                      : isDisabled
                      ? 'border-gray-800 bg-[#151515] opacity-40 cursor-not-allowed'
                      : 'border-gray-800 bg-[#151515] hover:border-gray-700'
                  }`}
                >
                  {team.logo && (
                    <div className="w-20 h-20 mx-auto mb-2 rounded-lg flex items-center justify-center bg-white p-2">
                      <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="text-sm font-semibold text-white text-center">{team.name}</div>
                  <div className="text-xs text-gray-400 text-center">{team.subtitle}</div>
                </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Match-up Preview Card */}
        <div className="mt-4 p-5 rounded-xl border-2 border-slate-700 bg-slate-900/50">
          <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-3">Match-up Preview</div>
          <div className="flex items-center justify-center gap-12">
            {/* Home Team */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-white p-2 mb-2">
                <img
                  src={TEAMS.find(t => t.id === homeTeam)?.logo}
                  alt={TEAMS.find(t => t.id === homeTeam)?.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-white font-semibold text-center">
                {TEAMS.find(t => t.id === homeTeam)?.name} {TEAMS.find(t => t.id === homeTeam)?.subtitle}
              </div>
              <div className="text-xs text-gray-400 uppercase mt-1">Home</div>
            </div>

            {/* VS */}
            <div className="text-2xl font-bold text-emerald-500">VS</div>

            {/* Away Team */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-white p-2 mb-2">
                <img
                  src={TEAMS.find(t => t.id === awayTeam)?.logo}
                  alt={TEAMS.find(t => t.id === awayTeam)?.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-white font-semibold text-center">
                {TEAMS.find(t => t.id === awayTeam)?.name} {TEAMS.find(t => t.id === awayTeam)?.subtitle}
              </div>
              <div className="text-xs text-gray-400 uppercase mt-1">Away</div>
            </div>
          </div>
        </div>
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
                  ? 'border-emerald-600 bg-orange-950/30 text-white'
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
                  ? 'border-emerald-600 bg-orange-950/30'
                  : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
              }`}
            >
              <div className="text-sm font-medium text-white">{goal}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={!projectName.trim() || isSaving}
          className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl"
          size="lg"
        >
          {isSaving ? 'Saving...' : 'Continue to Themes'}
          {!isSaving && <ArrowRight className="w-5 h-5 ml-2" />}
        </Button>
      </div>
    </div>
  );
};
