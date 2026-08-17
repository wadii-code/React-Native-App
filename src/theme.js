import { useColorScheme } from 'react-native';
import { useState, useEffect } from 'react';
import { loadTheme, saveTheme } from './storage';

const shared = {
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 50 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  fontSize: { xs: 12, sm: 13, md: 15, lg: 17, xl: 20, xxl: 28, xxxl: 34 },
};

export const lightTheme = {
  ...shared,
  colors: {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#8E8E93',
    textTertiary: '#AEAEB2',
    border: '#E5E5EA',
    borderLight: '#F2F2F7',
    primary: '#6366F1',
    primaryLight: '#EEF2FF',
    primaryDark: '#4F46E5',
    success: '#34C759',
    successLight: '#E8F8ED',
    danger: '#FF3B30',
    dangerLight: '#FFF0EF',
    warning: '#FF9500',
    warningLight: '#FFF8EC',
    overlay: 'rgba(0,0,0,0.4)',
    shadow: '#000',
    inputBg: '#F2F2F7',
    chip: '#F2F2F7',
    chipActive: '#6366F1',
  },
};

export const darkTheme = {
  ...shared,
  colors: {
    background: '#000000',
    surface: '#1C1C1E',
    surfaceElevated: '#2C2C2E',
    text: '#F2F2F7',
    textSecondary: '#8E8E93',
    textTertiary: '#636366',
    border: '#38383A',
    borderLight: '#1C1C1E',
    primary: '#818CF8',
    primaryLight: '#1E1B4B',
    primaryDark: '#6366F1',
    success: '#30D158',
    successLight: '#0A2E1C',
    danger: '#FF453A',
    dangerLight: '#3B1419',
    warning: '#FF9F0A',
    warningLight: '#332100',
    overlay: 'rgba(0,0,0,0.6)',
    shadow: '#000',
    inputBg: '#1C1C1E',
    chip: '#2C2C2E',
    chipActive: '#6366F1',
  },
};

export const PRIORITIES = [
  { id: 'none', label: 'None', color: '#8E8E93' },
  { id: 'low', label: 'Low', color: '#34C759' },
  { id: 'medium', label: 'Medium', color: '#FF9500' },
  { id: 'high', label: 'High', color: '#FF3B30' },
];

export const CATEGORIES = [
  { id: 'personal', label: 'Personal', icon: '🏠' },
  { id: 'work', label: 'Work', icon: '💼' },
  { id: 'shopping', label: 'Shopping', icon: '🛒' },
  { id: 'health', label: 'Health', icon: '💪' },
  { id: 'learning', label: 'Learning', icon: '📚' },
  { id: 'finance', label: 'Finance', icon: '💰' },
];

export function useTheme() {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState('system');

  useEffect(() => {
    loadTheme().then((m) => setMode(m));
  }, []);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    saveTheme(mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'dark';
      return isDark ? 'light' : 'dark';
    });
  };

  return { theme, isDark, toggleTheme };
}
