import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm w-full bg-white border border-slate-100 rounded-2xl shadow-sm p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto">
            <i className="fas fa-triangle-exclamation text-rose-500 text-xl"></i>
          </div>
          <div>
            <p className="text-base font-bold text-slate-800">Something went wrong</p>
            <p className="text-sm text-slate-400 mt-1">
              This page hit an unexpected error. Your data is safe — reloading usually fixes it.
            </p>
          </div>
          <button
            onClick={this.handleReload}
            className="w-full px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            <i className="fas fa-rotate-right mr-1.5"></i>Reload
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
