import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    localStorage.removeItem('binance_futures_strategies_v5');
    localStorage.removeItem('binance_futures_strategies_v4');
    localStorage.removeItem('binance_futures_strategies_v3');
    localStorage.removeItem('binance_futures_strategies_v2');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Terminal Protegido</h2>
              <p className="text-xs text-neutral-400 mt-1">
                La aplicación capturó un fallo inesperado de renderizado y protegió la pantalla. Puedes restaurar el terminal para cargar los datos limpios de Google Sheets.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-neutral-950 p-3 rounded border border-neutral-800 font-mono text-[11px] text-rose-300 max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Restaurar y Recargar Terminal</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
