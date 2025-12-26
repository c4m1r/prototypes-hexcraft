import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI or default error message
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 bg-red-900 bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg border border-red-500 max-w-md mx-4">
            <h2 className="text-red-400 text-xl font-bold mb-4">Oops! Something went wrong</h2>
            <p className="text-gray-300 mb-4">
              The application encountered an unexpected error. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details className="mb-4">
                <summary className="text-gray-400 cursor-pointer hover:text-gray-300">
                  Error details (click to expand)
                </summary>
                <pre className="text-xs text-gray-500 mt-2 p-2 bg-gray-900 rounded overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different parts of the app
export const GameErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg border border-red-500 max-w-md mx-4">
          <h2 className="text-red-400 text-xl font-bold mb-4">Game Error</h2>
          <p className="text-gray-300 mb-4">
            There was a problem with the game. This might be due to WebGL not being supported or insufficient graphics memory.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
          >
            Reload Game
          </button>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('Game Error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const UIErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="fixed top-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
        <h3 className="font-bold mb-2">UI Error</h3>
        <p className="text-sm mb-2">Something went wrong with the interface.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-800 hover:bg-red-900 text-white px-3 py-1 rounded text-sm"
        >
          Reload
        </button>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('UI Error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);
