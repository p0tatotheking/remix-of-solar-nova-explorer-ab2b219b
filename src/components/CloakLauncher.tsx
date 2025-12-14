import { useState } from 'react';
import { ExternalLink, Monitor } from 'lucide-react';

interface CloakLauncherProps {
  onContinue: () => void;
}

export function CloakLauncher({ onContinue }: CloakLauncherProps) {
  const [isLaunching, setIsLaunching] = useState(false);

  const launchCloaked = () => {
    setIsLaunching(true);
    
    const newWindow = window.open('about:blank', '_blank');
    if (newWindow) {
      const currentUrl = window.location.href;
      
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google</title>
            <link rel="icon" href="https://www.google.com/favicon.ico">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { height: 100%; overflow: hidden; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${currentUrl}" allow="fullscreen; autoplay; encrypted-media"></iframe>
          </body>
        </html>
      `);
      newWindow.document.close();
      
      // Close the original tab
      window.close();
    }
    
    setIsLaunching(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Launch Options</h1>
          <p className="text-muted-foreground">Choose how you want to access the site</p>
        </div>

        <div className="space-y-4">
          {/* Cloaked Launch Option */}
          <button
            onClick={launchCloaked}
            disabled={isLaunching}
            className="w-full p-6 rounded-xl border border-border/50 bg-card hover:bg-accent/10 transition-all duration-300 group text-left"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <ExternalLink className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-semibold text-foreground">Launch Cloaked</h3>
                <p className="text-sm text-muted-foreground">
                  Opens in a new tab with about:blank URL. The address bar will show "about:blank" instead of the actual site URL.
                </p>
              </div>
            </div>
          </button>

          {/* Normal Launch Option */}
          <button
            onClick={onContinue}
            className="w-full p-6 rounded-xl border border-border/50 bg-card hover:bg-accent/10 transition-all duration-300 group text-left"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-muted text-muted-foreground group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                <Monitor className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-semibold text-foreground">Continue Normally</h3>
                <p className="text-sm text-muted-foreground">
                  Continue using the site in this tab with the normal URL visible.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
