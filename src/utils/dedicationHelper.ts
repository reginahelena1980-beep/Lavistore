import { OrderData } from '../types';

export interface OrderDedicationInfo {
  orderId: string;
  customerName: string;
  recipient: string;
  sender: string;
  message: string;
  theme?: string;
  ribbon?: string;
  bag?: string;
  notes?: string;
  itemsIncluded?: string[];
  date?: string;
}

/**
 * Extrai dados de dedicatória de um pedido (seja do campo dedication,
 * de itens de kit personalizado como a Sacolinha Amarela ou das observações do pedido).
 */
export function extractDedicationFromOrder(order: OrderData): OrderDedicationInfo | null {
  if (!order) return null;

  // 1. Se já possui o objeto dedication explícito no pedido
  if (order.dedication && (order.dedication.message || order.dedication.recipient)) {
    return {
      orderId: order.orderId,
      customerName: order.customerName,
      recipient: order.dedication.recipient || 'Alguém muito especial',
      sender: order.dedication.sender || order.customerName,
      message: order.dedication.message || '',
      theme: order.dedication.theme || 'Sakura Rosé',
      ribbon: order.dedication.ribbon,
      bag: order.dedication.bag,
      notes: order.notes,
      date: order.date
    };
  }

  // 2. Procura nos itens do pedido por sacolinha personalizada ou itens de presente
  if (Array.isArray(order.items)) {
    for (const item of order.items) {
      // Se o item tem dedication direto
      if (item.dedication && (item.dedication.message || item.dedication.recipient)) {
        return {
          orderId: order.orderId,
          customerName: order.customerName,
          recipient: item.dedication.recipient || 'Alguém muito especial',
          sender: item.dedication.sender || order.customerName,
          message: item.dedication.message || '',
          theme: item.dedication.theme || 'Lavanda Imperial',
          ribbon: item.dedication.ribbon,
          bag: item.dedication.bag,
          notes: order.notes,
          date: order.date
        };
      }

      // Se o item tem customKitData
      if (item.customKitData) {
        return {
          orderId: order.orderId,
          customerName: order.customerName,
          recipient: item.customKitData.recipient || 'Alguém especial',
          sender: item.customKitData.sender || order.customerName,
          message: item.customKitData.message || '',
          theme: 'Sakura Rosé',
          ribbon: item.customKitData.selectedRibbon?.name,
          bag: item.customKitData.bagType?.name,
          notes: order.notes,
          date: order.date
        };
      }

      // Procura no texto da descrição do produto (ex: Sacolinha Amarela gerada pelo KitBuilder)
      const desc = item.product?.description || (item as any)?.description || '';
      if (desc.includes('Dedicatória:')) {
        let msg = '';
        let de = '';
        let para = '';
        let fita = '';

        // Extrai Dedicatória: "..."
        const msgMatch = desc.match(/Dedicat[oó]ria:\s*["“]([^"”]+)["”]/i);
        if (msgMatch && msgMatch[1]) {
          msg = msgMatch[1].trim();
        }

        // Extrai De: ... Para: ...
        const deMatch = desc.match(/\(De:\s*([^)]*?)\s*Para:\s*([^)]*?)\)/i);
        if (deMatch) {
          de = deMatch[1].trim();
          para = deMatch[2].trim();
        }

        // Extrai Fita: ...
        const fitaMatch = desc.match(/Fita:\s*([^.]+)\./i);
        if (fitaMatch && fitaMatch[1]) {
          fita = fitaMatch[1].trim();
        }

        if (msg || para || de) {
          return {
            orderId: order.orderId,
            customerName: order.customerName,
            recipient: para || 'Pessoa Amada',
            sender: de || order.customerName,
            message: msg || 'Com todo o meu amor e carinho!',
            theme: 'Sakura Rosé',
            ribbon: fita,
            bag: item.product?.name || 'Sacolinha Amarela',
            notes: order.notes,
            date: order.date
          };
        }
      }
    }
  }

  // 3. Se possui observações com conteúdo de presente ou mensagem
  if (order.notes && order.notes.trim().length > 3) {
    const raw = order.notes.trim();
    return {
      orderId: order.orderId,
      customerName: order.customerName,
      recipient: 'Alguém Especial',
      sender: order.customerName,
      message: raw,
      theme: 'Margaridinhas Lilás',
      notes: raw,
      date: order.date
    };
  }

  return null;
}

/**
 * Abre a janela de impressão com o cartãozinho floral de presente formatado em tamanho 10x15cm.
 */
export function openDedicationPrintWindow(dedication: OrderDedicationInfo): void {
  const printWindow = window.open('', '_blank', 'width=750,height=800');
  if (!printWindow) {
    alert('Por favor, permita pop-ups no seu navegador para imprimir o cartãozinho!');
    return;
  }

  const themeColors: Record<string, { primary: string; bg: string; border: string; accent: string }> = {
    'Sakura Rosé': { primary: '#9d174d', bg: '#fff1f2', border: '#f43f5e', accent: '#fb7185' },
    'Lavanda Imperial': { primary: '#581c87', bg: '#faf5ff', border: '#c084fc', accent: '#d8b4fe' },
    'Tulipas Douradas': { primary: '#78350f', bg: '#fffbeb', border: '#f59e0b', accent: '#fde68a' },
    'Margaridinhas Lilás': { primary: '#3730a3', bg: '#f5f3ff', border: '#818cf8', accent: '#c7d2fe' }
  };

  const theme = themeColors[dedication.theme || ''] || themeColors['Sakura Rosé'];

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Cartão de Dedicatória - Pedido #${dedication.orderId}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Playfair+Display:ital,wght@0,600;1,600&family=Quicksand:wght@500;600;700&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 15mm;
          }

          body {
            font-family: 'Quicksand', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f9fafb;
            color: #1f2937;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .instructions {
            text-align: center;
            margin-bottom: 20px;
            font-size: 13px;
            color: #6b7280;
          }

          .btn-print {
            background: #9d174d;
            color: white;
            border: none;
            padding: 10px 24px;
            font-size: 14px;
            font-weight: bold;
            border-radius: 9999px;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            margin-bottom: 16px;
            transition: all 0.2s;
          }
          .btn-print:hover {
            background: #831843;
          }

          /* CARTÃO 10cm x 15cm (ou proporcional) */
          .card-wrapper {
            position: relative;
            width: 140mm;
            min-height: 95mm;
            background: ${theme.bg};
            border: 2px dashed ${theme.border};
            border-radius: 18px;
            padding: 22mm 18mm 18mm 18mm;
            box-sizing: border-box;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
            page-break-inside: avoid;
            background-image: radial-gradient(${theme.accent}33 1px, transparent 1px);
            background-size: 14px 14px;
          }

          .inner-border {
            border: 1.5px solid ${theme.border};
            border-radius: 12px;
            padding: 16px;
            height: 100%;
            box-sizing: border-box;
            background: rgba(255, 255, 255, 0.88);
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .flower-corner-tl { position: absolute; top: 6px; left: 8px; font-size: 18px; }
          .flower-corner-tr { position: absolute; top: 6px; right: 8px; font-size: 18px; }
          .flower-corner-bl { position: absolute; bottom: 6px; left: 8px; font-size: 18px; }
          .flower-corner-br { position: absolute; bottom: 6px; right: 8px; font-size: 18px; }

          .header-brand {
            text-align: center;
            margin-bottom: 12px;
          }

          .brand-title {
            font-family: 'Playfair Display', serif;
            font-size: 16px;
            font-weight: 600;
            color: ${theme.primary};
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin: 0;
          }

          .brand-sub {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #6b7280;
            margin-top: 2px;
          }

          .recipient-line {
            font-size: 14px;
            font-weight: 700;
            color: ${theme.primary};
            margin-bottom: 12px;
            display: flex;
            align-items: baseline;
            gap: 6px;
          }

          .recipient-name {
            font-family: 'Caveat', cursive;
            font-size: 24px;
            font-weight: 700;
            color: #111827;
          }

          .message-body {
            font-family: 'Playfair Display', serif;
            font-style: italic;
            font-size: 14px;
            line-height: 1.6;
            color: #1f2937;
            text-align: center;
            margin: 10px 0 16px 0;
            padding: 0 10px;
          }

          .sender-line {
            text-align: right;
            font-size: 13px;
            font-weight: 700;
            color: ${theme.primary};
            margin-top: 8px;
          }

          .sender-name {
            font-family: 'Caveat', cursive;
            font-size: 22px;
            font-weight: 700;
            color: #111827;
            margin-left: 4px;
          }

          .card-footer {
            border-top: 1px dashed ${theme.border};
            padding-top: 8px;
            margin-top: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #6b7280;
          }

          .cut-hint {
            position: absolute;
            top: 6px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            color: #9ca3af;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
          }

          @media print {
            body {
              background: transparent;
              padding: 0;
            }
            .instructions, .btn-print {
              display: none !important;
            }
            .card-wrapper {
              box-shadow: none;
              border: 1.5px dashed #d1d5db;
            }
          }
        </style>
      </head>
      <body>
        <div class="instructions">
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir Cartãozinho de Dedicatória</button>
          <p>Dica: Imprima em papel cartão ou papel fotográfico fosco, recorte na linha pontilhada e borrife o cheirinho antes de colocar no pacote!</p>
        </div>

        <div class="card-wrapper">
          <span class="cut-hint">✂️ Recorte na linha pontilhada</span>
          
          <div class="inner-border">
            <span class="flower-corner-tl">🌸</span>
            <span class="flower-corner-tr">🌸</span>
            <span class="flower-corner-bl">🌸</span>
            <span class="flower-corner-br">🌸</span>

            <div class="header-brand">
              <h1 class="brand-title">Lavistore Kids</h1>
              <div class="brand-sub">Com carinho & doçura</div>
            </div>

            <div>
              <div class="recipient-line">
                <span>Para:</span>
                <span class="recipient-name">${dedication.recipient}</span>
              </div>

              <div class="message-body">
                "${dedication.message}"
              </div>

              <div class="sender-line">
                <span>Com amor,</span>
                <span class="sender-name">${dedication.sender}</span>
              </div>
            </div>

            <div class="card-footer">
              <span>Pedido #${dedication.orderId} ${dedication.ribbon ? `• Fita: ${dedication.ribbon}` : ''}</span>
              <span>Embalado artesanalmente ✨</span>
            </div>
          </div>
        </div>

        <script>
          // Abre diálogo de impressão automaticamente após carregar fontes
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
