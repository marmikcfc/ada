/**
 * Comprehensive theme definitions with complete token coverage
 * This file contains holistic themes that handle every UI element:
 * - All typography (headings, body, labels, code)
 * - Complete color system (states, interactions, brand)
 * - Full spacing and sizing scales
 * - Shadows and effects
 * - Crayon UI integration
 */

import { ThemeTokens } from '../types';

/**
 * Base typography configuration shared across themes
 */
const baseTypography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  fontFamilyMono: '"Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro", monospace',
  
  fontSize: {
    '3xs': '0.625rem',  // 10px
    '2xs': '0.6875rem', // 11px
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    md: '1rem',         // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },
  
  fontWeight: {
    thin: 100,
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
    loose: '2',
  },
  
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
  
  // Predefined text styles
  heading: {
    h1: {
      fontSize: '3rem',    // 48px
      fontWeight: 700,
      lineHeight: '1.25',
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2.25rem', // 36px
      fontWeight: 700,
      lineHeight: '1.25',
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.875rem', // 30px
      fontWeight: 600,
      lineHeight: '1.25',
      letterSpacing: '0',
    },
    h4: {
      fontSize: '1.5rem',  // 24px
      fontWeight: 600,
      lineHeight: '1.25',
      letterSpacing: '0',
    },
    h5: {
      fontSize: '1.25rem', // 20px
      fontWeight: 600,
      lineHeight: '1.25',
      letterSpacing: '0',
    },
    h6: {
      fontSize: '1.125rem', // 18px
      fontWeight: 600,
      lineHeight: '1.25',
      letterSpacing: '0',
    },
  },
  
  body: {
    large: {
      fontSize: '1.125rem', // 18px
      fontWeight: 400,
      lineHeight: '1.75',
      letterSpacing: '0',
    },
    medium: {
      fontSize: '1rem',     // 16px
      fontWeight: 400,
      lineHeight: '1.5',
      letterSpacing: '0',
    },
    small: {
      fontSize: '0.875rem', // 14px
      fontWeight: 400,
      lineHeight: '1.5',
      letterSpacing: '0',
    },
  },
  
  label: {
    large: {
      fontSize: '1rem',     // 16px
      fontWeight: 500,
      lineHeight: '1.5',
      letterSpacing: '0',
    },
    medium: {
      fontSize: '0.875rem', // 14px
      fontWeight: 500,
      lineHeight: '1.5',
      letterSpacing: '0',
    },
    small: {
      fontSize: '0.75rem',  // 12px
      fontWeight: 500,
      lineHeight: '1.5',
      letterSpacing: '0.025em',
    },
  },
  
  code: {
    fontSize: '0.875rem',  // 14px
    fontWeight: 400,
    fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro", monospace',
    lineHeight: '1.5',
    letterSpacing: '0',
  },
};

/**
 * Base spacing scale
 */
const baseSpacing = {
  '0': '0',
  '3xs': '0.125rem',  // 2px
  '2xs': '0.25rem',   // 4px
  xs: '0.5rem',       // 8px
  sm: '0.75rem',      // 12px
  md: '1rem',         // 16px
  lg: '1.5rem',       // 24px
  xl: '2rem',         // 32px
  '2xl': '3rem',      // 48px
  '3xl': '4rem',      // 64px
};

/**
 * Base border radius scale
 */
const baseBorderRadius = {
  none: '0',
  '3xs': '0.125rem',  // 2px
  '2xs': '0.25rem',   // 4px
  xs: '0.375rem',     // 6px
  sm: '0.5rem',       // 8px
  md: '0.75rem',      // 12px
  lg: '1rem',         // 16px
  xl: '1.5rem',       // 24px
  '2xl': '2rem',      // 32px
  '3xl': '3rem',      // 48px
  full: '9999px',
};

/**
 * Base shadows
 */
const baseShadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
};

/**
 * Base effects
 */
const baseEffects = {
  backdropBlur: 'blur(8px)',
  transition: 'all 0.2s ease-in-out',
  transitionFast: 'all 0.1s ease-in-out',
  transitionSlow: 'all 0.3s ease-in-out',
};

/**
 * Comprehensive Light Theme
 */
export const comprehensiveLightTheme: ThemeTokens = {
  colors: {
    // Brand colors
    primary: '#2563eb',           // Blue-600
    primaryHover: '#1d4ed8',      // Blue-700
    primaryActive: '#1e40af',     // Blue-800
    secondary: '#64748b',         // Slate-500
    secondaryHover: '#475569',    // Slate-600
    secondaryActive: '#334155',   // Slate-700
    
    // Backgrounds
    background: '#ffffff',        // Pure white
    backgroundSecondary: '#f8fafc', // Slate-50
    surface: '#ffffff',           // Pure white
    surfaceHover: '#f1f5f9',      // Slate-100
    elevated: '#ffffff',          // Pure white with shadow
    overlay: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
    
    // Text colors
    text: '#0f172a',              // Slate-900
    textSecondary: '#64748b',     // Slate-500
    textTertiary: '#94a3b8',      // Slate-400
    textInverse: '#ffffff',       // White
    textDisabled: '#cbd5e1',      // Slate-300
    
    // Interactive colors
    link: '#2563eb',              // Blue-600
    linkHover: '#1d4ed8',         // Blue-700
    linkVisited: '#7c3aed',       // Violet-600
    
    // Border colors
    border: '#e2e8f0',            // Slate-200
    borderHover: '#cbd5e1',       // Slate-300
    borderFocus: '#2563eb',       // Blue-600
    borderDisabled: '#f1f5f9',    // Slate-100
    
    // State colors
    error: '#dc2626',             // Red-600
    errorBackground: '#fef2f2',   // Red-50
    errorBorder: '#fecaca',       // Red-200
    success: '#16a34a',           // Green-600
    successBackground: '#f0fdf4', // Green-50
    successBorder: '#bbf7d0',     // Green-200
    warning: '#d97706',           // Amber-600
    warningBackground: '#fffbeb', // Amber-50
    warningBorder: '#fde68a',     // Amber-200
    info: '#0ea5e9',              // Sky-500
    infoBackground: '#f0f9ff',    // Sky-50
    infoBorder: '#bae6fd',        // Sky-200
    
    // Chat-specific colors
    chatUserBubble: '#2563eb',    // Blue-600
    chatUserText: '#ffffff',      // White
    chatAssistantBubble: '#f1f5f9', // Slate-100
    chatAssistantText: '#0f172a', // Slate-900
    chatTimestamp: '#94a3b8',     // Slate-400
  },
  
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  typography: baseTypography,
  shadows: baseShadows,
  effects: baseEffects,
};

/**
 * Comprehensive Dark Theme
 */
export const comprehensiveDarkTheme: ThemeTokens = {
  colors: {
    // Brand colors
    primary: '#60a5fa',           // Blue-400 (brighter for dark)
    primaryHover: '#3b82f6',      // Blue-500
    primaryActive: '#2563eb',     // Blue-600
    secondary: '#94a3b8',         // Slate-400
    secondaryHover: '#64748b',    // Slate-500
    secondaryActive: '#475569',   // Slate-600
    
    // Backgrounds
    background: '#0f172a',        // Slate-900
    backgroundSecondary: '#1e293b', // Slate-800
    surface: '#1e293b',           // Slate-800
    surfaceHover: '#334155',      // Slate-700
    elevated: '#334155',          // Slate-700
    overlay: 'rgba(0, 0, 0, 0.8)', // Darker overlay
    
    // Text colors
    text: '#f1f5f9',              // Slate-100
    textSecondary: '#cbd5e1',     // Slate-300
    textTertiary: '#94a3b8',      // Slate-400
    textInverse: '#0f172a',       // Slate-900
    textDisabled: '#64748b',      // Slate-500
    
    // Interactive colors
    link: '#60a5fa',              // Blue-400
    linkHover: '#3b82f6',         // Blue-500
    linkVisited: '#a78bfa',       // Violet-400
    
    // Border colors
    border: '#334155',            // Slate-700
    borderHover: '#475569',       // Slate-600
    borderFocus: '#60a5fa',       // Blue-400
    borderDisabled: '#1e293b',    // Slate-800
    
    // State colors
    error: '#f87171',             // Red-400 (brighter)
    errorBackground: '#7f1d1d',   // Red-900
    errorBorder: '#dc2626',       // Red-600
    success: '#4ade80',           // Green-400 (brighter)
    successBackground: '#14532d', // Green-900
    successBorder: '#16a34a',     // Green-600
    warning: '#fbbf24',           // Amber-400 (brighter)
    warningBackground: '#78350f', // Amber-900
    warningBorder: '#d97706',     // Amber-600
    info: '#38bdf8',              // Sky-400 (brighter)
    infoBackground: '#0c4a6e',    // Sky-900
    infoBorder: '#0ea5e9',        // Sky-500
    
    // Chat-specific colors
    chatUserBubble: '#60a5fa',    // Blue-400
    chatUserText: '#0f172a',      // Slate-900 (dark text on light blue)
    chatAssistantBubble: '#334155', // Slate-700
    chatAssistantText: '#f1f5f9', // Slate-100
    chatTimestamp: '#64748b',     // Slate-500
  },
  
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  typography: baseTypography,
  shadows: {
    ...baseShadows,
    // Darker shadows for dark theme
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.18)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.12)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  effects: baseEffects,
};

/**
 * Comprehensive Default Theme (GenUX Brand)
 */
export const comprehensiveDefaultTheme: ThemeTokens = {
  colors: {
    // Brand colors (GenUX purple gradient)
    primary: '#667eea',           // GenUX brand primary
    primaryHover: '#5a67d8',      // Darker shade
    primaryActive: '#4c51bf',     // Even darker
    secondary: '#764ba2',         // GenUX brand secondary
    secondaryHover: '#68409a',    // Darker shade
    secondaryActive: '#553c9a',   // Even darker
    
    // Backgrounds
    background: '#fafbfc',        // Slightly off-white
    backgroundSecondary: '#f7fafc', // Gray-50
    surface: '#ffffff',           // Pure white
    surfaceHover: '#edf2f7',      // Gray-100
    elevated: '#ffffff',          // Pure white with shadow
    overlay: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
    
    // Text colors
    text: '#1a202c',              // Gray-900
    textSecondary: '#718096',     // Gray-600
    textTertiary: '#a0aec0',      // Gray-400
    textInverse: '#ffffff',       // White
    textDisabled: '#cbd5e0',      // Gray-300
    
    // Interactive colors
    link: '#667eea',              // GenUX primary
    linkHover: '#5a67d8',         // Darker
    linkVisited: '#764ba2',       // GenUX secondary
    
    // Border colors
    border: '#e2e8f0',            // Gray-200
    borderHover: '#cbd5e0',       // Gray-300
    borderFocus: '#667eea',       // GenUX primary
    borderDisabled: '#f7fafc',    // Gray-50
    
    // State colors
    error: '#e53e3e',             // Red-500
    errorBackground: '#fed7d7',   // Red-100
    errorBorder: '#feb2b2',       // Red-200
    success: '#48bb78',           // Green-500
    successBackground: '#c6f6d5', // Green-100
    successBorder: '#9ae6b4',     // Green-200
    warning: '#ed8936',           // Orange-500
    warningBackground: '#feebc8', // Orange-100
    warningBorder: '#fbd38d',     // Orange-200
    info: '#4299e1',              // Blue-500
    infoBackground: '#bee3f8',    // Blue-100
    infoBorder: '#90cdf4',        // Blue-200
    
    // Chat-specific colors
    chatUserBubble: '#667eea',    // GenUX primary
    chatUserText: '#ffffff',      // White
    chatAssistantBubble: '#edf2f7', // Gray-100
    chatAssistantText: '#1a202c', // Gray-900
    chatTimestamp: '#a0aec0',     // Gray-400
  },
  
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  typography: baseTypography,
  shadows: baseShadows,
  effects: baseEffects,
};