import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  ShieldCheck, 
  Database, 
  ArrowRight, 
  Loader2,
  HardDrive,
  FileCheck2,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { Product, BiProductCalculatedRecord } from '../types';
import { AdminCustomVault } from '../utils/adminDataProtection';
import { 
  detectLegacyBase64Images, 
  migrateLegacyProductImages, 
  LegacyImageDetectionResult, 
  MigrationProgress, 
  MigrationExecutionResult,
  SAFE_FIRESTORE_SIZE_THRESHOLD_BYTES
} from '../services/legacyImageMigrationService';

interface LegacyImageMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  biRecords?: BiProductCalculatedRecord[];
  fullStoreConfigPayload?: Partial<AdminCustomVault>;
  onMigrationComplete: (migratedProducts: Product[], migratedBiRecords?: BiProductCalculatedRecord[]) => void;
}

export const LegacyImageMigrationModal: React.FC<LegacyImageMigrationModalProps> = ({
  isOpen,
  onClose,
  products,
  biRecords = [],
  fullStoreConfigPayload,
  onMigrationComplete
}) => {
  const [detection, setDetection] = useState<LegacyImageDetectionResult | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Analisa o catálogo ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setProgress(null);
      setErrorMessage(null);
      const det = detectLegacyBase64Images(products, biRecords, fullStoreConfigPayload);
      setDetection(det);
    }
  }, [isOpen, products, biRecords, fullStoreConfigPayload]);

  if (!isOpen) return null;

  const handleStartMigration = async () => {
    if (isMigrating) return;
    setIsMigrating(true);
    setErrorMessage(null);

    try {
      const res = await migrateLegacyProductImages(products, biRecords, {
        fullStoreConfigPayload,
        onProgress: (p) => setProgress(p)
      });

      setResult(res);

      if (res.success && res.firestoreSaved) {
        onMigrationComplete(res.migratedProducts, res.migratedBiRecords);
      } else if (res.errorMessage) {
        setErrorMessage(res.errorMessage);
      }
    } catch (err: any) {
      console.error('[Migration UI] Erro durante a migração:', err);
      setErrorMessage(err?.message || 'Ocorreu um erro inesperado durante a migração.');
    } finally {
      setIsMigrating(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/70 backdrop-blur-sm animate-in fade-in duration-200 font-['Comfortaa']">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-purple-100 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-purple-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-purple-950 flex items-center justify-center shadow-sm">
              <UploadCloud className="w-5 h-5 text-purple-950" />
            </div>
            <div>
              <h3 className="font-['Mali'] text-base sm:text-lg font-bold text-purple-950 flex items-center gap-1.5">
                Migração de Fotos para Firebase Storage
              </h3>
              <p className="text-[11px] text-slate-500 font-normal">
                Substituição definitiva de Base64 por URLs públicas HTTPS
              </p>
            </div>
          </div>
          {!isMigrating && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-purple-950 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Conteúdo Dinâmico */}
        <div className="py-5 overflow-y-auto space-y-4 flex-1">
          {/* ESTADO 1: Concluído com Sucesso */}
          {result && result.success && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-sm">Migração Concluída e Sincronizada!</span>
                </div>
                <p className="text-xs text-emerald-800">
                  Todas as fotos foram enviadas com sucesso para o Firebase Storage e substituídas por URLs HTTPS públicas. O documento soberano no Firestore foi atualizado de forma atômica.
                </p>
              </div>

              {/* Métricas do Resultado */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Fotos Migradas</p>
                  <p className="text-base font-bold text-purple-950">{result.uploadedSuccessfully} de {result.legacyFound}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Tamanho Anterior</p>
                  <p className="text-base font-bold text-slate-700">{formatBytes(result.beforeSizeBytes)}</p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-emerald-700 uppercase font-semibold">Tamanho Atual</p>
                  <p className="text-base font-bold text-emerald-700">{formatBytes(result.afterSizeBytes)}</p>
                </div>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center justify-between">
                <span>Redução obtida no documento:</span>
                <span className="font-bold text-emerald-700 text-sm">
                  - {formatBytes(result.reductionBytes)} ({(result.beforeSizeBytes > 0 ? ((result.reductionBytes / result.beforeSizeBytes) * 100).toFixed(0) : 0)}%)
                </span>
              </div>

              {result.failedCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-bold">Aviso sobre fotos não migradas ({result.failedCount}):</p>
                  <p>As fotos originais em Base64 continuam preservadas com segurança na memória.</p>
                </div>
              )}
            </div>
          )}

          {/* ESTADO 2: Erro ou Bloqueio por Limite de Tamanho */}
          {result && !result.success && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span className="font-bold text-sm">Atenção: Gravação Bloqueada</span>
                </div>
                <p className="text-xs text-rose-800">
                  {errorMessage || result.errorMessage || 'Falha ao concluir a persistência no Firestore.'}
                </p>
              </div>

              {result.fieldSizeBreakdown && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-slate-700">Consumo de espaço por campo no documento:</p>
                  <div className="text-[11px] space-y-1 text-slate-600">
                    {Object.entries(result.fieldSizeBreakdown).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-slate-100 pb-0.5">
                        <span className="font-mono">{k}</span>
                        <span className="font-semibold">{formatBytes(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ESTADO 3: Em Andamento */}
          {isMigrating && (
            <div className="py-6 space-y-5 text-center animate-in fade-in">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center text-purple-700">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="font-['Mali'] text-base font-bold text-purple-950">
                  {progress?.statusText || 'Processando imagens legadas...'}
                </p>
                <p className="text-xs text-slate-500">
                  Por favor, não feche esta janela durante a migração.
                </p>
              </div>

              {progress && progress.total > 0 && (
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-amber-500 h-full transition-all duration-300"
                    style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ESTADO 4: Prévia / Verificação Antes de Iniciar */}
          {!isMigrating && !result && detection && (
            <div className="space-y-4">
              {detection.hasLegacyImages ? (
                <>
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Fotos legadas em formato Base64 detectadas</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      O Firestore possui limite máximo de 1.048.576 bytes (1 MiB) por documento. As fotos armazenadas em Base64 estão ocupando excesso de espaço no documento <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">settings/store_config</code>.
                    </p>
                  </div>

                  {/* Estatísticas Detectadas */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-2xl text-center">
                      <p className="text-[10px] text-purple-700 uppercase font-semibold">Produtos Afetados</p>
                      <p className="font-['Mali'] text-lg font-bold text-purple-950">{detection.productsWithBase64Count}</p>
                    </div>
                    <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-2xl text-center">
                      <p className="text-[10px] text-amber-700 uppercase font-semibold">Fotos Base64</p>
                      <p className="font-['Mali'] text-lg font-bold text-amber-950">{detection.totalBase64ImagesCount}</p>
                    </div>
                    <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-2xl text-center">
                      <p className="text-[10px] text-rose-700 uppercase font-semibold">Espaço Base64</p>
                      <p className="font-['Mali'] text-lg font-bold text-rose-950">{formatBytes(detection.estimatedBase64PayloadBytes)}</p>
                    </div>
                  </div>

                  {/* Informações de Blindagem */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <p className="font-bold text-purple-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Garantias de Segurança desta Operação:
                    </p>
                    <ul className="space-y-1 text-slate-600 text-[11px] list-disc list-inside">
                      <li>Nenhum produto ou registro da planilha é apagado.</li>
                      <li>A foto original só é substituída após confirmação de URL HTTPS no Storage.</li>
                      <li>O documento do Firestore é gravado apenas uma vez, após validação atômica.</li>
                      <li>Registros de BI têm suas fotos sincronizadas para a mesma URL HTTPS.</li>
                    </ul>
                  </div>

                  {/* Lista detalhada dos produtos afetados */}
                  {detection.details.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Produtos para migração ({detection.details.length}):
                      </p>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-100 rounded-xl p-1.5 bg-slate-50/50">
                        {detection.details.map((item) => (
                          <div 
                            key={item.productId}
                            className="flex items-center justify-between text-xs p-1.5 bg-white rounded-lg border border-slate-100"
                          >
                            <span className="font-medium text-purple-950 truncate max-w-[240px]">{item.productName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {item.base64Count} foto(s) • ~{formatBytes(item.base64Bytes)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-['Mali'] text-base font-bold text-purple-950">
                      Catálogo 100% Otimizado!
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Nenhuma imagem legada em Base64 foi encontrada no catálogo. Todas as fotos já utilizam links externos e Firebase Storage.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé e Ações */}
        <div className="pt-4 border-t border-purple-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isMigrating}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {result?.success ? 'Fechar' : 'Cancelar'}
          </button>

          {!result?.success && detection?.hasLegacyImages && (
            <button
              type="button"
              onClick={handleStartMigration}
              disabled={isMigrating}
              className="px-5 py-2.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-amber-300 font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Migrando fotos...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-amber-300" />
                  <span>Iniciar Migração Segura</span>
                </>
              )}
            </button>
          )}

          {result?.success && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Concluir</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
