import { Layout } from "@/shared/components/layout";
import {
  HeroSection,
  VisionSection,
  HowItWorksSection,
  BenefitsSection,
  CTASection
} from "./components";

export const LandingPage = () => {
  return (
    <Layout>
      <HeroSection />
      <VisionSection />
      <HowItWorksSection />
      <BenefitsSection />
      <CTASection />
    </Layout>
  );
};
