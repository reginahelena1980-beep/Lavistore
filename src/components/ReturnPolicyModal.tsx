import React, { useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  ShieldCheck, 
  Clock, 
  Truck, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  MessageCircle, 
  Mail, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { HomePageConfig } from '../types';

interface ReturnPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: HomePageConfig;
}

export const ReturnPolicyModal: React.FC<ReturnPolicyModalProps> = ({
  isOpen,
  onClose,
  config
}) => {
  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const rawWhatsapp = config?.whatsappNumber?.replace(/\D/g, '') || '5511987654321';
  const whatsappUrl = `https://wa.me/${rawWhatsapp}?text=${encodeURIComponent(
    'Olá! Gostaria de informações para solicitar uma troca ou devolução de um pedido. 🌸'
  )}`;

  return (
    <div 
      id="return-policy-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-purple-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="return-policy-container"
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-purple-100 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-policy-title"
      >
        {/* Header Floral Amigável */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 p-5 sm:p-6 text-white relative shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold border border-pink-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
                <span>Garantia do Consumidor • Lei Federal 8.078/90</span>
              </div>
              <h2 id="return-policy-title" className="text-xl sm:text-2xl font-bold font-['Mali'] text-white">
                Política Simplificada de Troca e Devolução
              </h2>
              <p className="text-xs sm:text-sm text-purple-200 leading-relaxed max-w-xl">
                Transparência, carinho e respeito total aos seus direitos nas compras online (Código de Defesa do Consumidor e Decreto do E-commerce nº 7.962/13).
              </p>
            </div>
            <button
              id="btn-close-return-policy"
              type="button"
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo com Rolagem Suave */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 text-slate-700 text-sm">
          
          {/* 4 Pilares Principais em Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Pilar 1: 7 Dias Arrependimento */}
            <div className="p-4 rounded-2xl bg-pink-50/70 border border-pink-200/80 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-pink-950 text-xs sm:text-sm">7 Dias para Arrependimento</h4>
                  <span className="text-[11px] text-pink-700 font-semibold">Artigo 49 do CDC</span>
                </div>
              </div>
              <p className="text-xs text-pink-900 leading-relaxed">
                Você pode desistir da compra em até <strong>7 dias corridos</strong> após receber o produto. O reembolso é <strong>100% integral</strong>, incluindo o valor do frete pago.
              </p>
            </div>

            {/* Pilar 2: 30 Dias para Troca por Defeito */}
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-purple-950 text-xs sm:text-sm">30 Dias contra Defeitos</h4>
                  <span className="text-[11px] text-purple-700 font-semibold">Artigo 26 do CDC</span>
                </div>
              </div>
              <p className="text-xs text-purple-900 leading-relaxed">
                Caso o item chegue danificado no transporte ou com defeito de fabricação, você tem até <strong>30 dias</strong> para solicitar a substituição imediata ou o reembolso.
              </p>
            </div>

            {/* Pilar 3: Frete Reverso Sem Custos */}
            <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/80 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-cyan-950 text-xs sm:text-sm">Frete Reverso por Nossa Conta</h4>
                  <span className="text-[11px] text-cyan-700 font-semibold">Logística Gratuita</span>
                </div>
              </div>
              <p className="text-xs text-cyan-900 leading-relaxed">
                Você não paga nada pelo envio de volta. Nós geramos uma <strong>Autorização de Postagem Grátis</strong> dos Correios ou transportadora para você despachar sem custos.
              </p>
            </div>

            {/* Pilar 4: Reembolso Rápido */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 text-xs sm:text-sm">Restituição Rápida do Valor</h4>
                  <span className="text-[11px] text-emerald-700 font-semibold">PIX ou Cartão</span>
                </div>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Devolução imediata via PIX em até <strong>1 dia útil</strong> após o pacote chegar, ou estorno no cartão pelo Mercado Pago. Se preferir, fornecemos cupom com bônus.
              </p>
            </div>
          </div>

          {/* Passo a Passo Simples */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/90 space-y-3">
            <h3 className="font-bold text-sm text-purple-950 flex items-center gap-2 font-['Mali']">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>Como solicitar a sua troca ou devolução (em 4 passos simples):</span>
            </h3>

            <ol className="space-y-3 text-xs text-slate-700">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-900 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">1</span>
                <div>
                  <strong>Entre em contato:</strong> Mande uma mensagem no nosso WhatsApp <strong>{config?.whatsappNumber || '(11) 98765-4321'}</strong> ou e-mail <strong>{config?.contactEmail || 'contato@lavistore.com.br'}</strong> informando seu nome ou número do pedido.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-900 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">2</span>
                <div>
                  <strong>Receba o código gratuito:</strong> Em até 24h úteis nós enviamos o código de logística reversa para postagem nos Correios ou agência credenciada.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-900 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">3</span>
                <div>
                  <strong>Envie o pacote:</strong> Acondicione o produto na caixa original com segurança e entregue na agência mais próxima apresentando o código fornecido.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-900 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">4</span>
                <div>
                  <strong>Conclusão e Reembolso:</strong> Assim que o pacote chegar ao nosso ateliê, conferimos o item e liberamos o reembolso integral ou o envio do novo produto em até 1 dia útil.
                </div>
              </li>
            </ol>
          </div>

          {/* Condições e Diretrizes Transparentes */}
          <div className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-4">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
              <FileText className="w-3.5 h-3.5 text-purple-600" />
              <span>Condições Gerais do Produto</span>
            </h3>
            <ul className="space-y-2 list-disc list-inside leading-relaxed text-slate-600">
              <li>O produto não deve apresentar indícios de uso indevido, avarias provocadas por acidentes ou violação de lacres originais.</li>
              <li>Deve ser devolvido com sua embalagem e todos os acessórios, laços ou mimos que o acompanharam originalmente.</li>
              <li>Em caso de defeito de fabricação ou danos causados pelo frete, a loja garante a troca por item idêntico, substituição por outro produto de mesmo valor ou reembolso total conforme sua preferência.</li>
            </ul>
          </div>

          {/* Aviso de Canais Oficiais */}
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
            <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Nosso compromisso de encantamento:</p>
              <p className="text-[11px] text-amber-900 leading-relaxed mt-0.5">
                Queremos que sua experiência seja sempre doce e acolhedora. Se tiver qualquer dúvida, nosso suporte humanizado está pronto para atender você com todo o carinho!
              </p>
            </div>
          </div>

        </div>

        {/* Rodapé do Modal com Botões de Ação */}
        <div className="p-4 sm:p-5 bg-purple-50/60 border-t border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-purple-900 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Atendimento de Seg. a Sex. das 09h às 18h</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <a
              id="btn-policy-whatsapp"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Solicitar Troca via WhatsApp</span>
            </a>

            <button
              id="btn-policy-close"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-purple-100 text-purple-950 border border-purple-200 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
