/**
 * React Error Boundary Component
 *
 * WHY ERROR BOUNDARIES MATTER:
 * In React, a JavaScript error in part of the UI shouldn't crash the whole app.
 * Error boundaries are React components that:
 * 1. Catch errors in their child component tree
 * 2. Log those errors
 * 3. Display a fallback UI instead of crashing
 *
 * WITHOUT THIS: One bug in GameCanvas would show a white screen.
 * WITH THIS: User sees a helpful error message and can try to recover.
 *
 * IMPORTANT LIMITATIONS:
 * - Error boundaries do NOT catch errors in:
 *   - Event handlers (use try/catch there)
 *   - Async code (use try/catch)
 *   - Server-side rendering
 *   - Errors thrown in the error boundary itself
 *
 * REACT 19 NOTE:
 * React 19 changed error handling behavior. This implementation is compatible
 * with both React 18 and 19 patterns.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface ErrorBoundaryProps {
    children: ReactNode;
    /** Name of the component being wrapped (for error messages) */
    componentName?: string;
    /** Optional callback when an error is caught */
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    /** Optional custom fallback UI */
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

// =============================================================================
// ERROR BOUNDARY COMPONENT
// =============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    /**
     * This lifecycle method is called after an error is thrown in a descendant.
     *
     * WHY static: React needs this to be static so it can be called during render
     * phase. It's used to update state so the next render shows fallback UI.
     */
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    /**
     * This lifecycle method is called after an error is thrown.
     *
     * WHY separate from getDerivedStateFromError: This method is for side effects
     * like logging. getDerivedStateFromError is only for updating state.
     */
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log the error for debugging
        console.error('ErrorBoundary caught an error:', error);
        console.error('Component stack:', errorInfo.componentStack);

        // Store error info for display
        this.setState({ errorInfo });

        // Call optional error callback
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    /**
     * Attempt to recover from the error by resetting state.
     *
     * WHY: Sometimes errors are transient (race conditions, bad data that gets
     * fixed). Allowing the user to retry can restore functionality.
     */
    handleRetry = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    /**
     * Reload the entire page (nuclear option).
     *
     * WHY: If the error corrupted state badly, a clean reload is safest.
     */
    handleReload = (): void => {
        window.location.reload();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback UI provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-gray-900 border border-red-500/30 rounded-lg m-4">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="text-red-500" size={32} />
                        <h2 className="text-xl font-bold text-red-400">
                            Something went wrong
                        </h2>
                    </div>

                    <p className="text-gray-400 text-center mb-4 max-w-md">
                        {this.props.componentName
                            ? `An error occurred in ${this.props.componentName}.`
                            : 'An error occurred while rendering this component.'}
                    </p>

                    {/* Error details (collapsible) */}
                    {this.state.error && (
                        <details className="w-full max-w-lg mb-4">
                            <summary className="cursor-pointer text-gray-500 hover:text-gray-300 flex items-center gap-2">
                                <Terminal size={14} />
                                <span>Technical details</span>
                            </summary>
                            <pre className="mt-2 p-3 bg-black/50 rounded text-xs text-red-300 overflow-auto max-h-32">
                                {this.state.error.message}
                                {this.state.error.stack && (
                                    <>
                                        {'\n\nStack trace:\n'}
                                        {this.state.error.stack}
                                    </>
                                )}
                            </pre>
                        </details>
                    )}

                    {/* Recovery buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={this.handleRetry}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
                        >
                            <RefreshCw size={16} />
                            Try Again
                        </button>
                        <button
                            onClick={this.handleReload}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        // No error, render children normally
        return this.props.children;
    }
}

// =============================================================================
// HIGHER-ORDER COMPONENT VERSION
// =============================================================================

/**
 * HOC to wrap any component with error boundary.
 *
 * WHY HOC: Sometimes you want to add error handling to many components
 * without changing their JSX. This pattern allows:
 *
 * const SafeGameCanvas = withErrorBoundary(GameCanvas, 'GameCanvas');
 */
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    componentName?: string
): React.FC<P> {
    const WithErrorBoundary: React.FC<P> = (props) => (
        <ErrorBoundary componentName={componentName || WrappedComponent.displayName}>
            <WrappedComponent {...props} />
        </ErrorBoundary>
    );

    WithErrorBoundary.displayName = `WithErrorBoundary(${componentName || WrappedComponent.displayName || 'Component'})`;

    return WithErrorBoundary;
}

// =============================================================================
// SIMULATION-SPECIFIC ERROR BOUNDARY
// =============================================================================

interface SimulationErrorBoundaryProps {
    children: ReactNode;
    onSimulationError?: (error: Error) => void;
}

/**
 * Specialized error boundary for the simulation.
 *
 * WHY SPECIALIZED: The simulation has specific recovery needs:
 * - Preserve game state if possible
 * - Offer to restart the simulation
 * - Log simulation-specific context
 */
export class SimulationErrorBoundary extends Component<
    SimulationErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: SimulationErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('Simulation error:', error);
        console.error('Component stack:', errorInfo.componentStack);

        this.setState({ errorInfo });

        if (this.props.onSimulationError) {
            this.props.onSimulationError(error);
        }
    }

    handleRetry = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-8">
                    <div className="max-w-xl text-center">
                        <div className="text-6xl mb-6">🦋</div>
                        <h1 className="text-2xl font-bold text-purple-400 mb-4">
                            The simulation encountered a rupture
                        </h1>
                        <p className="text-gray-400 mb-6">
                            Something unexpected happened in Lucy's Sundries.
                            The spatial constraints may have shifted.
                        </p>

                        {this.state.error && (
                            <div className="bg-gray-900 border border-gray-700 rounded p-4 mb-6 text-left">
                                <p className="text-red-400 font-mono text-sm">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                            >
                                Attempt Recovery
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                            >
                                Restart Simulation
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
