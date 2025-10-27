import { APP_NAME, APP_TAGLINE, CURRENT_YEAR } from "@/shared/constants";

export const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-2xl font-bold gradient-text">{APP_NAME}</div>
          <p className="text-sm text-muted-foreground">
            © {CURRENT_YEAR} Pixology. {APP_TAGLINE}
          </p>
        </div>
      </div>
    </footer>
  );
};
