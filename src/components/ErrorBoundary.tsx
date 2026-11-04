import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[360px] p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm m-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {this.props.fallbackTitle ?? "Đã xảy ra sự cố khi tải giao diện"}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mb-4 font-mono text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-x-auto text-left w-full">
            {this.state.error?.message || "Lỗi không xác định trong quá trình render component."}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <RotateCcw size={16} />
            Thử tải lại màn hình
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
