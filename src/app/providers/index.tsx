import { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";
import { UIProvider } from "./UIProvider";

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <QueryProvider>
      <UIProvider>
        {children}
      </UIProvider>
    </QueryProvider>
  );
};
