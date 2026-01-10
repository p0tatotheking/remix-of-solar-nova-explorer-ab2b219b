import { Shield, AlertTriangle, X } from 'lucide-react';

interface AgeVerificationModalProps {
  onConfirm: () => void;
  onDeny: () => void;
}

export function AgeVerificationModal({ onConfirm, onDeny }: AgeVerificationModalProps) {
  return (
    <div className="fixed inset-0 z-[200] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-destructive/10 border-b border-destructive/20 p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Age Verification Required</h1>
          <p className="text-muted-foreground">This section contains mature content</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-500 mb-1">Important Notice</p>
              <p className="text-muted-foreground">
                You must be at least 18 years old to access TV & Movies content. By continuing, you confirm that you are of legal age in your jurisdiction.
              </p>
            </div>
          </div>

          {/* Terms */}
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">By clicking "I am 18 or older", you agree to the following:</p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>I confirm that I am at least 18 years of age</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>I understand this platform is for entertainment purposes only</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>I will not use this service to access, search for, or view NSFW, pornographic, or sexually explicit content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>I understand that violations may result in immediate termination of access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>I take full responsibility for my use of this service</span>
              </li>
            </ul>
          </div>

          {/* NSFW Warning Box */}
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 mb-2">
              <X className="w-4 h-4 text-destructive" />
              <span className="font-semibold text-destructive text-sm">Strictly Prohibited</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Searching for or attempting to access adult, pornographic, nude, or sexually explicit content is strictly prohibited. 
              Any attempts to bypass content filters will result in immediate session termination.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onDeny}
            className="flex-1 px-6 py-3 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 text-foreground font-medium transition-colors"
          >
            I am under 18
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
          >
            I am 18 or older
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-muted-foreground">
            This verification is required by our Terms of Service. Your age confirmation will be stored for this session only.
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook to manage age verification state
export function useAgeVerification() {
  const STORAGE_KEY = 'tv_movies_age_verified';
  
  const isVerified = (): boolean => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  };

  const setVerified = (verified: boolean) => {
    try {
      if (verified) {
        sessionStorage.setItem(STORAGE_KEY, 'true');
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Session storage not available
    }
  };

  const handleConfirm = () => {
    setVerified(true);
  };

  const handleDeny = () => {
    // Close the site
    window.location.href = 'https://www.google.com';
  };

  return {
    isVerified,
    handleConfirm,
    handleDeny,
  };
}