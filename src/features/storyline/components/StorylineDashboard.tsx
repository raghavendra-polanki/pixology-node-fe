import { useAuth } from '@/shared/contexts/AuthContext'
import { LogOut, Zap } from 'lucide-react'

export const StorylineDashboard = () => {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    // Router will handle redirect to login
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative bg-slate-900 dark:bg-black backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary to-secondary flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Storyline</h1>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-white">{user.name}</p>
                  <p className="text-xs text-gray-300">{user.email}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-bold">Welcome to Storyline</h2>
            <p className="text-lg text-muted-foreground">Hi {user?.name}! 👋</p>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            The Storyline dashboard is under development. We're building something amazing for you. Stay tuned!
          </p>
        </div>
      </main>
    </div>
  )
}
