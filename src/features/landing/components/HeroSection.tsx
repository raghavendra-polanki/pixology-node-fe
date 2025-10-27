import { Button } from "@/shared/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImage from "@/assets/images/hero-athlete.jpg";

export const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary animate-glow" />
              <span className="text-sm text-muted-foreground">Powered by Generative AI</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              The Future of{" "}
              <span className="gradient-text">Athlete Marketing</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Create lifelike digital avatars that move, perform, and express just like real athletes.
              Scale NIL globally without the barriers of time, travel, or cost.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" className="group">
                Join the Waitlist
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>
          <div className="relative animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl animate-glow" />
            <img
              src={heroImage}
              alt="Digital athlete avatar with AI visualization"
              className="relative rounded-2xl shadow-2xl border border-border"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
