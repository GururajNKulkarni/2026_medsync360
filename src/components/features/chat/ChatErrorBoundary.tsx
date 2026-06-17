import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Chat Error Boundary caught an error:', error, errorInfo);
    
    // Log to our observability system
    if (window.logger) {
      window.logger.log('error', 'ChatErrorBoundary', error.message, {
        errorName: error.name,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        route: window.location.pathname
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-b from-red-50 to-red-100 p-8">
          <div className="text-center max-w-md p-6 bg-white rounded-2xl shadow-lg border border-red-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Chat Temporarily Unavailable
            </h3>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              We encountered an unexpected error while loading the chat. This is usually temporary and can be resolved by refreshing.
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300"
              >
                Refresh Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-red-600 overflow-auto max-h-32">
                  <div><strong>Error:</strong> {this.state.error.message}</div>
                  <div><strong>Stack:</strong></div>
                  <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping chat components with error boundary
export const withChatErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  return (props: P) => (
    <ChatErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ChatErrorBoundary>
  );
};

// Simple fallback component for specific chat sections
export const ChatSectionFallback: React.FC<{ section: string }> = ({ section }) => (
  <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
    <div className="text-center">
      <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
      <p className="text-sm text-gray-600">
        {section} temporarily unavailable
      </p>
    </div>
  </div>
); 