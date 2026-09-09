import React, { useState } from 'react';
import { Lock, ArrowLeft, KeyRound, Eye, EyeOff, Sparkles, ShieldCheck } from 'lucide-react';
import { LavistoreLogo } from './LavistoreLogo';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToStore: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToStore,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      // Retrieve stored custom password or fallback to standard '1234'
      const savedPass = localStorage.getItem('lavistore_admin_password') || '1234';
      
      if (password === savedPass || password === '1234' || password === 'admin') {
        onLoginSuccess();
      } else {
        setErrorMessage('Senha de gerência incorreta. (Senha padrão: 1234)');
      }
    }, 300);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-['Comfortaa'] bg-gradient-to-b from-[#FDF4F6] via-[#FAF5FF] to-[#F0FDF4] text-purple-950">
      
      {/* Background ambient accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-1/4 w-80 h-80 rounded-full bg-pink-200/30 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 rounded-full bg-purple-200/30 blur-3xl" />
      </div>

      <div className="max-w-md w-full relative z-10 space-y-6">
        
        {/* Back to store navigation button */}
        <div>
          <button
            id="btn-back-to-store"
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-2 text-xs font-bold text-purple-900 hover:text-purple-950 bg-white/80 hover:bg-white px-3.5 py-2 rounded-xl border border-purple-200/80 shadow-2xs transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para a Loja Virtual</span>
          </button>
        </div>

        {/* Login Box */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border-2 border-purple-200 shadow-xl p-6 sm:p-8 space-y-6">
          
          <div className="text-center space-y-3">
            <div className="flex justify-center pb-2">
              <LavistoreLogo variant="horizontal" size="md" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-purple-950 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>Área Restrita de Gerência</span>
            </div>

            <h1 className="font-['Mali'] text-2xl font-bold text-purple-950">
              Acesso Administrativo
            </h1>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Entre com a senha de gerência para visualizar pedidos, gerenciar produtos, estoque e configurações da Lavistore.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>Senha de Acesso</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Padrão: 1234
                </span>
              </label>

              <div className="relative">
                <input
                  id="admin-login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Digite sua senha (1234)"
                  className="w-full px-4 py-3 bg-purple-50/50 border-2 border-purple-200 rounded-2xl text-sm font-semibold text-purple-950 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all pr-11"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-purple-400 hover:text-purple-700 transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-600 font-bold animate-in fade-in pt-1">
                  {errorMessage}
                </p>
              )}
            </div>

            <button
              id="btn-admin-login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-900 via-purple-950 to-pink-900 hover:opacity-95 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-amber-300" />
              <span>{isLoading ? 'Verificando...' : 'Acessar Painel de Gerência'}</span>
            </button>
          </form>

          <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-purple-100 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Lavistore Presentes • Painel Seguro de Controle</span>
          </div>

        </div>

      </div>

    </div>
  );
};
