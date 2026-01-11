import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemePreset = 'purple' | 'blue' | 'green' | 'red' | 'orange' | 'pink' | 'cyan' | 'midnight';

export interface CustomBackground {
  type: 'none' | 'image' | 'video';
  url: string;
}

interface ThemeColors {
  primary: string;
  primaryHue: number;
  secondary: string;
  secondaryHue: number;
  accent: string;
  accentHue: number;
}

const THEME_PRESETS: Record<ThemePreset, ThemeColors> = {
  purple: {
    primary: '270 70% 50%',
    primaryHue: 270,
    secondary: '330 70% 50%',
    secondaryHue: 330,
    accent: '330 70% 50%',
    accentHue: 330,
  },
  blue: {
    primary: '220 70% 50%',
    primaryHue: 220,
    secondary: '260 70% 50%',
    secondaryHue: 260,
    accent: '260 70% 50%',
    accentHue: 260,
  },
  green: {
    primary: '150 70% 40%',
    primaryHue: 150,
    secondary: '180 70% 45%',
    secondaryHue: 180,
    accent: '180 70% 45%',
    accentHue: 180,
  },
  red: {
    primary: '0 70% 50%',
    primaryHue: 0,
    secondary: '330 70% 50%',
    secondaryHue: 330,
    accent: '330 70% 50%',
    accentHue: 330,
  },
  orange: {
    primary: '25 95% 53%',
    primaryHue: 25,
    secondary: '45 95% 55%',
    secondaryHue: 45,
    accent: '45 95% 55%',
    accentHue: 45,
  },
  pink: {
    primary: '330 70% 55%',
    primaryHue: 330,
    secondary: '280 70% 55%',
    secondaryHue: 280,
    accent: '280 70% 55%',
    accentHue: 280,
  },
  cyan: {
    primary: '185 70% 45%',
    primaryHue: 185,
    secondary: '200 70% 50%',
    secondaryHue: 200,
    accent: '200 70% 50%',
    accentHue: 200,
  },
  midnight: {
    primary: '240 50% 45%',
    primaryHue: 240,
    secondary: '260 50% 40%',
    secondaryHue: 260,
    accent: '260 50% 40%',
    accentHue: 260,
  },
};

interface ThemeContextType {
  currentTheme: ThemePreset;
  setCurrentTheme: (theme: ThemePreset) => void;
  customBackground: CustomBackground;
  setCustomBackground: (bg: CustomBackground) => void;
  glassEnabled: boolean;
  setGlassEnabled: (enabled: boolean) => void;
  themePresets: typeof THEME_PRESETS;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'solarnova_theme';
const BG_STORAGE_KEY = 'solarnova_custom_bg';
const GLASS_STORAGE_KEY = 'solarnova_glass_enabled';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemePreset>('purple');
  const [customBackground, setCustomBackground] = useState<CustomBackground>({ type: 'none', url: '' });
  const [glassEnabled, setGlassEnabled] = useState(true);

  // Load saved settings on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemePreset | null;
    if (savedTheme && THEME_PRESETS[savedTheme]) {
      setCurrentTheme(savedTheme);
    }

    const savedBg = localStorage.getItem(BG_STORAGE_KEY);
    if (savedBg) {
      try {
        setCustomBackground(JSON.parse(savedBg));
      } catch {
        // Invalid JSON
      }
    }

    const savedGlass = localStorage.getItem(GLASS_STORAGE_KEY);
    if (savedGlass !== null) {
      setGlassEnabled(savedGlass === 'true');
    }
  }, []);

  // Apply theme colors to CSS variables
  useEffect(() => {
    const colors = THEME_PRESETS[currentTheme];
    const root = document.documentElement;

    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--ring', colors.primary);
    root.style.setProperty('--card', `${colors.primaryHue} 50% 8%`);
    root.style.setProperty('--popover', `${colors.primaryHue} 50% 8%`);
    root.style.setProperty('--muted', `${colors.primaryHue} 30% 20%`);
    root.style.setProperty('--muted-foreground', `${colors.primaryHue} 10% 60%`);
    root.style.setProperty('--border', `${colors.primaryHue} 50% 30%`);
    root.style.setProperty('--input', `${colors.primaryHue} 50% 20%`);

    // Update gradient CSS variables
    root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${colors.primary}), hsl(${colors.secondary}))`);
    root.style.setProperty('--gradient-hero', `linear-gradient(to right, hsl(${colors.primaryHue}, 70%, 60%), hsl(${colors.secondaryHue}, 70%, 55%), hsl(${colors.primaryHue}, 70%, 55%))`);
    root.style.setProperty('--gradient-card', `linear-gradient(to bottom right, hsl(${colors.primaryHue}, 50%, 15%, 0.5), hsl(0, 0%, 0%))`);
    root.style.setProperty('--gradient-bg', `linear-gradient(to bottom right, hsl(${colors.primaryHue}, 50%, 15%, 0.2), hsl(0, 0%, 0%), hsl(${colors.secondaryHue}, 50%, 15%, 0.2))`);
    root.style.setProperty('--shadow-glow', `0 0 40px hsl(${colors.primary} / 0.4)`);
    root.style.setProperty('--shadow-card', `0 25px 50px -12px hsl(${colors.primary} / 0.5)`);

    localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
  }, [currentTheme]);

  // Save custom background
  useEffect(() => {
    localStorage.setItem(BG_STORAGE_KEY, JSON.stringify(customBackground));
  }, [customBackground]);

  // Save glass setting
  useEffect(() => {
    localStorage.setItem(GLASS_STORAGE_KEY, String(glassEnabled));
  }, [glassEnabled]);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setCurrentTheme,
        customBackground,
        setCustomBackground,
        glassEnabled,
        setGlassEnabled,
        themePresets: THEME_PRESETS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
