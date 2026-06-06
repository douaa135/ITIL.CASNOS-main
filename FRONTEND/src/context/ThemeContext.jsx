import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Récupérer la préférence sauvegardée ou utiliser la préférence système
    const saved = localStorage.getItem('theme-mode');
    if (saved) {
      return saved === 'dark';
    }
    return false;
  });

  useEffect(() => {
    // Sauvegarder la préférence
    localStorage.setItem('theme-mode', isDarkMode ? 'dark' : 'light');
    
    // Appliquer le thème au document
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark-mode');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark-mode');
      root.style.colorScheme = 'light';
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return false;
};
