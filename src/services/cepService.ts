/**
 * SERVIÇO DE CONSULTA E AUTO-PREENCHIMENTO DE CEP
 * Busca automática de logradouro, bairro, cidade e estado via ViaCEP e BrasilAPI
 */

export interface CepAddress {
  cep: string;
  street: string;
  district: string;
  city: string;
  state: string;
  complement?: string;
  source?: string;
}

/**
 * Busca dados de endereço completos a partir de um CEP de 8 dígitos
 */
export async function fetchAddressByCep(rawCep: string): Promise<CepAddress | null> {
  const clean = String(rawCep || '').replace(/\D/g, '');
  if (clean.length !== 8) return null;

  // 1. Tenta ViaCEP direto no navegador
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        return {
          cep: data.cep || clean,
          street: data.logradouro || '',
          district: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
          complement: data.complemento || '',
          source: 'viacep'
        };
      }
    }
  } catch {
    // Fallback silencioso para endpoint proxy da API
  }

  // 2. Tenta Endpoint Proxy do Backend (/api/cep/:cep)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`/api/cep/${clean}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && !data.error) {
        return {
          cep: data.cep || clean,
          street: data.street || '',
          district: data.district || '',
          city: data.city || '',
          state: data.state || '',
          complement: data.complement || '',
          source: 'backend_proxy'
        };
      }
    }
  } catch {
    // Fallback silencioso para BrasilAPI
  }

  // 3. Fallback adicional via BrasilAPI
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${clean}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && (data.street || data.city)) {
        return {
          cep: data.cep || clean,
          street: data.street || '',
          district: data.neighborhood || '',
          city: data.city || '',
          state: data.state || '',
          source: 'brasilapi'
        };
      }
    }
  } catch {
    // Não foi possível encontrar dados
  }

  return null;
}
