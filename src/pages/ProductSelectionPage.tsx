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
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  Pixology.ai
                </h1>
                <p className="text-xs text-slate-500">AI-Powered Media Platform</p>
              </div>
            </div>

            {/* User Section */}
            <div className="flex items-center gap-4">
              {user?.picture && (
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-full px-4 py-2">
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border-2 border-blue-500/50"
                  />
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                </div>
              )}
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-slate-900 via-black to-black py-12 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
            Choose Your Workspace
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Select a product to start creating amazing AI-powered content
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-start justify-center px-6 pb-12">
        <div className="w-full max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 -mt-8">
            {/* StoryLab Card */}
            <Card className="bg-gradient-to-br from-slate-900/80 to-blue-950/40 border-slate-800/50 hover:border-blue-600/50 transition-all duration-300 group hover:shadow-2xl hover:shadow-blue-600/10 hover:-translate-y-1">
              <CardHeader className="space-y-6">
                {/* Icon */}
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Beaker className="w-8 h-8 text-white" />
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <CardTitle className="text-3xl font-bold text-white group-hover:text-blue-400 transition-colors">
                    StoryLab
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-base leading-relaxed">
                    End-to-end AI video production platform. Transform campaign briefs into polished marketing videos through automated narrative generation, AI personas, storyboarding, and multi-model video synthesis.
                  </CardDescription>
                </div>

                {/* Features */}
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></span>
                    <span className="text-slate-300">Automated narrative and screenplay generation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></span>
                    <span className="text-slate-300">Custom AI personas with visual generation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></span>
                    <span className="text-slate-300">Multi-stage storyboard-to-video pipeline</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></span>
                    <span className="text-slate-300">Support for multiple AI video models (Veo, Sora, etc.)</span>
                  </li>
                </ul>
              </CardHeader>

              <CardContent>
                <Button
                  onClick={handleNavigateToStoryLab}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 rounded-xl group-hover:shadow-lg group-hover:shadow-blue-600/20 transition-all"
                  size="lg"
                >
                  Open StoryLab
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            {/* GameLab Card */}
            <Card className="bg-gradient-to-br from-slate-900/80 to-green-950/40 border-slate-800/50 hover:border-green-500/50 transition-all duration-300 group hover:shadow-2xl hover:shadow-green-500/10 hover:-translate-y-1">
              <CardHeader className="space-y-6">
                {/* Icon */}
                <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="w-8 h-8 text-white" />
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <CardTitle className="text-3xl font-bold text-white group-hover:text-green-400 transition-colors">
                    GameLab
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-base leading-relaxed">
                    Transform static sports media assets into cinematic broadcast-ready content. Generate rights-cleared, context-aware B-roll from standard headshots with deep technical integrations.
                  </CardDescription>
                </div>

                {/* Features */}
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                    <span className="text-slate-300">Context-Aware B-Roll Generation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                    <span className="text-slate-300">Alpha Channel Support (ProRes 4444)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                    <span className="text-slate-300">Rights-Cleared Clean Data Model</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                    <span className="text-slate-300">Broadcast pipeline integration</span>
                  </li>
                </ul>
              </CardHeader>

              <CardContent>
                <Button
                  onClick={handleNavigateToGameLab}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-6 rounded-xl group-hover:shadow-lg group-hover:shadow-green-500/20 transition-all"
                  size="lg"
                >
                  Open GameLab
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © 2025 Pixology.ai. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-slate-500 hover:text-slate-300 transition-colors">
              Privacy
            </a>
            <a href="#" className="text-slate-500 hover:text-slate-300 transition-colors">
              Terms
            </a>
            <a href="#" className="text-slate-500 hover:text-slate-300 transition-colors">
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
