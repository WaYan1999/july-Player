import { Component, type ErrorInfo, type ReactNode } from "react";
import { ArrowClockwiseIcon as ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "@heroui/react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.captureException(error, {
          extra: { componentStack: info.componentStack },
        });
      })
      .catch(() => {
        // Error reporting should never mask the original render failure.
      });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-background px-6">
          <div className="july-dialog max-w-sm border border-border bg-card p-5 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
              <ArrowClockwise className="size-5" weight="bold" />
            </div>
            <h1 className="font-sans text-base font-semibold text-foreground">
              {"\u754c\u9762\u6682\u65f6\u51fa\u9519"}
            </h1>
            <p className="mt-1.5 font-sans text-sm leading-6 text-muted-foreground">
              {"\u91cd\u65b0\u52a0\u8f7d\u540e\u53ef\u7ee7\u7eed\u5f53\u524d\u64cd\u4f5c\u3002"}
            </p>
            <Button
              type="button"
              variant="primary"
              className="july-heroui-button july-heroui-button-primary mt-4 px-4"
              onClick={() => window.location.reload()}
            >
              {"\u91cd\u65b0\u52a0\u8f7d"}
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
