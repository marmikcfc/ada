/**
 * JSXCompilerService - Runtime JSX compilation using Babel Standalone
 * 
 * This service compiles JSX strings to React elements at runtime using @babel/standalone,
 * which provides excellent browser compatibility without WebAssembly complexity.
 */

declare global {
  interface Window {
    Babel: any;
  }
}

export interface JSXCompilerOptions {
  /** React import style - 'automatic' for React 17+ JSX transform */
  jsx?: 'transform' | 'preserve';
  /** Target JavaScript version */
  target?: 'es5' | 'es2015' | 'es2016' | 'es2017' | 'es2018' | 'es2019' | 'es2020' | 'es2021' | 'es2022';
  /** Enable React development mode transforms */
  development?: boolean;
}

export class JSXCompilerService {
  private static instance: JSXCompilerService | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Get singleton instance
   */
  public static getInstance(): JSXCompilerService {
    if (!JSXCompilerService.instance) {
      JSXCompilerService.instance = new JSXCompilerService();
    }
    return JSXCompilerService.instance;
  }

  /**
   * Initialize the Babel Standalone compiler
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      // Load Babel standalone if not already loaded
      if (!window.Babel) {
        await this.loadBabelStandalone();
      }
      
      this.initialized = true;
      console.log('🚀 JSXCompilerService: Babel standalone initialized successfully');
    } catch (error) {
      console.error('❌ JSXCompilerService: Failed to initialize Babel standalone:', error);
      throw new Error(`JSX compiler initialization failed: ${error}`);
    }
  }
  
  private async loadBabelStandalone(): Promise<void> {
    // Dynamically import Babel standalone
    const babelStandalone = await import('@babel/standalone');
    window.Babel = babelStandalone;
    console.log('📦 Babel standalone loaded successfully');
  }

  /**
   * Compile JSX string to JavaScript
   */
  public async compile(jsxCode: string, options: JSXCompilerOptions = {}): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = window.Babel.transform(jsxCode, {
        presets: [
          ['react', {
            runtime: 'classic', // Use classic React.createElement for better compatibility
            development: options.development ?? false,
          }]
        ],
        plugins: [],
      });

      return result.code;
    } catch (error) {
      console.error('❌ JSXCompilerService: Compilation failed:', error);
      throw new Error(`JSX compilation failed: ${error}`);
    }
  }

  /**
   * Compile JSX and evaluate to React element
   */
  public async compileToElement(jsxCode: string, componentRegistry: Record<string, any>): Promise<React.ReactElement> {
    try {
      // Add necessary imports and wrap in component function
      const wrappedCode = this.wrapJSXCode(jsxCode);
      
      // Compile JSX to JavaScript
      const compiledCode = await this.compile(wrappedCode);
      
      // Create evaluation context with React and component registry
      const React = await import('react');
      const evalContext = {
        React,
        ...componentRegistry,
      };
      
      // Debug logging removed to prevent log spam
      
      // Evaluate the compiled code
      const element = this.evaluateCode(compiledCode, evalContext);
      
      return element;
    } catch (error) {
      console.error('❌ JSXCompilerService: Failed to compile to element:', error);
      throw error;
    }
  }

  /**
   * Wrap JSX code in a component function for evaluation
   */
  private wrapJSXCode(jsxCode: string): string {
    // Clean up the JSX code - remove any wrapping functions/exports
    let cleanJSX = jsxCode.trim();
    
    // Remove export statements
    cleanJSX = cleanJSX.replace(/^export\s+(default\s+)?/gm, '');
    
    // If it's already a component function, use it as-is
    if (cleanJSX.includes('function ') || cleanJSX.includes('const ') || cleanJSX.includes('=>')) {
      return cleanJSX;
    }
    
    // Otherwise, wrap in a component function
    // Note: We don't use import statements as Babel will transform them
    return `
      function GeneratedComponent() {
        return (
          ${cleanJSX}
        );
      }
    `;
  }

  /**
   * Safely evaluate compiled JavaScript code
   */
  private evaluateCode(code: string, context: Record<string, any>): React.ReactElement {
    try {
      // Extract React for createElement calls
      const React = context.React;
      
      // Create a new function with the provided context
      const contextKeys = Object.keys(context);
      const contextValues = Object.values(context);
      
      // Babel transforms JSX to React.createElement calls
      // We need to extract the component function from the transformed code
      const wrappedCode = `
        ${code}
        
        // Return the component function
        if (typeof GeneratedComponent !== 'undefined') {
          return GeneratedComponent;
        } else {
          throw new Error('No GeneratedComponent function found in compiled code');
        }
      `;
      
      const func = new Function(...contextKeys, wrappedCode);
      const ComponentFunction = func(...contextValues);
      
      if (ComponentFunction === undefined) {
        throw new Error('Component function evaluation returned undefined. Check that GeneratedComponent is properly defined.');
      }
      
      // Create React element from the component
      return React.createElement(ComponentFunction);
    } catch (error) {
      console.error('❌ JSXCompilerService: Code evaluation failed:', error);
      console.error('Code that failed:', code);
      throw new Error(`Code evaluation failed: ${error}`);
    }
  }

  /**
   * Check if the compiler is ready to use
   */
  public isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get compiler info for debugging
   */
  public getInfo(): { initialized: boolean; ready: boolean } {
    return {
      initialized: this.initialized,
      ready: this.isReady(),
    };
  }
}

// Export singleton instance
export const jsxCompiler = JSXCompilerService.getInstance();