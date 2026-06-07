import React, { useRef, useState } from 'react';
import { useTracker } from '../context/TrackerContext';
import { Download, Upload, RotateCcw } from 'lucide-react';

export const StorageExportImport: React.FC = () => {
  const { exportData, importData, resetData } = useTracker();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        const success = importData(result);
        if (success) {
          setStatus('success');
          setTimeout(() => setStatus('idle'), 2500);
        } else {
          setStatus('error');
          setTimeout(() => setStatus('idle'), 2500);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleResetClick = () => {
    if (window.confirm('Вы уверены, что хотите сбросить все данные? Это действие удалит все ваши курсы и события и восстановит начальные демонстрационные данные.')) {
      resetData();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      <button
        onClick={exportData}
        title="Экспортировать JSON"
        className="ide-btn-primary flex items-center justify-center gap-1.5"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Экспорт JSON</span>
      </button>

      <button
        onClick={handleImportClick}
        title="Импортировать JSON"
        className={`ide-btn-primary flex items-center justify-center gap-1.5 ${
          status === 'success'
            ? 'border-[#3fb950] text-[#3fb950] bg-[#3fb950]/5'
            : status === 'error'
            ? 'border-[#f85149] text-[#f85149] bg-[#f85149]/5'
            : ''
        }`}
      >
        <Upload className="w-3.5 h-3.5" />
        <span>Импорт JSON</span>
      </button>

      <button
        onClick={handleResetClick}
        title="Сбросить все данные"
        className="ide-btn-primary flex items-center justify-center gap-1.5 hover:border-[#f85149]/60 hover:text-[#f85149]"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Сбросить всё</span>
      </button>
    </div>
  );
};
