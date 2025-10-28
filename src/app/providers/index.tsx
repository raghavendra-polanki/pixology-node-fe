import { ReactNode } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryProvider } from "./QueryProvider";
import { UIProvider } from "./UIProvider";

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryProvider>
        <UIProvider>
          {children}
        </UIProvider>
      </QueryProvider>
    </GoogleOAuthProvider>
  );
};
