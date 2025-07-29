/**
 * ComponentRegistry - Dynamic component resolution for JSX compilation
 * 
 * This registry provides a centralized way to resolve component names to actual
 * React components during runtime JSX compilation. It includes shadcn/ui components
 * and allows for custom component registration.
 */

import React from 'react';

// Component interfaces for type safety
export interface ComponentRegistryEntry {
  component: React.ComponentType<any>;
  displayName?: string;
  props?: Record<string, any>;
}

export interface ComponentRegistry {
  [componentName: string]: React.ComponentType<any>;
}

/**
 * Default component implementations for common HTML elements and shadcn patterns
 */
const defaultComponents: ComponentRegistry = {
  // Basic HTML elements
  div: 'div' as any,
  span: 'span' as any,
  p: 'p' as any,
  h1: 'h1' as any,
  h2: 'h2' as any,
  h3: 'h3' as any,
  h4: 'h4' as any,
  h5: 'h5' as any,
  h6: 'h6' as any,
  button: 'button' as any,
  input: 'input' as any,
  textarea: 'textarea' as any,
  form: 'form' as any,
  label: 'label' as any,
  select: 'select' as any,
  option: 'option' as any,
  img: 'img' as any,
  a: 'a' as any,
  ul: 'ul' as any,
  ol: 'ol' as any,
  li: 'li' as any,
  table: 'table' as any,
  thead: 'thead' as any,
  tbody: 'tbody' as any,
  tr: 'tr' as any,
  th: 'th' as any,
  td: 'td' as any,
  section: 'section' as any,
  article: 'article' as any,
  header: 'header' as any,
  footer: 'footer' as any,
  nav: 'nav' as any,
  main: 'main' as any,
  aside: 'aside' as any,
  
  // Common shadcn/ui components (as simplified versions for now)
  Card: ({ children, className = '', ...props }: any) => 
    React.createElement('div', { 
      className: `bg-card text-card-foreground rounded-xl border shadow-sm ${className}`, 
      ...props 
    }, children),
    
  CardHeader: ({ children, className = '', ...props }: any) => 
    React.createElement('div', { 
      className: `flex flex-col gap-1.5 p-6 ${className}`, 
      ...props 
    }, children),
    
  CardTitle: ({ children, className = '', ...props }: any) => 
    React.createElement('h3', { 
      className: `font-semibold leading-none tracking-tight ${className}`, 
      ...props 
    }, children),
    
  CardDescription: ({ children, className = '', ...props }: any) => 
    React.createElement('p', { 
      className: `text-sm text-muted-foreground ${className}`, 
      ...props 
    }, children),
    
  CardContent: ({ children, className = '', ...props }: any) => 
    React.createElement('div', { 
      className: `p-6 pt-0 ${className}`, 
      ...props 
    }, children),
    
  CardFooter: ({ children, className = '', ...props }: any) => 
    React.createElement('div', { 
      className: `flex items-center p-6 pt-0 ${className}`, 
      ...props 
    }, children),
    
  Button: ({ children, variant = 'default', size = 'default', className = '', ...props }: any) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
    
    const variants = {
      default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
      destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
      outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    };
    
    const sizes = {
      default: 'h-9 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-10 rounded-md px-8',
      icon: 'h-9 w-9',
    };
    
    return React.createElement('button', {
      className: `${baseClasses} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`,
      ...props
    }, children);
  },
  
  Input: ({ className = '', type = 'text', ...props }: any) => 
    React.createElement('input', {
      type,
      className: `flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`,
      ...props
    }),
    
  Label: ({ children, className = '', ...props }: any) => 
    React.createElement('label', {
      className: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`,
      ...props
    }, children),
    
  Textarea: ({ className = '', ...props }: any) => 
    React.createElement('textarea', {
      className: `flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`,
      ...props
    }),
    
  Table: ({ children, className = '', ...props }: any) => 
    React.createElement('div', { className: 'relative w-full overflow-auto' },
      React.createElement('table', {
        className: `w-full caption-bottom text-sm ${className}`,
        ...props
      }, children)
    ),
    
  TableHeader: ({ children, className = '', ...props }: any) => 
    React.createElement('thead', {
      className: `[&_tr]:border-b ${className}`,
      ...props
    }, children),
    
  TableBody: ({ children, className = '', ...props }: any) => 
    React.createElement('tbody', {
      className: `[&_tr:last-child]:border-0 ${className}`,
      ...props
    }, children),
    
  TableRow: ({ children, className = '', ...props }: any) => 
    React.createElement('tr', {
      className: `border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${className}`,
      ...props
    }, children),
    
  TableHead: ({ children, className = '', ...props }: any) => 
    React.createElement('th', {
      className: `h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] ${className}`,
      ...props
    }, children),
    
  TableCell: ({ children, className = '', ...props }: any) => 
    React.createElement('td', {
      className: `p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] ${className}`,
      ...props
    }, children),
    
  Badge: ({ children, variant = 'default', className = '', ...props }: any) => {
    const baseClasses = 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
    
    const variants = {
      default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
      secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
      outline: 'text-foreground',
    };
    
    return React.createElement('div', {
      className: `${baseClasses} ${variants[variant] || variants.default} ${className}`,
      ...props
    }, children);
  },
  
  Alert: ({ children, variant = 'default', className = '', ...props }: any) => {
    const baseClasses = 'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7';
    
    const variants = {
      default: 'bg-background text-foreground',
      destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
    };
    
    return React.createElement('div', {
      className: `${baseClasses} ${variants[variant] || variants.default} ${className}`,
      role: 'alert',
      ...props
    }, children);
  },
  
  AlertDescription: ({ children, className = '', ...props }: any) => 
    React.createElement('div', {
      className: `text-sm [&_p]:leading-relaxed ${className}`,
      ...props
    }, children),
    
  // Accordion Components
  Accordion: ({ children, type = 'single', collapsible = false, className = '', defaultValue, ...props }: any) => {
    const [openItems, setOpenItems] = React.useState<string[]>(() => 
      defaultValue ? [defaultValue] : []
    );
    
    const toggleItem = (value: string) => {
      if (type === 'single') {
        setOpenItems(prev => prev.includes(value) ? [] : [value]);
      } else {
        setOpenItems(prev => 
          prev.includes(value) 
            ? prev.filter(item => item !== value)
            : [...prev, value]
        );
      }
    };
    
    return React.createElement('div', {
      className: `${className}`,
      'data-orientation': 'vertical',
      ...props
    }, React.Children.map(children, child => 
      React.isValidElement(child) 
        ? React.cloneElement(child, { openItems, toggleItem } as any)
        : child
    ));
  },
  
  AccordionItem: ({ children, value, openItems = [], toggleItem, className = '', ...props }: any) => {
    const isOpen = openItems.includes(value);
    
    // Filter out internal props that shouldn't be passed to DOM
    const { openItems: _, toggleItem: __, ...domProps } = props;
    
    return React.createElement('div', {
      className: `border-b ${className}`,
      'data-state': isOpen ? 'open' : 'closed',
      ...domProps
    }, React.Children.map(children, child => 
      React.isValidElement(child) 
        ? React.cloneElement(child, { value, isOpen, toggleItem } as any)
        : child
    ));
  },
  
  AccordionTrigger: ({ children, value, isOpen = false, toggleItem, className = '', ...props }: any) => {
    // Filter out internal props that shouldn't be passed to DOM
    const { value: _, isOpen: __, toggleItem: ___, ...domProps } = props;
    
    return React.createElement('button', {
      className: `flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180 ${className}`,
      'data-state': isOpen ? 'open' : 'closed',
      onClick: () => toggleItem?.(value),
      ...domProps
    }, [
      React.createElement('span', { key: 'text' }, children),
      React.createElement('svg', {
        key: 'icon',
        className: 'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
        xmlns: 'http://www.w3.org/2000/svg',
        width: '24', 
        height: '24',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: '2',
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }, React.createElement('path', { d: 'm6 9 6 6 6-6' }))
    ]);
  },
    
  AccordionContent: ({ children, value, isOpen = false, toggleItem, className = '', ...props }: any) => {
    // Filter out internal props that shouldn't be passed to DOM
    const { value: _, isOpen: __, toggleItem: ___, ...domProps } = props;
    
    return React.createElement('div', {
      className: `overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down ${className}`,
      'data-state': isOpen ? 'open' : 'closed',
      style: { 
        display: isOpen ? 'block' : 'none' 
      },
      ...domProps
    }, React.createElement('div', { 
      className: 'pb-4 pt-0' 
    }, children));
  },
};

/**
 * ComponentRegistry service for managing component resolution
 */
export class ComponentRegistryService {
  private static instance: ComponentRegistryService | null = null;
  private registry: ComponentRegistry = { ...defaultComponents };

  /**
   * Get singleton instance
   */
  public static getInstance(): ComponentRegistryService {
    if (!ComponentRegistryService.instance) {
      ComponentRegistryService.instance = new ComponentRegistryService();
    }
    return ComponentRegistryService.instance;
  }

  /**
   * Register a component
   */
  public register(name: string, component: React.ComponentType<any>): void {
    this.registry[name] = component;
    console.log(`📦 ComponentRegistry: Registered component "${name}"`);
  }

  /**
   * Register multiple components
   */
  public registerMany(components: ComponentRegistry): void {
    Object.entries(components).forEach(([name, component]) => {
      this.register(name, component);
    });
  }

  /**
   * Resolve a component by name
   */
  public resolve(name: string): React.ComponentType<any> | undefined {
    return this.registry[name];
  }

  /**
   * Get all registered components
   */
  public getAll(): ComponentRegistry {
    return { ...this.registry };
  }

  /**
   * Get component names
   */
  public getComponentNames(): string[] {
    return Object.keys(this.registry);
  }

  /**
   * Check if a component is registered
   */
  public has(name: string): boolean {
    return name in this.registry;
  }

  /**
   * Unregister a component
   */
  public unregister(name: string): boolean {
    if (this.has(name)) {
      delete this.registry[name];
      console.log(`📦 ComponentRegistry: Unregistered component "${name}"`);
      return true;
    }
    return false;
  }

  /**
   * Clear all custom components (keeps default components)
   */
  public clearCustom(): void {
    this.registry = { ...defaultComponents };
    console.log('📦 ComponentRegistry: Cleared all custom components');
  }

  /**
   * Get registry info for debugging
   */
  public getInfo(): { componentCount: number; components: string[] } {
    const components = this.getComponentNames();
    return {
      componentCount: components.length,
      components: components.sort(),
    };
  }
}

// Export singleton instance
export const componentRegistry = ComponentRegistryService.getInstance();

// Export utility function for external component registration
export const registerComponents = (components: ComponentRegistry): void => {
  componentRegistry.registerMany(components);
};

// Export utility function for external component registration with shadcn components
export const registerShadcnComponents = async (): Promise<void> => {
  try {
    // Try to import actual shadcn components from the example app
    // This would be used when the package is integrated into a project with shadcn
    
    console.log('📦 ComponentRegistry: Using built-in shadcn component implementations');
    
    // The default components are already loaded, so we're good to go
    // In a real implementation, you could dynamically import actual shadcn components here
    
  } catch (error) {
    console.warn('📦 ComponentRegistry: Could not load external shadcn components, using built-in implementations');
  }
};