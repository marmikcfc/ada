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
 * @param geuiTheme The GenUX theme to convert
 * @returns Complete Crayon-compatible theme object
 */
export function toCrayonTheme(geuiTheme: ThemeTokens): CrayonTheme {
  return {
    // Core color fills
    backgroundFills: geuiTheme.colors.background,
    brandElFills: geuiTheme.colors.primary,
    brandElHoverFills: geuiTheme.colors.primaryHover,
    containerFills: geuiTheme.colors.surface,
    overlayFills: geuiTheme.colors.overlay,
    sunkFills: geuiTheme.colors.backgroundSecondary,
    containerHoverFills: geuiTheme.colors.surfaceHover,
    dangerFills: geuiTheme.colors.error,
    successFills: geuiTheme.colors.success,
    infoFills: geuiTheme.colors.info,
    elevatedFills: geuiTheme.colors.elevated,
    
    // Stroke colors
    strokeDefault: geuiTheme.colors.border,
    strokeInteractiveEl: geuiTheme.colors.borderFocus,
    strokeInteractiveElHover: geuiTheme.colors.borderHover,
    strokeInteractiveElSelected: geuiTheme.colors.primary,
    
    // Text colors
    brandText: geuiTheme.colors.primary,
    brandSecondaryText: geuiTheme.colors.secondary,
    primaryText: geuiTheme.colors.text,
    secondaryText: geuiTheme.colors.textSecondary,
    disabledText: geuiTheme.colors.textDisabled,
    dangerText: geuiTheme.colors.error,
    successText: geuiTheme.colors.success,
    linkText: geuiTheme.colors.link,
    infoText: geuiTheme.colors.info,
    
    // Chat-specific colors
    chatContainerBg: geuiTheme.colors.background,
    chatAssistantResponseBg: geuiTheme.colors.chatAssistantBubble,
    chatUserResponseBg: geuiTheme.colors.chatUserBubble,
    chatAssistantResponseText: geuiTheme.colors.chatAssistantText,
    chatUserResponseText: geuiTheme.colors.chatUserText,
    
    // Complete spacing scale
    spacing0: geuiTheme.spacing['0'],
    spacing3xs: geuiTheme.spacing['3xs'],
    spacing2xs: geuiTheme.spacing['2xs'],
    spacingXs: geuiTheme.spacing.xs,
    spacingS: geuiTheme.spacing.sm,
    spacingM: geuiTheme.spacing.md,
    spacingL: geuiTheme.spacing.lg,
    spacingXl: geuiTheme.spacing.xl,
    spacing2xl: geuiTheme.spacing['2xl'],
    spacing3xl: geuiTheme.spacing['3xl'],
    
    // Complete border radius scale
    rounded0: geuiTheme.borderRadius.none,
    rounded3xs: geuiTheme.borderRadius['3xs'],
    rounded2xs: geuiTheme.borderRadius['2xs'],
    roundedXs: geuiTheme.borderRadius.xs,
    roundedS: geuiTheme.borderRadius.sm,
    roundedM: geuiTheme.borderRadius.md,
    roundedL: geuiTheme.borderRadius.lg,
    roundedXl: geuiTheme.borderRadius.xl,
    rounded2xl: geuiTheme.borderRadius['2xl'],
    rounded3xl: geuiTheme.borderRadius['3xl'],
    rounded4xl: geuiTheme.borderRadius['3xl'], // Map to 3xl as fallback
    roundedFull: geuiTheme.borderRadius.full,
    roundedClickable: geuiTheme.borderRadius.md, // Default for clickable elements
    
    // Complete typography system
    fontPrimary: geuiTheme.typography.fontFamily,
    fontPrimaryLetterSpacing: geuiTheme.typography.letterSpacing.normal,
    
    // Headings - map to GenUX heading styles
    fontHeadingLarge: `${geuiTheme.typography.heading.h1.fontWeight} ${geuiTheme.typography.heading.h1.fontSize}/${geuiTheme.typography.heading.h1.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontHeadingLargeLetterSpacing: geuiTheme.typography.heading.h1.letterSpacing,
    fontHeadingMedium: `${geuiTheme.typography.heading.h2.fontWeight} ${geuiTheme.typography.heading.h2.fontSize}/${geuiTheme.typography.heading.h2.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontHeadingMediumLetterSpacing: geuiTheme.typography.heading.h2.letterSpacing,
    fontHeadingSmall: `${geuiTheme.typography.heading.h3.fontWeight} ${geuiTheme.typography.heading.h3.fontSize}/${geuiTheme.typography.heading.h3.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontHeadingSmallLetterSpacing: geuiTheme.typography.heading.h3.letterSpacing,
    
    // Titles - map to smaller headings
    fontTitle: `${geuiTheme.typography.heading.h4.fontWeight} ${geuiTheme.typography.heading.h4.fontSize}/${geuiTheme.typography.heading.h4.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontTitleLetterSpacing: geuiTheme.typography.heading.h4.letterSpacing,
    fontTitleMedium: `${geuiTheme.typography.heading.h5.fontWeight} ${geuiTheme.typography.heading.h5.fontSize}/${geuiTheme.typography.heading.h5.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontTitleMediumLetterSpacing: geuiTheme.typography.heading.h5.letterSpacing,
    fontTitleSmall: `${geuiTheme.typography.heading.h6.fontWeight} ${geuiTheme.typography.heading.h6.fontSize}/${geuiTheme.typography.heading.h6.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontTitleSmallLetterSpacing: geuiTheme.typography.heading.h6.letterSpacing,
    
    // Body text - map to GenUX body styles
    fontBody: `${geuiTheme.typography.body.medium.fontWeight} ${geuiTheme.typography.body.medium.fontSize}/${geuiTheme.typography.body.medium.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontBodyLetterSpacing: geuiTheme.typography.body.medium.letterSpacing,
    fontBodyHeavy: `${geuiTheme.typography.fontWeight.bold} ${geuiTheme.typography.body.medium.fontSize}/${geuiTheme.typography.body.medium.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontBodyHeavyLetterSpacing: geuiTheme.typography.body.medium.letterSpacing,
    fontBodyMedium: `${geuiTheme.typography.fontWeight.medium} ${geuiTheme.typography.body.medium.fontSize}/${geuiTheme.typography.body.medium.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontBodyMediumLetterSpacing: geuiTheme.typography.body.medium.letterSpacing,
    fontBodySmall: `${geuiTheme.typography.body.small.fontWeight} ${geuiTheme.typography.body.small.fontSize}/${geuiTheme.typography.body.small.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontBodySmallLetterSpacing: geuiTheme.typography.body.small.letterSpacing,
    fontBodySmallHeavy: `${geuiTheme.typography.fontWeight.bold} ${geuiTheme.typography.body.small.fontSize}/${geuiTheme.typography.body.small.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontBodySmallHeavyLetterSpacing: geuiTheme.typography.body.small.letterSpacing,
    fontBodyLink: `${geuiTheme.typography.fontWeight.medium} ${geuiTheme.typography.body.medium.fontSize}/${geuiTheme.typography.body.medium.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontBodyLinkLetterSpacing: geuiTheme.typography.body.medium.letterSpacing,
    
    // Labels - map to GenUX label styles
    fontLabel: `${geuiTheme.typography.label.medium.fontWeight} ${geuiTheme.typography.label.medium.fontSize}/${geuiTheme.typography.label.medium.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontLabelLetterSpacing: geuiTheme.typography.label.medium.letterSpacing,
    fontLabelHeavy: `${geuiTheme.typography.fontWeight.bold} ${geuiTheme.typography.label.medium.fontSize}/${geuiTheme.typography.label.medium.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontLabelHeavyLetterSpacing: geuiTheme.typography.label.medium.letterSpacing,
    fontLabelLarge: `${geuiTheme.typography.label.large.fontWeight} ${geuiTheme.typography.label.large.fontSize}/${geuiTheme.typography.label.large.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontLabelLargeLetterSpacing: geuiTheme.typography.label.large.letterSpacing,
    fontLabelLargeHeavy: `${geuiTheme.typography.fontWeight.bold} ${geuiTheme.typography.label.large.fontSize}/${geuiTheme.typography.label.large.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontLabelLargeHeavyLetterSpacing: geuiTheme.typography.label.large.letterSpacing,
    fontLabelMedium: `${geuiTheme.typography.label.medium.fontWeight} ${geuiTheme.typography.label.medium.fontSize}/${geuiTheme.typography.label.medium.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontLabelMediumLetterSpacing: geuiTheme.typography.label.medium.letterSpacing,
    fontLabelMediumHeavy: `${geuiTheme.typography.fontWeight.bold} ${geuiTheme.typography.label.medium.fontSize}/${geuiTheme.typography.label.medium.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontLabelMediumHeavyLetterSpacing: geuiTheme.typography.label.medium.letterSpacing,
    fontLabelSmall: `${geuiTheme.typography.label.small.fontWeight} ${geuiTheme.typography.label.small.fontSize}/${geuiTheme.typography.label.small.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontLabelSmallLetterSpacing: geuiTheme.typography.label.small.letterSpacing,
    fontLabelSmallHeavy: `${geuiTheme.typography.fontWeight.bold} ${geuiTheme.typography.label.small.fontSize}/${geuiTheme.typography.label.small.lineHeight} ${geuiTheme.typography.fontFamily}`,
    fontLabelSmallHeavyLetterSpacing: geuiTheme.typography.label.small.letterSpacing,
    fontLabelExtraSmall: `${geuiTheme.typography.fontWeight.medium} ${geuiTheme.typography.fontSize.xs}/${geuiTheme.typography.lineHeight.normal} ${geuiTheme.typography.fontFamily}`,
    fontLabelExtraSmallLetterSpacing: geuiTheme.typography.letterSpacing.wide,
    fontLabelExtraSmallHeavy: `${geuiTheme.typography.fontWeight.bold} ${geuiTheme.typography.fontSize.xs}/${geuiTheme.typography.lineHeight.normal} ${geuiTheme.typography.fontFamily}`,
    fontLabelExtraSmallHeavyLetterSpacing: geuiTheme.typography.letterSpacing.wide,
    
    // Effects - map to GenUX shadows
    shadowS: geuiTheme.shadows.sm,
    shadowM: geuiTheme.shadows.md,
    shadowL: geuiTheme.shadows.lg,
    shadowXl: geuiTheme.shadows.xl,
    shadow2xl: geuiTheme.shadows['2xl'],
    shadow3xl: geuiTheme.shadows['2xl'], // Fallback to 2xl
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
export function themeToCssVars(theme: ThemeTokens, prefix = 'geui'): Record<string, string> {
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
