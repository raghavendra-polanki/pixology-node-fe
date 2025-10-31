/**
 * Auth Service - Handles Google OAuth and token management
 *
 * Storage Strategy:
 * - Development: sessionStorage (simple, reasonably secure)
 * - Production: Hybrid mode (httpOnly Cookie + sessionStorage)
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  authToken?: string;
  expiresIn?: number;
  error?: string;
}

interface StoredAuthData {
  user: AuthUser;
  expiresAt: number;
}

class AuthService {
  private apiBaseUrl: string;
  private isProduction: boolean;

  constructor(apiBaseUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3000') {
    this.apiBaseUrl = apiBaseUrl;
    this.isProduction = import.meta.env.MODE === 'production';
  }

  /**
   * Send Google token to backend for validation and get auth token
   *
   * Production: Backend sets httpOnly cookie automatically
   * Development: Returns token in response for sessionStorage
   */
  async loginWithGoogle(googleToken: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in request (for production)
        body: JSON.stringify({ token: googleToken }),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Login failed',
        };
      }

      if (data.user && data.authToken) {
        this.storeAuthData(data.user, data.authToken, data.expiresIn || 3600);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Failed to communicate with server',
      };
    }
  }

  /**
   * Store auth data
   * - Development: Token + user data in sessionStorage
   * - Production: Token + user data in sessionStorage, plus httpOnly cookie (set by backend)
   */
  private storeAuthData(user: AuthUser, token: string, expiresIn: number): void {
    const expiresAt = Date.now() + expiresIn * 1000;

    // Store token in sessionStorage for Authorization header (both dev and prod)
    sessionStorage.setItem('authToken', token);

    // Store user and expiry
    sessionStorage.setItem('authUser', JSON.stringify(user));
    sessionStorage.setItem('authExpiry', expiresAt.toString());

    if (!this.isProduction) {
      // Development: Also store in authData for backward compatibility
      const authData: StoredAuthData = {
        user,
        expiresAt,
      };
      sessionStorage.setItem('authData', JSON.stringify(authData));
    }
  }

  /**
   * Get auth token
   * - Development & Production: From sessionStorage
   * - Browser also automatically sends httpOnly cookie (for extra security)
   */
  getToken(): string | null {
    return sessionStorage.getItem('authToken');
  }

  /**
   * Get user data
   */
  getUser(): AuthUser | null {
    const userJson = sessionStorage.getItem('authUser');
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Check if user is authenticated and token is valid
   */
  isAuthenticated(): boolean {
    const expiresAt = this.getTokenExpiry();
    if (!expiresAt) return false;
    return Date.now() < expiresAt;
  }

  /**
   * Get token expiry time
   */
  private getTokenExpiry(): number | null {
    const expiry = sessionStorage.getItem('authExpiry');
    return expiry ? parseInt(expiry, 10) : null;
  }

  /**
   * Verify token with backend
   */
  async verifyToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      const headers: HeadersInit = {};

      // Add token to Authorization header (both dev and prod)
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.apiBaseUrl}/api/auth/verify`, {
        method: 'GET',
        headers,
        credentials: 'include', // Include cookies for httpOnly cookie
      });

      const data = await response.json();
      return data.success && data.authenticated;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  /**
   * Logout - clear all auth data
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${this.apiBaseUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Clear httpOnly cookie in production
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthData();
    }
  }

  /**
   * Clear all stored auth data
   */
  private clearAuthData(): void {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');
    sessionStorage.removeItem('authExpiry');
    sessionStorage.removeItem('authData'); // For backward compatibility
  }

  /**
   * Get environment mode
   */
  getMode(): string {
    return this.isProduction ? 'production (hybrid: httpOnly + sessionStorage)' : 'development (sessionStorage)';
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export class for testing or custom instances
export default AuthService;
