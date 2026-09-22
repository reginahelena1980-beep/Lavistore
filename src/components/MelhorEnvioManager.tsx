import React, { useState, useEffect } from 'react';
import {
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  ExternalLink,
  Package,
  Check,
  Copy,
  Printer,
  Search,
  Zap,
  Globe,
  Mail,
  Lock
} from 'lucide-react';
import {
  getShippingConfig,
  getOAuthAuthorizeUrl,
  exchangeOAuthCodeApi,
  refreshMelhorEnvioTokenApi,
  saveManualTokenApi,
  getAccountInfoApi,
  trackShippingApi,
  formatCep,
  ShippingConfigResponse
} from '../services/shippingService';

export const MelhorEnvioManager: React.FC = () => {
  const [config, setConfig] = useState<ShippingConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados para autorização OAuth e Token
  const [manualToken, setManualToken] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [exchangingCode, setExchangingCode] = useState(false);

  // Estados para consulta de conta
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  // Estados para teste de cotação rápido
  const [testCep, setTestCep] = useState('01310-100');
  const [calculatingTest, setCalculatingTest] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);

  // Estados para rastreamento
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Carrega configurações
  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await getShippingConfig();
      setConfig(data);
    } catch (err: any) {
      console.error('Erro ao carregar configurações do Melhor Envio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();

    // Verifica parâmetros na URL (ex: retorno de OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('melhor_envio_connected') === 'true') {
      setFeedback({
        type: 'success',
        message: '🎉 Aplicativo autorizado com sucesso no Melhor Envio Produção!'
      });
      // Limpa URL sem recarregar
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=admin');
    } else if (urlParams.get('shipping_error')) {
      setFeedback({
        type: 'error',
        message: `Aviso na autorização: ${urlParams.get('shipping_error')}`
      });
    }
  }, []);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Iniciar fluxo OAuth oficial
  const handleStartOAuth = async () => {
    try {
      setRefreshing(true);
      const { authUrl } = await getOAuthAuthorizeUrl();
      window.open(authUrl, '_blank');
      setFeedback({
        type: 'success',
        message: 'Janela de autorização aberta! Aprove o aplicativo na sua conta do Melhor Envio e copie o código caso solicitado.'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao gerar URL de autorização.'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Trocar código retornado na URL
  const handleExchangeCode = async () => {
    if (!authCode.trim()) {
      setFeedback({ type: 'error', message: 'Cole o código de autorização fornecido pelo Melhor Envio.' });
      return;
    }

    try {
      setExchangingCode(true);
      const res = await exchangeOAuthCodeApi(authCode.trim());
      setFeedback({ type: 'success', message: res.message });
      setAuthCode('');
      await loadConfig();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setExchangingCode(false);
    }
  };

  // Renovar token via refresh token
  const handleRefreshToken = async () => {
    try {
      setRefreshing(true);
      const res = await refreshMelhorEnvioTokenApi();
      setFeedback({ type: 'success', message: res.message });
      await loadConfig();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setRefreshing(false);
    }
  };

  // Salvar token de acesso manualmente
  const handleSaveManualToken = async () => {
    if (!manualToken.trim()) {
      setFeedback({ type: 'error', message: 'Digite ou cole o Bearer Token de Produção.' });
      return;
    }

    try {
      setSavingToken(true);
      const res = await saveManualTokenApi(manualToken.trim());
      setFeedback({ type: 'success', message: res.message });
      setManualToken('');
      await loadConfig();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSavingToken(false);
    }
  };

  // Consultar dados da conta conectada
  const handleLoadAccount = async () => {
    try {
      setLoadingAccount(true);
      const res = await getAccountInfoApi();
      setAccountInfo(res.account);
      setFeedback({ type: 'success', message: 'Dados da conta de produção consultados com sucesso!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoadingAccount(false);
    }
  };

  // Testar cotação oficial na API
  const handleTestCalculation = async () => {
    const clean = testCep.replace(/\D/g, '');
    if (clean.length !== 8) {
      setFeedback({ type: 'error', message: 'Digite um CEP válido com 8 dígitos para testar.' });
      return;
    }

    try {
      setCalculatingTest(true);
      setTestResults(null);
      const res = await fetch('/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toPostalCode: clean,
          products: [
            {
              id: 'teste-caixa-mimos',
              width: 16,
              height: 8,
              length: 22,
              weight: 0.45,
              price: 59.90,
              quantity: 1
            }
          ]
        })
      });

      const data = await res.json();
      if (res.ok && data.options) {
        setTestResults(data.options);
        setFeedback({
          type: 'success',
          message: data.isSimulated
            ? 'Cotação retornada em modo de contingência (verifique o token).'
            : '✨ Cotação oficial de Produção retornada com sucesso da API do Melhor Envio!'
        });
      } else {
        throw new Error(data.error || 'Falha ao obter cotação de teste.');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setCalculatingTest(false);
    }
  };

  // Rastrear encomenda
  const handleTrack = async () => {
    if (!trackingCode.trim()) {
      setFeedback({ type: 'error', message: 'Informe o código de rastreamento ou ID da etiqueta.' });
      return;
    }

    try {
      setTrackingLoading(true);
      setTrackingResult(null);
      const res = await trackShippingApi([trackingCode.trim()]);
      setTrackingResult(res.tracking);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner de Identificação de Produção */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Ambiente de Produção Oficial
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-purple-200">
                v2 API Oficial
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-amber-300 flex items-center gap-2.5">
              <Truck className="w-7 h-7 text-amber-400" />
              Melhor Envio Oficial (Produção)
            </h2>
            <p className="text-purple-200 text-sm mt-1 max-w-2xl">
              Cálculo de frete em tempo real, geração e impressão de etiquetas, compra e rastreamento oficial integrados à conta Lavistore.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadConfig}
              disabled={loading}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Status
            </button>
            <a
              href="https://melhorenvio.com.br/painel"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-purple-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Painel Melhor Envio
            </a>
          </div>
        </div>

        {/* Informações Oficiais Cadastradas */}
        <div className="mt-6 pt-5 border-t border-purple-800/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-purple-900/40 p-3 rounded-xl border border-purple-800/40">
            <span className="text-purple-300 font-medium block">Endpoint Base</span>
            <span className="font-mono text-white text-xs select-all">https://melhorenvio.com.br</span>
          </div>

          <div className="bg-purple-900/40 p-3 rounded-xl border border-purple-800/40">
            <div className="flex items-center justify-between">
              <span className="text-purple-300 font-medium block">Client ID Oficial</span>
              <button
                onClick={() => handleCopy('30288', 'client_id')}
                className="text-amber-300 hover:text-amber-200"
                title="Copiar Client ID"
              >
                {copiedKey === 'client_id' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="font-mono text-amber-300 font-bold text-sm">30288</span>
          </div>

          <div className="bg-purple-900/40 p-3 rounded-xl border border-purple-800/40">
            <span className="text-purple-300 font-medium block">Suporte & User-Agent</span>
            <span className="font-mono text-white text-xs truncate block" title="Lavistore (estilobeeadm@gmail.com)">
              estilobeeadm@gmail.com
            </span>
          </div>

          <div className="bg-purple-900/40 p-3 rounded-xl border border-purple-800/40">
            <span className="text-purple-300 font-medium block">Status do Token</span>
            <span className="flex items-center gap-1.5 font-semibold text-xs mt-0.5">
              {config?.configured ? (
                <span className="text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conectado ({config.tokenSource})
                </span>
              ) : (
                <span className="text-amber-300 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Aguardando Autorização
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-start gap-3 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium">{feedback.message}</p>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs text-gray-500 hover:text-gray-800 font-semibold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Grade de Configuração & Autorização */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Autorização OAuth2 Oficial */}
        <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-900">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-gray-900 text-base">
                1. Autorização OAuth2 Oficial
              </h3>
              <p className="text-xs text-gray-500">
                Conecte a Lavistore diretamente à sua conta oficial do Melhor Envio
              </p>
            </div>
          </div>

          <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100/80 text-xs text-purple-900 space-y-2">
            <p className="font-medium flex items-center gap-1.5 text-purple-950">
              <Zap className="w-4 h-4 text-amber-500" />
              Como funciona o fluxo de produção:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-purple-800">
              <li>Clique no botão abaixo para abrir a página oficial de consentimento.</li>
              <li>Faça login na sua conta do Melhor Envio (se ainda não estiver conectado).</li>
              <li>Aprove as permissões de cotação e emissão de etiquetas.</li>
              <li>O sistema salva o token de acesso e refresh token automaticamente no cofre seguro.</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={handleStartOAuth}
              disabled={refreshing}
              className="flex-1 py-2.5 px-4 bg-purple-950 hover:bg-purple-900 text-amber-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              {refreshing ? 'Abrindo...' : 'Conectar via OAuth2 (Produção)'}
            </button>

            {config?.hasRefreshToken && (
              <button
                onClick={handleRefreshToken}
                disabled={refreshing}
                className="py-2.5 px-4 bg-purple-50 hover:bg-purple-100 text-purple-950 font-semibold text-xs rounded-xl border border-purple-200 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Renovar token com refresh_token"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Renovar Token
              </button>
            )}
          </div>

          {/* Inserir Código Manualmente se o redirecionamento local não for automático */}
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <label className="text-xs font-medium text-gray-700 block">
              Caso tenha copiado o código da URL após autorizar (?code=...):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="Cole o authorization_code aqui..."
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-950/20"
              />
              <button
                onClick={handleExchangeCode}
                disabled={exchangingCode || !authCode.trim()}
                className="px-4 py-2 bg-purple-900 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                {exchangingCode ? 'Validando...' : 'Trocar Código'}
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Inserção Direta de Bearer Token de Produção */}
        <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-900">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-gray-900 text-base">
                2. Inserir Token de Produção Manualmente
              </h3>
              <p className="text-xs text-gray-500">
                Ou gere um Token no Painel Melhor Envio &gt; Gerenciar &gt; Tokens
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Se você já gerou um Token de Acesso permanente no painel oficial do Melhor Envio para o ambiente de produção, basta colá-lo abaixo. Ele será salvo de forma atômica no cofre seguro do servidor.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700 block">
              Token de Acesso (Bearer Token de Produção)
            </label>
            <textarea
              rows={3}
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-950/20 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-400">
              {config?.configured ? '✅ Token configurado no servidor' : '⚠️ Nenhum token ativo'}
            </span>
            <button
              onClick={handleSaveManualToken}
              disabled={savingToken || !manualToken.trim()}
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
            >
              {savingToken ? 'Salvando...' : 'Salvar Token no Servidor'}
            </button>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <button
              onClick={handleLoadAccount}
              disabled={loadingAccount || !config?.configured}
              className="text-purple-900 hover:text-purple-950 font-semibold flex items-center gap-1.5 disabled:opacity-40"
            >
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              {loadingAccount ? 'Consultando...' : 'Consultar Dados da Conta Conectada'}
            </button>
          </div>

          {accountInfo && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
              <p className="font-bold text-gray-800">
                {accountInfo.firstname} {accountInfo.lastname} ({accountInfo.email})
              </p>
              <p className="text-gray-500">
                Documento: {accountInfo.document || 'Não informado'} | Saldo na carteira: R$ {accountInfo.balance ?? '0,00'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Testador Rápido de Cotação de Produção */}
      <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-900">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-gray-900 text-base">
                Teste de Cotação em Produção Real
              </h3>
              <p className="text-xs text-gray-500">
                Simule um cálculo de frete para verificar se a API oficial está respondendo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={testCep}
              onChange={(e) => setTestCep(formatCep(e.target.value))}
              placeholder="00000-000"
              maxLength={9}
              className="w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-950/20"
            />
            <button
              onClick={handleTestCalculation}
              disabled={calculatingTest}
              className="py-2 px-4 bg-purple-950 hover:bg-purple-900 text-amber-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              {calculatingTest ? 'Cotando...' : 'Cotar Agora'}
            </button>
          </div>
        </div>

        {/* Resultados do teste */}
        {testResults && testResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {testResults.map((opt) => (
              <div
                key={opt.id}
                className="p-4 rounded-2xl border border-purple-100 bg-purple-50/30 flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-semibold text-purple-950 block">{opt.name}</span>
                  <span className="text-xs text-gray-500">{opt.deadline}</span>
                </div>
                <div className="mt-3 pt-2 border-t border-purple-100 flex items-baseline justify-between">
                  <span className="text-xs text-gray-400">Valor</span>
                  <span className="font-bold text-base text-purple-950">
                    R$ {opt.price.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card 4: Rastreamento em Tempo Real */}
      <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-900">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-gray-900 text-base">
              Rastreamento de Encomendas & Etiquetas
            </h3>
            <p className="text-xs text-gray-500">
              Consulte eventos de rastreio oficial de etiquetas emitidas
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value)}
            placeholder="Ex: BR123456789BR ou ID do envio Melhor Envio..."
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-950/20"
          />
          <button
            onClick={handleTrack}
            disabled={trackingLoading || !trackingCode.trim()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            {trackingLoading ? 'Consultando...' : 'Rastrear'}
          </button>
        </div>

        {trackingResult && (
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
            {JSON.stringify(trackingResult, null, 2)}
          </div>
        )}
      </div>
    </div>
  );
};
