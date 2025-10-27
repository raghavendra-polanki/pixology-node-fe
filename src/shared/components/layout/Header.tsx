import { Button } from "@/shared/components/ui/button";
import { APP_NAME } from "@/shared/constants";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-lg bg-background/80">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="text-2xl font-bold gradient-text">{APP_NAME}</div>
        <Button variant="hero" size="sm">
          Get Early Access
        </Button>
      </div>
    </header>
  );
};
