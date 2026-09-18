import React, { useState } from 'react';
import { X, Type, Check, RotateCcw, Bold, Sparkles, Sliders } from 'lucide-react';
import { FormattedText, HomePageConfig } from '../types';
import { DEFAULT_HOME_PAGE_CONFIG } from '../utils/textFormatter';

interface HomeTextEditorModalProps {
  isOpen: boolean;
  fieldKey: keyof HomePageConfig | null;
  fieldLabel: string;
  currentValue: FormattedText | string | any;
  onClose: () => void;
  onSave: (fieldKey: keyof HomePageConfig, updated: FormattedText) => void;
}

export const HomeTextEditorModal: React.FC<HomeTextEditorModalProps> = ({
  isOpen,
  fieldKey,
  fieldLabel,
  currentValue,
  onClose,
  onSave
}) => {
  const initialText = typeof currentValue === 'string' ? currentValue : (currentValue?.text || '');
  const [text, setText] = useState(initialText);
  const [fontSize, setFontSize] = useState<FormattedText['fontSize']>(currentValue?.fontSize || 'base');
  const [isBold, setIsBold] = useState<boolean>(currentValue?.isBold ?? false);

  React.useEffect(() => {
    if (currentValue !== undefined && currentValue !== null) {
      setText(typeof currentValue === 'string' ? currentValue : (currentValue?.text || ''));
      setFontSize(currentValue?.fontSize || 'base');
      setIsBold(currentValue?.isBold ?? false);
    }
  }, [fieldKey, currentValue]);

  const fontSizes: { value: FormattedText['fontSize']; label: string; previewClass: string }[] = [
    { value: 'xs', label: 'Extra Pequeno (XS)', previewClass: 'text-xs' },
    { value: 'sm', label: 'Pequeno (SM)', previewClass: 'text-sm' },
    { value: 'base', label: 'Médio / Normal (Base)', previewClass: 'text-base' },
    { value: 'lg', label: 'Grande (LG)', previewClass: 'text-lg' },
    { value: 'xl', label: 'Muito Grande (XL)', previewClass: 'text-xl' },
    { value: '2xl', label: 'Título 2XL', previewClass: 'text-2xl' },
    { value: '3xl', label: 'Título 3XL', previewClass: 'text-3xl' },
    { value: '4xl', label: 'Destaque 4XL', previewClass: 'text-4xl' },
    { value: '5xl', label: 'Gigante 5XL', previewClass: 'text-5xl' }
  ];

  const handleResetToDefault = () => {
    const defaultVal = DEFAULT_HOME_PAGE_CONFIG[fieldKey];
    if (defaultVal) {
      if (typeof defaultVal === 'string') {
        setText(defaultVal);
      } else {
        setText(defaultVal.text || '');
        setFontSize(defaultVal.fontSize || 'base');
        setIsBold(defaultVal.isBold ?? false);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(fieldKey, {
      text: text.trim(),
      fontSize,
      isBold
    });
    onClose();
  };

  if (!isOpen || !fieldKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
      <div 
        id="home-text-editor-modal"
        className="bg-white rounded-3xl border-2 border-amber-300 shadow-2xl w-full max-w-lg overflow-hidden font-['Comfortaa'] text-slate-800 my-auto"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-200 bg-gradient-to-r from-amber-100 via-yellow-50 to-pink-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 border border-white shadow-xs flex items-center justify-center text-purple-950">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Mali'] text-lg font-bold text-purple-950">
                Personalizar Texto da Home
              </h2>
              <p className="text-xs text-purple-900 font-semibold truncate max-w-xs">
                Campo: {fieldLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-purple-950 hover:bg-amber-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Text input */}
          <div className="space-y-1.5">
            <label className="font-bold text-purple-950 flex items-center justify-between">
              <span>Texto / Conteúdo</span>
              <span className="text-[8px] text-slate-400 font-normal">{text.length} caracteres</span>
            </label>
            {text.length > 60 || fieldKey.includes('Desc') || fieldKey.includes('Subtitle') ? (
              <textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-amber-50/50 border-2 border-amber-200 rounded-2xl font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            ) : (
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-amber-50/50 border-2 border-amber-200 rounded-2xl font-semibold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            )}
          </div>

          {/* Typography Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Font Size */}
            <div className="space-y-1.5">
              <label className="font-bold text-purple-950 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                <span>Tamanho da Fonte</span>
              </label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as any)}
                className="w-full px-3 py-2 bg-amber-50/50 border-2 border-amber-200 rounded-2xl font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs"
              >
                {fontSizes.map(f => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bold Toggle */}
            <div className="space-y-1.5">
              <label className="font-bold text-purple-950 flex items-center gap-1">
                <Bold className="w-3.5 h-3.5 text-amber-500" />
                <span>Estilo de Peso</span>
              </label>
              <button
                type="button"
                onClick={() => setIsBold(prev => !prev)}
                className={`w-full px-3 py-2 rounded-2xl font-bold text-xs border-2 transition-all flex items-center justify-center gap-2 ${
                  isBold
                    ? 'bg-amber-400 border-amber-500 text-purple-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-amber-50'
                }`}
              >
                <Bold className="w-3.5 h-3.5" />
                <span>{isBold ? 'Negrito Ativado (Bold)' : 'Normal (Sem Negrito)'}</span>
              </button>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 bg-gradient-to-br from-amber-50 to-purple-50 rounded-2xl border border-amber-200 space-y-1">
            <span className="text-[8px] font-bold text-purple-900 uppercase tracking-wider block">
              Prévia Visual em Tempo Real:
            </span>
            <div className="p-3 bg-white rounded-xl border border-amber-100 overflow-hidden">
              <p className={`${fontSize === '5xl' ? 'text-4xl' : fontSize === '4xl' ? 'text-3xl' : `text-${fontSize}`} ${isBold ? 'font-bold' : 'font-normal'} text-purple-950 leading-snug break-words`}>
                {text || '(Digite seu texto acima...)'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-amber-100">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-purple-950 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-purple-950 font-bold text-xs shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
