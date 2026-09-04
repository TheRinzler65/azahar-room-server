import React from "react";
import { Window } from "../components/Window";

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto p-4 mt-10">
          <Window title="SYSTEM ERROR">
            <div className="font-mono text-xs p-4 space-y-3">
              <div className="text-danger-500 font-bold">UNCAUGHT EXCEPTION</div>
              <pre className="whitespace-pre-wrap text-danger-400">
                {this.state.message}
              </pre>
              <button
                className="bg-muted-800 hover:bg-muted-700 text-muted-200 px-4 py-1.5 border border-border"
                onClick={() => window.location.reload()}
              >
                [reload]
              </button>
            </div>
          </Window>
        </div>
      );
    }
    return this.props.children;
  }
}
