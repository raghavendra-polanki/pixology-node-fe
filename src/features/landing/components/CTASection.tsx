import { Button } from "@/shared/components/ui/button";
import { ArrowRight } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
      <div className="container mx-auto px-6 relative">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to Transform <span className="gradient-text">Sports Marketing?</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join us in disrupting the multi-billion-dollar sports marketing industry.
          </p>
          <Button variant="hero" size="lg" className="group">
            Get Early Access
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};
