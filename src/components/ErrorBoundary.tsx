import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    let detailedInfo = null;
    try {
      // Check if it's our custom Firestore error
      const parsed = JSON.parse(error.message);
      if (parsed.error && parsed.operationType) {
        detailedInfo = JSON.stringify(parsed, null, 2);
      }
    } catch (e) {
      // Not a JSON error message
    }

    this.setState({
      error,
      errorInfo: detailedInfo || error.stack || null
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 font-sans">
          <div className="bg-[#1a1a1a] border border-red-500/20 rounded-3xl p-8 max-w-2xl w-full shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertTriangle size={40} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">عذراً، حدث خطأ غير متوقع</h1>
              <p className="text-gray-400">نواجه بعض الصعوبات التقنية حالياً. يرجى المحاولة مرة أخرى.</p>
            </div>

            {this.state.errorInfo && (
              <div className="bg-black/40 rounded-xl p-4 text-left overflow-auto max-h-48 border border-white/5">
                <pre className="text-[10px] font-mono text-red-400/80 whitespace-pre-wrap">
                  {this.state.errorInfo}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={this.handleReset}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} />
                تحديث الصفحة
              </button>
              <button 
                onClick={this.handleGoHome}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Home size={20} />
                العودة للرئيسية
              </button>
            </div>

            <p className="text-[10px] text-gray-600 pt-4">
              إذا استمرت المشكلة، يرجى التواصل مع الدعم الفني: qydalrfyd@gmail.com
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
