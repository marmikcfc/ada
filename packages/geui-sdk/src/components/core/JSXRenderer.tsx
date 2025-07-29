/**
 * JSXRenderer - Runtime JSX compilation and rendering component
 * 
 * This component takes JSX strings from the backend and compiles them to React elements
 * using the JSXCompilerService and ComponentRegistry. It provides error boundaries
 * and loading states for a smooth user experience.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { jsxCompiler, JSXCompilerOptions } from '../../services/JSXCompilerService';
import { componentRegistry, ComponentRegistry } from '../../services/ComponentRegistry';

export interface JSXRendererProps {
  /** JSX string to compile and render */
  jsx: string;
  /** Additional components to register for this render */
  components?: ComponentRegistry;
  /** Compiler options */
  compilerOptions?: JSXCompilerOptions;
  /** Loading component */
  fallback?: React.ReactNode;
  /** Error boundary component */
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  /** Callback for compilation errors */
  onError?: (error: Error) => void;
  /** Callback for successful compilation */
  onSuccess?: (element: React.ReactElement) => void;
  /** CSS class name for container */
  className?: string;
  /** Inline styles for container */
  style?: React.CSSProperties;
  /** Whether to show debug information */
  debug?: boolean;
}

interface JSXRenderState {
  element: React.ReactElement | null;
  loading: boolean;
  error: Error | null;
  compilationTime: number | null;
}

/**
 * Default error fallback component
 */
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="jsx-renderer-error p-4 border border-red-200 rounded-lg bg-red-50 text-red-900">
    <h4 className="font-semibold mb-2">JSX Compilation Error</h4>
    <p className="text-sm mb-3">{error.message}</p>
    <button 
      onClick={retry}
      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
    >
      Retry
    </button>
  </div>
);

/**
 * Default loading fallback component
 */
const DefaultLoadingFallback: React.FC = () => (
  <div className="jsx-renderer-loading p-4 text-center text-gray-600">
    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
    <p className="text-sm">Compiling JSX...</p>
  </div>
);

/**
 * JSXRenderer component
 */
export const JSXRenderer: React.FC<JSXRendererProps> = ({
  jsx,
  components = {},
  compilerOptions = {},
  fallback,
  errorFallback: ErrorFallback = DefaultErrorFallback,
  onError,
  onSuccess,
  className = '',
  style,
  debug = false,
}) => {
  const [state, setState] = useState<JSXRenderState>({
    element: null,
    loading: false,
    error: null,
    compilationTime: null,
  });

  // Remove the problematic memoized registry that was causing infinite loops

  // Compile JSX function with stable dependencies
  const compileJSX = useCallback(async () => {
    if (!jsx || jsx.trim() === '') {
      setState(prev => ({ ...prev, element: null, loading: false, error: null }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    const startTime = performance.now();

    try {
      // Ensure compiler is initialized
      await jsxCompiler.initialize();

      // Register any additional components
      if (Object.keys(components).length > 0) {
        componentRegistry.registerMany(components);
      }

      // Create registry inside the function to avoid dependency issues
      const currentRegistry = {
        ...componentRegistry.getAll(),
        ...components,
      };

      // Compile JSX to React element
      const element = await jsxCompiler.compileToElement(jsx, currentRegistry);
      
      const compilationTime = performance.now() - startTime;

      setState({
        element,
        loading: false,
        error: null,
        compilationTime,
      });

      if (debug) {
        console.log(`🎯 JSXRenderer: Compilation successful in ${compilationTime.toFixed(2)}ms`);
      }

      onSuccess?.(element);

    } catch (error) {
      const compilationTime = performance.now() - startTime;
      const jsxError = error instanceof Error ? error : new Error(String(error));
      
      setState({
        element: null,
        loading: false,
        error: jsxError,
        compilationTime,
      });

      if (debug) {
        console.error(`❌ JSXRenderer: Compilation failed in ${compilationTime.toFixed(2)}ms:`, jsxError);
      }

      onError?.(jsxError);
    }
  }, [jsx]); // Only depend on jsx to prevent infinite loops

  // Retry function
  const retry = useCallback(() => {
    compileJSX();
  }, [compileJSX]);

  // Compile when JSX changes
  useEffect(() => {
    if (jsx && jsx.trim() !== '') {
      compileJSX();
    }
  }, [jsx]); // Remove compileJSX dependency to prevent infinite loops

  // Debug information
  const debugInfo = useMemo(() => {
    if (!debug) return null;

    const registrySize = Object.keys(componentRegistry.getAll()).length + Object.keys(components).length;

    return (
      <div className="jsx-renderer-debug mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
        <div><strong>Status:</strong> {state.loading ? 'Compiling' : state.error ? 'Error' : 'Ready'}</div>
        {state.compilationTime && (
          <div><strong>Compilation Time:</strong> {state.compilationTime.toFixed(2)}ms</div>
        )}
        <div><strong>JSX Length:</strong> {jsx.length} characters</div>
        <div><strong>Components Available:</strong> {registrySize}</div>
        <div><strong>Compiler Ready:</strong> {jsxCompiler.isReady() ? 'Yes' : 'No'}</div>
      </div>
    );
  }, [debug, state, jsx.length, components]);

  // Render loading state
  if (state.loading) {
    return (
      <div className={`jsx-renderer jsx-renderer--loading ${className}`} style={style}>
        {fallback || <DefaultLoadingFallback />}
        {debugInfo}
      </div>
    );
  }

  // Render error state
  if (state.error) {
    return (
      <div className={`jsx-renderer jsx-renderer--error ${className}`} style={style}>
        <ErrorFallback error={state.error} retry={retry} />
        {debugInfo}
      </div>
    );
  }

  // Render compiled element
  if (state.element) {
    return (
      <div className={`jsx-renderer jsx-renderer--ready ${className}`} style={style}>
        <JSXErrorBoundary 
          onError={onError}
          fallback={<ErrorFallback error={new Error('Runtime error in compiled JSX')} retry={retry} />}
        >
          {state.element}
        </JSXErrorBoundary>
        {debugInfo}
      </div>
    );
  }

  // Empty state
  return (
    <div className={`jsx-renderer jsx-renderer--empty ${className}`} style={style}>
      {debug && <div className="text-gray-500 text-sm">No JSX to render</div>}
      {debugInfo}
    </div>
  );
};

/**
 * Error boundary for runtime errors in compiled JSX
 */
interface JSXErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onError?: (error: Error) => void;
}

interface JSXErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class JSXErrorBoundary extends React.Component<JSXErrorBoundaryProps, JSXErrorBoundaryState> {
  constructor(props: JSXErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): JSXErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ JSXRenderer: Runtime error in compiled JSX:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

/**
 * Hook for programmatic JSX compilation
 */
export const useJSXCompiler = () => {
  const [isReady, setIsReady] = useState(jsxCompiler.isReady());

  useEffect(() => {
    const initializeCompiler = async () => {
      if (!jsxCompiler.isReady()) {
        await jsxCompiler.initialize();
        setIsReady(true);
      }
    };

    initializeCompiler();
  }, []);

  const compile = useCallback(async (jsx: string, components: ComponentRegistry = {}) => {
    const fullRegistry = {
      ...componentRegistry.getAll(),
      ...components,
    };

    return jsxCompiler.compileToElement(jsx, fullRegistry);
  }, []);

  return {
    compile,
    isReady,
    compiler: jsxCompiler,
    registry: componentRegistry,
  };
};

export default JSXRenderer;