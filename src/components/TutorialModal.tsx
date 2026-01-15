import { useTutorial } from '@/contexts/TutorialContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';

export function TutorialModal() {
  const { 
    showTutorial, 
    currentStep, 
    steps, 
    nextStep, 
    prevStep, 
    skipTutorial 
  } = useTutorial();

  if (!showTutorial) return null;

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 p-6 text-center relative">
            <button
              onClick={skipTutorial}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-background/20 transition-colors text-muted-foreground hover:text-foreground"
              title="Skip tutorial"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Icon */}
            <div className="text-5xl mb-3">{step.icon}</div>
            
            {/* Title */}
            <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
              {step.title}
              {currentStep === 0 && <Sparkles className="w-5 h-5 text-primary animate-pulse" />}
            </h2>
            
            {/* Step indicator */}
            <p className="text-sm text-muted-foreground mt-2">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-muted-foreground text-center leading-relaxed">
              {step.description}
            </p>

            {/* Visual hints for specific steps */}
            {step.highlight === 'sidebar' && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50 text-sm text-center">
                <span className="text-primary font-medium">💡 Tip:</span> Try hovering over the left edge of the screen after this tutorial!
              </div>
            )}

            {step.id === 'friends-how' && (
              <div className="mt-4 flex justify-center gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-lg border border-green-500/30">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm text-green-400">Accept</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-destructive/20 rounded-lg border border-destructive/30">
                  <span className="text-destructive">✗</span>
                  <span className="text-sm text-destructive">Decline</span>
                </div>
              </div>
            )}

            {step.id === 'keybinds' && (
              <div className="mt-4 grid grid-cols-2 gap-2">
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
          <div className="p-4 border-t border-border flex items-center justify-between gap-3">
            <Button
              variant="ghost"
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
                  className={`w-2 h-2 rounded-full transition-colors ${
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
              onClick={nextStep}
              className="flex items-center gap-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {isLastStep ? 'Get Started' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
