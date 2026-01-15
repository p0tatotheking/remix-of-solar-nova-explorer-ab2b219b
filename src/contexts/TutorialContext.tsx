import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  highlight?: string; // CSS selector or section name to highlight
}

interface TutorialContextType {
  showTutorial: boolean;
  currentStep: number;
  steps: TutorialStep[];
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  hasCompletedTutorial: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const TUTORIAL_STORAGE_KEY = 'solarnova_tutorial_completed';

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Solarnova! 🌟',
    description: 'This quick tutorial will show you around the app. Let\'s get started!',
    icon: '👋',
  },
  {
    id: 'sidebar',
    title: 'Navigation Sidebar',
    description: 'Hover over the left edge of the screen (or tap "More" on mobile) to reveal the sidebar. This is your main navigation hub for all sections.',
    icon: '📱',
    highlight: 'sidebar',
  },
  {
    id: 'home',
    title: 'Home Dashboard',
    description: 'The Home section shows your dashboard with quick stats and recent activity. It\'s your starting point every time you visit.',
    icon: '🏠',
    highlight: 'home',
  },
  {
    id: 'games',
    title: 'Games Section',
    description: 'Browse and play a variety of games! Click on any game card to play. Some games open in a new tab, others are embedded right here.',
    icon: '🎮',
    highlight: 'games',
  },
  {
    id: 'youtube',
    title: 'YouTube & TV',
    description: 'Watch YouTube videos and TV shows directly in the app. Use the search bar to find content.',
    icon: '📺',
    highlight: 'youtube',
  },
  {
    id: 'music',
    title: 'Music Player',
    description: 'Listen to music while browsing! The mini player stays visible so you can control playback from anywhere.',
    icon: '🎵',
    highlight: 'music',
  },
  {
    id: 'chatroom',
    title: 'Chatroom & Friends',
    description: 'Chat with other users in the public chatroom or send direct messages to friends. You can also create private group chats!',
    icon: '💬',
    highlight: 'chatroom',
  },
  {
    id: 'friends-intro',
    title: 'Friend System',
    description: 'In the Chatroom, you can add friends, send direct messages, and see who\'s online. Let\'s learn how friend requests work!',
    icon: '👥',
  },
  {
    id: 'friends-how',
    title: 'Accepting Friend Requests',
    description: 'When someone sends you a friend request, a notification will pop up in the top-right corner. Click the ✓ button to accept or ✗ to decline. You can also find pending requests in the sidebar of the Chatroom.',
    icon: '✉️',
  },
  {
    id: 'friends-admin',
    title: 'You\'re Connected with Admin!',
    description: 'Good news! You\'re already friends with the Admin account. This means you can message them directly if you need help or want to report issues.',
    icon: '🤝',
  },
  {
    id: 'settings',
    title: 'Settings & Customization',
    description: 'Personalize your experience in Settings! Change themes, set custom backgrounds, enable snowfall effects, and more.',
    icon: '⚙️',
    highlight: 'settings',
  },
  {
    id: 'keybinds',
    title: 'Keyboard Shortcuts',
    description: 'Press R for panic button (redirects to Google), G or F11 to exit fullscreen. These work everywhere except the chatroom.',
    icon: '⌨️',
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🎉',
    description: 'That\'s everything! Enjoy using Solarnova. If you ever need help, check the Announcements section or message the Admin.',
    icon: '🚀',
  },
];

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(true);

  // Check if user has completed tutorial
  useEffect(() => {
    if (!user) return;
    
    const completedUsers = JSON.parse(localStorage.getItem(TUTORIAL_STORAGE_KEY) || '[]');
    const hasCompleted = completedUsers.includes(user.id);
    
    setHasCompletedTutorial(hasCompleted);
    
    // Show tutorial if not completed
    if (!hasCompleted) {
      // Small delay to let the app load first
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const markTutorialComplete = () => {
    if (!user) return;
    
    const completedUsers = JSON.parse(localStorage.getItem(TUTORIAL_STORAGE_KEY) || '[]');
    if (!completedUsers.includes(user.id)) {
      completedUsers.push(user.id);
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(completedUsers));
    }
    setHasCompletedTutorial(true);
    setShowTutorial(false);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipTutorial = () => {
    markTutorialComplete();
  };

  const completeTutorial = () => {
    markTutorialComplete();
  };

  return (
    <TutorialContext.Provider
      value={{
        showTutorial,
        currentStep,
        steps: tutorialSteps,
        nextStep,
        prevStep,
        skipTutorial,
        completeTutorial,
        hasCompletedTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
