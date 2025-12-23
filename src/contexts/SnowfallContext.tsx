import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SnowfallContextType {
  snowfallEnabled: boolean;
  setSnowfallEnabled: (enabled: boolean) => void;
}

const SnowfallContext = createContext<SnowfallContextType | undefined>(undefined);

export function SnowfallProvider({ children }: { children: ReactNode }) {
  const [snowfallEnabled, setSnowfallEnabled] = useState(() => {
    const stored = localStorage.getItem('snowfall_enabled');
    return stored !== null ? stored === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('snowfall_enabled', String(snowfallEnabled));
  }, [snowfallEnabled]);

  return (
    <SnowfallContext.Provider value={{ snowfallEnabled, setSnowfallEnabled }}>
      {children}
    </SnowfallContext.Provider>
  );
}

export function useSnowfall() {
  const context = useContext(SnowfallContext);
  if (context === undefined) {
    throw new Error('useSnowfall must be used within a SnowfallProvider');
  }
  return context;
}
