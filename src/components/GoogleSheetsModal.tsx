import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Link as LinkIcon, 
  LogOut, 
  ShieldCheck, 
  Sparkles,
  BarChart3,
  ShoppingBag,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  logoutGoogle, 
  getAccessToken,
  createBiSpreadsheet, 
  syncBiToSpreadsheet, 
  getStoredSheetsConfig, 
  saveStoredSheetsConfig, 
  GoogleSheetsConfig 
} from '../services/googleSheetsService';
import { BiProductCalculatedRecord, OrderData } from '../types';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  biRecords: BiProductCalculatedRecord[];
  orders: OrderData[];
  onNotify?: (msg: string) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  biRecords,
  orders,
  onNotify
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig | null>(() => getStoredSheetsConfig());
  const [customTitle, setCustomTitle] = useState('Lavistore Kids - BI & Controle Financeiro');
  const [existingUrlOrId, setExistingUrlOrId] = useState('');
  const [showConfirmSyncModal, setShowConfirmSyncModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Inicializa o estado de autenticação
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasToken(Boolean(token));
      },
      () => {
        setCurrentUser(null);
        setHasToken(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Mantém a configuração sincronizada com o localStorage
  useEffect(() => {
    if (isOpen) {
      setSheetsConfig(getStoredSheetsConfig());
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setHasToken(true);
        setSuccessMessage('Conta Google conectada com sucesso! ✨');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Falha na autenticação com a conta Google. Por favor, tente novamente.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setCurrentUser(null);
    setHasToken(false);
    setSuccessMessage('Desconectado da conta Google.');
  };

  const handleCreateNewSpreadsheet = async () => {
    if (!hasToken) {
      setErrorMessage('Por favor, faça login com sua conta Google primeiro.');
      return;
    }
    setIsCreating(true);
    setErrorMessage(null);
    try {
      const res = await createBiSpreadsheet(
        customTitle.trim() || 'Lavistore Kids - BI & Controle Financeiro',
        biRecords,
        orders
      );
      const updated = getStoredSheetsConfig();
      setSheetsConfig(updated);
      setSuccessMessage(`Planilha criada com sucesso! 📊 Abas: "Apuração BI por Produto", "Pedidos e Vendas" e "Resumo Financeiro".`);
      if (onNotify) onNotify('Planilha do Google Sheets criada e sincronizada!');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao criar planilha no Google Sheets.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLinkExisting = async () => {
    if (!existingUrlOrId.trim()) return;
    setErrorMessage(null);

    // Extrai o ID da URL se o usuário colou a URL completa
    let id = existingUrlOrId.trim();
    const match = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      id = match[1];
    }

    const newCfg: GoogleSheetsConfig = {
      spreadsheetId: id,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}`,
      title: 'Planilha Vinculada - Lavistore',
      lastSync: undefined,
      autoSync: true
    };

    saveStoredSheetsConfig(newCfg);
    setSheetsConfig(newCfg);
    setExistingUrlOrId('');
    setSuccessMessage('Planilha vinculada com sucesso! Clique em "Sincronizar Agora" para enviar os dados.');
  };

  const handleUnlink = () => {
    if (window.confirm('Deseja desvincular a planilha atual desta loja? A planilha no seu Google Drive não será apagada.')) {
      saveStoredSheetsConfig(null);
      setSheetsConfig(null);
      setSuccessMessage('Planilha desvinculada com sucesso.');
    }
  };

  const handleToggleAutoSync = () => {
    if (!sheetsConfig) return;
    const updated = { ...sheetsConfig, autoSync: !sheetsConfig.autoSync };
    saveStoredSheetsConfig(updated);
    setSheetsConfig(updated);
  };

  const handleExecuteSync = async () => {
    if (!sheetsConfig) return;
    setShowConfirmSyncModal(false);
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      await syncBiToSpreadsheet(sheetsConfig.spreadsheetId, biRecords, orders);
      setSheetsConfig(getStoredSheetsConfig());
      setSuccessMessage(`Sincronização concluída com sucesso! ${biRecords.length} produtos e ${orders.length} pedidos atualizados na planilha.`);
      if (onNotify) onNotify('Google Sheets sincronizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      if (String(err?.message || '').toLowerCase().includes('token') || String(err?.message || '').toLowerCase().includes('autenticado')) {
        setErrorMessage('Sua sessão com o Google expirou. Por favor, clique em "Entrar com Google" para renovar o acesso.');
        setHasToken(false);
      } else {
        setErrorMessage(err.message || 'Falha ao sincronizar com o Google Sheets.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-purple-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl border-2 border-emerald-300 shadow-2xl w-full max-w-2xl overflow-hidden my-auto animate-in zoom-in-95">
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Mali'] text-xl font-bold">Google Sheets & Controle Financeiro</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-400 text-emerald-950 rounded-full">
                  Nuvem Real
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">
                Envie dados de vendas, estoque e apuração do BI diretamente para o Excel / Google Drive.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Mensagens de Feedback */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Aviso do Google Sheets:</span>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Etapa 1: Conexão com a Conta Google (GSI) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                1. Conta Google para Armazenamento
              </span>
              {hasToken && currentUser && (
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Conectado
                </span>
              )}
            </div>

            {hasToken && currentUser ? (
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt={currentUser.displayName || 'Google'} 
                      className="w-9 h-9 rounded-full border border-slate-300"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                      {(currentUser.displayName || currentUser.email || 'G')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-800">{currentUser.displayName || 'Usuário Google'}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors font-semibold flex items-center gap-1 cursor-pointer"
                  title="Desconectar conta Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-600">
                  Conecte sua conta do Google para permitir que a loja crie e atualize sua planilha no Google Drive.
                </p>

                {/* Botão Oficial Sign in with Google (GSI Material Button Style) */}
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isAuthenticating}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                  <span>{isAuthenticating ? 'Conectando...' : 'Conectar com Google'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Etapa 2: Planilha Vinculada ou Criar Nova */}
          <div className="space-y-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              2. Planilha Financeira no Google Sheets
            </span>

            {sheetsConfig ? (
              /* Card da Planilha Conectada */
              <div className="p-4 bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-emerald-950">{sheetsConfig.title}</h4>
                      <p className="text-[11px] text-emerald-800">
                        {sheetsConfig.lastSync 
                          ? `Última sincronização: ${new Date(sheetsConfig.lastSync).toLocaleString('pt-BR')}`
                          : 'Ainda não sincronizado'}
                      </p>
                    </div>
                  </div>

                  <a
                    href={sheetsConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <span>Abrir no Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Status das 3 Abas Sincronizadas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200">
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-center">
                    <span className="text-[10px] text-slate-500 font-bold block">Aba 1: Apuração BI</span>
                    <span className="text-xs font-extrabold text-purple-900">{biRecords.length} produtos apurados</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-center">
                    <span className="text-[10px] text-slate-500 font-bold block">Aba 2: Vendas & Pedidos</span>
                    <span className="text-xs font-extrabold text-emerald-700">{orders.length} pedidos</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-center">
                    <span className="text-[10px] text-slate-500 font-bold block">Aba 3: Resumo</span>
                    <span className="text-xs font-extrabold text-pink-600">CPV & Margens</span>
                  </div>
                </div>

                {/* Ações da Planilha Conectada */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmSyncModal(true)}
                    disabled={isSyncing || !hasToken}
                    className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Dados Agora'}</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-emerald-950 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sheetsConfig.autoSync}
                        onChange={handleToggleAutoSync}
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Auto-sincronizar vendas</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleUnlink}
                      className="text-[11px] text-slate-500 hover:text-rose-600 underline font-medium cursor-pointer"
                    >
                      Desvincular
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Opções para Criar ou Vincular Planilha */
              <div className="space-y-4">
                {/* Opção A: Criar Nova Planilha do Zero */}
                <div className="p-4 bg-purple-50/70 border-2 border-purple-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h4 className="font-bold text-xs text-purple-950 uppercase tracking-wider">
                      Opção A: Criar Nova Planilha Formatada no Google Drive
                    </h4>
                  </div>
                  <p className="text-xs text-purple-900 leading-relaxed">
                    Cria automaticamente uma planilha completa com cabeçalhos profissionais, fórmulas de CPV e abas separadas para o estoque e vendas da Lavistore Kids.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Título da Planilha"
                      className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <button
                      type="button"
                      onClick={handleCreateNewSpreadsheet}
                      disabled={isCreating || !hasToken}
                      className="px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Criando Planilha...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Criar Planilha no Drive</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Opção B: Vincular Planilha Existente */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-slate-600" />
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Opção B: Já possui uma planilha? Cole a URL ou ID
                    </h4>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={existingUrlOrId}
                      onChange={(e) => setExistingUrlOrId(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/SEU_ID/edit"
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={handleLinkExisting}
                      disabled={!existingUrlOrId.trim()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Vincular Planilha</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Conexão direta e segura com a API oficial do Google Sheets
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modal de Confirmação de Operação Mutante / Sincronização (Regra Obrigatória SKILL.md) */}
      {showConfirmSyncModal && (
        <div className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border-2 border-emerald-400 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="font-bold text-base text-slate-900">
                Confirmar sincronização com o Google Sheets?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Esta ação irá atualizar as abas <strong>"Apuração BI por Produto"</strong> ({biRecords.length} produtos), <strong>"Pedidos e Vendas"</strong> ({orders.length} pedidos) e o <strong>"Resumo Financeiro"</strong> na sua planilha oficial <em>"{sheetsConfig?.title}"</em>.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSyncModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteSync}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Confirmar e Sincronizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
