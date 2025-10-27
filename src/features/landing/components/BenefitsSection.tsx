export const BenefitsSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-transparent via-card/30 to-transparent">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold gradient-text">For Brands</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <p className="text-muted-foreground">
                  Produce authentic athlete campaigns in days, not months
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <p className="text-muted-foreground">
                  Reduce production costs by 50% compared to traditional shoots
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <p className="text-muted-foreground">
                  Scale content creation without scheduling conflicts
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-bold gradient-text">For Athletes</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-secondary mt-2 shrink-0" />
                <p className="text-muted-foreground">
                  Open new digital revenue streams without time commitment
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-secondary mt-2 shrink-0" />
                <p className="text-muted-foreground">
                  Maintain full control over your Name, Image, and Likeness
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-secondary mt-2 shrink-0" />
                <p className="text-muted-foreground">
                  Automatic credit and IP protection via blockchain verification
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
