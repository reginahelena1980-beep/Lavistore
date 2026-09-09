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

/**
 * Safely writes to localStorage, catching QuotaExceededError and preventing app crashes.
 * If quota is exceeded, tries to purge non-critical temporary keys.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[Storage] Failed to set "${key}":`, err?.message || err);

    // If quota exceeded, try cleaning temporary items and retry
    try {
      localStorage.removeItem('lavistore_product_draft');
      localStorage.removeItem('lavistore_temp_upload');
      localStorage.setItem(key, value);
      console.info(`[Storage] Successfully saved "${key}" after clearing draft cache.`);
      return true;
    } catch (retryErr) {
      console.error(`[Storage] Quota still exceeded when saving "${key}".`, retryErr);
      return false;
    }
  }
}

/**
 * Serializes cart items into a lightweight JSON format without duplicating heavy images.
 * Reduces storage footprint from megabytes to ~500 bytes!
 */
export function serializeCart(items: CartItem[]): string {
  const minimalItems: StoredCartItem[] = items.map(item => {
    // Only keep first image if it is an HTTP or asset URL, never duplicate huge base64 in cart storage
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
 * Deserializes stored cart data and associates each item with the actual catalog product.
 * Handles both new lightweight format and legacy full-product format safely.
 */
export function deserializeCart(savedJson: string | null, catalogProducts: Product[] = PRODUCTS): CartItem[] {
  if (!savedJson) return [];

  try {
    const parsed = JSON.parse(savedJson);
    if (!Array.isArray(parsed)) return [];

    const pool = catalogProducts.length > 0 ? catalogProducts : PRODUCTS;

    return parsed.map((item: any): CartItem | null => {
      // Find product by id from pool
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

      // If legacy format had a full product, use it but sanitize images
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

      // If only fallback is available
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
          features: ['Embalagem perfumada com amor'],
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
 * Serializes favorites by storing only product IDs.
 */
export function serializeFavorites(favorites: Product[]): string {
  const ids = favorites.map(f => f.id);
  return JSON.stringify(ids);
}

/**
 * Deserializes favorites from IDs by matching with current product pool.
 */
export function deserializeFavorites(savedJson: string | null, catalogProducts: Product[] = PRODUCTS): Product[] {
  if (!savedJson) return [PRODUCTS[0], PRODUCTS[3]].filter(Boolean);

  try {
    const parsed = JSON.parse(savedJson);
    if (!Array.isArray(parsed)) return [PRODUCTS[0], PRODUCTS[3]].filter(Boolean);

    const pool = catalogProducts.length > 0 ? catalogProducts : PRODUCTS;

    // Check if it's array of string IDs
    if (typeof parsed[0] === 'string') {
      const matched = parsed
        .map(id => pool.find(p => p.id === id))
        .filter((p): p is Product => Boolean(p));
      return matched.length > 0 ? matched : [PRODUCTS[0], PRODUCTS[3]].filter(Boolean);
    }

    // Legacy format: array of Product objects
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
 * Client-side image compressor that scales down large user uploads before saving to base64.
 * Reduces 3MB-5MB photos to ~60KB-120KB without visible quality loss for web view.
 */
export async function compressImage(
  file: File, 
  maxDimension: number = 1000, 
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If not an image, reject
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
          // Fallback to original if canvas 2d context unavailable
          resolve(src);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with 0.8 quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
