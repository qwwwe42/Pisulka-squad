import React, { useRef, useState } from 'react';
import { Loader2, Video } from 'lucide-react';

interface VideoUploaderProps {
  onVideoUploaded: (base64String: string) => void;
  className?: string;
  disabled?: boolean;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ 
  onVideoUploaded, 
  className = "",
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 15MB
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('Файл слишком большой. Максимальный размер видео — 15 МБ.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        onVideoUploaded(result);
      } else {
        alert('Не удалось прочитать видеофайл.');
      }
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      alert('Ошибка при чтении видеофайла.');
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={className}>
      <input
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading || disabled}
        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2 border border-slate-700/50"
      >
        {isUploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Video className="w-3.5 h-3.5" />
        )}
        <span>Загрузить видео</span>
      </button>
    </div>
  );
};
