import { Component, type ErrorInfo, type ReactNode } from "react";
import { withTranslation, type WithTranslation } from "react-i18next";
import { Button } from "./ui/button";

interface State {
  hasError: boolean;
}

class ErrorBoundaryInner extends Component<{ children: ReactNode } & WithTranslation, State> {
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

    const { t } = this.props;

    return (
      <main className="grid h-screen place-items-center bg-background p-6">
        <div className="panel max-w-md p-6 text-center">
          <h1 className="text-lg font-semibold">{t("errorBoundary.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("errorBoundary.description")}</p>
          <Button className="mt-4" variant="primary" onClick={() => window.location.reload()}>
            {t("errorBoundary.reload")}
          </Button>
        </div>
      </main>
    );
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryInner);
