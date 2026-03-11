'use client';

import { useState, useRef, useCallback } from 'react';

export interface UploadedPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  name: string;
  size: number;
  createdAt: string;
}

interface PhotoUploaderProps {
  incidentId: string;
  photos?: UploadedPhoto[];
  onPhotosChange?: (photos: UploadedPhoto[]) => void;
  maxPhotos?: number;
  maxSizeMB?: number;
  accept?: string;
}

export function PhotoUploader({
  incidentId,
  photos = [],
  onPhotosChange,
  maxPhotos = 10,
  maxSizeMB = 5,
  accept = 'image/*',
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<UploadedPhoto[]>(photos);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gerar ID único
  const generateId = () => `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Converter arquivo para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Validar arquivo
  const validateFile = (file: File): string | null => {
    // Verificar tipo
    if (!file.type.startsWith('image/')) {
      return 'Arquivo deve ser uma imagem';
    }

    // Verificar tamanho
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Arquivo deve ter no máximo ${maxSizeMB}MB`;
    }

    return null;
  };

  // Processar arquivo
  const processFile = async (file: File): Promise<UploadedPhoto | null> => {
    try {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return null;
      }

      // Converter para base64 (em produção, você enviaria para um servidor/storage)
      const base64 = await fileToBase64(file);
      
      const photo: UploadedPhoto = {
        id: generateId(),
        url: base64, // Em produção: URL do Supabase Storage
        thumbnailUrl: base64, // Em produção: thumbnail redimensionado
        name: file.name,
        size: file.size,
        createdAt: new Date().toISOString(),
      };

      return photo;
    } catch (err) {
      console.error('Erro ao processar arquivo:', err);
      setError('Erro ao processar arquivo');
      return null;
    }
  };

  // Manipular seleção de arquivos
  const handleFiles = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setError(null);
    setUploading(true);

    const newPhotos: UploadedPhoto[] = [];
    const remainingSlots = maxPhotos - previews.length;

    // Limitar ao número máximo
    const filesToProcess = Array.from(selectedFiles).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const photo = await processFile(file);
      if (photo) {
        newPhotos.push(photo);
      }
    }

    if (newPhotos.length > 0) {
      const updatedPhotos = [...previews, ...newPhotos];
      setPreviews(updatedPhotos);
      onPhotosChange?.(updatedPhotos);
    }

    setUploading(false);

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previews, maxPhotos, onPhotosChange]);

  // Excluir foto
  const handleDelete = useCallback((photoId: string) => {
    const updatedPhotos = previews.filter((p) => p.id !== photoId);
    setPreviews(updatedPhotos);
    onPhotosChange?.(updatedPhotos);
  }, [previews, onPhotosChange]);

  // Formatar tamanho
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Botão de adicionar fotos */}
      {previews.length < maxPhotos && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {uploading ? (
            <>
              <span className="animate-spin">⏳</span>
              Processando...
            </>
          ) : (
            <>
              <span>📷</span>
              Adicionar Fotos
            </>
          )}
        </button>
      )}

      {/* Erro */}
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Grid de fotos */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {previews.map((photo) => (
            <div
              key={photo.id}
              className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden"
            >
              {/* Imagem */}
              <img
                src={photo.url}
                alt={photo.name}
                className="w-full h-full object-cover"
              />

              {/* Overlay de ações */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {/* Visualizar */}
                <button
                  type="button"
                  onClick={() => window.open(photo.url, '_blank')}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white"
                  title="Visualizar"
                >
                  🔍
                </button>

                {/* Excluir */}
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id)}
                  className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white"
                  title="Excluir"
                >
                  🗑️
                </button>
              </div>

              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-white text-xs truncate">{photo.name}</p>
                <p className="text-white/70 text-xs">{formatSize(photo.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contador */}
      <p className="text-sm text-gray-500">
        {previews.length} de {maxPhotos} fotos
      </p>
    </div>
  );
}

/**
 * Componente de galeria de fotos (visualização)
 */
export function PhotoGallery({
  photos,
  onDelete,
}: {
  photos: UploadedPhoto[];
  onDelete?: (photoId: string) => void;
}) {
  const [selectedPhoto, setSelectedPhoto] = useState<UploadedPhoto | null>(null);

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="text-4xl block mb-2">📷</span>
        Nenhuma foto anexada
      </div>
    );
  }

  return (
    <>
      {/* Grid de miniaturas */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setSelectedPhoto(photo)}
            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
          >
            <img
              src={photo.thumbnailUrl || photo.url}
              alt={photo.name}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Modal de visualização */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white"
          >
            ✕
          </button>

          <img
            src={selectedPhoto.url}
            alt={selectedPhoto.name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(selectedPhoto.id);
                setSelectedPhoto(null);
              }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              🗑️ Excluir
            </button>
          )}
        </div>
      )}
    </>
  );
}

