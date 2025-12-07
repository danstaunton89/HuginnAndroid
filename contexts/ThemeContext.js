import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load saved theme preference on app start
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update dark mode state when theme mode or system theme changes
  useEffect(() => {
    if (themeMode === 'system') {
      setIsDarkMode(systemColorScheme === 'dark');
    } else {
      setIsDarkMode(themeMode === 'dark');
    }
  }, [themeMode, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme) {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const setTheme = async (newThemeMode) => {
    try {
      setThemeMode(newThemeMode);
      await AsyncStorage.setItem('themeMode', newThemeMode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const toggleDarkMode = () => {
    const newMode = isDarkMode ? 'light' : 'dark';
    setTheme(newMode);
  };

  const value = {
    isDarkMode,
    themeMode,
    setTheme,
    toggleDarkMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};