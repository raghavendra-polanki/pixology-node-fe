import { ReactNode } from "react";
import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";

interface UIProviderProps {
  children: ReactNode;
}

export const UIProvider = ({ children }: UIProviderProps) => {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {children}
    </TooltipProvider>
  );
};
