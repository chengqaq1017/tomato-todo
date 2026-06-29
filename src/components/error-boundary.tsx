import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui/button";

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="grid h-screen place-items-center bg-background p-6">
        <div className="panel max-w-md p-6 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">The app recovered the shell. Reload to restore state.</p>
          <Button className="mt-4" variant="primary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </main>
    );
  }
}
