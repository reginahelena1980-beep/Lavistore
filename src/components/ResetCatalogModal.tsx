import React from 'react';
import { RotateCcw } from 'lucide-react';

export interface ResetCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResetCatalogModal: React.FC<ResetCatalogModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full border border-red-200/80 shadow-xl space-y-3.5 animate-in zoom-in-95">
        <div className="flex items-center gap-2.5 text-red-600">
          <div className="p-2.5 bg-red-100 rounded-xl">
            <RotateCcw className="w-5 h-5 text-red-700" />
          </div>
          <div>
            <h3 className="font-['Mali'] text-base font-bold text-purple-950">Restaurar Catálogo Padrão?</h3>
            <p className="text-[11px] text-slate-500 font-normal">Voltar para os produtos demonstrativos originais.</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-normal">
          Deseja restaurar a lista com os produtos e categorias originais da loja? Novos itens cadastrados e alterações manuais serão resetados.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-amber-300 font-medium text-xs shadow-2xs transition-colors cursor-pointer"
          >
            Restaurar Catálogo
          </button>
        </div>
      </div>
    </div>
  );
};
