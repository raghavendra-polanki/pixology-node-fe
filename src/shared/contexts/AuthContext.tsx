import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthUser } from '@/shared/services/authService';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginWithGoogle: (token: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  canEditPrompts: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider - Manages authentication state
 * Wraps the entire application to provide auth context
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const storedUser = authService.getUser();
        const isValid = authService.isAuthenticated();

        if (storedUser && isValid) {
          // Verify with backend
          const isTokenValid = await authService.verifyToken();

          if (isTokenValid) {
            // Fetch full user profile (including role) if not already present
            if (!storedUser.role) {
              const fullProfile = await authService.fetchUserProfile();
              if (fullProfile) {
                setUser(fullProfile);
              } else {
                setUser(storedUser);
              }
            } else {
              setUser(storedUser);
            }
            setIsAuthenticated(true);
          } else {
            // Token invalid, clear auth and redirect to login
            console.log('Token verification failed, redirecting to login...');
            await authService.logout();
            setUser(null);
            setIsAuthenticated(false);

            // Redirect to login page
            window.location.href = '/login';
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setUser(null);
        setIsAuthenticated(false);

        // Redirect to login on error
        window.location.href = '/login';
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const loginWithGoogle = async (token: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.loginWithGoogle(token);

      if (!response.success) {
        setError(response.error || 'Login failed');
        return false;
      }

      if (response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  // Check if user has permission to edit prompts (Sudo User or Super User)
  const canEditPrompts = user?.role === 'Sudo User' || user?.role === 'Super User';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        loginWithGoogle,
        logout,
        clearError,
        canEditPrompts,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use Auth Context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
