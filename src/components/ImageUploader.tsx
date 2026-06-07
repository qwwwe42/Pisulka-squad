import React, { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { compressImageToBase64 } from '../utils/imageUtils';

interface ImageUploaderProps {
  onImageUploaded: (base64String: string) => void;
  maxWidth?: number;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImageUploaded, 
  maxWidth = 1200,
  className = ""
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const base64 = await compressImageToBase64(file, maxWidth, 0.7);
      onImageUploaded(base64);
    } catch (err) {
      console.error('Failed to process image:', err);
      alert('Ошибка при обработке изображения. Попробуйте другой файл.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={className}>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2 border border-slate-700/50"
      >
        {isUploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Upload className="w-3.5 h-3.5" />
        )}
        <span>Загрузить</span>
      </button>
    </div>
  );
};
