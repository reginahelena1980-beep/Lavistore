import React from 'react';
import { RotateCcw } from 'lucide-react';

export interface ResetHeroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResetHeroModal: React.FC<ResetHeroModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full border border-amber-200/80 shadow-xl space-y-3.5 animate-in zoom-in-95">
        <div className="flex items-center gap-2.5 text-amber-600">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <RotateCcw className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="font-['Mali'] text-base font-bold text-purple-950">Restaurar Banner Principal?</h3>
            <p className="text-[11px] text-slate-500 font-normal">Voltar para a imagem e textos padrões de capa.</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-normal">
          Deseja restaurar a foto do trio de florzinhas e textos padrões da capa da página inicial?
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
            Restaurar Banner
          </button>
        </div>
      </div>
    </div>
  );
};
