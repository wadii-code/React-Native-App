/**
 * The design system.
 *
 * One file decides how the whole product looks: surfaces, type, colour, radius,
 * shadow and motion. Screens never invent a value - they read one from here, so
 * tasks, habits and challenges cannot drift apart visually.
 *
 * Everything the previous version exported is still exported with the same
 * shape (`colors`, `spacing`, `fontSize`, `borderRadius`), so no screen breaks.
 * What is new sits alongside it: `type`, `radius`, `shadow`, `motion`, `layer`.
 */
import { useColorScheme } from 'react-native';
import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import { loadTheme, saveTheme } from './storage';

/* ------------------------------------------------------------------ scale */

/**
 * iOS type ramp. Sizes and line heights follow the system text styles, which is
 * most of what makes text "feel" native before anyone reads a word of it.
 * Weight is the hierarchy tool here - not size, and never a border.
 */
const type = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: -0.8, lineHeight: 41 },
  title1: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6, lineHeight: 34 },
  title2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, lineHeight: 28 },
  title3: { fontSize: 20, fontWeight: '600', letterSpacing: -0.3, lineHeight: 25 },
  headline: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4, lineHeight: 22 },
  body: { fontSize: 17, fontWeight: '400', letterSpacing: -0.4, lineHeight: 22 },
  callout: { fontSize: 16, fontWeight: '400', letterSpacing: -0.3, lineHeight: 21 },
  subhead: { fontSize: 15, fontWeight: '400', letterSpacing: -0.2, lineHeight: 20 },
  subheadEmph: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, lineHeight: 20 },
  footnote: { fontSize: 13, fontWeight: '400', letterSpacing: -0.1, lineHeight: 18 },
  footnoteEmph: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0, lineHeight: 16 },
  caption2: { fontSize: 11, fontWeight: '600', letterSpacing: 0.1, lineHeight: 14 },
  /** Section headers. Uppercase and tracked, never large. */
  overline: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, lineHeight: 16 },
  /** Numbers that are meant to be read as a figure, not as prose. */
  metric: { fontSize: 28, fontWeight: '700', letterSpacing: -1, lineHeight: 32 },
  metricSm: { fontSize: 20, fontWeight: '700', letterSpacing: -0.6, lineHeight: 24 },
};

const shared = {
  type,

  /* Legacy aliases - still read by older components. */
  borderRadius: { sm: 8, md: 12, lg: 18, xl: 22, xxl: 28, pill: 999 },
  radius: { xs: 6, sm: 10, md: 14, lg: 18, xl: 22, xxl: 28, full: 999 },

  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  /** The horizontal margin every screen shares. Consistency lives here. */
  screen: 20,

  fontSize: { xs: 12, sm: 13, md: 15, lg: 17, xl: 20, xxl: 28, xxxl: 34 },

  /**
   * Short, soft, purposeful. Nothing in the app animates for longer than a
   * third of a second, because past that it stops reading as responsiveness.
   */
  motion: {
    instant: 110,
    fast: 160,
    base: 220,
    slow: 320,
    spring: { damping: 20, stiffness: 220, mass: 0.9 },
    springSoft: { damping: 26, stiffness: 170, mass: 1 },
    springSnappy: { damping: 16, stiffness: 320, mass: 0.7 },
  },

  /** Touch targets never go below this, whatever the visual size. */
  hit: { top: 10, bottom: 10, left: 10, right: 10 },
};

/* ----------------------------------------------------------------- shadow */

/**
 * Shadows here are almost subliminal. Depth comes from surface lightness first;
 * the shadow only stops a card from sitting flat on its background.
 */
function shadows(dark) {
  const o = dark ? 0.5 : 1;
  return {
    none: {},
    xs: {
      shadowColor: '#000',
      shadowOpacity: 0.04 * o,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    sm: {
      shadowColor: '#000',
      shadowOpacity: 0.06 * o,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOpacity: 0.09 * o,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 7 },
      elevation: 5,
    },
    lg: {
      shadowColor: '#000',
      shadowOpacity: 0.14 * o,
      shadowRadius: 34,
      shadowOffset: { width: 0, height: 14 },
      elevation: 12,
    },
  };
}

/* ------------------------------------------------------------------ light */

export const lightTheme = {
  ...shared,
  dark: false,
  shadow: shadows(false),
  /** Named surface layers, deepest first. Used instead of ad-hoc colours. */
  layer: {
    base: '#F4F4F7',
    raised: '#FFFFFF',
    floating: '#FFFFFF',
    sheet: '#FFFFFF',
  },
  colors: {
    background: '#F4F4F7',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSunken: '#EDEDF2',

    text: '#12131A',
    textSecondary: '#6E7180',
    textTertiary: '#9EA1AF',
    textQuaternary: '#C3C5D0',

    border: 'rgba(60,60,67,0.10)',
    borderStrong: 'rgba(60,60,67,0.17)',
    borderLight: 'rgba(60,60,67,0.055)',
    separator: 'rgba(60,60,67,0.10)',

    /* Translucent system fills - the iOS way to tint without adding a colour. */
    fill1: 'rgba(118,118,128,0.06)',
    fill2: 'rgba(118,118,128,0.10)',
    fill3: 'rgba(118,118,128,0.15)',

    primary: '#5A54E8',
    primaryLight: '#EEEDFD',
    primaryDark: '#4640C4',

    success: '#2FB865',
    successLight: '#E7F7EE',
    danger: '#E8453C',
    dangerLight: '#FDECEB',
    warning: '#F09A18',
    warningLight: '#FEF3E4',
    info: '#2E96E0',
    infoLight: '#E6F3FC',
    accent: '#9B5DE5',
    accentLight: '#F4EBFD',

    overlay: 'rgba(12,12,18,0.32)',
    shadow: '#000',

    inputBg: 'rgba(118,118,128,0.08)',
    chip: 'rgba(118,118,128,0.08)',
    chipActive: '#5A54E8',
    track: 'rgba(118,118,128,0.14)',
    heatEmpty: '#E7E7EE',

    /* Glass. Used only for chrome that floats over content. */
    glass: 'rgba(249,249,252,0.93)',
    glassBorder: 'rgba(255,255,255,0.65)',
    glassHairline: 'rgba(60,60,67,0.12)',
    tabBar: 'rgba(249,249,252,0.93)',
  },
};

/* ------------------------------------------------------------------- dark */

export const darkTheme = {
  ...shared,
  dark: true,
  shadow: shadows(true),
  layer: {
    base: '#08090C',
    raised: '#15171E',
    floating: '#1D202A',
    sheet: '#191C24',
  },
  colors: {
    background: '#08090C',
    surface: '#15171E',
    surfaceElevated: '#1D202A',
    surfaceSunken: '#0C0D11',

    text: '#F3F4F8',
    textSecondary: '#9BA1B0',
    textTertiary: '#6E7482',
    textQuaternary: '#4B505C',

    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(255,255,255,0.16)',
    borderLight: 'rgba(255,255,255,0.05)',
    separator: 'rgba(255,255,255,0.09)',

    fill1: 'rgba(120,120,128,0.14)',
    fill2: 'rgba(120,120,128,0.20)',
    fill3: 'rgba(120,120,128,0.28)',

    primary: '#8B86FF',
    primaryLight: '#221F42',
    primaryDark: '#6C66F0',

    success: '#37D07C',
    successLight: '#0E2C1D',
    danger: '#FF5A4E',
    dangerLight: '#361715',
    warning: '#FFB020',
    warningLight: '#33240A',
    info: '#4FB3F5',
    infoLight: '#0C2739',
    accent: '#B57BF0',
    accentLight: '#2A1B3D',

    overlay: 'rgba(0,0,0,0.55)',
    shadow: '#000',

    inputBg: 'rgba(120,120,128,0.16)',
    chip: 'rgba(120,120,128,0.16)',
    chipActive: '#8B86FF',
    track: 'rgba(120,120,128,0.22)',
    heatEmpty: '#1E212A',

    glass: 'rgba(19,21,27,0.94)',
    glassBorder: 'rgba(255,255,255,0.08)',
    glassHairline: 'rgba(255,255,255,0.10)',
    tabBar: 'rgba(19,21,27,0.94)',
  },
};

/* ------------------------------------------------------------- vocabulary */

export const PRIORITIES = [
  { id: 'none', label: 'None', color: '#8E8E93' },
  { id: 'low', label: 'Low', color: '#2FB865' },
  { id: 'medium', label: 'Medium', color: '#F09A18' },
  { id: 'high', label: 'High', color: '#E8453C' },
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
  '#5A54E8', '#2E96E0', '#12A8A0', '#2FB865', '#D9A414',
  '#EE7A31', '#E8453C', '#E4519A', '#9B5DE5', '#6B7183',
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

/* ---------------------------------------------------------------- helpers */

/** Blend a hex colour with an alpha channel (RN understands #RRGGBBAA). */
export function withAlpha(hex, alpha) {
  if (!hex || hex[0] !== '#') return hex;
  const base = hex.length === 9 ? hex.slice(0, 7) : hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${base}${a}`;
}

/**
 * A colour tinted toward the current surface. Used for the soft "wash" behind
 * icons and badges, which reads better than a flat alpha on dark backgrounds.
 */
export function tint(theme, color, strength = 0.12) {
  return withAlpha(color, theme.dark ? strength + 0.06 : strength);
}

/* --------------------------------------------------------------- provider */

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
