import React, { useState } from 'react';
import {
  X,
  Database,
  GitBranch,
  Layers,
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  Code2,
  Copy,
  Check,
  ShieldCheck,
  Server
} from 'lucide-react';

interface BiDatabaseArchitectureModalProps {
  onClose: () => void;
}

export const BiDatabaseArchitectureModal: React.FC<BiDatabaseArchitectureModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'triggers' | 'sql'>('schema');
  const [copiedCode, setCopiedCode] = useState(false);

  const sqlSchema = `-- ==========================================================
-- MODELAGEM DE BANCO DE DADOS: ESTOQUE/BI <-> VITRINE E-COMMERCE
-- SISTEMA LAVISTORE - FULL-STACK ENTERPRISE
-- ==========================================================

-- 1. TABELA DE ESTOQUE FISCAL & APURAÇÃO (BI FINANCEIRO)
CREATE TABLE IF NOT EXISTS estoque_produtos (
    id VARCHAR(64) PRIMARY KEY,                  -- Ex: 'bi-1789152241687-wc5sa'
    ano INTEGER NOT NULL,                        -- Ano de apuração (Ex: 2026)
    mes VARCHAR(20) NOT NULL,                    -- Mês de apuração (Ex: 'Setembro')
    produto VARCHAR(255) NOT NULL,               -- Nome original da planilha (Ex: 'Bolsa unicornio')
    tam_cor VARCHAR(50) DEFAULT 'Único',         -- Variação física (Ex: 'M', 'P', 'Rosa')
    descricao TEXT,                              -- Descrição base de cadastro
    quantidade_comprada INTEGER NOT NULL CHECK (quantidade_comprada >= 0),
    custo_total NUMERIC(10, 2) NOT NULL CHECK (custo_total >= 0),
    preco_venda NUMERIC(10, 2) NOT NULL CHECK (preco_venda >= 0),
    quantidade_vendida INTEGER DEFAULT 0 CHECK (quantidade_vendida >= 0),
    
    -- Indicadores calculados / materializados
    saldo_estoque_qtd INTEGER GENERATED ALWAYS AS (quantidade_comprada - quantidade_vendida) STORED,
    custo_unitario NUMERIC(10, 2) GENERATED ALWAYS AS (
        CASE WHEN quantidade_comprada > 0 THEN custo_total / quantidade_comprada ELSE 0 END
    ) STORED,
    
    -- Metadados de integração com Vitrine
    published_to_vitrine BOOLEAN DEFAULT FALSE,
    auto_hide_when_out_of_stock BOOLEAN DEFAULT TRUE,
    vitrine_image_url TEXT,
    vitrine_category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE PRODUTOS DA VITRINE (CATÁLOGO PÚBLICO E-COMMERCE)
CREATE TABLE IF NOT EXISTS vitrine_produtos (
    id VARCHAR(64) PRIMARY KEY,                  -- Ex: 'lav-bolsa-unicornio'
    bi_record_id VARCHAR(64) REFERENCES estoque_produtos(id) ON DELETE SET NULL, -- CHAVE ESTRANGEIRA (FK)
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    stock INTEGER NOT NULL DEFAULT 0,            -- Sincronizado com saldo_estoque_qtd
    images JSONB NOT NULL DEFAULT '[]'::jsonb,   -- Fotos da vitrine (upload pelo ADM)
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    tag VARCHAR(50),
    is_published BOOLEAN DEFAULT TRUE,           -- Controla visibilidade pública
    auto_hide_when_out_of_stock BOOLEAN DEFAULT TRUE,
    rating NUMERIC(2, 1) DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. GATILHO (TRIGGER): BAIXA AUTOMÁTICA DE ESTOQUE APÓS VENDA NO CHECKOUT
CREATE OR REPLACE FUNCTION fn_processar_venda_estoque()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
    v_saldo_atual INTEGER;
    v_auto_hide BOOLEAN;
BEGIN
    -- Para cada item comprado no pedido finalizado
    FOR v_item IN SELECT * FROM jsonb_to_recordset(NEW.items) AS x(
        product_id VARCHAR(64),
        bi_record_id VARCHAR(64),
        quantity INTEGER
    )
    LOOP
        -- 1. Abate na tabela de Estoque/BI (incrementa quantidade_vendida)
        UPDATE estoque_produtos
        SET quantidade_vendida = quantidade_vendida + v_item.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_item.bi_record_id OR id = (
            SELECT bi_record_id FROM vitrine_produtos WHERE id = v_item.product_id
        );

        -- 2. Verifica novo saldo em estoque
        SELECT saldo_estoque_qtd, auto_hide_when_out_of_stock 
        INTO v_saldo_atual, v_auto_hide
        FROM estoque_produtos
        WHERE id = v_item.bi_record_id OR id = (
            SELECT bi_record_id FROM vitrine_produtos WHERE id = v_item.product_id
        );

        -- 3. Sincroniza tabela da vitrine e oculta se esgotado (quando auto_hide for true)
        UPDATE vitrine_produtos
        SET stock = GREATEST(0, v_saldo_atual),
            is_published = CASE 
                WHEN v_saldo_atual <= 0 AND v_auto_hide THEN FALSE 
                ELSE is_published 
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_item.product_id OR bi_record_id = v_item.bi_record_id;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-purple-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-3xl w-full border-2 border-amber-300 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-amber-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-900 text-amber-300 flex items-center justify-center shadow-md">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Mali'] text-base sm:text-lg font-bold text-purple-950">
                  Lógica de Banco de Dados & Arquitetura de Sincronização
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ACID & Real-Time
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Relacionamento relacional/documental entre Estoque/BI (Administrativo) e Vitrine (E-commerce).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs de navegação */}
        <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'schema'
                ? 'bg-purple-900 text-white shadow-xs'
                : 'text-purple-950 hover:bg-amber-100'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Diagrama & Relacionamento (1:1 / 1:N)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('triggers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'triggers'
                ? 'bg-purple-900 text-white shadow-xs'
                : 'text-purple-950 hover:bg-amber-100'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Fluxo de Baixa em Tempo Real</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sql'
                ? 'bg-purple-900 text-white shadow-xs'
                : 'text-purple-950 hover:bg-amber-100'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Script DDL / SQL PostgreSQL</span>
          </button>
        </div>

        {/* Conteúdo da Tab 1: Relacionamento */}
        {activeTab === 'schema' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Entidade 1: Estoque/BI */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-amber-700" />
                    <span>Tabela: estoque_produtos (BI)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-200 text-amber-950">
                    Origem Primária
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Gerenciamento físico, custos unitários, quantidades compradas e controle financeiro de compras.
                </p>
                <div className="space-y-1 pt-1 font-mono text-[10px] text-slate-700">
                  <div className="flex justify-between py-0.5 border-b border-amber-200/60 font-bold text-purple-950">
                    <span>id (PK)</span>
                    <span className="text-slate-400">VARCHAR(64)</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>produto / tam_cor</span>
                    <span className="text-slate-400">TEXT</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>quantidade_comprada</span>
                    <span className="text-slate-400">INTEGER</span>
                  </div>
                  <div className="flex justify-between py-0.5 font-bold text-emerald-800">
                    <span>quantidade_vendida</span>
                    <span className="text-slate-400">INTEGER (Atualiz. via checkout)</span>
                  </div>
                  <div className="flex justify-between py-0.5 font-bold text-purple-900">
                    <span>saldo_estoque_qtd</span>
                    <span className="text-slate-400">CALCULADO</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>published_to_vitrine</span>
                    <span className="text-slate-400">BOOLEAN</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>auto_hide_when_out_of_stock</span>
                    <span className="text-slate-400">BOOLEAN</span>
                  </div>
                </div>
              </div>

              {/* Entidade 2: Vitrine/Produtos */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border-2 border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-purple-900 tracking-wider flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-purple-700" />
                    <span>Tabela: vitrine_produtos</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-200 text-purple-950">
                    Catálogo Público
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Exibição para os clientes no catálogo online, com fotos bonitas, tags, carrinho e checkout.
                </p>
                <div className="space-y-1 pt-1 font-mono text-[10px] text-slate-700">
                  <div className="flex justify-between py-0.5 border-b border-purple-200/60 font-bold text-purple-950">
                    <span>id (PK)</span>
                    <span className="text-slate-400">VARCHAR(64)</span>
                  </div>
                  <div className="flex justify-between py-0.5 font-bold text-pink-700 bg-pink-50 px-1 rounded">
                    <span>bi_record_id (FK)</span>
                    <span className="text-slate-500 font-normal">REF estoque_produtos.id</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>name / category / price</span>
                    <span className="text-slate-400">TEXT, NUMERIC</span>
                  </div>
                  <div className="flex justify-between py-0.5 font-bold text-purple-900">
                    <span>stock</span>
                    <span className="text-slate-400">INTEGER (Sincronizado)</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>images</span>
                    <span className="text-slate-400">JSONB (Upload ADM)</span>
                  </div>
                  <div className="flex justify-between py-0.5 font-bold text-emerald-700">
                    <span>is_published</span>
                    <span className="text-slate-400">BOOLEAN (Ativo na Loja)</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>auto_hide_when_out_of_stock</span>
                    <span className="text-slate-400">BOOLEAN</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Destaque do Relacionamento */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-xs text-slate-700 space-y-2">
              <div className="font-bold text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Como funciona a integridade referencial:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                O campo <strong>bi_record_id</strong> na tabela de vitrine vincula o anúncio público diretamente ao lote de apuração contábil na tabela de estoque. 
                Dessa forma, a vitrine não duplica o controle de estoque de forma isolada: ela reflete com precisão cirúrgica a disponibilidade física das peças cadastradas pelo administrador.
              </p>
            </div>
          </div>
        )}

        {/* Conteúdo da Tab 2: Triggers e Baixa em Tempo Real */}
        {activeTab === 'triggers' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-7 h-7 rounded-xl bg-purple-900 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-950">Cliente Finaliza a Compra no Checkout</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    O cliente escolhe o mimo (ex: Meia de Panda ou Bolsa Unicórnio) e confirma o pagamento via PIX, Cartão ou Boleto.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-7 h-7 rounded-xl bg-purple-900 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-950">Baixa Instantânea no Estoque do BI</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    O sistema localiza o registro correspondente pelo <code>biRecordId</code>, incrementa a <code>quantidadeVendida</code> e recalcula imediatamente o <code>saldoEstoqueQtd</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-7 h-7 rounded-xl bg-purple-900 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-950">Alerta Visual e Ocultação Automática</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Se o saldo for ≤ 5 un., o painel exibe o alerta amarelo <strong>"Estoque Baixo"</strong>. Se o saldo zerar (0 un.) e a opção <strong>"Ocultar automaticamente"</strong> estiver ativa, o produto é pausado da vitrine para que novos clientes não comprem sem produto físico.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-950 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0" />
              <span>
                <strong>Garantia ACID:</strong> A transação de checkout assegura que o estoque seja debitado atomicamente, prevenindo "overselling" (venda duplicada).
              </span>
            </div>
          </div>
        )}

        {/* Conteúdo da Tab 3: Script SQL DDL */}
        {activeTab === 'sql' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                Script SQL DDL (PostgreSQL / CockroachDB / SQLite):
              </span>
              <button
                type="button"
                onClick={copyToClipboard}
                className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-purple-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copiado!' : 'Copiar Script SQL'}</span>
              </button>
            </div>

            <div className="relative rounded-2xl bg-slate-900 text-slate-100 p-4 font-mono text-[11px] overflow-x-auto max-h-[350px] leading-relaxed shadow-inner">
              <pre>{sqlSchema}</pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-amber-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-purple-950 hover:bg-purple-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Entendido, fechar janela
          </button>
        </div>

      </div>
    </div>
  );
};
