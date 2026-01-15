import { useTutorial } from '@/contexts/TutorialContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ArrowLeft, Sparkles } from 'lucide-react';

export function TutorialOverlay() {
  const { 
    showTutorial, 
    currentStep, 
    steps, 
    nextStep, 
    prevStep, 
    skipTutorial,
    actionCompleted,
  } = useTutorial();

  if (!showTutorial) return null;

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const canProceed = !step.requiresAction || actionCompleted;

  // Determine if we need the arrow pointing to left edge
  const showLeftArrow = step.targetSelector === '.tutorial-sidebar-trigger' && !actionCompleted;

  return (
    <>
      {/* Semi-transparent overlay - but allows interaction */}
      <div className="fixed inset-0 z-[90] pointer-events-none">
        {/* Left edge highlight when needed */}
        {showLeftArrow && (
          <div className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none">
            {/* Pulsing glow effect on left edge */}
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-primary/40 to-transparent animate-pulse" />
            
            {/* Arrow pointing to left edge */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center gap-2 animate-bounce-horizontal">
              <ArrowLeft className="w-8 h-8 text-primary drop-shadow-lg" />
              <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg">
                Hover here!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tutorial tooltip card */}
      <div 
        className={`fixed z-[100] transition-all duration-300 ${
          step.position === 'center' 
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : step.position === 'right'
              ? 'top-1/2 left-24 -translate-y-1/2'
              : 'top-1/2 right-8 -translate-y-1/2'
        }`}
      >
        <div className="w-80 md:w-96 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 p-4 relative">
            <button
              onClick={skipTutorial}
              className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-background/20 transition-colors text-muted-foreground hover:text-foreground"
              title="Skip tutorial"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2">
              {isFirstStep && <Sparkles className="w-5 h-5 text-primary animate-pulse" />}
              <h2 className="text-lg font-bold text-foreground">{step.title}</h2>
            </div>
            
            <p className="text-xs text-muted-foreground mt-1">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>

            {/* Action instruction */}
            <div className={`p-3 rounded-lg border text-sm font-medium flex items-center gap-2 ${
              actionCompleted 
                ? 'bg-green-500/10 border-green-500/30 text-green-500'
                : 'bg-primary/10 border-primary/30 text-primary'
            }`}>
              {actionCompleted ? (
                <>
                  <span>✓</span>
                  <span>Done! Click Next to continue</span>
                </>
              ) : (
                <span>{step.action}</span>
              )}
            </div>

            {/* Visual hints for friend requests */}
            {step.id === 'friend-requests' && (
              <div className="flex justify-center gap-3 pt-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-lg border border-green-500/30">
                  <span className="text-green-500">✓</span>
                  <span className="text-xs text-green-400">Accept</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-destructive/20 rounded-lg border border-destructive/30">
                  <span className="text-destructive">✗</span>
                  <span className="text-xs text-destructive">Decline</span>
                </div>
              </div>
            )}

            {/* Keybinds visual */}
            {step.id === 'keybinds' && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2 bg-muted/50 rounded-lg text-center">
                  <kbd className="px-2 py-1 bg-background rounded text-xs font-mono">R</kbd>
                  <p className="text-xs text-muted-foreground mt-1">Panic Button</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg text-center">
                  <kbd className="px-2 py-1 bg-background rounded text-xs font-mono">G</kbd>
                  <p className="text-xs text-muted-foreground mt-1">Exit Fullscreen</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="p-3 border-t border-border flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevStep}
              disabled={isFirstStep}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    index === currentStep 
                      ? 'bg-primary' 
                      : index < currentStep 
                        ? 'bg-primary/50' 
                        : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <Button
              size="sm"
              onClick={nextStep}
              disabled={!canProceed}
              className={`flex items-center gap-1 ${
                canProceed 
                  ? 'bg-gradient-to-r from-primary to-accent hover:opacity-90' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Custom CSS for horizontal bounce animation */}
      <style>{`
        @keyframes bounce-horizontal {
          0%, 100% { transform: translateX(0) translateY(-50%); }
          50% { transform: translateX(-10px) translateY(-50%); }
        }
        .animate-bounce-horizontal {
          animation: bounce-horizontal 1s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
