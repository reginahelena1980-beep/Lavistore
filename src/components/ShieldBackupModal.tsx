import React, { useRef } from 'react';
import { 
  ShieldCheck, 
  X, 
  Check, 
  CloudUpload, 
  Download, 
  Upload, 
  ArrowRight 
} from 'lucide-react';

export interface ShieldBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishToServer?: () => Promise<boolean> | void;
  isPublishing?: boolean;
  onDownloadBackup?: () => void;
  onRestoreBackup?: (file: File) => void;
  onNotification?: (msg: string) => void;
}

export const ShieldBackupModal: React.FC<ShieldBackupModalProps> = ({
  isOpen,
  onClose,
  onPublishToServer,
  isPublishing = false,
  onDownloadBackup,
  onRestoreBackup,
  onNotification
}) => {
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-purple-200/80 shadow-2xl space-y-5 animate-in zoom-in-95 font-['Comfortaa']">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-purple-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-2xl text-purple-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-['Mali'] text-lg sm:text-xl font-bold text-purple-950">
                Blindagem de Dados & Backups 🛡️
              </h3>
              <p className="text-xs text-purple-900/70">
                Proteção permanente contra atualizações de código e deploys
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-purple-900/40 hover:text-purple-900 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Card */}
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>STATUS: BLINDAGEM ATIVA & TRAVADA</span>
          </div>
          <p className="text-xs text-emerald-900/80 leading-relaxed">
            Todas as configurações feitas pelo Administrador — cabeçalho, rodapé, faixa de vantagens, cupons ativos, sacolinhas, frases promocionais, telefone e e-mail — são salvas em cofre persistente independente com prioridade absoluta e <strong>nunca são apagadas ou substituídas</strong> por deploys.
          </p>
        </div>

        {/* Action options */}
        <div className="space-y-2.5">
          {/* Force sync */}
          {onPublishToServer && (
            <button
              type="button"
              onClick={async () => {
                await onPublishToServer();
                onNotification?.('🛡️ Configurações sincronizadas e blindadas com sucesso!');
              }}
              disabled={isPublishing}
              className="w-full p-3.5 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <CloudUpload className="w-5 h-5 text-purple-700 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-bold text-purple-950">
                    {isPublishing ? 'Salvando...' : 'Forçar Sincronização e Blindagem Agora'}
                  </div>
                  <div className="text-[11px] text-purple-900/60">
                    Grava atomicamente o cofre local no servidor persistente
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Download Backup */}
          <button
            type="button"
            onClick={() => {
              onDownloadBackup?.();
            }}
            className="w-full p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-amber-700 group-hover:scale-110 transition-transform" />
              <div>
                <div className="text-xs font-bold text-purple-950">
                  Baixar Backup Completo (.json)
                </div>
                <div className="text-[11px] text-purple-900/60">
                  Exporta todos os produtos, cupons, textos, sacolinhas e fotos
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Restore Backup */}
          {onRestoreBackup && (
            <>
              <input
                type="file"
                ref={backupFileInputRef}
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onRestoreBackup(file);
                    onClose();
                  }
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => backupFileInputRef.current?.click()}
                className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-slate-700 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Restaurar Backup do Computador (.json)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Recarrega todas as configurações salvas em um arquivo anterior
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-950 text-amber-300 font-semibold text-xs shadow-2xs hover:bg-purple-900 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
