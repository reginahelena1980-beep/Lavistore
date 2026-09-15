import { BiProductCalculatedRecord, Product, ProductSizeVariant } from '../types';

/**
 * MOTOR DE AGRUPAMENTO AUTOMÁTICO PAI / FILHO (E-COMMERCE LAVISTORE)
 * =================================================================
 * Permite que planilhas com múltiplas linhas para o mesmo produto (diferenciadas
 * apenas pela coluna "Tam/Cor", ex: P, M, G, GG) sejam:
 * 1. Preservadas como linhas individuais no Painel Administrativo / Financeiro BI;
 * 2. Unificadas automaticamente em um ÚNICO Card na Vitrine Pública com seletor dinâmico;
 * 3. Abatidas exclusivamente na linha correspondente da variação comprada no checkout.
 */

/**
 * Normaliza o nome do produto para agrupamento, removendo sufixos acidentais
 * como " - P", " - M", " (G)", mantendo o nome principal uniforme.
 */
export function normalizeBaseProductName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    // Remove sufixos como " - P", " - GG", " (Tamanho P)", " - Único", etc.
    .replace(/\s*[-–/]\s*(tam(anho)?\.?\s*)?(pp|p|m|g|gg|xg|xgg|único|unico|\d+[-/]\d+|\d+)\s*$/i, '')
    .replace(/\s*\((tam(anho)?\.?\s*)?(pp|p|m|g|gg|xg|xgg|único|unico|\d+[-/]\d+|\d+)\)\s*$/i, '')
    .trim();
}

/**
 * Chave de agrupamento comparativa (minúscula e sem acentos)
 */
export function getGroupingKey(name: string): string {
  return normalizeBaseProductName(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Agrupa registros do BI por produto base (Pai)
 */
export function groupBiRecordsByBaseProduct(
  records: BiProductCalculatedRecord[]
): Map<string, BiProductCalculatedRecord[]> {
  const groups = new Map<string, BiProductCalculatedRecord[]>();

  for (const record of records) {
    const key = getGroupingKey(record.produto);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(record);
  }

  return groups;
}

/**
 * Encontra todos os registros irmãos da mesma família de produto no BI
 */
export function findSiblingBiRecords(
  targetRecord: BiProductCalculatedRecord,
  allRecords: BiProductCalculatedRecord[]
): BiProductCalculatedRecord[] {
  const targetKey = getGroupingKey(targetRecord.produto);
  return allRecords.filter(r => getGroupingKey(r.produto) === targetKey);
}

/**
 * Cria ou atualiza o Produto Pai da Vitrine a partir do grupo de registros filhos da planilha
 */
export function createParentProductFromBiRecords(
  primaryRecord: BiProductCalculatedRecord,
  siblingRecords: BiProductCalculatedRecord[],
  existingProduct?: Product | null,
  productOverrides?: Partial<Product>
): Product {
  const prodId =
    existingProduct?.id ||
    primaryRecord.vitrineProductId ||
    siblingRecords.find(s => s.vitrineProductId)?.vitrineProductId ||
    `lav-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const baseName = normalizeBaseProductName(primaryRecord.produto) || primaryRecord.produto;

  // Monta a lista de variações a partir de cada linha da planilha ou das alterações no modal
  let sizes: ProductSizeVariant[];

  if (productOverrides?.sizes && productOverrides.sizes.length > 0) {
    sizes = productOverrides.sizes.map((s) => {
      const matchingSibling = siblingRecords.find(
        r => r.id === s.biRecordId || r.tamCor.toLowerCase().trim() === s.label.toLowerCase().trim()
      );
      return {
        ...s,
        biRecordId: s.biRecordId || matchingSibling?.id || primaryRecord.id,
        initialStock: s.initialStock ?? matchingSibling?.quantidadeComprada,
        unitCost: s.unitCost ?? matchingSibling?.custoUnitario,
        stock: s.stock ?? (matchingSibling?.saldoEstoqueQtd !== undefined ? Math.max(0, matchingSibling.saldoEstoqueQtd) : 0)
      };
    });
  } else {
    sizes = siblingRecords.map((r, index) => {
      // Procura se já existia uma variante correspondente no produto
      const existingVar = existingProduct?.sizes?.find(
        s => s.biRecordId === r.id || s.label.toLowerCase() === r.tamCor.toLowerCase()
      );

      const effectiveStock = r.saldoEstoqueQtd > 0
        ? r.saldoEstoqueQtd
        : ((!r.quantidadeVendida || r.quantidadeVendida === 0) && (r.quantidadeComprada || 0) > 0)
          ? r.quantidadeComprada
          : Math.max(0, r.saldoEstoqueQtd || 0);

      return {
        id: existingVar?.id || `size-${r.id || index}`,
        label: r.tamCor || 'Único',
        stock: existingVar?.stock !== undefined ? existingVar.stock : effectiveStock,
        initialStock: r.quantidadeComprada,
        price: existingVar?.price ?? r.precoVenda,
        unitCost: r.custoUnitario,
        biRecordId: r.id
      };
    });
  }

  // Estoque total é a soma exata dos saldos em estoque de todas as variações
  const totalStock = sizes.reduce((acc, s) => acc + (s.stock || 0), 0);

  // Verifica se há variação de preço entre os tamanhos/cores
  const allPrices = sizes.map(s => s.price ?? primaryRecord.precoVenda);
  const hasMultiplePrices = allPrices.some(p => p !== allPrices[0]);

  // Foto padrão inteligente baseada no produto
  const defaultImage =
    existingProduct?.images?.[0] ||
    primaryRecord.vitrineImageUrl ||
    siblingRecords.find(s => s.vitrineImageUrl)?.vitrineImageUrl ||
    'https://images.unsplash.com/photo-1582966770380-921587181f82?w=800&auto=format&fit=crop&q=80';

  const product: Product = {
    ...existingProduct,
    ...productOverrides,
    id: prodId,
    name: productOverrides?.name || existingProduct?.name || baseName,
    category: productOverrides?.category || existingProduct?.category || primaryRecord.vitrineCategory || 'acessorios-mimos',
    price: productOverrides?.price ?? existingProduct?.price ?? primaryRecord.precoVenda,
    originalPrice:
      productOverrides?.originalPrice ??
      existingProduct?.originalPrice ??
      Number((primaryRecord.precoVenda * 1.25).toFixed(2)),
    rating: existingProduct?.rating || 5.0,
    reviewCount: existingProduct?.reviewCount || 18,
    images:
      productOverrides?.images && productOverrides.images.length > 0
        ? productOverrides.images
        : existingProduct?.images && existingProduct.images.length > 0
          ? existingProduct.images
          : [defaultImage],
    description:
      productOverrides?.description ||
      existingProduct?.description ||
      primaryRecord.descricao ||
      `Lindo mimo ${baseName} da Lavistore! Conforto, carinho e delicadeza em cada detalhe. ✨💖`,
    features:
      productOverrides?.features ||
      existingProduct?.features || [
        `Variações disponíveis: ${siblingRecords.map(s => s.tamCor).join(', ')}`,
        'Item selecionado com carinho pela equipe Lavistore',
        'Embalado para presente com cheirinho doce especial',
        'Pronta entrega com estoque real sincronizado'
      ],
    tag: productOverrides?.tag || existingProduct?.tag || primaryRecord.vitrineTag || 'Favorito ✨',
    dimensions: productOverrides?.dimensions || existingProduct?.dimensions,
    isNew: productOverrides?.isNew ?? existingProduct?.isNew ?? true,
    isBestseller: productOverrides?.isBestseller ?? existingProduct?.isBestseller ?? false,
    isFloralSpecial: productOverrides?.isFloralSpecial ?? existingProduct?.isFloralSpecial ?? false,
    hasSizes: sizes.length > 1 || (sizes.length === 1 && sizes[0].label.toLowerCase() !== 'único'),
    sizePricingMode: hasMultiplePrices ? 'custom' : 'same',
    sizes,
    hasColors: productOverrides?.hasColors ?? existingProduct?.hasColors ?? false,
    colors: productOverrides?.colors ?? existingProduct?.colors,
    imageFit: productOverrides?.imageFit || existingProduct?.imageFit || 'cover',
    imagePosition: productOverrides?.imagePosition || existingProduct?.imagePosition || 'center',
    imageScale: productOverrides?.imageScale || existingProduct?.imageScale || 100,
    stock: totalStock,
    biRecordId: primaryRecord.id,
    originTamCor: primaryRecord.tamCor,
    isPublished: productOverrides?.isPublished ?? existingProduct?.isPublished ?? true,
    autoHideWhenOutOfStock:
      productOverrides?.autoHideWhenOutOfStock ??
      existingProduct?.autoHideWhenOutOfStock ??
      primaryRecord.autoHideWhenOutOfStock ??
      true
  };

  return product;
}

/**
 * Encontra a linha EXATA na planilha do BI que corresponde ao item comprado,
 * garantindo que a baixa seja realizada exclusivamente na variação certa.
 */
export function findExactBiRecordForOrderItem(
  item: {
    product: Product;
    selectedSize?: string;
    selectedSizeId?: string;
    biRecordId?: string;
  },
  biRecords: BiProductCalculatedRecord[]
): BiProductCalculatedRecord | null {
  // 1. Tenta correspondência direta pelo biRecordId no item ou na variação
  if (item.biRecordId) {
    const found = biRecords.find(r => r.id === item.biRecordId);
    if (found) return found;
  }

  // 2. Tenta através do ID da variação registrada no produto
  if (item.selectedSizeId && item.product.sizes) {
    const matchedSize = item.product.sizes.find(s => s.id === item.selectedSizeId);
    if (matchedSize?.biRecordId) {
      const found = biRecords.find(r => r.id === matchedSize.biRecordId);
      if (found) return found;
    }
  }

  const pKey = getGroupingKey(item.product.name);
  const targetLabel = (item.selectedSize || '').trim().toLowerCase();

  // 3. Tenta encontrar pelo produto agrupado + Tam/Cor exato
  const matchingByGroupAndSize = biRecords.find(r => {
    const rKey = getGroupingKey(r.produto);
    if (rKey !== pKey) return false;
    if (!targetLabel) return true;
    return r.tamCor.trim().toLowerCase() === targetLabel;
  });
  if (matchingByGroupAndSize) return matchingByGroupAndSize;

  // 4. Tenta por vínculo do vitrineProductId + Tam/Cor
  const matchingByVitrineIdAndSize = biRecords.find(r => {
    if (r.vitrineProductId !== item.product.id) return false;
    if (!targetLabel) return true;
    return r.tamCor.trim().toLowerCase() === targetLabel;
  });
  if (matchingByVitrineIdAndSize) return matchingByVitrineIdAndSize;

  // 5. Fallback por biRecordId do produto pai
  if (item.product.biRecordId) {
    const found = biRecords.find(r => r.id === item.product.biRecordId);
    if (found) return found;
  }

  // 6. Último fallback: primeira linha com o mesmo nome do produto
  return biRecords.find(r => getGroupingKey(r.produto) === pKey) || null;
}

/**
 * Agrupa dinamicamente a lista de produtos da vitrine se houver itens duplicados
 * ou sincroniza os saldos em tempo real com as linhas individuais do BI.
 */
export function aggregateProductsForVitrine(
  rawProducts: Product[],
  biRecords?: BiProductCalculatedRecord[]
): Product[] {
  if (!rawProducts || rawProducts.length === 0) return [];

  const biList = biRecords || [];
  const biGroups = groupBiRecordsByBaseProduct(biList);

  // Mapeia por chave de agrupamento
  const aggregatedMap = new Map<string, Product>();

  for (const prod of rawProducts) {
    const key = getGroupingKey(prod.name);
    const biSiblings = biGroups.get(key) || [];

    if (!aggregatedMap.has(key)) {
      // Se tivermos registros no BI para esse produto, sincronizamos em tempo real
      if (biSiblings.length > 0) {
        // Encontra o registro principal
        const primary = biSiblings.find(s => s.id === prod.biRecordId) || biSiblings[0];
        const unified = createParentProductFromBiRecords(primary, biSiblings, prod);
        aggregatedMap.set(key, unified);
      } else {
        aggregatedMap.set(key, { ...prod });
      }
    } else {
      // Já existe um pai: unifica as variações deste produto duplicado no pai
      const existingParent = aggregatedMap.get(key)!;
      const combinedSizes: ProductSizeVariant[] = existingParent.sizes ? [...existingParent.sizes] : [];

      if (prod.sizes && prod.sizes.length > 0) {
        for (const s of prod.sizes) {
          if (!combinedSizes.some(cs => cs.label.toLowerCase() === s.label.toLowerCase())) {
            combinedSizes.push(s);
          }
        }
      } else if (prod.originTamCor && prod.originTamCor.toLowerCase() !== 'único') {
        if (!combinedSizes.some(cs => cs.label.toLowerCase() === prod.originTamCor!.toLowerCase())) {
          combinedSizes.push({
            id: `size-${prod.id}`,
            label: prod.originTamCor,
            stock: prod.stock,
            price: prod.price,
            biRecordId: prod.biRecordId
          });
        }
      }

      const totalStock = combinedSizes.length > 0
        ? combinedSizes.reduce((acc, s) => acc + (s.stock || 0), 0)
        : existingParent.stock + prod.stock;

      aggregatedMap.set(key, {
        ...existingParent,
        hasSizes: combinedSizes.length > 1 || (combinedSizes.length === 1 && combinedSizes[0].label.toLowerCase() !== 'único'),
        sizes: combinedSizes,
        stock: totalStock
      });
    }
  }

  return Array.from(aggregatedMap.values());
}
