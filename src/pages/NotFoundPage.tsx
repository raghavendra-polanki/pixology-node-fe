import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Home } from "lucide-react";

export const NotFoundPage = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-6">
        <h1 className="mb-4 text-6xl font-bold gradient-text">404</h1>
        <p className="mb-2 text-2xl font-semibold">Page Not Found</p>
        <p className="mb-8 text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button variant="hero" size="lg" asChild>
          <a href="/">
            <Home className="w-5 h-5 mr-2" />
            Return to Home
          </a>
        </Button>
      </div>
    </div>
  );
};
