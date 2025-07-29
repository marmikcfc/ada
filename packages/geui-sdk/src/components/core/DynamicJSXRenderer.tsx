/**
 * Dynamic JSX Renderer Component
 * 
 * Renders JSX components compiled at runtime with error boundaries,
 * context injection, and proper lifecycle management.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { jsxCompiler, CompilationResult } from '../../services/jsxCompiler';

interface DynamicJSXRendererProps {
  /** The JSX content string to compile and render */
  jsxContent: string;
  /** Name of the component function */
  componentName: string;
  /** Props to pass to the dynamically compiled component */
  componentProps?: Record<string, any>;
  /** Framework identifier */
  framework?: string;
  /** Optional title */
  title?: string;
  /** Callback handlers for component interactions */
  onButtonClick?: (action: string, context?: any) => void;
  onFormSubmit?: (formId: string, formData: any) => void;
  onInputChange?: (fieldName: string, value: any) => void;
  /** Custom error fallback component */
  errorFallback?: React.ComponentType<{ error: string; jsxContent: string; onRetry: () => void }>;
  /** Loading component */
  loadingComponent?: React.ComponentType;
  /** Enable debug mode */
  debug?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: string | null;
  errorInfo: any;
}

/**
 * Error boundary class component for catching runtime errors in dynamic components
 */
class DynamicComponentErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    onError: (error: string, errorInfo: any) => void;
    fallback: React.ComponentType<{ error: string; errorInfo: any; onRetry: () => void }>;
    onRetry: () => void;
  },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DynamicJSXRenderer: Component error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError(error.message, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      return (
        <FallbackComponent
          error={this.state.error || 'Unknown error'}
          errorInfo={this.state.errorInfo}
          onRetry={() => {
            this.setState({ hasError: false, error: null, errorInfo: null });
            this.props.onRetry();
          }}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
const DefaultErrorFallback: React.FC<{
  error: string;
  jsxContent: string;
  onRetry: () => void;
}> = ({ error, jsxContent, onRetry }) => (
  <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
    <h3 className="text-lg font-semibold text-red-800 mb-2">
      Dynamic Component Error
    </h3>
    <p className="text-red-700 mb-3 text-sm">
      {error}
    </p>
    <details className="mb-3">
      <summary className="text-red-600 cursor-pointer text-sm">
        View JSX Source
      </summary>
      <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-32 text-red-800">
        {jsxContent}
      </pre>
    </details>
    <button
      onClick={onRetry}
      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
    >
      Retry Compilation
    </button>
  </div>
);

/**
 * Default loading component
 */
const DefaultLoadingComponent: React.FC = () => (
  <div className="p-4 flex items-center justify-center">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Compiling component...</span>
  </div>
);

/**
 * Runtime error fallback for error boundary
 */
const RuntimeErrorFallback: React.FC<{
  error: string;
  errorInfo: any;
  onRetry: () => void;
}> = ({ error, errorInfo, onRetry }) => (
  <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
    <h3 className="text-lg font-semibold text-red-800 mb-2">
      Component Runtime Error
    </h3>
    <p className="text-red-700 mb-3 text-sm">
      {error}
    </p>
    {errorInfo && (
      <details className="mb-3">
        <summary className="text-red-600 cursor-pointer text-sm">
          Error Details
        </summary>
        <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-32 text-red-800">
          {errorInfo.componentStack}
        </pre>
      </details>
    )}
    <button
      onClick={onRetry}
      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
    >
      Retry
    </button>
  </div>
);

/**
 * Main DynamicJSXRenderer component
 */
export const DynamicJSXRenderer: React.FC<DynamicJSXRendererProps> = ({
  jsxContent,
  componentName,
  componentProps = {},
  framework = 'shadcn',
  title,
  onButtonClick,
  onFormSubmit,
  onInputChange,
  errorFallback: ErrorFallback = DefaultErrorFallback,
  loadingComponent: LoadingComponent = DefaultLoadingComponent,
  debug = false,
}) => {
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationAttempts, setCompilationAttempts] = useState(0);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  // Memoize the props to pass to the dynamic component
  const dynamicComponentProps = useMemo(() => ({
    ...componentProps,
    onButtonClick,
    onFormSubmit,
    onInputChange,
    framework,
    title,
  }), [componentProps, onButtonClick, onFormSubmit, onInputChange, framework, title]);

  // Handle runtime errors from error boundary
  const handleRuntimeError = useCallback((error: string, errorInfo: any) => {
    setRuntimeError(error);
    if (debug) {
      console.error('DynamicJSXRenderer: Runtime error:', error, errorInfo);
    }
  }, [debug]);

  // Compile the JSX content
  const compileComponent = useCallback(async () => {
    if (!jsxContent?.trim()) {
      setCompilationResult({
        success: false,
        error: 'No JSX content provided'
      });
      return;
    }

    setIsCompiling(true);
    setRuntimeError(null);
    setCompilationAttempts(prev => prev + 1);

    try {
      if (debug) {
        console.log('DynamicJSXRenderer: Starting compilation:', {
          componentName,
          jsxLength: jsxContent.length,
          attempt: compilationAttempts + 1
        });
      }

      const result = await jsxCompiler.compile(jsxContent, componentName);
      setCompilationResult(result);

      if (result.success && debug) {
        console.log('DynamicJSXRenderer: Compilation successful:', {
          componentName,
          cacheStats: jsxCompiler.getCacheStats()
        });
      } else if (!result.success) {
        console.error('DynamicJSXRenderer: Compilation failed:', result.error);
      }

    } catch (error) {
      console.error('DynamicJSXRenderer: Unexpected compilation error:', error);
      setCompilationResult({
        success: false,
        error: `Unexpected error: ${error}`
      });
    } finally {
      setIsCompiling(false);
    }
  }, [jsxContent, componentName, debug, compilationAttempts]);

  // Retry compilation
  const retryCompilation = useCallback(() => {
    setCompilationResult(null);
    setRuntimeError(null);
    compileComponent();
  }, [compileComponent]);

  // Compile component when inputs change
  useEffect(() => {
    compileComponent();
  }, [compileComponent]);

  // Handle loading state
  if (isCompiling || !compilationResult) {
    return <LoadingComponent />;
  }

  // Handle compilation errors
  if (!compilationResult.success || !compilationResult.component) {
    return (
      <ErrorFallback
        error={compilationResult.error || 'Unknown compilation error'}
        jsxContent={jsxContent}
        onRetry={retryCompilation}
      />
    );
  }

  // Render the successfully compiled component with error boundary
  const DynamicComponent = compilationResult.component;

  return (
    <DynamicComponentErrorBoundary
      onError={handleRuntimeError}
      fallback={RuntimeErrorFallback}
      onRetry={retryCompilation}
    >
      <div data-dynamic-component={componentName} data-framework={framework}>
        <DynamicComponent {...dynamicComponentProps} />
      </div>
    </DynamicComponentErrorBoundary>
  );
};

export default DynamicJSXRenderer;