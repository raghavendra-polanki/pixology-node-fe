import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, FileText, Edit2, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useStoryLabProject } from '../../hooks/useStoryLabProject';

interface ScreenplayEntry {
  id: string;
  timeStart: string;
  timeEnd: string;
  visual: string;
  audio: string;
}

interface Stage5Props {
  projectId: string;
}

const mockScreenplay: ScreenplayEntry[] = [
  {
    id: '1',
    timeStart: '0:00',
    timeEnd: '0:05',
    visual: 'Wide shot of cluttered desk. Camera slowly pushes in. Warm, natural lighting streaming through window.',
    audio: 'Ambient office sounds, keyboard typing. Soft, tense music begins.',
  },
  {
    id: '2',
    timeStart: '0:05',
    timeEnd: '0:08',
    visual: 'Close-up: Character\'s frustrated face. Eyes tired, slight head shake.',
    audio: 'VO: "Another deadline. Another mountain of work." Music builds tension.',
  },
  {
    id: '3',
    timeStart: '0:08',
    timeEnd: '0:12',
    visual: 'Over-shoulder shot. Character scrolling phone, suddenly stops. Screen reflects in their glasses.',
    audio: 'Scroll sounds. Sudden UI notification chime. Music pauses.',
  },
  {
    id: '4',
    timeStart: '0:12',
    timeEnd: '0:18',
    visual: 'Screen recording: App interface. Smooth transitions between features. Clean animations, intuitive design.',
    audio: 'VO: "Meet [Product Name] - your productivity revolution." Uplifting music starts.',
  },
  {
    id: '5',
    timeStart: '0:18',
    timeEnd: '0:23',
    visual: 'Split screen / time-lapse: Left shows messy desk, right shows organized workflow. Transition effect.',
    audio: 'VO: "From chaos to clarity in minutes." Whoosh sound effects, music crescendo.',
  },
  {
    id: '6',
    timeStart: '0:23',
    timeEnd: '0:27',
    visual: 'Medium shot: Character at clean desk, smiling, confident. Camera pulls back to reveal organized space.',
    audio: 'VO: "Take control of your day." Optimistic, inspiring music.',
  },
  {
    id: '7',
    timeStart: '0:27',
    timeEnd: '0:30',
    visual: 'Logo animation. Call-to-action text fades in: "Start your free trial today." Brand colors prominent.',
    audio: 'VO: "Visit [website] to get started." Music resolves, brand audio signature.',
  },
];

export function Stage5Screenplay({ projectId }: Stage5Props) {
  // Load project using new hook
  const { project, isSaving, updateAIScreenplay, updateScreenplayCustomizations, markStageCompleted, advanceToNextStage } =
    useStoryLabProject({ autoLoad: true, projectId });

  const [screenplay, setScreenplay] = useState<ScreenplayEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sync screenplay with project data when loaded
  useEffect(() => {
    if (project?.aiGeneratedScreenplay?.sections) {
      const entries: ScreenplayEntry[] = project.aiGeneratedScreenplay.sections.map((s, i) => ({
        id: i.toString(),
        timeStart: (s.timecode?.start as any) || '',
        timeEnd: (s.timecode?.end as any) || '',
        visual: s.visual || '',
        audio: s.audio || '',
      }));
      setScreenplay(entries);
    } else {
      setScreenplay([]);
    }
  }, [project?.aiGeneratedScreenplay]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setScreenplay(mockScreenplay);
    setIsGenerating(false);
  };

  const handleEdit = (id: string, field: keyof ScreenplayEntry, value: string) => {
    setScreenplay(screenplay.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async () => {
    try {
      // Save screenplay customizations
      if (screenplay.length > 0) {
        await updateScreenplayCustomizations({
          editedText: screenplay,
          lastEditedAt: new Date(),
        });
      }
      // Mark stage as completed
      await markStageCompleted('screenplay');
      // Advance to next stage
      await advanceToNextStage();
    } catch (error) {
      console.error('Failed to save screenplay:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-white">Create Screenplay</h2>
            <p className="text-gray-400">
              Convert your storyboard into a detailed, timed script
            </p>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      {screenplay.length === 0 && (
        <div className="mb-8">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                Generating Screenplay...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Screenplay
              </>
            )}
          </Button>
        </div>
      )}

      {/* Screenplay Table */}
      {screenplay.length > 0 && (
        <>
          <Card className="bg-[#151515] border-gray-800 rounded-xl overflow-hidden mb-8">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400 w-24">Time</TableHead>
                  <TableHead className="text-gray-400">Visual Description</TableHead>
                  <TableHead className="text-gray-400">Audio / Dialogue</TableHead>
                  <TableHead className="text-gray-400 w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {screenplay.map((entry) => (
                  <TableRow key={entry.id} className="border-gray-800">
                    {/* Time Column */}
                    <TableCell className="align-top">
                      {editingId === entry.id ? (
                        <div className="space-y-2">
                          <Input
                            value={entry.timeStart}
                            onChange={(e) => handleEdit(entry.id, 'timeStart', e.target.value)}
                            className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg text-sm"
                            placeholder="0:00"
                          />
                          <Input
                            value={entry.timeEnd}
                            onChange={(e) => handleEdit(entry.id, 'timeEnd', e.target.value)}
                            className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg text-sm"
                            placeholder="0:00"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-blue-500">{entry.timeStart}</div>
                          <div className="text-gray-600">to</div>
                          <div className="text-blue-500">{entry.timeEnd}</div>
                        </div>
                      )}
                    </TableCell>

                    {/* Visual Column */}
                    <TableCell className="align-top">
                      {editingId === entry.id ? (
                        <Textarea
                          value={entry.visual}
                          onChange={(e) => handleEdit(entry.id, 'visual', e.target.value)}
                          className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-24"
                        />
                      ) : (
                        <p className="text-gray-300 leading-relaxed">{entry.visual}</p>
                      )}
                    </TableCell>

                    {/* Audio Column */}
                    <TableCell className="align-top">
                      {editingId === entry.id ? (
                        <Textarea
                          value={entry.audio}
                          onChange={(e) => handleEdit(entry.id, 'audio', e.target.value)}
                          className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-24"
                        />
                      ) : (
                        <p className="text-gray-300 leading-relaxed">{entry.audio}</p>
                      )}
                    </TableCell>

                    {/* Actions Column */}
                    <TableCell className="align-top">
                      <Button
                        onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white rounded-lg"
                      >
                        {editingId === entry.id ? (
                          <Save className="w-4 h-4" />
                        ) : (
                          <Edit2 className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              onClick={handleGenerate}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={screenplay.length === 0 || isSaving}
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
                  Finalize Screenplay
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
