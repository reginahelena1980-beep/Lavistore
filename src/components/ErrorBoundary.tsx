import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, ShoppingBag, Home } from 'lucide-react';
import { purgeAllProjectLocalStorage } from '../utils/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('⚠️ [Lavistore ErrorBoundary] Erro capturado na renderização:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    try {
      sessionStorage.clear();
      purgeAllProjectLocalStorage();
    } catch {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    try {
      sessionStorage.clear();
      purgeAllProjectLocalStorage();
    } catch {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = window.location.origin;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4 font-['Comfortaa']">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-xl border-2 border-pink-200 space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mx-auto shadow-sm">
              <ShoppingBag className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-pink-700 bg-pink-100 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                Lavistore Kids
              </span>
              <h2 className="font-['Mali'] text-xl sm:text-2xl font-bold text-purple-950">
                Ops! Um instante, por favor 🌸
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Tivemos uma pequena oscilação ao processar esta ação, mas seus dados e sacola estão preservados.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left text-[11px] text-rose-800 font-mono overflow-x-auto max-h-24">
                {this.state.error.message || 'Erro inesperado de renderização.'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Loja</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="py-3 px-4 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Início</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
