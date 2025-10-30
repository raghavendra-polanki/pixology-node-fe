import { GoogleLogin } from "@react-oauth/google";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const LoginForm = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, error, clearError } = useAuth();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    clearError();
    const { credential } = credentialResponse;

    try {
      const success = await loginWithGoogle(credential);
      if (success) {
        // Redirect to home page after successful login
        navigate("/home");
      }
    } catch (err) {
      // Error is handled by auth context
    }
  };

  const handleGoogleError = () => {
    // Error is handled by auth context
  };

  return (
    <section className="relative min-h-[calc(100vh-200px)] flex items-center justify-center py-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-secondary/5 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="w-full max-w-md mx-auto">
          {/* Card container with gradient border */}
          <div className="gradient-border p-8 md:p-10">
            <div className="space-y-8">
              {/* Header section */}
              <div className="text-center space-y-4 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-primary/20 mb-4">
                  <Sparkles className="w-4 h-4 text-primary animate-glow" />
                  <span className="text-sm text-muted-foreground">
                    Powered by Generative AI
                  </span>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                  Welcome to{" "}
                  <span className="gradient-text">Pixology</span>
                </h1>

                <p className="text-lg text-muted-foreground">
                  Sign in to unlock the future of athlete marketing with AI-powered digital avatars
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Google Login Button */}
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="outline"
                    size="large"
                    text="signin_with"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-background text-muted-foreground">
                      Secure sign-in with Google
                    </span>
                  </div>
                </div>

                {/* Info text */}
                <p className="text-center text-sm text-muted-foreground">
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>

              {/* Features list */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <p className="text-sm font-semibold text-foreground text-center mb-4">
                  What you can do
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Create lifelike digital athlete avatars
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Scale NIL marketing globally
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Manage campaigns without barriers
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom accent */}
          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p>
              Questions?{" "}
              <a
                href="mailto:support@pixology.ai"
                className="text-primary hover:text-secondary transition-colors"
              >
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
