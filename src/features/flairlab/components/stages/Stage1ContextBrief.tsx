import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import type { Project, ContextPill, CampaignGoal } from '../../types';

interface Stage1Props {
  project: Project;
  onNext: () => void;
  onPrevious: () => void;
  onUpdateProject: (project: Project) => void;
}

const CONTEXT_PILLS: ContextPill[] = ['Playoff Intensity', 'Rivalry', 'Holiday', 'Buzzer Beater'];
const CAMPAIGN_GOALS: CampaignGoal[] = ['Social Hype', 'Broadcast B-Roll', 'Stadium Ribbon'];

export const Stage1ContextBrief = ({ project, onNext, onUpdateProject }: Stage1Props) => {
  // Pre-populate with dummy data
  const [homeTeam, setHomeTeam] = useState(
    project.data.contextBrief?.homeTeam?.name || 'Los Angeles Lakers'
  );
  const [awayTeam, setAwayTeam] = useState(
    project.data.contextBrief?.awayTeam?.name || 'Boston Celtics'
  );
  const [selectedPills, setSelectedPills] = useState<ContextPill[]>(
    project.data.contextBrief?.contextPills || ['Rivalry', 'Playoff Intensity']
  );
  const [campaignGoal, setCampaignGoal] = useState<CampaignGoal>(
    project.data.contextBrief?.campaignGoal || 'Broadcast B-Roll'
  );

  const togglePill = (pill: ContextPill) => {
    setSelectedPills(prev =>
      prev.includes(pill) ? prev.filter(p => p !== pill) : [...prev, pill]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProject({
      ...project,
      data: {
        ...project.data,
        contextBrief: {
          homeTeam: { id: 'home', name: homeTeam },
          awayTeam: { id: 'away', name: awayTeam },
          contextPills: selectedPills,
          campaignGoal,
        },
      },
    });
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Context Brief</h2>
        <p className="text-slate-400">Define the match-up and atmospheric context for your video</p>
      </div>

      {/* Team Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Home Team */}
        <Card className="p-6 bg-slate-900/50 border-slate-800">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="homeTeam" className="text-white">Home Team</Label>
              <Input
                id="homeTeam"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                placeholder="Enter home team name"
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>
            <div className="aspect-square bg-gradient-to-br from-purple-600/20 to-yellow-600/20 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-700">
              <div className="text-center text-slate-400">
                <p className="text-sm">Team Logo</p>
                <p className="text-xs mt-1">{homeTeam}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Away Team */}
        <Card className="p-6 bg-slate-900/50 border-slate-800">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="awayTeam" className="text-white">Away Team</Label>
              <Input
                id="awayTeam"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                placeholder="Enter away team name"
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>
            <div className="aspect-square bg-gradient-to-br from-green-600/20 to-white/10 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-700">
              <div className="text-center text-slate-400">
                <p className="text-sm">Team Logo</p>
                <p className="text-xs mt-1">{awayTeam}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Context Pills */}
      <Card className="p-6 bg-slate-900/50 border-slate-800">
        <div className="space-y-4">
          <Label className="text-white">Game Context</Label>
          <p className="text-sm text-slate-400">Select all that apply to set the emotional tone</p>
          <div className="flex flex-wrap gap-3">
            {CONTEXT_PILLS.map(pill => (
              <Badge
                key={pill}
                variant={selectedPills.includes(pill) ? 'default' : 'outline'}
                className={`cursor-pointer px-4 py-2 text-sm transition-all ${
                  selectedPills.includes(pill)
                    ? 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600'
                    : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-orange-600/50'
                }`}
                onClick={() => togglePill(pill)}
              >
                {pill}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Campaign Goal */}
      <Card className="p-6 bg-slate-900/50 border-slate-800">
        <div className="space-y-4">
          <Label htmlFor="campaignGoal" className="text-white">Campaign Goal</Label>
          <p className="text-sm text-slate-400">What's the primary use case for this content?</p>
          <Select value={campaignGoal} onValueChange={(value) => setCampaignGoal(value as CampaignGoal)}>
            <SelectTrigger id="campaignGoal" className="bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAMPAIGN_GOALS.map(goal => (
                <SelectItem key={goal} value={goal}>{goal}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end pt-6 border-t border-slate-800">
        <Button
          type="submit"
          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 px-8"
          size="lg"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </form>
  );
};
