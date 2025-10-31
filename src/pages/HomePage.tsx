import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { LogOut } from 'lucide-react';

export const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  // Auto-redirect to storylab after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setRedirecting(true);
      navigate('/storylab');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleManualRedirect = () => {
    setRedirecting(true);
    navigate('/storylab');
  };

  const handleLogout = async () => {
    await logout();
    // Redirect to login page (handled by router)
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/5 flex items-center justify-center py-20 px-6">
      <div className="w-full max-w-md space-y-6">
        {/* Welcome Card */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl">
              Welcome, {user?.name}! 👋
            </CardTitle>
            <CardDescription>
              You're successfully logged in to Pixology
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* User Info Card */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-3">
                {user?.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-12 h-12 rounded-full border-2 border-primary/20"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{user?.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Redirect Info */}
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  ✨ Redirecting you to StoryLab
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  You'll be redirected to your <strong>StoryLab dashboard</strong> in {redirecting ? '0' : '3'} seconds.
                </p>
              </div>

              {/* Redirect Button */}
              <Button
                onClick={handleManualRedirect}
                size="lg"
                className="w-full"
                disabled={redirecting}
              >
                {redirecting ? 'Redirecting...' : 'Go to StoryLab Now'}
              </Button>
            </div>

            {/* Security Info */}
            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                <strong>Storage Mode:</strong> {import.meta.env.MODE === 'production' ? 'Hybrid (httpOnly Cookie + sessionStorage)' : 'sessionStorage'}
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Session Duration:</strong> {import.meta.env.MODE === 'production' ? 'Until browser closes' : 'Until tab closes'}
              </p>
            </div>

            {/* Logout Button */}
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </CardContent>
        </Card>

        {/* Info Footer */}
        <p className="text-center text-xs text-muted-foreground">
          You are logged in with Google OAuth. Your session is secure and will auto-clear.
        </p>
      </div>
    </div>
  );
};
