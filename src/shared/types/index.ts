// Common types used across the application

export interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export interface Benefit {
  text: string;
  color?: "primary" | "secondary";
}

export interface BenefitGroup {
  title: string;
  benefits: Benefit[];
}
