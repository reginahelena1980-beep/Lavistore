import { Product, CartItem } from '../types';
import { PRODUCTS } from '../data/products';

export interface StoredCartItem {
  productId: string;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  sizePrice?: number;
  isGiftWrapped?: boolean;
  customMessage?: string;
  fallback?: {
    id: string;
    name: string;
    price: number;
    category: string;
    imageUrl?: string;
  };
}

// Armazenamento estritamente em memória volátil (Zero LocalStorage)
const memoryStorage = new Map<string, string>();

/**
 * Remove proativamente quaisquer dados residuais legados do localStorage do navegador,
 * garantindo conformidade total com a diretriz de zero armazenamento local.
 */
export function purgeAllProjectLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (
        key.startsWith('lavistore') || 
        key.startsWith('lavi') || 
        key.includes('melhor_envio') || 
        key.includes('bi_') || 
        key.includes('session_notes') || 
        key.includes('google_sheets') ||
        key.includes('order')
      )) {
        keysToRemove.push(key);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
    if (keysToRemove.length > 0) {
      console.info(`[Storage Security] ${keysToRemove.length} chaves residuais removidas do localStorage com sucesso.`);
    }
  } catch (err) {
    console.warn('[Storage Security] Aviso ao purgar localStorage:', err);
  }
}

// Executa a purga imediatamente ao importar o módulo
purgeAllProjectLocalStorage();

/**
 * Grava exclusivamente em memória volátil da sessão.
 * NUNCA armazena nada no localStorage do navegador.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    memoryStorage.set(key, value);
    // Assegura que nada seja gravado no localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
    return true;
  } catch (err: any) {
    console.warn(`[MemoryStorage] Falha ao definir "${key}":`, err?.message || err);
    return false;
  }
}

/**
 * Lê exclusivamente da memória volátil da sessão (Zero LocalStorage).
 */
export function safeGetItem(key: string): string | null {
  return memoryStorage.get(key) || null;
}

/**
 * Remove da memória volátil e garante ausência no localStorage.
 */
export function safeRemoveItem(key: string): void {
  memoryStorage.delete(key);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }
}

/**
 * Serializa itens do carrinho em formato JSON leve
 */
export function serializeCart(items: CartItem[]): string {
  const minimalItems: StoredCartItem[] = items.map(item => {
    const firstImg = item.product?.images?.[0] || '';
    const safeImg = firstImg.startsWith('data:') ? '' : firstImg;

    return {
      productId: item.product?.id || 'unknown',
      quantity: item.quantity,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize,
      sizePrice: item.sizePrice,
      isGiftWrapped: item.isGiftWrapped,
      customMessage: item.customMessage,
      fallback: {
        id: item.product?.id || 'unknown',
        name: item.product?.name || 'Mimo Lavistore',
        price: item.product?.price || 0,
        category: item.product?.category || 'geral',
        imageUrl: safeImg
      }
    };
  });

  return JSON.stringify(minimalItems);
}

/**
 * Desserializa os dados do carrinho associando cada item aos produtos do catálogo
 */
export function deserializeCart(savedJson: string | null, catalogProducts: Product[] = PRODUCTS): CartItem[] {
  if (!savedJson) return [];

  try {
    const parsed = JSON.parse(savedJson);
    if (!Array.isArray(parsed)) return [];

    const pool = catalogProducts.length > 0 ? catalogProducts : PRODUCTS;

    return parsed.map((item: any): CartItem | null => {
      const prodId = item.productId || item.product?.id;
      const foundProduct = pool.find(p => p.id === prodId);

      if (foundProduct) {
        return {
          product: foundProduct,
          quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
          selectedColor: item.selectedColor,
          selectedSize: item.selectedSize,
          sizePrice: item.sizePrice,
          isGiftWrapped: Boolean(item.isGiftWrapped),
          customMessage: item.customMessage
        };
      }

      if (item.product && item.product.id && item.product.name) {
        return {
          product: item.product,
          quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
          selectedColor: item.selectedColor,
          selectedSize: item.selectedSize,
          sizePrice: item.sizePrice,
          isGiftWrapped: Boolean(item.isGiftWrapped),
          customMessage: item.customMessage
        };
      }

      if (item.fallback) {
        const fallbackProduct: Product = {
          id: item.fallback.id,
          name: item.fallback.name,
          category: item.fallback.category,
          price: item.fallback.price,
          rating: 5.0,
          reviewCount: 1,
          images: item.fallback.imageUrl ? [item.fallback.imageUrl] : ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80'],
          description: 'Mimo artesanal Lavistore',
          features: ['Embalagem especial com amor'],
          stock: 10
        };

        return {
          product: fallbackProduct,
          quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
          selectedColor: item.selectedColor,
          selectedSize: item.selectedSize,
          sizePrice: item.sizePrice,
          isGiftWrapped: Boolean(item.isGiftWrapped),
          customMessage: item.customMessage
        };
      }

      return null;
    }).filter((item): item is CartItem => item !== null);
  } catch (e) {
    console.error('[Storage] Error deserializing cart:', e);
    return [];
  }
}

/**
 * Serializa favoritos armazenando IDs de produtos
 */
export function serializeFavorites(favorites: Product[]): string {
  const ids = favorites.map(f => f.id);
  return JSON.stringify(ids);
}

/**
 * Desserializa favoritos recuperando os produtos da lista de produtos
 */
export function deserializeFavorites(savedJson: string | null, catalogProducts: Product[] = PRODUCTS): Product[] {
  if (!savedJson) return [PRODUCTS[0], PRODUCTS[3]].filter(Boolean);

  try {
    const parsed = JSON.parse(savedJson);
    if (!Array.isArray(parsed)) return [PRODUCTS[0], PRODUCTS[3]].filter(Boolean);

    const pool = catalogProducts.length > 0 ? catalogProducts : PRODUCTS;

    if (typeof parsed[0] === 'string') {
      const matched = parsed
        .map(id => pool.find(p => p.id === id))
        .filter((p): p is Product => Boolean(p));
      return matched.length > 0 ? matched : [PRODUCTS[0], PRODUCTS[3]].filter(Boolean);
    }

    if (parsed[0] && typeof parsed[0] === 'object' && parsed[0].id) {
      const matched = parsed
        .map((legacy: Product) => pool.find(p => p.id === legacy.id) || legacy)
        .filter(Boolean);
      return matched;
    }

    return [PRODUCTS[0], PRODUCTS[3]].filter(Boolean);
  } catch {
    return [PRODUCTS[0], PRODUCTS[3]].filter(Boolean);
  }
}

/**
 * Compressor de imagens no cliente
 */
export async function compressImage(
  file: File, 
  maxDimension: number = 1000, 
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler arquivo da imagem.'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('Falha ao processar arquivo de imagem.'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao renderizar imagem para compressão.'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compressor de imagens no cliente retornando Blob binário
 * para upload direto ao Firebase Storage (Zero Base64 no banco de dados).
 */
export async function compressImageToBlob(
  file: File,
  maxDimension: number = 1000,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler arquivo da imagem.'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('Falha ao processar arquivo de imagem.'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao renderizar imagem para compressão.'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Falha ao obter contexto 2D para renderização da imagem.'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao gerar blob comprimido da imagem.'));
          }
        }, 'image/jpeg', quality);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
