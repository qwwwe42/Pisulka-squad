import React, { useRef, useState } from 'react';
import { Loader2, Video, UploadCloud } from 'lucide-react';
import { uploadVideoFile } from '../utils/uploadNewsVideo';

interface VideoUploaderProps {
  onVideoUploaded: (result: string) => void; // base64 data URL or Firebase download URL
  onProgress?: (percent: number) => void;
  onError?: (message: string) => void;
  maxSizeMb?: number; // default 50
  uploadToFirebase?: boolean; // default true
  storagePath?: string; // default 'news_videos/'
  className?: string;
  disabled?: boolean;
  variant?: 'button' | 'dropzone';
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ 
  onVideoUploaded, 
  onProgress,
  onError,
  maxSizeMb = 50,
  uploadToFirebase = true,
  storagePath = 'news_videos/',
  className = "",
  disabled = false,
  variant = 'button'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = async (file: File) => {
    if (!file) return;

    // Check file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      const errMsg = 'Неподдерживаемый формат файла. Допускаются только MP4, WebM, Ogg и QuickTime.';
      if (onError) onError(errMsg);
      return;
    }

    // Check size limit
    const maxSize = maxSizeMb * 1024 * 1024;
    if (file.size > maxSize) {
      const errMsg = `Файл слишком большой. Максимальный размер видео — ${maxSizeMb} МБ.`;
      if (onError) onError(errMsg);
      return;
    }

    setIsUploading(true);
    setUploadPercent(0);

    try {
      const result = await uploadVideoFile(file, {
        uploadToFirebase,
        storagePath,
        onProgress: (percent) => {
          setUploadPercent(percent);
          if (onProgress) onProgress(percent);
        }
      });

      // Check if it's base64 fallback or storage url
      if (result.startsWith('data:video/')) {
        if (onError) {
          // Warning as per requirements: "Сохранено локально, загрузка в облако при следующей синхронизации"
          onError('Сохранено локально, загрузка в облако при следующей синхронизации');
        }
      }

      onVideoUploaded(result);
    } catch (err: any) {
      const errMsg = err?.message || 'Ошибка при загрузке видеофайла.';
      if (onError) onError(errMsg);
    } finally {
      setIsUploading(false);
      setUploadPercent(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
      
      {variant === 'dropzone' ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer select-none bg-bg-app/35
            ${isDragOver ? 'border-accent-color bg-accent-light/10 scale-[0.99]' : 'border-border-color hover:border-accent-color/40'}
            ${disabled || isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-accent-color" />
              <p className="text-xs font-semibold text-text-primary">Загрузка видео...</p>
              <div className="w-32 bg-border-color h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-accent-color h-full transition-all duration-350" style={{ width: `${uploadPercent}%` }} />
              </div>
              <span className="text-[10px] font-mono text-text-muted">{uploadPercent}%</span>
            </div>
          ) : (
            <>
              <div className="p-3 bg-accent-light text-accent-color rounded-full">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-text-primary">Перетащите видео или нажмите для выбора</p>
                <p className="text-[10px] text-text-muted">Форматы: MP4, WebM, Ogg, QuickTime (до {maxSizeMb} МБ)</p>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          className="px-3.5 py-2 bg-accent-color hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-2 shadow-soft hover:scale-[1.01] active:scale-[0.98] transition-all"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Загрузка {uploadPercent}%</span>
            </>
          ) : (
            <>
              <Video className="w-3.5 h-3.5" />
              <span>Загрузить видео</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
