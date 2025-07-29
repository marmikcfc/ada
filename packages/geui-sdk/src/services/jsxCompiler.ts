/**
 * JSX Runtime Compiler Service
 * 
 * Provides runtime compilation of JSX strings into executable React components
 * using Babel Standalone with caching and error handling.
 */

import React from 'react';

// Type definitions for Babel Standalone
interface BabelStandalone {
  transform: (code: string, options: BabelTransformOptions) => BabelTransformResult;
}

interface BabelTransformOptions {
  presets: string[];
  plugins?: string[];
  filename?: string;
}

interface BabelTransformResult {
  code: string;
  map?: any;
  ast?: any;
}

interface CompilationResult {
  success: boolean;
  component?: React.ComponentType<any>;
  error?: string;
  compiledCode?: string;
}

interface CacheEntry {
  component: React.ComponentType<any>;
  compiledCode: string;
  timestamp: number;
}

/**
 * JSX Compiler class that handles runtime compilation of JSX strings
 */
export class JSXCompiler {
  private babel: BabelStandalone | null = null;
  private cache = new Map<string, CacheEntry>();
  private readonly maxCacheSize = 100;
  private readonly cacheExpiryMs = 5 * 60 * 1000; // 5 minutes
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize Babel Standalone (lazy loading)
   */
  private async initializeBabel(): Promise<void> {
    if (this.babel) return;

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      try {
        // Dynamic import of Babel Standalone
        const babelModule = await import('@babel/standalone');
        this.babel = babelModule.default || babelModule;
        
        // Register presets if not already available
        if (this.babel && typeof this.babel.transform === 'function') {
          console.log('JSX Compiler: Babel Standalone initialized successfully');
        } else {
          throw new Error('Babel Standalone not properly loaded');
        }
      } catch (error) {
        console.error('JSX Compiler: Failed to initialize Babel Standalone:', error);
        throw new Error(`Failed to initialize JSX compiler: ${error}`);
      }
    })();

    await this.initPromise;
  }

  /**
   * Generate a cache key for the JSX content
   */
  private generateCacheKey(jsxContent: string, componentName: string): string {
    // Simple hash function for cache key
    let hash = 0;
    const str = `${jsxContent}:${componentName}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `jsx_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheExpiryMs) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    // If cache is still too large, remove oldest entries
    if (this.cache.size > this.maxCacheSize) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const entriesToRemove = sortedEntries.slice(0, this.cache.size - this.maxCacheSize);
      for (const [key] of entriesToRemove) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Validate JSX content for security and basic syntax
   */
  private validateJSXContent(jsxContent: string): { valid: boolean; error?: string } {
    // Basic security checks
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /document\s*\./,
      /window\s*\./,
      /import\s+/,
      /require\s*\(/,
      /__proto__/,
      /constructor\s*\./,
      /prototype\s*\./,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(jsxContent)) {
        return {
          valid: false,
          error: `Potentially unsafe code detected: ${pattern.source}`
        };
      }
    }

    // Check for basic function structure
    if (!jsxContent.trim().startsWith('function ') && !jsxContent.trim().includes('=>')) {
      return {
        valid: false,
        error: 'JSX content must contain a valid React component function'
      };
    }

    return { valid: true };
  }

  /**
   * Create a safe execution environment for the compiled code
   */
  private createSafeEnvironment(): { [key: string]: any } {
    return {
      React,
      useState: React.useState,
      useEffect: React.useEffect,
      useCallback: React.useCallback,
      useMemo: React.useMemo,
      useRef: React.useRef,
      console: {
        log: console.log,
        warn: console.warn,
        error: console.error,
      },
      // Add other safe globals as needed
    };
  }

  /**
   * Compile JSX string into a React component
   */
  async compile(
    jsxContent: string,
    componentName: string = 'DynamicComponent'
  ): Promise<CompilationResult> {
    try {
      await this.initializeBabel();
      
      if (!this.babel) {
        return {
          success: false,
          error: 'Babel compiler not initialized'
        };
      }

      // Clean cache periodically
      this.cleanCache();

      // Check cache first
      const cacheKey = this.generateCacheKey(jsxContent, componentName);
      const cachedEntry = this.cache.get(cacheKey);
      
      if (cachedEntry && (Date.now() - cachedEntry.timestamp) < this.cacheExpiryMs) {
        console.log('JSX Compiler: Using cached component');
        return {
          success: true,
          component: cachedEntry.component,
          compiledCode: cachedEntry.compiledCode
        };
      }

      // Validate JSX content
      const validation = this.validateJSXContent(jsxContent);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Transform JSX to JavaScript
      const transformResult = this.babel.transform(jsxContent, {
        presets: ['react', 'typescript'],
        filename: `${componentName}.jsx`
      });

      if (!transformResult.code) {
        return {
          success: false,
          error: 'Babel transformation resulted in empty code'
        };
      }

      // Create safe execution environment
      const safeEnv = this.createSafeEnvironment();

      // Execute the compiled code in a controlled environment
      let compiledComponent: React.ComponentType<any>;
      
      try {
        // Create a function that returns the component
        const execCode = `
          (function(React, useState, useEffect, useCallback, useMemo, useRef, console) {
            ${transformResult.code}
            return ${componentName};
          })
        `;

        const execFunction = new Function('return ' + execCode)();
        compiledComponent = execFunction(
          safeEnv.React,
          safeEnv.useState,
          safeEnv.useEffect,
          safeEnv.useCallback,
          safeEnv.useMemo,
          safeEnv.useRef,
          safeEnv.console
        );

        if (typeof compiledComponent !== 'function') {
          return {
            success: false,
            error: `Compiled code did not export a valid React component function: ${componentName}`
          };
        }

      } catch (execError) {
        const compilationError = new JSXCompilationError(
          `Runtime execution error: ${execError}`,
          jsxContent,
          execError instanceof Error ? execError : new Error(String(execError))
        );
        return {
          success: false,
          error: compilationError.message
        };
      }

      // Cache the compiled component
      this.cache.set(cacheKey, {
        component: compiledComponent,
        compiledCode: transformResult.code,
        timestamp: Date.now()
      });

      console.log(`JSX Compiler: Successfully compiled component "${componentName}"`);

      return {
        success: true,
        component: compiledComponent,
        compiledCode: transformResult.code
      };

    } catch (error) {
      console.error('JSX Compiler: Compilation failed:', error);
      const compilationError = new JSXCompilationError(
        `Compilation failed: ${error}`,
        jsxContent,
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        success: false,
        error: compilationError.message
      };
    }
  }

  /**
   * Clear the compilation cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('JSX Compiler: Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }

  /**
   * Check if compiler is ready
   */
  isReady(): boolean {
    return this.babel !== null;
  }
}

// Custom JSX compilation error class
export class JSXCompilationError extends Error {
  constructor(
    message: string,
    public jsxCode: string,
    public originalError: Error
  ) {
    super(message);
    this.name = 'JSXCompilationError';
  }
}

// Utility functions for easier usage
export const compileJSX = async (jsxContent: string, componentName?: string): Promise<CompilationResult> => {
  return jsxCompiler.compile(jsxContent, componentName);
};

export const initializeJSXCompiler = async (): Promise<void> => {
  // The compiler initializes lazily, but this can be used to warm it up
  await jsxCompiler.compile('function Test() { return <div>test</div>; }', 'WarmupComponent');
  jsxCompiler.clearCache(); // Clear the warmup component
};

// Export singleton instance
export const jsxCompiler = new JSXCompiler();

// Export types for external use
export type { CompilationResult };