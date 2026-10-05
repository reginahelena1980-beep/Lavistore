import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ArrowLeft, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Mail, 
  HelpCircle, 
  Send
} from 'lucide-react';
import { LavistoreLogo } from './LavistoreLogo';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToStore: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToStore,
}) => {
  // Mode: 'login' | 'change_password' | 'forgot_password'
  const [mode, setMode] = useState<'login' | 'change_password' | 'forgot_password'>('login');
  
  // Login form state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Change password form state (Primeiro Acesso / Alteração com senha antiga)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Forgot password state (Recuperação sem senha antiga)
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [maskedRecoveryEmail, setMaskedRecoveryEmail] = useState('lav***@gmail.com');
  const [isStoreEmailConfigured, setIsStoreEmailConfigured] = useState(true);
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'verify'>('request');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [showRecoveryNew, setShowRecoveryNew] = useState(false);
  const [showRecoveryConfirm, setShowRecoveryConfirm] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // First access detection prompt
  const [showFirstAccessPrompt, setShowFirstAccessPrompt] = useState(false);
  const [isDefaultPasswordOnServer, setIsDefaultPasswordOnServer] = useState<boolean>(true);

  // Check password status and active session on mount
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        // Verifica se o administrador já possui sessão ativa e válida via cookie HttpOnly
        const sessionRes = await fetch('/api/admin/session', { credentials: 'same-origin' });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData && sessionData.authenticated === true && isMounted) {
            onLoginSuccess();
            return;
          }
        }

        const res = await fetch('/api/admin/password-status', { credentials: 'same-origin' });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.success) {
            setIsDefaultPasswordOnServer(data.isDefaultPassword);
            if (data.recoveryEmailMasked) {
              setMaskedRecoveryEmail(data.recoveryEmailMasked);
            }
            if (data.isStoreEmailConfigured !== undefined) {
              setIsStoreEmailConfigured(data.isStoreEmailConfigured);
            }
          }
        }
     } catch (err) {
        console.error(
          '[AdminLogin] Não foi possível consultar o status da senha no servidor:',
          err
        );

        // Falha fechada: não usamos mais informações de senha armazenadas no navegador.
        if (isMounted) {
          setIsDefaultPasswordOnServer(false);
        }
      }
    };
    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [onLoginSuccess]);

  // Standard Login Submit
 const handleLoginSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setErrorMessage(null);
  setIsLoading(true);

  const entered = password.trim();

  if (!entered) {
    setIsLoading(false);
    setErrorMessage('Digite a senha de gerência.');
    return;
  }

  try {
    const res = await fetch('/api/admin/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password: entered })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      setIsLoading(false);
      setErrorMessage('Senha de gerência incorreta.');
      return;
    }

    setIsLoading(false);

    if (data.requiresPasswordChange === true) {
      setShowFirstAccessPrompt(true);
      return;
    }

    onLoginSuccess();
  } catch (error) {
    console.error('[AdminLogin] Falha ao validar acesso administrativo:', error);
    setIsLoading(false);
    setErrorMessage(
      'Não foi possível validar o acesso ao painel. Tente novamente em alguns instantes.'
    );
  }
};

// Change Password Submit (Primeiro Acesso / Alteração com senha antiga)
const handleChangePasswordSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setChangeError(null);
  setChangeSuccess(null);

  const current = currentPassword.trim();
  const newPass = newPassword.trim();
  const confirmPass = confirmPassword.trim();

  if (!current) {
    setChangeError(
      'Por favor, digite a senha atual. Se não lembrar, clique em "Esqueci a senha".'
    );
    return;
  }

  if (!newPass || newPass.length < 8) {
    setChangeError('A nova senha deve possuir pelo menos 8 caracteres.');
    return;
  }

  if (newPass !== confirmPass) {
    setChangeError(
      'A confirmação da senha não coincide com a nova senha digitada.'
    );
    return;
  }

  setIsChangingPassword(true);

  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: current,
        newPassword: newPass
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      setChangeError(
        data.error || 'Não foi possível alterar a senha de gerência.'
      );
      setIsChangingPassword(false);
      return;
    }

    // Remove qualquer credencial legada eventualmente armazenada no navegador.
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('lavistore_admin_password');
        window.localStorage.removeItem('lavistore_admin_password_changed');
      } catch {}
    }

    setIsDefaultPasswordOnServer(false);

    setChangeSuccess(
      'Nova senha de gerência cadastrada com sucesso! Entrando no painel...'
    );

    setTimeout(() => {
      setIsChangingPassword(false);
      onLoginSuccess();
    }, 1200);
  } catch (error) {
    console.error('[AdminLogin] Erro ao alterar senha:', error);

    setIsChangingPassword(false);
    setChangeError(
      'Não foi possível alterar a senha. Verifique sua conexão e tente novamente.'
    );
  }
};

  // Solicitar Código de Verificação por E-mail (Recuperação sem senha antiga)
  const handleRequestRecoveryCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);
    setIsRequestingCode(true);

    try {
      const res = await fetch('/api/admin/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim() || undefined })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRecoverySuccess(data.message || 'Código gerado com sucesso!');
        if (data.emailMasked) {
          setMaskedRecoveryEmail(data.emailMasked);
        }
        setRecoveryStep('verify');
      } else {
        setRecoveryError(data.error || 'Não foi possível gerar o código. Verifique o e-mail informado.');
      }
    } catch (err: any) {
      setRecoveryError('Erro de conexão ao solicitar código. Tente novamente.');
    } finally {
      setIsRequestingCode(false);
    }
  };

// Redefinir Senha Sem a Senha Antiga via Código por E-mail
const handleResetPasswordSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setRecoveryError(null);
  setRecoverySuccess(null);

  const newPass = recoveryNewPassword.trim();
  const confirmPass = recoveryConfirmPassword.trim();

  if (!newPass || newPass.length < 8) {
    setRecoveryError('A nova senha deve possuir pelo menos 8 caracteres.');
    return;
  }

  if (newPass !== confirmPass) {
    setRecoveryError(
      'A confirmação da nova senha não coincide com a senha digitada.'
    );
    return;
  }

  if (!verificationCode.trim()) {
    setRecoveryError('Por favor, digite o código de 6 dígitos recebido.');
    return;
  }

  setIsResettingPassword(true);

  try {
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationCode: verificationCode.trim(),
        newPassword: newPass
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      setRecoveryError(
        data.error || 'Não foi possível redefinir a senha.'
      );
      setIsResettingPassword(false);
      return;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('lavistore_admin_password');
        window.localStorage.removeItem('lavistore_admin_password_changed');
      } catch {}
    }

    setIsDefaultPasswordOnServer(false);

    setRecoverySuccess(
      '🎉 Nova senha redefinida com sucesso! Acessando painel de gerência...'
    );

    setTimeout(() => {
      setIsResettingPassword(false);
      onLoginSuccess();
    }, 1300);
  } catch (error) {
    console.error('[AdminLogin] Erro ao redefinir senha:', error);

    setIsResettingPassword(false);
    setRecoveryError(
      'Não foi possível redefinir a senha. Tente novamente.'
    );
  }
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
            className="inline-flex items-center gap-2 text-xs font-bold text-purple-900 hover:text-purple-950 bg-white/80 hover:bg-white px-3.5 py-2 rounded-xl border border-purple-200/80 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para a Loja Virtual</span>
          </button>
        </div>

        {/* Main Box */}
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
              {mode === 'login' && 'Acesso Administrativo'}
              {mode === 'forgot_password' && 'Recuperar Senha'}
              {mode === 'change_password' && 'Cadastrar Nova Senha'}
            </h1>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {mode === 'login' && 'Entre com a senha de gerência para visualizar pedidos, gerenciar produtos, estoque e configurações da Lavistore.'}
              {mode === 'forgot_password' && 'Esqueceu sua senha? Crie uma nova senha de forma segura sem precisar lembrar da antiga.'}
              {mode === 'change_password' && 'Defina uma senha pessoal e exclusiva para o painel administrativo da Lavistore.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 p-1 bg-purple-100/60 rounded-2xl border border-purple-200 text-xs font-bold">
            <button
              id="tab-admin-login-mode"
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setChangeError(null);
                setRecoveryError(null);
              }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-purple-950 shadow-xs border border-purple-200'
                  : 'text-purple-700 hover:text-purple-950'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>

            <button
              id="tab-admin-forgot-password-mode"
              type="button"
              onClick={() => {
                setMode('forgot_password');
                setRecoveryStep('request');
                setRecoveryError(null);
                setRecoverySuccess(null);
              }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'forgot_password'
                  ? 'bg-white text-purple-950 shadow-xs border border-purple-200'
                  : 'text-purple-700 hover:text-purple-950'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Esqueci</span>
            </button>

            <button
              id="tab-admin-first-access-mode"
              type="button"
              onClick={() => {
                setMode('change_password');
                setCurrentPassword('1234');
                setErrorMessage(null);
                setChangeError(null);
                setRecoveryError(null);
              }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'change_password'
                  ? 'bg-white text-purple-950 shadow-xs border border-purple-200'
                  : 'text-purple-700 hover:text-purple-950'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-pink-600" />
              <span>1º Acesso</span>
            </button>
          </div>

          {/* VIEW 1: NORMAL LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* Informative Hint for First Access */}
              {isDefaultPasswordOnServer && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-purple-950 font-medium flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Primeiro acesso à gerência? Configure sua senha pessoal.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('change_password');
                      setCurrentPassword('1234');
                    }}
                    className="text-amber-800 hover:text-amber-950 font-bold underline shrink-0 cursor-pointer"
                  >
                    Alterar agora
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Senha de Acesso</span>
                  </label>
                  
                  {/* ESQUECI A SENHA LINK */}
                  <button
                    id="link-admin-forgot-password"
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setRecoveryStep('request');
                      setRecoveryError(null);
                      setRecoverySuccess(null);
                    }}
                    className="text-[11px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>

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
                    placeholder="Digite sua senha de gerência"
                    className="w-full px-4 py-3 bg-purple-50/50 border-2 border-purple-200 rounded-2xl text-sm font-semibold text-purple-950 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all pr-11"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-purple-400 hover:text-purple-700 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 animate-in fade-in">
                    <p className="text-xs text-rose-700 font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{errorMessage}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setRecoveryStep('request');
                        setRecoveryError(null);
                      }}
                      className="text-[11px] text-amber-800 hover:text-amber-950 font-bold underline block pl-5 cursor-pointer text-left"
                    >
                      Esqueceu a senha? Clique aqui para criar uma nova sem a antiga.
                    </button>
                  </div>
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

              <div className="pt-2 flex flex-col items-center gap-1.5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setRecoveryStep('request');
                  }}
                  className="text-xs text-amber-800 hover:text-amber-950 font-bold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Não lembra sua senha? Clique para redefinir agora</span>
                </button>
              </div>

            </form>
          )}

          {/* VIEW 2: FORGOT PASSWORD / RECUPERAÇÃO SEM SENHA ANTIGA */}
          {mode === 'forgot_password' && (
            <div className="space-y-4">
              
              {/* Informative Security Banner */}
              <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-2xl text-xs text-amber-950 font-medium space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Redefinição Segura Sem Senha Antiga</span>
                </div>
                <p className="text-[11px] text-amber-900/80 leading-relaxed pl-6">
                  Você não precisa lembrar da senha antiga! Valide seu e-mail de administradora cadastrado para receber um código de 6 dígitos e criar sua nova senha.
                </p>
              </div>

              {/* EMAIL VERIFICATION */}
                <>

                  {recoveryStep === 'request' ? (
                    <form onSubmit={handleRequestRecoveryCode} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-purple-950 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-purple-600" />
                            <span>E-mail da Loja (STORE_EMAIL)</span>
                          </span>
                          <span className="text-[11px] font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                            {maskedRecoveryEmail}
                          </span>
                        </label>
                        <input
                          id="input-recovery-email"
                          type="email"
                          value={recoveryEmail}
                          onChange={(e) => {
                            setRecoveryEmail(e.target.value);
                            if (recoveryError) setRecoveryError(null);
                          }}
                          placeholder={`Deixe em branco para usar o e-mail cadastrado (${maskedRecoveryEmail})`}
                          className="w-full px-4 py-2.5 bg-purple-50/50 border-2 border-purple-200 rounded-xl text-sm font-semibold text-purple-950 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all"
                        />
                        <p className="text-[11px] text-slate-600">
                          O código será enviado para o e-mail cadastrado da loja ({maskedRecoveryEmail}). Deixe o campo em branco para usar o e-mail cadastrado.
                        </p>
                      </div>

                      <button
                        id="btn-send-recovery-code"
                        type="submit"
                        disabled={isRequestingCode}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-900 via-purple-950 to-pink-900 hover:opacity-95 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-4 h-4 text-amber-300" />
                        <span>{isRequestingCode ? 'Enviando código...' : 'Gerar Código de Recuperação'}</span>
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                      
                      {/* Código de 6 dígitos */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-purple-950 flex items-center justify-between">
                          <span>Código de Verificação (6 dígitos)</span>
                          <button
                            type="button"
                            onClick={() => handleRequestRecoveryCode()}
                            disabled={isRequestingCode}
                            className="text-[11px] text-purple-700 hover:text-purple-950 font-bold underline cursor-pointer"
                          >
                            Reenviar código
                          </button>
                        </label>
                        <input
                          id="input-recovery-code"
                          type="text"
                          required
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => {
                            setVerificationCode(e.target.value.replace(/\D/g, ''));
                            if (recoveryError) setRecoveryError(null);
                          }}
                          placeholder="Digite o código de 6 dígitos"
                          className="w-full px-4 py-2.5 bg-purple-50/50 border-2 border-purple-200 rounded-xl text-center tracking-widest font-mono text-base font-bold text-purple-950 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all"
                        />
                      </div>

                      {/* Nova Senha */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-purple-950">
                          Nova Senha de Gerência
                        </label>
                        <div className="relative">
                          <input
                            id="input-recovery-new-password"
                            type={showRecoveryNew ? 'text' : 'password'}
                            required
                            minLength={4}
                            value={recoveryNewPassword}
                            onChange={(e) => {
                              setRecoveryNewPassword(e.target.value);
                              if (recoveryError) setRecoveryError(null);
                            }}
                            placeholder="Crie sua nova senha (mínimo 8 caracteres)"
                            className="w-full px-4 py-2.5 bg-purple-50/50 border-2 border-purple-200 rounded-xl text-sm font-semibold text-purple-950 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRecoveryNew(!showRecoveryNew)}
                            className="absolute right-3 top-3 text-purple-400 hover:text-purple-700 cursor-pointer"
                          >
                            {showRecoveryNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirmar Nova Senha */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-purple-950">
                          Confirmar Nova Senha
                        </label>
                        <div className="relative">
                          <input
                            id="input-recovery-confirm-password"
                            type={showRecoveryConfirm ? 'text' : 'password'}
                            required
                            value={recoveryConfirmPassword}
                            onChange={(e) => {
                              setRecoveryConfirmPassword(e.target.value);
                              if (recoveryError) setRecoveryError(null);
                            }}
                            placeholder="Repita a nova senha"
                            className="w-full px-4 py-2.5 bg-purple-50/50 border-2 border-purple-200 rounded-xl text-sm font-semibold text-purple-950 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRecoveryConfirm(!showRecoveryConfirm)}
                            className="absolute right-3 top-3 text-purple-400 hover:text-purple-700 cursor-pointer"
                          >
                            {showRecoveryConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        id="btn-confirm-recovery-reset"
                        type="submit"
                        disabled={isResettingPassword}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-900 via-purple-950 to-pink-900 hover:opacity-95 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>{isResettingPassword ? 'Gravando nova senha...' : 'Criar Nova Senha e Entrar'}</span>
                      </button>

                    </form>
                  )}
                </>
            

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setRecoveryError(null);
                    setRecoverySuccess(null);
                  }}
                  className="w-full py-2.5 text-xs font-bold text-purple-800 hover:text-purple-950 hover:bg-purple-50 rounded-xl transition-colors cursor-pointer"
                >
                  ← Voltar para tela de login
                </button>
              </div>

            </div>
          )}

          {/* VIEW 3: CHANGE PASSWORD / PRIMEIRO ACESSO COM SENHA ATUAL */}
          {mode === 'change_password' && (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              
              <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-2xl text-xs text-amber-950 font-medium flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Alterar Senha de Gerência</p>
                  <p className="text-[11px] text-amber-900/80 leading-relaxed pt-0.5">
                    Se for seu primeiro acesso ou desejar atualizar a segurança da loja, informe a senha atual e cadastre a nova senha.
                  </p>
                </div>
              </div>

              {changeSuccess && (
                <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-xs text-emerald-900 font-bold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{changeSuccess}</span>
                </div>
              )}

              {changeError && (
                <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-900 font-bold flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{changeError}</span>
                </div>
              )}

              {/* Senha Atual */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-950">
                    Senha Atual
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setRecoveryStep('request');
                      setRecoveryError(null);
                    }}
                    className="text-[11px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                  >
                    Esqueceu a senha atual?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="input-first-access-current"
                    type={showCurrent ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (changeError) setChangeError(null);
                    }}
                    placeholder="Digite a senha atual"
                    className="w-full px-4 py-2.5 bg-purple-50/50 border-2 border-purple-200 rounded-xl text-sm font-semibold text-purple-950 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-3 text-purple-400 hover:text-purple-700 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nova Senha */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-purple-950">
                  Nova Senha de Gerência
                </label>
                <div className="relative">
                  <input
                    id="input-first-access-new"
                    type={showNew ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (changeError) setChangeError(null);
                    }}
                    placeholder="Crie sua nova senha (mínimo 8 dígitos)"
                    className="w-full px-4 py-2.5 bg-purple-50/50 border-2 border-purple-200 rounded-xl text-sm font-semibold text-purple-950 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-3 text-purple-400 hover:text-purple-700 cursor-pointer"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Nova Senha */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-purple-950">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    id="input-first-access-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (changeError) setChangeError(null);
                    }}
                    placeholder="Repita a nova senha para confirmar"
                    className="w-full px-4 py-2.5 bg-purple-50/50 border-2 border-purple-200 rounded-xl text-sm font-semibold text-purple-950 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-3 text-purple-400 hover:text-purple-700 cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  id="btn-save-first-access-password"
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-900 via-purple-950 to-pink-900 hover:opacity-95 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>{isChangingPassword ? 'Salvando...' : 'Salvar Nova Senha e Entrar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full py-2.5 text-xs font-bold text-purple-800 hover:text-purple-950 hover:bg-purple-50 rounded-xl transition-colors cursor-pointer"
                >
                  Voltar para tela de login
                </button>
              </div>

            </form>
          )}

          <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-purple-100 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Lavistore Presentes • Painel Seguro de Controle</span>
          </div>

        </div>

      </div>

      {/* MODAL / DIALOG: Prompt de Primeiro Acesso com senha padrão 1234 */}
      {showFirstAccessPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border-2 border-amber-300 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-600 mx-auto shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="font-['Mali'] text-xl font-bold text-purple-950">
              Primeiro Acesso à Loja!
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Identificamos que você ainda não personalizou sua senha de acesso.
              Gostaria de cadastrar sua senha pessoal exclusiva agora?
            </p>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowFirstAccessPrompt(false);
                  setMode('change_password');
                  setCurrentPassword('1234');
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-900 via-purple-950 to-pink-900 text-white font-bold text-xs shadow-md hover:opacity-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                <span>Sim, Cadastrar Minha Senha Agora</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowFirstAccessPrompt(false);
                  onLoginSuccess();
                }}
                className="w-full py-2.5 rounded-xl border border-purple-200 text-purple-900 font-bold text-xs hover:bg-purple-50 transition-colors cursor-pointer"
              >
                Continuar por enquanto
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
