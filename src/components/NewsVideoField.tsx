import React, { useRef, useState, useEffect } from 'react';
import { Loader2, Video, X } from 'lucide-react';
import { uploadVideoFile } from '../utils/uploadNewsVideo';
import { useStreaming } from '../context/StreamingContext';

interface NewsVideoFieldProps {
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  source: 'link' | 'upload';
  onSourceChange: (source: 'link' | 'upload') => void;
  disabled?: boolean;
  error?: string;
  onError?: (msg: string | null) => void;
  onUploadStateChange?: (uploading: boolean, progress: number) => void;
}

export const NewsVideoField: React.FC<NewsVideoFieldProps> = ({
  videoUrl,
  onVideoUrlChange,
  source,
  onSourceChange,
  disabled = false,
  error,
  onError,
  onUploadStateChange
}) => {
  const { isFirebaseConnected } = useStreaming();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [localWarning, setLocalWarning] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // If URL changes to empty, reset file metadata
  useEffect(() => {
    const url = videoUrl || '';
    if (!url) {
      setFileName('');
      setFileSize('');
      setLocalWarning(null);
    } else if (url.startsWith('https://firebasestorage.googleapis.com')) {
      // Parse file name from Firebase URL if not set
      if (!fileName) {
        try {
          const decoded = decodeURIComponent(url);
          const parts = decoded.split('/');
          const fileNameWithToken = parts[parts.length - 1];
          const nameOnly = fileNameWithToken.split('?')[0];
          // Firebase storage name format: news_videos%2F171...-file_name.mp4
          const cleanName = nameOnly.replace(/^news_videos[/%]/, '').replace(/^\d+-/, '');
          setFileName(cleanName || 'Видеофайл в облаке');
        } catch {
          setFileName('Видеофайл в облаке');
        }
      }
    } else if (url.startsWith('data:video/')) {
      if (!fileName) {
        setFileName('Локальный видеофайл');
      }
    }
  }, [videoUrl, fileName]);

  const processFile = async (file: File) => {
    if (!file) return;

    if (onError) onError(null);
    setLocalError(null);
    setLocalWarning(null);

    // Validate type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      const msg = 'Неподдерживаемый формат. Допускаются только MP4, WebM, Ogg, QuickTime.';
      if (onError) onError(msg);
      setLocalError(msg);
      return;
    }

    // Validate size (50MB)
    const MAX_SIZE_MB = 50;
    const maxSize = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > maxSize) {
      const msg = `Файл слишком большой. Максимальный размер видео — ${MAX_SIZE_MB} МБ.`;
      if (onError) onError(msg);
      setLocalError(msg);
      return;
    }

    // Capture metadata
    setFileName(file.name);
    setFileSize((file.size / (1024 * 1024)).toFixed(1) + ' МБ');
    setIsUploading(true);
    setUploadPercent(0);
    if (onUploadStateChange) onUploadStateChange(true, 0);

    try {
      const result = await uploadVideoFile(file, {
        uploadToFirebase: isFirebaseConnected,
        storagePath: 'news_videos/',
        onProgress: (percent) => {
          setUploadPercent(percent);
          if (onUploadStateChange) onUploadStateChange(true, percent);
        }
      });

      if (result.startsWith('data:video/')) {
        const warningText = 'Сохранено локально, загрузка в облако при следующей синхронизации';
        setLocalWarning(warningText);
        if (onError) onError(warningText);
      }

      onVideoUrlChange(result);
    } catch (err: any) {
      const errMsg = err?.message || 'Ошибка при загрузке видеофайла.';
      if (onError) onError(errMsg);
      setLocalError(errMsg);
      setFileName('');
      setFileSize('');
    } finally {
      setIsUploading(false);
      setUploadPercent(0);
      if (onUploadStateChange) onUploadStateChange(false, 0);
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

  const clearVideo = () => {
    onVideoUrlChange('');
    setFileName('');
    setFileSize('');
    setLocalWarning(null);
    setLocalError(null);
    if (onError) onError(null);
  };

  const handleSourceChange = (newSource: 'link' | 'upload') => {
    onSourceChange(newSource);
    onVideoUrlChange('');
    if (onError) onError(null);
    setLocalWarning(null);
    setLocalError(null);
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Segmented Control */}
      <div 
        role="tablist" 
        aria-label="Источник видео" 
        className="flex gap-1.5 bg-bg-app border border-border-color p-0.5 rounded-xl text-[11px] font-bold w-fit select-none"
      >
        <button
          type="button"
          role="tab"
          aria-selected={source === 'link'}
          disabled={disabled || isUploading}
          onClick={() => handleSourceChange('link')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-accent-color focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            source === 'link'
              ? 'bg-accent-color text-white shadow-soft'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Ссылка
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={source === 'upload'}
          disabled={disabled || isUploading}
          onClick={() => handleSourceChange('upload')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-accent-color focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            source === 'upload'
              ? 'bg-accent-color text-white shadow-soft'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Загрузить файл
        </button>
      </div>

      {/* Mode content */}
      {source === 'link' ? (
        <div className="space-y-1.5">
          <input
            type="url"
            value={(videoUrl || '').startsWith('data:') ? '' : videoUrl}
            onChange={(e) => onVideoUrlChange(e.target.value)}
            disabled={disabled}
            placeholder="Вставьте ссылку на видео (YouTube, Google Drive, MP4)..."
            className="w-full ide-input font-sans text-xs"
            aria-label="Ссылка на видео"
          />
        </div>
      ) : (
        <div className="space-y-2">
          {videoUrl ? (
            <div className="space-y-2.5">
              {/* Preview Container */}
              <div className="relative aspect-video rounded-2xl border border-border-color overflow-hidden bg-bg-app shadow-soft">
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={clearVideo}
                  disabled={disabled || isUploading}
                  aria-label="Удалить видео"
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-black/60 hover:bg-black/85 text-slate-350 hover:text-white transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-accent-color focus-visible:outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* File Info */}
              {(fileName || fileSize) && (
                <div className="flex items-center justify-between text-[11px] font-medium text-text-secondary px-1 font-sans">
                  <span className="truncate max-w-[70%] font-mono" title={fileName}>{fileName}</span>
                  <span className="shrink-0 text-text-muted font-mono">{fileSize}</span>
                </div>
              )}

              {/* Local Storage Warning Notification */}
              {localWarning && (
                <div className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/25 px-3 py-2 rounded-xl leading-relaxed font-sans">
                  ⚠️ {localWarning}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* File Input */}
              <input
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                disabled={disabled || isUploading}
              />
              
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
                className={`border border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer select-none bg-bg-app/40 focus-visible:ring-2 focus-visible:ring-accent-color focus-visible:outline-none
                  ${isDragOver ? 'border-accent-color bg-accent-light/10 scale-[0.995]' : 'border-border-color hover:border-accent-color/30'}
                  ${disabled || isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                `}
                tabIndex={disabled || isUploading ? -1 : 0}
                role="button"
                aria-label="Зона загрузки видеофайла"
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-7 h-7 animate-spin text-accent-color" />
                    <p className="text-xs font-semibold text-text-primary">Загрузка видео...</p>
                    <div className="w-32 bg-border-color h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div className="bg-accent-color h-full transition-all duration-300" style={{ width: `${uploadPercent}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-text-muted">{uploadPercent}%</span>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-accent-light text-accent-color rounded-full">
                      <Video className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-text-primary">Перетащите видео или нажмите для выбора</p>
                      <p className="text-[10px] text-text-muted">Форматы: MP4, WebM, Ogg, QuickTime (до 50 МБ)</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inline form error display */}
      {(error || localError) && !localWarning && (
        <div className="text-xs text-rose-500 font-semibold px-1 font-sans">
          {error || localError}
        </div>
      )}
    </div>
  );
};
