import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
  systemTheme: string | undefined;
  resolvedTheme: string | undefined;
  themes: string[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

export function ThemeProvider({
  children,
  attribute: _attribute = 'class',
  defaultTheme = 'system',
  enableSystem: _enableSystem = true,
  disableTransitionOnChange: _disableTransitionOnChange = false
}: ThemeProviderProps) {
  const {
    theme,
    setTheme,
    systemTheme,
    resolvedTheme,
    themes
  } = useNextTheme();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  const value: ThemeContextType = {
    theme: theme || defaultTheme,
    setTheme,
    systemTheme,
    resolvedTheme,
    themes: themes || ['light', 'dark', 'system']
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
