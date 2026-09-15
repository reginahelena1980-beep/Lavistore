import React from 'react';
import { AdminProductModal } from './AdminProductModal';
import { BiProductCalculatedRecord, Product, Category } from '../types';

export interface PublishToVitrineModalProps {
  record: BiProductCalculatedRecord;
  allRecords?: BiProductCalculatedRecord[];
  existingProduct?: Product | null;
  onClose: () => void;
  onPublish: (updatedRecord: BiProductCalculatedRecord, productData: Partial<Product>) => void;
  onUnpublish?: (recordId: string, productId?: string) => void;
  onViewLiveProduct?: (product: Product) => void;
  onViewLive?: (product: Product) => void;
  categories?: Category[];
}

/**
 * PublishToVitrineModal (Unificado com AdminProductModal)
 * Agora ambas as telas de cadastro e edição de mimos na vitrine foram 100% unificadas
 * em um único modal completo, com suporte a múltiplas fotos, grade de tamanhos e cores,
 * preço promocional 'De/Por' e sincronização com a planilha financeira BI.
 */
export const PublishToVitrineModal: React.FC<PublishToVitrineModalProps> = ({
  record,
  allRecords,
  existingProduct,
  onClose,
  onPublish,
  onUnpublish,
  onViewLiveProduct,
  onViewLive,
  categories
}) => {
  return (
    <AdminProductModal
      isOpen={true}
      productToEdit={existingProduct || null}
      biRecord={record}
      allBiRecords={allRecords}
      onClose={onClose}
      onSaveProduct={(prod) => {
        if (onPublish && record) {
          onPublish(record, prod);
        }
      }}
      onPublishBiRecord={onPublish}
      onUnpublishBiRecord={onUnpublish}
      onViewLiveProduct={onViewLiveProduct || onViewLive}
      categories={categories}
    />
  );
};
