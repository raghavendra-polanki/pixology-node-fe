import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Beaker, ArrowRight, LogOut, Sparkles, TrendingUp, Users, Zap } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';

export const ProductSelectionPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleNavigateToStoryLab = () => {
    navigate('/storylab');
  };

  const handleNavigateToGameLab = () => {
    navigate('/gamelab');
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#151515]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Pixology.ai
                </h1>
                <p className="text-xs text-gray-500">AI-Powered Media Platform</p>
              </div>
            </div>

            {/* User Section */}
            <div className="flex items-center gap-4">
              {user?.picture && (
                <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-4 py-2">
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
              )}
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="py-12 px-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <h2 className="text-4xl font-bold text-white">
            Choose Your Workspace
          </h2>
          <p className="text-base text-gray-400 max-w-2xl mx-auto">
            Select a product to start creating AI-powered content
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-start justify-center px-6 pb-12">
        <div className="w-full max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* StoryLab Card */}
            <Card className="bg-[#151515] border-gray-800 hover:border-gray-700 transition-all group">
              <CardHeader className="space-y-4">
                {/* Icon */}
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Beaker className="w-6 h-6 text-white" />
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold">
                    <span className="text-white">Story</span>
                    <span className="text-blue-500">Lab</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-sm">
                    End-to-end AI video production platform. Transform campaign briefs into polished marketing videos through automated narrative generation, AI personas, storyboarding, and multi-model video synthesis.
                  </CardDescription>
                </div>

                {/* Features */}
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0"></span>
                    <span className="text-gray-300">Automated narrative and screenplay generation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0"></span>
                    <span className="text-gray-300">Custom AI personas with visual generation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0"></span>
                    <span className="text-gray-300">Multi-stage storyboard-to-video pipeline</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0"></span>
                    <span className="text-gray-300">Support for multiple AI video models (Veo, Sora, etc.)</span>
                  </li>
                </ul>
              </CardHeader>

              <CardContent>
                <Button
                  onClick={handleNavigateToStoryLab}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  size="lg"
                >
                  Open StoryLab
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            {/* GameLab Card */}
            <Card className="bg-[#151515] border-gray-800 hover:border-gray-700 transition-all group">
              <CardHeader className="space-y-4">
                {/* Icon */}
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold">
                    <span className="text-white">Game</span>
                    <span className="text-green-400">Lab</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-sm">
                    Transform static sports media assets into cinematic broadcast-ready content. Generate rights-cleared, context-aware B-roll from standard headshots with deep technical integrations.
                  </CardDescription>
                </div>

                {/* Features */}
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                    <span className="text-gray-300">Context-Aware B-Roll Generation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                    <span className="text-gray-300">Alpha Channel Support (ProRes 4444)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                    <span className="text-gray-300">Rights-Cleared Clean Data Model</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                    <span className="text-gray-300">Broadcast pipeline integration</span>
                  </li>
                </ul>
              </CardHeader>

              <CardContent>
                <Button
                  onClick={handleNavigateToGameLab}
                  className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg"
                  size="lg"
                >
                  Open GameLab
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 bg-[#151515]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © 2025 Pixology.ai. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors">
              Privacy
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors">
              Terms
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors">
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
