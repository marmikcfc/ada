/**
 * Default theme for the Genux SDK
 * Provides a modern, clean look for chat interfaces
 */
import { ThemeTokens } from '../types';

/**
 * Default theme tokens
 */
export const defaultTheme: ThemeTokens = {
  colors: {
    primary: '#2563eb', // Blue-600
    secondary: '#4b5563', // Gray-600
    background: '#f9fafb', // Gray-50
    surface: '#ffffff',
    text: '#111827', // Gray-900
    textSecondary: '#6b7280', // Gray-500
    border: '#e5e7eb', // Gray-200
    error: '#ef4444', // Red-500
    success: '#10b981', // Green-500
  },
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem',  // 8px
    md: '1rem',    // 16px
    lg: '1.5rem',  // 24px
    xl: '2rem',    // 32px
  },
  borderRadius: {
    sm: '0.25rem', // 4px
    md: '0.5rem',  // 8px
    lg: '0.75rem', // 12px
    full: '9999px',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      md: '1rem',     // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem',  // 20px
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
  },
};

/**
 * Creates a custom theme by merging with the default theme
 * @param customTheme Partial theme to merge with defaults
 * @returns Complete theme with custom overrides
 */
export function createTheme(customTheme: Partial<ThemeTokens> = {}): ThemeTokens {
  return {
    colors: {
      ...defaultTheme.colors,
      ...customTheme.colors,
    },
    spacing: {
      ...defaultTheme.spacing,
      ...customTheme.spacing,
    },
    borderRadius: {
      ...defaultTheme.borderRadius,
      ...customTheme.borderRadius,
    },
    typography: {
      fontFamily: customTheme.typography?.fontFamily || defaultTheme.typography.fontFamily,
      fontSize: {
        ...defaultTheme.typography.fontSize,
        ...customTheme.typography?.fontSize,
      },
      fontWeight: {
        ...defaultTheme.typography.fontWeight,
        ...customTheme.typography?.fontWeight,
      },
    },
  };
}

/**
 * Dark theme variant
 */
export const darkTheme: ThemeTokens = createTheme({
  colors: {
    primary: '#3b82f6', // Blue-500 (slightly lighter for dark mode)
    secondary: '#9ca3af', // Gray-400
    background: '#111827', // Gray-900
    surface: '#1f2937', // Gray-800
    text: '#f9fafb', // Gray-50
    textSecondary: '#d1d5db', // Gray-300
    border: '#374151', // Gray-700
    error: '#f87171', // Red-400 (lighter for dark mode)
    success: '#34d399', // Green-400 (lighter for dark mode)
  },
});

/**
 * Generates CSS variables from a theme
 * @param theme The theme to convert to CSS variables
 * @param prefix Optional prefix for the CSS variables
 * @returns Object with CSS variable definitions
 */
export function themeToCssVars(theme: ThemeTokens, prefix = 'genux'): Record<string, string> {
  const cssVars: Record<string, string> = {};
  
  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    cssVars[`--${prefix}-color-${key}`] = value;
  });
  
  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    cssVars[`--${prefix}-spacing-${key}`] = value;
  });
  
  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    cssVars[`--${prefix}-radius-${key}`] = value;
  });
  
  // Typography
  cssVars[`--${prefix}-font-family`] = theme.typography.fontFamily;
  
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    cssVars[`--${prefix}-font-size-${key}`] = value;
  });
  
  Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
    cssVars[`--${prefix}-font-weight-${key}`] = value.toString();
  });
  
  return cssVars;
}

export default defaultTheme;
