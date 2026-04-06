import { Component } from 'react';

/**
 * ErrorBoundary — catches any uncaught React render errors and shows
 * a friendly fallback instead of a blank white screen.
 * Wrap <App> with this in main.jsx.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // Keep this single error log for production debugging
        console.error('[ErrorBoundary] Caught error:', error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 max-w-sm w-full text-center">
                        <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                            An unexpected error occurred. Please refresh the page to continue.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={this.handleRetry}
                                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 rounded-xl text-sm transition"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl text-sm transition"
                            >
                                Refresh Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
