import { useColorScheme } from 'react-native';
import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import { loadTheme, saveTheme } from './storage';

const shared = {
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 50 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  fontSize: { xs: 12, sm: 13, md: 15, lg: 17, xl: 20, xxl: 28, xxxl: 34 },
};

export const lightTheme = {
  ...shared,
  colors: {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSunken: '#EBEBF0',
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
    info: '#0EA5E9',
    infoLight: '#E0F2FE',
    accent: '#AF52DE',
    accentLight: '#F6EDFD',
    overlay: 'rgba(0,0,0,0.4)',
    shadow: '#000',
    inputBg: '#F2F2F7',
    chip: '#F2F2F7',
    chipActive: '#6366F1',
    track: '#E5E5EA',
    heatEmpty: '#EBEBF0',
    tabBar: 'rgba(255,255,255,0.94)',
  },
};

export const darkTheme = {
  ...shared,
  colors: {
    background: '#000000',
    surface: '#1C1C1E',
    surfaceElevated: '#2C2C2E',
    surfaceSunken: '#141416',
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
    info: '#38BDF8',
    infoLight: '#082F49',
    accent: '#BF5AF2',
    accentLight: '#2A1039',
    overlay: 'rgba(0,0,0,0.6)',
    shadow: '#000',
    inputBg: '#1C1C1E',
    chip: '#2C2C2E',
    chipActive: '#6366F1',
    track: '#2C2C2E',
    heatEmpty: '#1F1F22',
    tabBar: 'rgba(28,28,30,0.94)',
  },
};

export const PRIORITIES = [
  { id: 'none', label: 'None', color: '#8E8E93' },
  { id: 'low', label: 'Low', color: '#34C759' },
  { id: 'medium', label: 'Medium', color: '#FF9500' },
  { id: 'high', label: 'High', color: '#FF3B30' },
];

export const CATEGORIES = [
  { id: 'personal', label: 'Personal', icon: '\u{1F3E0}' },
  { id: 'work', label: 'Work', icon: '\u{1F4BC}' },
  { id: 'shopping', label: 'Shopping', icon: '\u{1F6D2}' },
  { id: 'health', label: 'Health', icon: '\u{1F4AA}' },
  { id: 'learning', label: 'Learning', icon: '\u{1F4DA}' },
  { id: 'finance', label: 'Finance', icon: '\u{1F4B0}' },
];

/** A restrained palette - saturated enough to tell habits apart, never loud. */
export const ENTITY_COLORS = [
  '#6366F1', '#0EA5E9', '#14B8A6', '#22C55E', '#EAB308',
  '#F97316', '#EF4444', '#EC4899', '#A855F7', '#64748B',
];

export const ICON_CHOICES = [
  '\u{1F3AF}', '\u{1F4AA}', '\u{1F3C3}', '\u{1F9D8}', '\u{1F4DA}', '\u{270D}', '\u{1F4BB}',
  '\u{1F3B8}', '\u{1F3A8}', '\u{1F9E0}', '\u{1F4A7}', '\u{1F34E}', '\u{1F634}', '\u{2600}',
  '\u{1F3CB}', '\u{1F6B4}', '\u{1F3CA}', '\u{26BD}', '\u{1F5E3}', '\u{1F30D}', '\u{1F4B0}',
  '\u{1F331}', '\u{1F525}', '\u{2728}', '\u{1F680}', '\u{1F4C8}', '\u{1F3C6}', '\u{1F91D}',
];

export const HABIT_CATEGORIES = [
  { id: 'health', label: 'Health', icon: '\u{1F4AA}' },
  { id: 'mind', label: 'Mind', icon: '\u{1F9E0}' },
  { id: 'learning', label: 'Learning', icon: '\u{1F4DA}' },
  { id: 'work', label: 'Work', icon: '\u{1F4BC}' },
  { id: 'creative', label: 'Creative', icon: '\u{1F3A8}' },
  { id: 'social', label: 'Social', icon: '\u{1F91D}' },
  { id: 'finance', label: 'Finance', icon: '\u{1F4B0}' },
];

/** Blend a hex colour with an alpha channel (RN understands #RRGGBBAA). */
export function withAlpha(hex, alpha) {
  if (!hex || hex[0] !== '#') return hex;
  const base = hex.length === 9 ? hex.slice(0, 7) : hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${base}${a}`;
}

const ThemeContext = createContext(null);

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

  return { theme, isDark, toggleTheme, mode, setMode };
}

export function ThemeProvider({ children }) {
  const value = useTheme();
  const memo = useMemo(() => value, [value.theme, value.isDark, value.mode]);
  return <ThemeContext.Provider value={memo}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside <ThemeProvider>');
  return ctx;
}
