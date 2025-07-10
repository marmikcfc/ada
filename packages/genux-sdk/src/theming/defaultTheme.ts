/**
 * Comprehensive theme system for GenUX SDK
 * Provides light, dark, and default themes with complete UI coverage
 */
import { ThemeTokens } from '../types';
import { 
  comprehensiveLightTheme, 
  comprehensiveDarkTheme, 
  comprehensiveDefaultTheme 
} from './comprehensiveThemes';

/**
 * Light theme - Clean, modern theme optimized for bright environments
 * Now includes comprehensive coverage for all UI elements
 */
export const lightTheme: ThemeTokens = comprehensiveLightTheme;

/**
 * Dark theme - Optimized for low-light environments with proper contrast
 * Now includes comprehensive coverage for all UI elements
 */
export const darkTheme: ThemeTokens = comprehensiveDarkTheme;

/**
 * Default theme - Balanced theme using GenUX brand colors
 * Now includes comprehensive coverage for all UI elements
 */
export const defaultTheme: ThemeTokens = comprehensiveDefaultTheme;

/**
 * Comprehensive Crayon theme interface - maps to full Crayon theme capabilities
 */
export interface CrayonTheme {
  // Core color fills
  backgroundFills?: string;
  brandElFills?: string;
  brandElHoverFills?: string;
  containerFills?: string;
  overlayFills?: string;
  sunkFills?: string;
  containerHoverFills?: string;
  dangerFills?: string;
  successFills?: string;
  infoFills?: string;
  elevatedFills?: string;
  
  // Stroke colors
  strokeDefault?: string;
  strokeInteractiveEl?: string;
  strokeInteractiveElHover?: string;
  strokeInteractiveElSelected?: string;
  
  // Text colors
  brandText?: string;
  brandSecondaryText?: string;
  primaryText?: string;
  secondaryText?: string;
  disabledText?: string;
  dangerText?: string;
  successText?: string;
  linkText?: string;
  infoText?: string;
  
  // Chat-specific colors
  chatContainerBg?: string;
  chatAssistantResponseBg?: string;
  chatUserResponseBg?: string;
  chatAssistantResponseText?: string;
  chatUserResponseText?: string;
  
  // Complete spacing scale
  spacing0?: string;
  spacing3xs?: string;
  spacing2xs?: string;
  spacingXs?: string;
  spacingS?: string;
  spacingM?: string;
  spacingL?: string;
  spacingXl?: string;
  spacing2xl?: string;
  spacing3xl?: string;
  
  // Complete border radius scale
  rounded0?: string;
  rounded3xs?: string;
  rounded2xs?: string;
  roundedXs?: string;
  roundedS?: string;
  roundedM?: string;
  roundedL?: string;
  roundedXl?: string;
  rounded2xl?: string;
  rounded3xl?: string;
  rounded4xl?: string;
  roundedFull?: string;
  roundedClickable?: string;
  
  // Complete typography system
  fontPrimary?: string;
  fontPrimaryLetterSpacing?: string;
  
  // Headings
  fontHeadingLarge?: string;
  fontHeadingLargeLetterSpacing?: string;
  fontHeadingMedium?: string;
  fontHeadingMediumLetterSpacing?: string;
  fontHeadingSmall?: string;
  fontHeadingSmallLetterSpacing?: string;
  
  // Titles
  fontTitle?: string;
  fontTitleLetterSpacing?: string;
  fontTitleMedium?: string;
  fontTitleMediumLetterSpacing?: string;
  fontTitleSmall?: string;
  fontTitleSmallLetterSpacing?: string;
  
  // Body text
  fontBody?: string;
  fontBodyLetterSpacing?: string;
  fontBodyHeavy?: string;
  fontBodyHeavyLetterSpacing?: string;
  fontBodyMedium?: string;
  fontBodyMediumLetterSpacing?: string;
  fontBodySmall?: string;
  fontBodySmallLetterSpacing?: string;
  fontBodySmallHeavy?: string;
  fontBodySmallHeavyLetterSpacing?: string;
  fontBodyLink?: string;
  fontBodyLinkLetterSpacing?: string;
  
  // Labels
  fontLabel?: string;
  fontLabelLetterSpacing?: string;
  fontLabelHeavy?: string;
  fontLabelHeavyLetterSpacing?: string;
  fontLabelLarge?: string;
  fontLabelLargeLetterSpacing?: string;
  fontLabelLargeHeavy?: string;
  fontLabelLargeHeavyLetterSpacing?: string;
  fontLabelMedium?: string;
  fontLabelMediumLetterSpacing?: string;
  fontLabelMediumHeavy?: string;
  fontLabelMediumHeavyLetterSpacing?: string;
  fontLabelSmall?: string;
  fontLabelSmallLetterSpacing?: string;
  fontLabelSmallHeavy?: string;
  fontLabelSmallHeavyLetterSpacing?: string;
  fontLabelExtraSmall?: string;
  fontLabelExtraSmallLetterSpacing?: string;
  fontLabelExtraSmallHeavy?: string;
  fontLabelExtraSmallHeavyLetterSpacing?: string;
  
  // Effects
  shadowS?: string;
  shadowM?: string;
  shadowL?: string;
  shadowXl?: string;
  shadow2xl?: string;
  shadow3xl?: string;
}

/**
 * Converts GenUX theme to comprehensive Crayon-compatible theme
 * Maps all GenUX tokens to corresponding Crayon tokens for complete coverage
 * @param genuxTheme The GenUX theme to convert
 * @returns Complete Crayon-compatible theme object
 */
export function toCrayonTheme(genuxTheme: ThemeTokens): CrayonTheme {
  const isDark = genuxTheme.colors.background.toLowerCase() < '#800000';
  
  return {
    // Core color fills
    backgroundFills: genuxTheme.colors.background,
    brandElFills: genuxTheme.colors.primary,
    brandElHoverFills: genuxTheme.colors.primaryHover,
    containerFills: genuxTheme.colors.surface,
    overlayFills: genuxTheme.colors.overlay,
    sunkFills: genuxTheme.colors.backgroundSecondary,
    containerHoverFills: genuxTheme.colors.surfaceHover,
    dangerFills: genuxTheme.colors.error,
    successFills: genuxTheme.colors.success,
    infoFills: genuxTheme.colors.info,
    elevatedFills: genuxTheme.colors.elevated,
    
    // Stroke colors
    strokeDefault: genuxTheme.colors.border,
    strokeInteractiveEl: genuxTheme.colors.borderFocus,
    strokeInteractiveElHover: genuxTheme.colors.borderHover,
    strokeInteractiveElSelected: genuxTheme.colors.primary,
    
    // Text colors
    brandText: genuxTheme.colors.primary,
    brandSecondaryText: genuxTheme.colors.secondary,
    primaryText: genuxTheme.colors.text,
    secondaryText: genuxTheme.colors.textSecondary,
    disabledText: genuxTheme.colors.textDisabled,
    dangerText: genuxTheme.colors.error,
    successText: genuxTheme.colors.success,
    linkText: genuxTheme.colors.link,
    infoText: genuxTheme.colors.info,
    
    // Chat-specific colors
    chatContainerBg: genuxTheme.colors.background,
    chatAssistantResponseBg: genuxTheme.colors.chatAssistantBubble,
    chatUserResponseBg: genuxTheme.colors.chatUserBubble,
    chatAssistantResponseText: genuxTheme.colors.chatAssistantText,
    chatUserResponseText: genuxTheme.colors.chatUserText,
    
    // Complete spacing scale
    spacing0: genuxTheme.spacing['0'],
    spacing3xs: genuxTheme.spacing['3xs'],
    spacing2xs: genuxTheme.spacing['2xs'],
    spacingXs: genuxTheme.spacing.xs,
    spacingS: genuxTheme.spacing.sm,
    spacingM: genuxTheme.spacing.md,
    spacingL: genuxTheme.spacing.lg,
    spacingXl: genuxTheme.spacing.xl,
    spacing2xl: genuxTheme.spacing['2xl'],
    spacing3xl: genuxTheme.spacing['3xl'],
    
    // Complete border radius scale
    rounded0: genuxTheme.borderRadius.none,
    rounded3xs: genuxTheme.borderRadius['3xs'],
    rounded2xs: genuxTheme.borderRadius['2xs'],
    roundedXs: genuxTheme.borderRadius.xs,
    roundedS: genuxTheme.borderRadius.sm,
    roundedM: genuxTheme.borderRadius.md,
    roundedL: genuxTheme.borderRadius.lg,
    roundedXl: genuxTheme.borderRadius.xl,
    rounded2xl: genuxTheme.borderRadius['2xl'],
    rounded3xl: genuxTheme.borderRadius['3xl'],
    rounded4xl: genuxTheme.borderRadius['3xl'], // Map to 3xl as fallback
    roundedFull: genuxTheme.borderRadius.full,
    roundedClickable: genuxTheme.borderRadius.md, // Default for clickable elements
    
    // Complete typography system
    fontPrimary: genuxTheme.typography.fontFamily,
    fontPrimaryLetterSpacing: genuxTheme.typography.letterSpacing.normal,
    
    // Headings - map to GenUX heading styles
    fontHeadingLarge: `${genuxTheme.typography.heading.h1.fontWeight} ${genuxTheme.typography.heading.h1.fontSize}/${genuxTheme.typography.heading.h1.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontHeadingLargeLetterSpacing: genuxTheme.typography.heading.h1.letterSpacing,
    fontHeadingMedium: `${genuxTheme.typography.heading.h2.fontWeight} ${genuxTheme.typography.heading.h2.fontSize}/${genuxTheme.typography.heading.h2.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontHeadingMediumLetterSpacing: genuxTheme.typography.heading.h2.letterSpacing,
    fontHeadingSmall: `${genuxTheme.typography.heading.h3.fontWeight} ${genuxTheme.typography.heading.h3.fontSize}/${genuxTheme.typography.heading.h3.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontHeadingSmallLetterSpacing: genuxTheme.typography.heading.h3.letterSpacing,
    
    // Titles - map to smaller headings
    fontTitle: `${genuxTheme.typography.heading.h4.fontWeight} ${genuxTheme.typography.heading.h4.fontSize}/${genuxTheme.typography.heading.h4.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontTitleLetterSpacing: genuxTheme.typography.heading.h4.letterSpacing,
    fontTitleMedium: `${genuxTheme.typography.heading.h5.fontWeight} ${genuxTheme.typography.heading.h5.fontSize}/${genuxTheme.typography.heading.h5.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontTitleMediumLetterSpacing: genuxTheme.typography.heading.h5.letterSpacing,
    fontTitleSmall: `${genuxTheme.typography.heading.h6.fontWeight} ${genuxTheme.typography.heading.h6.fontSize}/${genuxTheme.typography.heading.h6.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontTitleSmallLetterSpacing: genuxTheme.typography.heading.h6.letterSpacing,
    
    // Body text - map to GenUX body styles
    fontBody: `${genuxTheme.typography.body.medium.fontWeight} ${genuxTheme.typography.body.medium.fontSize}/${genuxTheme.typography.body.medium.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontBodyLetterSpacing: genuxTheme.typography.body.medium.letterSpacing,
    fontBodyHeavy: `${genuxTheme.typography.fontWeight.bold} ${genuxTheme.typography.body.medium.fontSize}/${genuxTheme.typography.body.medium.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontBodyHeavyLetterSpacing: genuxTheme.typography.body.medium.letterSpacing,
    fontBodyMedium: `${genuxTheme.typography.fontWeight.medium} ${genuxTheme.typography.body.medium.fontSize}/${genuxTheme.typography.body.medium.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontBodyMediumLetterSpacing: genuxTheme.typography.body.medium.letterSpacing,
    fontBodySmall: `${genuxTheme.typography.body.small.fontWeight} ${genuxTheme.typography.body.small.fontSize}/${genuxTheme.typography.body.small.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontBodySmallLetterSpacing: genuxTheme.typography.body.small.letterSpacing,
    fontBodySmallHeavy: `${genuxTheme.typography.fontWeight.bold} ${genuxTheme.typography.body.small.fontSize}/${genuxTheme.typography.body.small.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontBodySmallHeavyLetterSpacing: genuxTheme.typography.body.small.letterSpacing,
    fontBodyLink: `${genuxTheme.typography.fontWeight.medium} ${genuxTheme.typography.body.medium.fontSize}/${genuxTheme.typography.body.medium.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontBodyLinkLetterSpacing: genuxTheme.typography.body.medium.letterSpacing,
    
    // Labels - map to GenUX label styles
    fontLabel: `${genuxTheme.typography.label.medium.fontWeight} ${genuxTheme.typography.label.medium.fontSize}/${genuxTheme.typography.label.medium.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontLabelLetterSpacing: genuxTheme.typography.label.medium.letterSpacing,
    fontLabelHeavy: `${genuxTheme.typography.fontWeight.bold} ${genuxTheme.typography.label.medium.fontSize}/${genuxTheme.typography.label.medium.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontLabelHeavyLetterSpacing: genuxTheme.typography.label.medium.letterSpacing,
    fontLabelLarge: `${genuxTheme.typography.label.large.fontWeight} ${genuxTheme.typography.label.large.fontSize}/${genuxTheme.typography.label.large.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontLabelLargeLetterSpacing: genuxTheme.typography.label.large.letterSpacing,
    fontLabelLargeHeavy: `${genuxTheme.typography.fontWeight.bold} ${genuxTheme.typography.label.large.fontSize}/${genuxTheme.typography.label.large.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontLabelLargeHeavyLetterSpacing: genuxTheme.typography.label.large.letterSpacing,
    fontLabelMedium: `${genuxTheme.typography.label.medium.fontWeight} ${genuxTheme.typography.label.medium.fontSize}/${genuxTheme.typography.label.medium.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontLabelMediumLetterSpacing: genuxTheme.typography.label.medium.letterSpacing,
    fontLabelMediumHeavy: `${genuxTheme.typography.fontWeight.bold} ${genuxTheme.typography.label.medium.fontSize}/${genuxTheme.typography.label.medium.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontLabelMediumHeavyLetterSpacing: genuxTheme.typography.label.medium.letterSpacing,
    fontLabelSmall: `${genuxTheme.typography.label.small.fontWeight} ${genuxTheme.typography.label.small.fontSize}/${genuxTheme.typography.label.small.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontLabelSmallLetterSpacing: genuxTheme.typography.label.small.letterSpacing,
    fontLabelSmallHeavy: `${genuxTheme.typography.fontWeight.bold} ${genuxTheme.typography.label.small.fontSize}/${genuxTheme.typography.label.small.lineHeight} ${genuxTheme.typography.fontFamily}`,
    fontLabelSmallHeavyLetterSpacing: genuxTheme.typography.label.small.letterSpacing,
    fontLabelExtraSmall: `${genuxTheme.typography.fontWeight.medium} ${genuxTheme.typography.fontSize.xs}/${genuxTheme.typography.lineHeight.normal} ${genuxTheme.typography.fontFamily}`,
    fontLabelExtraSmallLetterSpacing: genuxTheme.typography.letterSpacing.wide,
    fontLabelExtraSmallHeavy: `${genuxTheme.typography.fontWeight.bold} ${genuxTheme.typography.fontSize.xs}/${genuxTheme.typography.lineHeight.normal} ${genuxTheme.typography.fontFamily}`,
    fontLabelExtraSmallHeavyLetterSpacing: genuxTheme.typography.letterSpacing.wide,
    
    // Effects - map to GenUX shadows
    shadowS: genuxTheme.shadows.sm,
    shadowM: genuxTheme.shadows.md,
    shadowL: genuxTheme.shadows.lg,
    shadowXl: genuxTheme.shadows.xl,
    shadow2xl: genuxTheme.shadows['2xl'],
    shadow3xl: genuxTheme.shadows['2xl'], // Fallback to 2xl
  };
}

/**
 * Pre-configured Crayon themes for use with C1Components
 */
export const crayonLightTheme = toCrayonTheme(lightTheme);
export const crayonDarkTheme = toCrayonTheme(darkTheme);
export const crayonDefaultTheme = toCrayonTheme(defaultTheme);

/**
 * Creates a custom theme by merging with the default theme
 * @param customTheme Partial theme to merge with defaults
 * @returns Complete theme with custom overrides
 */
export function createTheme(customTheme: Partial<ThemeTokens> = {}): ThemeTokens {
  const baseTheme = customTheme.colors?.background && customTheme.colors.background.toLowerCase() < '#800000' 
    ? darkTheme 
    : lightTheme;
    
  return {
    colors: {
      ...baseTheme.colors,
      ...customTheme.colors,
    },
    spacing: {
      ...baseTheme.spacing,
      ...customTheme.spacing,
    },
    borderRadius: {
      ...baseTheme.borderRadius,
      ...customTheme.borderRadius,
    },
    typography: {
      fontFamily: customTheme.typography?.fontFamily || baseTheme.typography.fontFamily,
      fontFamilyMono: customTheme.typography?.fontFamilyMono || baseTheme.typography.fontFamilyMono,
      fontSize: {
        ...baseTheme.typography.fontSize,
        ...customTheme.typography?.fontSize,
      },
      fontWeight: {
        ...baseTheme.typography.fontWeight,
        ...customTheme.typography?.fontWeight,
      },
      lineHeight: {
        ...baseTheme.typography.lineHeight,
        ...customTheme.typography?.lineHeight,
      },
      letterSpacing: {
        ...baseTheme.typography.letterSpacing,
        ...customTheme.typography?.letterSpacing,
      },
      heading: {
        h1: {
          ...baseTheme.typography.heading.h1,
          ...customTheme.typography?.heading?.h1,
        },
        h2: {
          ...baseTheme.typography.heading.h2,
          ...customTheme.typography?.heading?.h2,
        },
        h3: {
          ...baseTheme.typography.heading.h3,
          ...customTheme.typography?.heading?.h3,
        },
        h4: {
          ...baseTheme.typography.heading.h4,
          ...customTheme.typography?.heading?.h4,
        },
        h5: {
          ...baseTheme.typography.heading.h5,
          ...customTheme.typography?.heading?.h5,
        },
        h6: {
          ...baseTheme.typography.heading.h6,
          ...customTheme.typography?.heading?.h6,
        },
      },
      body: {
        large: {
          ...baseTheme.typography.body.large,
          ...customTheme.typography?.body?.large,
        },
        medium: {
          ...baseTheme.typography.body.medium,
          ...customTheme.typography?.body?.medium,
        },
        small: {
          ...baseTheme.typography.body.small,
          ...customTheme.typography?.body?.small,
        },
      },
      label: {
        large: {
          ...baseTheme.typography.label.large,
          ...customTheme.typography?.label?.large,
        },
        medium: {
          ...baseTheme.typography.label.medium,
          ...customTheme.typography?.label?.medium,
        },
        small: {
          ...baseTheme.typography.label.small,
          ...customTheme.typography?.label?.small,
        },
      },
      code: {
        ...baseTheme.typography.code,
        ...customTheme.typography?.code,
      },
    },
    shadows: {
      ...baseTheme.shadows,
      ...customTheme.shadows,
    },
    effects: {
      ...baseTheme.effects,
      ...customTheme.effects,
    },
  };
}

/**
 * Generates CSS variables from a comprehensive theme
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
  
  // Typography base
  cssVars[`--${prefix}-font-family`] = theme.typography.fontFamily;
  cssVars[`--${prefix}-font-family-mono`] = theme.typography.fontFamilyMono;
  
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    cssVars[`--${prefix}-font-size-${key}`] = value;
  });
  
  Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
    cssVars[`--${prefix}-font-weight-${key}`] = value.toString();
  });
  
  Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
    cssVars[`--${prefix}-line-height-${key}`] = value;
  });
  
  Object.entries(theme.typography.letterSpacing).forEach(([key, value]) => {
    cssVars[`--${prefix}-letter-spacing-${key}`] = value;
  });
  
  // Heading styles
  Object.entries(theme.typography.heading).forEach(([level, style]) => {
    cssVars[`--${prefix}-heading-${level}-size`] = style.fontSize;
    cssVars[`--${prefix}-heading-${level}-weight`] = style.fontWeight.toString();
    cssVars[`--${prefix}-heading-${level}-line-height`] = style.lineHeight;
    cssVars[`--${prefix}-heading-${level}-letter-spacing`] = style.letterSpacing;
  });
  
  // Body styles
  Object.entries(theme.typography.body).forEach(([size, style]) => {
    cssVars[`--${prefix}-body-${size}-size`] = style.fontSize;
    cssVars[`--${prefix}-body-${size}-weight`] = style.fontWeight.toString();
    cssVars[`--${prefix}-body-${size}-line-height`] = style.lineHeight;
    cssVars[`--${prefix}-body-${size}-letter-spacing`] = style.letterSpacing;
  });
  
  // Label styles
  Object.entries(theme.typography.label).forEach(([size, style]) => {
    cssVars[`--${prefix}-label-${size}-size`] = style.fontSize;
    cssVars[`--${prefix}-label-${size}-weight`] = style.fontWeight.toString();
    cssVars[`--${prefix}-label-${size}-line-height`] = style.lineHeight;
    cssVars[`--${prefix}-label-${size}-letter-spacing`] = style.letterSpacing;
  });
  
  // Code styles
  cssVars[`--${prefix}-code-size`] = theme.typography.code.fontSize;
  cssVars[`--${prefix}-code-weight`] = theme.typography.code.fontWeight.toString();
  cssVars[`--${prefix}-code-family`] = theme.typography.code.fontFamily;
  cssVars[`--${prefix}-code-line-height`] = theme.typography.code.lineHeight;
  cssVars[`--${prefix}-code-letter-spacing`] = theme.typography.code.letterSpacing;
  
  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    cssVars[`--${prefix}-shadow-${key}`] = value;
  });
  
  // Effects
  Object.entries(theme.effects).forEach(([key, value]) => {
    cssVars[`--${prefix}-effect-${key}`] = value;
  });
  
  return cssVars;
}

export default defaultTheme;
