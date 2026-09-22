import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Mail, 
  Search, 
  Download, 
  Copy, 
  Check, 
  Trash2, 
  Sparkles, 
  Ticket, 
  UserPlus, 
  RefreshCw, 
  ExternalLink,
  ShoppingBag,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Clock,
  Send,
  MessageCircle,
  Database
} from 'lucide-react';
import { NewsletterLead, OrderData } from '../types';
import { 
  fetchNewsletterLeads, 
  deleteNewsletterLead, 
  subscribeNewsletter, 
  fetchOrders 
} from '../services/storeApiService';

interface NewsletterLeadsManagerProps {
  onNotify?: (message: string) => void;
  onGoToStorefront?: () => void;
}

export const NewsletterLeadsManager: React.FC<NewsletterLeadsManagerProps> = ({
  onNotify
}) => {
  const [leads, setLeads] = useState<NewsletterLead[]>([]);
  const [buyerCustomers, setBuyerCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'club' | 'buyers'>('club');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [leadToDelete, setLeadToDelete] = useState<NewsletterLead | null>(null);

  // Fetch leads from Server API & localStorage
  const fetchLeads = async () => {
    setIsLoading(true);
    let serverList: NewsletterLead[] = [];
    let localList: NewsletterLead[] = [];

    // 1. Fetch from server API via storeApiService
    try {
      serverList = await fetchNewsletterLeads();
    } catch (err) {
      console.warn('Erro ao carregar leads do servidor:', err);
    }

    // 2. Fetch from localStorage
    try {
      const saved = localStorage.getItem('lavistore_newsletter_leads');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          localList = parsed;
        }
      }
    } catch (err) {
      console.warn('Erro ao ler leads do localStorage:', err);
    }

    // Merge and deduplicate by email
    const map = new Map<string, NewsletterLead>();
    [...serverList, ...localList].forEach((lead) => {
      if (lead?.email) {
        const key = lead.email.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, lead);
        }
      }
    });

    const merged = Array.from(map.values()).sort((a, b) => {
      const dateA = new Date(a.registeredAt || 0).getTime();
      const dateB = new Date(b.registeredAt || 0).getTime();
      return dateB - dateA;
    });

    setLeads(merged);

    // Also fetch buyers from orders to provide complete visibility of customers
    try {
      let orders: OrderData[] = [];
      try {
        orders = await fetchOrders();
      } catch {
        orders = [];
      }

      if (orders.length === 0) {
        const localOrders = localStorage.getItem('lavistore_orders');
        if (localOrders) {
          orders = JSON.parse(localOrders);
        }
      }

      // Group buyers by email or phone
      const buyersMap = new Map<string, any>();
      orders.forEach((ord: OrderData) => {
        const emailKey = (ord.customerEmail || ord.customerPhone || ord.orderId).trim().toLowerCase();
        if (!buyersMap.has(emailKey)) {
          buyersMap.set(emailKey, {
            name: ord.customerName || 'Cliente Lavistore',
            email: ord.customerEmail || 'Não informado',
            phone: ord.customerPhone || '',
            city: ord.city || '',
            state: ord.state || '',
            ordersCount: 1,
            totalSpent: Number(ord.total || 0),
            lastOrderDate: ord.createdAt || ord.date || new Date().toISOString()
          });
        } else {
          const existing = buyersMap.get(emailKey);
          existing.ordersCount += 1;
          existing.totalSpent += Number(ord.total || 0);
        }
      });

      setBuyerCustomers(Array.from(buyersMap.values()));
    } catch (e) {
      console.warn('Erro ao carregar clientes compradores:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    const term = searchTerm.toLowerCase();
    return leads.filter(
      (l) =>
        (l.email && l.email.toLowerCase().includes(term)) ||
        (l.name && l.name.toLowerCase().includes(term)) ||
        (l.source && l.source.toLowerCase().includes(term))
    );
  }, [leads, searchTerm]);

  // Filtered buyers
  const filteredBuyers = useMemo(() => {
    if (!searchTerm.trim()) return buyerCustomers;
    const term = searchTerm.toLowerCase();
    return buyerCustomers.filter(
      (b) =>
        (b.name && b.name.toLowerCase().includes(term)) ||
        (b.email && b.email.toLowerCase().includes(term)) ||
        (b.phone && b.phone.includes(term)) ||
        (b.city && b.city.toLowerCase().includes(term))
    );
  }, [buyerCustomers, searchTerm]);

  // Copy all emails comma-separated
  const handleCopyAllEmails = () => {
    const emailList = activeTab === 'club'
      ? filteredLeads.map((l) => l.email).filter(Boolean)
      : filteredBuyers.map((b) => b.email).filter((e) => e && e.includes('@'));

    if (emailList.length === 0) {
      if (onNotify) onNotify('Nenhum e-mail para copiar.');
      return;
    }

    const textToCopy = emailList.join(', ');
    navigator.clipboard.writeText(textToCopy);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 3000);
    if (onNotify) onNotify(`${emailList.length} e-mails copiados para a área de transferência!`);
  };

  // Copy single email
  const handleCopySingleEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
    if (onNotify) onNotify(`E-mail ${email} copiado!`);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === 'club') {
      if (leads.length === 0) {
        if (onNotify) onNotify('Nenhum dado para exportar.');
        return;
      }
      const headers = ['ID', 'E-mail', 'Nome', 'Data_Cadastro', 'Horario', 'Origem', 'Cupom_Liberado', 'Status'];
      const rows = leads.map((l) => {
        const d = l.registeredAt ? new Date(l.registeredAt) : new Date();
        const dateStr = d.toLocaleDateString('pt-BR');
        const timeStr = d.toLocaleTimeString('pt-BR');
        return [
          `"${l.id || ''}"`,
          `"${l.email || ''}"`,
          `"${l.name || ''}"`,
          `"${dateStr}"`,
          `"${timeStr}"`,
          `"${l.source || 'Clube de Mimos'}"`,
          `"${l.couponOffered || 'LAVI10'}"`,
          `"${l.status || 'active'}"`
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clube_de_mimos_lavistore_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (onNotify) onNotify('Planilha CSV de leads baixada com sucesso!');
    } else {
      if (buyerCustomers.length === 0) {
        if (onNotify) onNotify('Nenhum comprador para exportar.');
        return;
      }
      const headers = ['Nome', 'E-mail', 'WhatsApp_Telefone', 'Cidade', 'Estado', 'Qtd_Pedidos', 'Total_Gasto_R$', 'Ultimo_Pedido'];
      const rows = buyerCustomers.map((b) => {
        const d = b.lastOrderDate ? new Date(b.lastOrderDate).toLocaleDateString('pt-BR') : '';
        return [
          `"${b.name || ''}"`,
          `"${b.email || ''}"`,
          `"${b.phone || ''}"`,
          `"${b.city || ''}"`,
          `"${b.state || ''}"`,
          `"${b.ordersCount || 1}"`,
          `"${Number(b.totalSpent || 0).toFixed(2)}"`,
          `"${d}"`
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clientes_compradores_lavistore_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (onNotify) onNotify('Planilha CSV de compradores baixada com sucesso!');
    }
  };

  // Delete lead
  const confirmDeleteLead = async () => {
    if (!leadToDelete) return;
    const id = leadToDelete.id;

    // Remove from server via storeApiService
    try {
      await deleteNewsletterLead(id);
    } catch (e) {
      console.warn('Erro ao deletar lead no servidor:', e);
    }

    // Remove from local state and localStorage
    const updated = leads.filter((l) => l.id !== id);
    setLeads(updated);
    try {
      localStorage.setItem('lavistore_newsletter_leads', JSON.stringify(updated));
    } catch (e) {}

    setLeadToDelete(null);
    if (onNotify) onNotify('Cadastro de e-mail excluído com sucesso.');
  };

  // Add lead manually
  const handleAddManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      if (onNotify) onNotify('Por favor, digite um e-mail válido.');
      return;
    }

    const newLeadItem: NewsletterLead = {
      id: `lead-${Date.now()}`,
      name: newName.trim(),
      email: cleanEmail,
      registeredAt: new Date().toISOString(),
      source: 'Cadastro Manual pelo ADM',
      couponOffered: 'LAVI10',
      status: 'active'
    };

    // Save to server via storeApiService
    try {
      await subscribeNewsletter(newLeadItem.email, newLeadItem.name, newLeadItem.source);
    } catch (e) {
      console.warn('Erro ao salvar no servidor:', e);
    }

    // Save locally
    const updated = [newLeadItem, ...leads.filter((l) => l.email.toLowerCase() !== cleanEmail)];
    setLeads(updated);
    try {
      localStorage.setItem('lavistore_newsletter_leads', JSON.stringify(updated));
    } catch (e) {}

    setNewEmail('');
    setNewName('');
    setShowAddModal(false);
    if (onNotify) onNotify(`Cliente ${cleanEmail} cadastrada com sucesso!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Informative Storage Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-purple-950 to-indigo-950 text-white rounded-3xl p-5 sm:p-7 shadow-lg border-2 border-purple-300/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Base de Contatos & E-mails Cadastrados</span>
            </div>
            <h2 className="font-['Mali'] text-xl sm:text-2xl font-bold text-amber-100 flex items-center gap-2">
              <Users className="w-6 h-6 text-amber-400" />
              <span>Cadastros do Clube de Mimos & Clientes</span>
            </h2>
            <p className="text-xs sm:text-sm text-purple-200 leading-relaxed">
              Aqui você visualiza todos os e-mails que as clientes cadastraram na caixa de <strong>"Clube de Mimos"</strong> para receber 10% OFF (Cupom <strong>LAVI10</strong>), além de clientes que finalizaram pedidos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={fetchLeads}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-purple-950 text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Cadastro Manual</span>
            </button>
          </div>
        </div>
      </div>

      {/* Storage Location Explanation Card */}
      <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200/80 shadow-2xs flex items-start gap-3 text-xs text-amber-950">
        <div className="p-2 bg-amber-200/60 rounded-xl text-amber-800 shrink-0 mt-0.5">
          <Database className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-amber-900 text-xs sm:text-sm flex items-center gap-1.5">
            <span>💾 Onde o sistema armazena esses dados cadastrados?</span>
          </p>
          <p className="text-slate-700 leading-relaxed text-[11px] sm:text-xs">
            1. <strong>No Servidor (Backend Express):</strong> Os e-mails são gravados automaticamente no arquivo <code>src/data/newsletter_leads.json</code>, garantindo persistência oficial e permanente na loja.<br />
            2. <strong>No Navegador (Armazenamento Local):</strong> Ficam sincronizados na chave <code>lavistore_newsletter_leads</code> do <code>localStorage</code>, permitindo visualização instantânea mesmo offline.<br />
            3. <strong>Disparo & Exportação:</strong> Você pode exportar para planilha Excel/CSV ou copiar todos os e-mails com 1 clique para colar no campo CCO de ferramentas como Gmail, Mailchimp ou Brevo.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-amber-200/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-purple-900">
            <span>Cadastros no Clube</span>
            <Mail className="w-4 h-4 text-purple-600" />
          </div>
          <p className="font-['Mali'] text-2xl font-bold text-purple-950">{leads.length}</p>
          <p className="text-[10px] text-slate-500">Leads capturados no rodapé</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-900">
            <span>Clientes Compradoras</span>
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-['Mali'] text-2xl font-bold text-emerald-950">{buyerCustomers.length}</p>
          <p className="text-[10px] text-slate-500">Já realizaram checkout</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-amber-900">
            <span>Cupom do Clube</span>
            <Ticket className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-base font-bold text-purple-950 bg-amber-100 px-2 py-0.5 rounded-md">LAVI10</span>
            <span className="text-[11px] text-emerald-700 font-bold">10% OFF</span>
          </div>
          <p className="text-[10px] text-slate-500">Oferecido na 1ª compra</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-900">
            <span>Status da Base</span>
            <ShieldCheck className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="font-['Mali'] text-lg font-bold text-cyan-950 flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>100% Ativa</span>
          </p>
          <p className="text-[10px] text-slate-500">Pronta para e-mail marketing</p>
        </div>
      </div>

      {/* Tabs & Search & Action Bar */}
      <div className="bg-white rounded-2xl p-4 border border-amber-200/70 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-purple-50 rounded-xl border border-purple-100">
            <button
              onClick={() => setActiveTab('club')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'club'
                  ? 'bg-purple-950 text-amber-300 shadow-2xs'
                  : 'text-purple-900/80 hover:text-purple-950'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Clube de Mimos ({leads.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('buyers')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'buyers'
                  ? 'bg-purple-950 text-amber-300 shadow-2xs'
                  : 'text-purple-900/80 hover:text-purple-950'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Compradoras ({buyerCustomers.length})</span>
            </button>
          </div>

          {/* Action Buttons: Copy All & Export */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAllEmails}
              className="px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-950 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Copia todos os e-mails da lista separados por vírgula para colar no campo CCO do seu e-mail"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-purple-700" />
                  <span>Copiar Todos os E-mails</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Exportar em formato CSV compatível com Excel e Google Sheets"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel (CSV)</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'club'
                ? 'Buscar por e-mail ou nome cadastrado no Clube...'
                : 'Buscar por nome, e-mail, telefone ou cidade da compradora...'
            }
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-purple-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'club' ? (
        <div className="bg-white rounded-3xl border border-amber-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-amber-100 flex items-center justify-between bg-amber-50/40">
            <h3 className="font-['Mali'] text-sm sm:text-base font-bold text-purple-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Lista de Cadastros no Clube de Mimos ({filteredLeads.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500">Ordenados do mais recente para o mais antigo</span>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>
              <p className="font-['Mali'] text-base font-bold text-purple-950">Nenhum cadastro encontrado</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchTerm
                  ? 'Tente outro termo de busca.'
                  : 'Quando uma visitante cadastrar o e-mail no rodapé da loja, ela aparecerá automaticamente aqui.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-[11px] text-slate-600 uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Cliente / E-mail</th>
                    <th className="py-3 px-4">Data & Horário</th>
                    <th className="py-3 px-4">Origem</th>
                    <th className="py-3 px-4">Cupom</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((lead) => {
                    const dateObj = lead.registeredAt ? new Date(lead.registeredAt) : null;
                    const dateFormatted = dateObj ? dateObj.toLocaleDateString('pt-BR') : 'Hoje';
                    const timeFormatted = dateObj ? dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

                    return (
                      <tr key={lead.id || lead.email} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-900 font-bold flex items-center justify-center text-xs shrink-0 border border-purple-200">
                              {(lead.name || lead.email || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-purple-950 text-xs sm:text-sm select-all">
                                {lead.email}
                              </p>
                              {lead.name && (
                                <p className="text-[11px] text-slate-500 font-medium">{lead.name}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{dateFormatted}</span>
                            {timeFormatted && <span className="text-slate-400">às {timeFormatted}</span>}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-purple-200">
                            <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                            <span>{lead.source || 'Clube de Mimos'}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] bg-amber-100 text-purple-950 px-2 py-0.5 rounded-md font-bold border border-amber-200">
                            {lead.couponOffered || 'LAVI10'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopySingleEmail(lead.email)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-900 transition-colors cursor-pointer"
                              title="Copiar e-mail"
                            >
                              {copiedEmail === lead.email ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <a
                              href={`mailto:${lead.email}?subject=Mimo%20Especial%20Lavistore%20🌸&body=Olá,%20vimos%20que%20você%20se%20cadastrou%20no%20Clube%20Lavistore!%20Seu%20cupom%20LAVI10%20está%20ativo.`}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 transition-colors cursor-pointer"
                              title="Enviar e-mail para este contato"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </a>

                            <button
                              type="button"
                              onClick={() => setLeadToDelete(lead)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Excluir este cadastro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Buyers tab */
        <div className="bg-white rounded-3xl border border-amber-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-amber-100 flex items-center justify-between bg-emerald-50/40">
            <h3 className="font-['Mali'] text-sm sm:text-base font-bold text-purple-950 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>Clientes que já Compraram na Loja ({filteredBuyers.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500">Dados consolidados do histórico de pedidos</span>
          </div>

          {filteredBuyers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="font-['Mali'] text-base font-bold text-purple-950">Nenhuma compradora registrada</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Quando os clientes finalizarem pedidos no checkout, os dados cadastrais (nome, WhatsApp, e-mail e endereço) aparecerão aqui e na aba Pedidos Recebidos.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-[11px] text-slate-600 uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Cliente / Nome</th>
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">WhatsApp / Tel</th>
                    <th className="py-3 px-4">Cidade / UF</th>
                    <th className="py-3 px-4 text-center">Pedidos</th>
                    <th className="py-3 px-4 text-right">Total Gasto</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBuyers.map((buyer, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-purple-950">{buyer.name}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 select-all">
                        {buyer.email}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {buyer.phone ? (
                          <div className="flex items-center gap-1">
                            <span>{buyer.phone}</span>
                            <a
                              href={`https://wa.me/${buyer.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700"
                              title="Abrir no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {buyer.city ? `${buyer.city}${buyer.state ? `/${buyer.state}` : ''}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-purple-100 text-purple-900 font-bold px-2 py-0.5 rounded-full text-[11px]">
                          {buyer.ordersCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                        R$ {Number(buyer.totalSpent || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {buyer.email && buyer.email.includes('@') && (
                            <button
                              type="button"
                              onClick={() => handleCopySingleEmail(buyer.email)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-900 transition-colors cursor-pointer"
                              title="Copiar e-mail"
                            >
                              {copiedEmail === buyer.email ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: NOVO CADASTRO MANUAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border-2 border-purple-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-purple-950">
              <div className="p-3 bg-purple-100 rounded-2xl text-purple-700">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-['Mali'] text-lg font-bold">Adicionar Cliente ao Clube</h3>
                <p className="text-xs text-slate-500 font-medium">Cadastre um e-mail manualmente na base da loja</p>
              </div>
            </div>

            <form onSubmit={handleAddManualLead} className="space-y-3.5 pt-2">
              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1">
                  E-mail da Cliente *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="cliente@exemplo.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1">
                  Nome (Opcional)
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Amanda Silva"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 text-amber-300 font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      {leadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border-2 border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-['Mali'] text-base font-bold text-purple-950">Excluir Cadastro?</h3>
                <p className="text-xs text-slate-500 font-medium">Remover da base de e-mails</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-rose-50 p-3 rounded-xl border border-rose-100">
              Tem certeza que deseja remover o e-mail <strong>{leadToDelete.email}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLeadToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteLead}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
