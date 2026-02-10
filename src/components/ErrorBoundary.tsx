import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("❌ [ERROR BOUNDARY] Caught error:", error);
    console.error("❌ [ERROR BOUNDARY] Error info:", errorInfo);
    
    // Log to console for debugging
    if (typeof window !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.error("❌ [ERROR BOUNDARY] User Agent:", navigator.userAgent);
      console.error("❌ [ERROR BOUNDARY] Is Mobile:", isMobile);
      console.error("❌ [ERROR BOUNDARY] Current URL:", window.location.href);
      console.error("❌ [ERROR BOUNDARY] API Base URL:", import.meta.env.VITE_API_URL || 'Not set');
    }
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-card border-2 border-red-500/50 rounded-lg p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Something went wrong
            </h1>
            <p className="text-muted-foreground mb-6">
              The application encountered an error. Please try refreshing the page.
            </p>
            
            {this.state.error && (
              <div className="bg-background border border-red-500/30 rounded p-4 mb-6 text-left">
                <p className="text-red-700 text-sm font-mono break-all">
                  {this.state.error.message || "Unknown error"}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-muted-foreground text-xs cursor-pointer">
                      Stack trace
                    </summary>
                    <pre className="text-foreground0 text-xs mt-2 overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button
                onClick={this.handleReload}
                className="bg-primary text-primary-foreground hover:bg-primary/80"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="border-border text-muted-foreground hover:bg-muted/50"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            <div className="mt-6 text-xs text-foreground0">
              <p>If this problem persists, please contact support.</p>
              <p className="mt-2">
                User Agent: {typeof window !== 'undefined' ? navigator.userAgent : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

