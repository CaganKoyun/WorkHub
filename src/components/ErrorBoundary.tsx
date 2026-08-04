import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Wire a real error tracker (Sentry vs.) here before charging customers.
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-xl font-semibold">Bir şeyler ters gitti</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Beklenmeyen bir hata oluştu. Sayfayı yenilemeyi deneyin; sorun
            devam ederse destek ekibine bildirin.
          </p>
          <pre className="max-w-md overflow-auto rounded bg-muted p-3 text-left text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
          <Button onClick={() => window.location.reload()}>Sayfayı Yenile</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
