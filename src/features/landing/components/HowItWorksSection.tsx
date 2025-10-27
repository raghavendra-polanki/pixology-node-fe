import { Zap, Shield } from "lucide-react";
import avatarImage from "@/assets/images/digital-avatar.jpg";

export const HowItWorksSection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Authentic. Scalable. <span className="gradient-text">Protected.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI captures an athlete's true essence—signature moves, expressions, and personality.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="gradient-border p-8 hover:shadow-[var(--shadow-glow)] transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-3">Computer Vision + ML</h3>
            <p className="text-muted-foreground">
              We learn each athlete's signature motion—their stride, throw, or celebration—creating
              digital twins that move with authentic precision.
            </p>
          </div>

          <div className="gradient-border p-8 hover:shadow-[var(--shadow-glow)] transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-3">Blockchain Verified</h3>
            <p className="text-muted-foreground">
              Every avatar is securely tracked on blockchain. Athletes automatically receive credit
              and maintain full IP protection.
            </p>
          </div>
        </div>

        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 blur-3xl" />
          <img
            src={avatarImage}
            alt="Digital avatar transformation visualization"
            className="relative rounded-2xl shadow-2xl mx-auto max-w-3xl w-full border border-border"
          />
        </div>
      </div>
    </section>
  );
};
