/**
 * UI Framework Adapter System
 * 
 * This system allows users to choose their preferred UI framework
 * (Tailwind, shadcn/ui, Chakra UI, Material UI, etc.) and have
 * the SDK generate appropriate markup for that framework.
 */

import { ReactNode } from 'react';

/**
 * Base interface for UI framework adapters
 */
export interface UIFrameworkAdapter {
  /** Unique identifier for the adapter */
  id: string;
  
  /** Display name of the framework */
  name: string;
  
  /** Framework version compatibility */
  version: string;
  
  /** Whether this adapter requires additional setup */
  requiresSetup: boolean;
  
  /** Convert generic UI description to framework-specific HTML/JSX */
  renderComponent(component: UIComponentDescription): string | ReactNode;
  
  /** Get framework-specific class names */
  getClasses(styles: StyleDescription): string;
  
  /** Check if the framework is available in the current environment */
  isAvailable(): boolean;
  
  /** Get setup instructions if not available */
  getSetupInstructions(): string;
  
  /** Transform raw HTML to use framework classes */
  transformHTML?(html: string): string;
}

/**
 * Generic UI component description
 * This is what the LLM would generate
 */
export interface UIComponentDescription {
  type: 'card' | 'button' | 'input' | 'table' | 'list' | 'heading' | 'text' | 'container' | 'grid' | 'form';
  props?: Record<string, any>;
  children?: UIComponentDescription[] | string;
  styles?: StyleDescription;
  actions?: ComponentAction[];
}

/**
 * Style description in a framework-agnostic way
 */
export interface StyleDescription {
  // Layout
  display?: 'flex' | 'grid' | 'block' | 'inline' | 'inline-block';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  alignItems?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  
  // Spacing
  padding?: SpacingValue;
  paddingX?: SpacingValue;
  paddingY?: SpacingValue;
  paddingTop?: SpacingValue;
  paddingBottom?: SpacingValue;
  paddingLeft?: SpacingValue;
  paddingRight?: SpacingValue;
  margin?: SpacingValue;
  marginX?: SpacingValue;
  marginY?: SpacingValue;
  marginTop?: SpacingValue;
  marginBottom?: SpacingValue;
  marginLeft?: SpacingValue;
  marginRight?: SpacingValue;
  
  // Sizing
  width?: SizeValue;
  height?: SizeValue;
  maxWidth?: SizeValue;
  maxHeight?: SizeValue;
  minWidth?: SizeValue;
  minHeight?: SizeValue;
  
  // Colors
  backgroundColor?: ColorValue;
  textColor?: ColorValue;
  borderColor?: ColorValue;
  
  // Typography
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  
  // Borders
  borderWidth?: 'none' | 'thin' | 'medium' | 'thick';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  
  // Effects
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  opacity?: number;
  
  // Gradients (special case)
  gradient?: {
    type: 'linear' | 'radial';
    from: string;
    to: string;
    direction?: string;
  };
}

type SpacingValue = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
type SizeValue = 'auto' | 'full' | '1/2' | '1/3' | '2/3' | '1/4' | '3/4' | 'screen' | string;
type ColorValue = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 
                  'gray' | 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink' |
                  'white' | 'black' | 'transparent' | string;

/**
 * Component actions (for interactive elements)
 */
export interface ComponentAction {
  type: 'click' | 'submit' | 'change';
  handler: string | (() => void);
}

/**
 * Adapter configuration passed during initialization
 */
export interface AdapterConfig {
  /** User's theme preferences */
  theme?: Record<string, any>;
  
  /** Whether to use dark mode */
  darkMode?: boolean;
  
  /** Custom class prefix (for CSS modules, etc.) */
  classPrefix?: string;
  
  /** Additional framework-specific options */
  frameworkOptions?: Record<string, any>;
}

/**
 * Registry for available adapters
 */
export interface AdapterRegistry {
  register(adapter: UIFrameworkAdapter): void;
  get(id: string): UIFrameworkAdapter | undefined;
  list(): UIFrameworkAdapter[];
  detectAvailable(): UIFrameworkAdapter[];
}