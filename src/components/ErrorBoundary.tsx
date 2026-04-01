import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-12">
          <div className="w-24 h-24 border-2 border-dashed border-red-500/50 rounded-full flex items-center justify-center mb-8 bg-red-500/10">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-mono font-bold tracking-tighter mb-4 uppercase text-red-500">System Crash</h2>
          <p className="text-zinc-400 font-mono text-sm max-w-md text-center leading-relaxed mb-8">
            {this.state.error?.message || 'An unexpected error occurred in the UI.'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs uppercase tracking-widest hover:bg-zinc-800 transition-colors"
          >
            Reboot System
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
