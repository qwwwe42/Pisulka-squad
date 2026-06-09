import React, { useState } from 'react';
import { useStreaming } from '../context/StreamingContext';
import { ImageUploader } from './ImageUploader';
import { X, Trash2, Maximize2, Plus, Calendar, User } from 'lucide-react';

export const GalleryView: React.FC = () => {
  const { gallery, addGalleryItem, deleteGalleryItem } = useStreaming();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploaderName, setUploaderName] = useState(() => {
    return localStorage.getItem('penis_ink_uploader_name') || '';
  });
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Lightbox state
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  // Custom Modals State for delete verification
  const [photoToDeleteId, setPhotoToDeleteId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAdminRequired, setShowAdminRequired] = useState(false);

  const requestDelete = (itemId: string) => {
    if (sessionStorage.getItem('penis_ink_admin') === 'true') {
      setPhotoToDeleteId(itemId);
      setShowDeleteConfirm(true);
    } else {
      setShowAdminRequired(true);
    }
  };

  const handleOpenUploadModal = () => {
    setIsUploadModalOpen(true);
    setSelectedImage(null);
    setCaption('');
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  const handleImageUploaded = (base64: string) => {
    setSelectedImage(base64);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) {
      alert('Пожалуйста, выберите изображение');
      return;
    }
    
    const name = uploaderName.trim() || 'Аноним';
    setIsSubmitting(true);
    
    try {
      localStorage.setItem('penis_ink_uploader_name', name);
      await addGalleryItem(selectedImage, name, caption.trim() || undefined);
      setIsUploadModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении изображения.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePhoto = activePhotoIndex !== null ? gallery[activePhotoIndex] : null;

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out] glass-panel">
      
      {/* HEADER SECTION */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 rounded-[32px] bg-bg-card border border-border-color overflow-hidden shadow-soft">
        <div className="absolute top-0 right-0 w-80 h-80 bg-accent-color/5 rounded-full filter blur-[80px] pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-accent-color/5 rounded-full filter blur-[60px] pointer-events-none -ml-10 -mb-10" />

        <div className="space-y-1 relative z-10">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-primary flex items-center gap-2">
            Галерея Squad
          </h2>
          <p className="text-xs text-text-secondary font-medium">
            Делитесь скриншотами из игр, моментами из аниме и совместными воспоминаниями.
          </p>
        </div>

        <button
          onClick={handleOpenUploadModal}
          className="relative z-10 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent-color hover:bg-accent-hover text-white font-bold text-xs shadow-soft hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить фото</span>
        </button>
      </div>

      {/* GALLERY GRID */}
      {gallery.length === 0 ? (
        <div className="text-center py-20 rounded-[32px] border border-dashed border-border-color bg-bg-card shadow-soft text-text-muted text-sm font-semibold">
          <p>Галерея пока пуста. Будьте первым, кто добавит фото!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {gallery.map((item, index) => (
            <div 
              key={item.id}
              className="group relative bg-bg-card border border-border-color hover:border-accent-color/30 rounded-[24px] overflow-hidden transition-all duration-300 shadow-soft hover:shadow-hover hover:scale-[1.01] flex flex-col"
            >
              {/* Image Container */}
              <div 
                className="relative aspect-video sm:aspect-square overflow-hidden cursor-pointer bg-bg-app"
                onClick={() => setActivePhotoIndex(index)}
              >
                <img 
                  src={item.imageUrl} 
                  alt={item.caption || "Изображение"} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="p-3 rounded-full bg-accent-color text-white shadow-soft scale-90 group-hover:scale-100 transition-transform duration-300">
                    <Maximize2 className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {/* Card Footer Info */}
              <div className="p-4 flex-1 flex flex-col justify-between gap-3 bg-bg-card">
                {item.caption && (
                  <p className="text-text-primary text-xs font-semibold leading-relaxed break-words line-clamp-3">
                    {item.caption}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-text-muted font-bold mt-auto pt-2 border-t border-border-color">
                  <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                    <User className="w-3.5 h-3.5 text-accent-color shrink-0" />
                    <span className="truncate text-text-secondary">{item.uploadedBy}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-text-muted">
                      {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </span>
                    <button
                      onClick={() => requestDelete(item.id)}
                      className="p-1 rounded hover:bg-rose-500/10 text-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                      title="Удалить фото"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UPLOAD PHOTO MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-md bg-bg-card border border-border-color rounded-[32px] p-6 shadow-hover m-4 animate-[scaleIn_0.2s_ease-out]">
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Добавить новое фото
              </h3>
              <button 
                onClick={handleCloseUploadModal}
                className="p-1.5 rounded-lg bg-bg-app hover:bg-border-color text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Uploader Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  Ваш Никнейм
                </label>
                <input
                  type="text"
                  placeholder="Введите ваше имя"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  className="w-full ide-input"
                  required
                />
              </div>

              {/* Caption */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  Описание / Подпись (необязательно)
                </label>
                <textarea
                  placeholder="Напишите пару слов о фотографии..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full ide-input min-h-20 resize-none py-2.5"
                  maxLength={150}
                />
              </div>

              {/* File Upload Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                  Изображение
                </label>
                
                {selectedImage ? (
                  <div className="relative aspect-video rounded-xl border border-border-color overflow-hidden bg-bg-app">
                    <img 
                      src={selectedImage} 
                      alt="Превью" 
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 p-1 rounded-md bg-black/60 hover:bg-black/80 text-slate-350 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-border-color rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 bg-bg-app">
                    <p className="text-text-muted text-xs font-semibold">Выберите файл формата JPG, PNG или WebP</p>
                    <ImageUploader 
                      onImageUploaded={handleImageUploaded}
                      maxWidth={1200}
                    />
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={handleCloseUploadModal}
                  className="flex-1 py-2.5 rounded-xl border border-border-color hover:bg-bg-app text-text-secondary hover:text-text-primary text-xs font-semibold transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedImage}
                  className="flex-1 py-2.5 bg-accent-color hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-soft transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? 'Сохранение...' : 'Опубликовать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX / FULLSCREEN VIEWER */}
      {activePhotoIndex !== null && activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col animate-[fadeIn_0.15s_ease-out]">
          {/* Lightbox Header */}
          <div className="h-16 px-6 border-b border-border-color flex items-center justify-between shrink-0 bg-black/45 backdrop-blur-xs">
            <div className="space-y-0.5 truncate max-w-[70%]">
              {activePhoto.caption ? (
                <h4 className="text-xs font-bold text-white truncate">{activePhoto.caption}</h4>
              ) : (
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Просмотр изображения</span>
              )}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-350 font-semibold truncate">
                <span>Опубликовал:</span>
                <span className="text-accent-color">{activePhoto.uploadedBy}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-text-muted font-bold">
                {activePhotoIndex + 1} / {gallery.length}
              </span>
              <button
                onClick={() => setActivePhotoIndex(null)}
                className="p-1.5 rounded-lg bg-bg-card/40 hover:bg-bg-card border border-border-color/30 text-text-secondary hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Lightbox Content Image */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center p-4">
            
            {/* Left navigation arrow */}
            {activePhotoIndex > 0 && (
              <button
                onClick={() => setActivePhotoIndex(activePhotoIndex - 1)}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-bg-card/65 hover:bg-accent-color border border-border-color/30 text-white font-bold text-xl flex items-center justify-center transition-all cursor-pointer select-none"
              >
                &#8249;
              </button>
            )}

            <img 
              src={activePhoto.imageUrl} 
              alt={activePhoto.caption || "Просмотр"} 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all duration-300"
            />

            {/* Right navigation arrow */}
            {activePhotoIndex < gallery.length - 1 && (
              <button
                onClick={() => setActivePhotoIndex(activePhotoIndex + 1)}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-bg-card/65 hover:bg-accent-color border border-border-color/30 text-white font-bold text-xl flex items-center justify-center transition-all cursor-pointer select-none"
              >
                &#8250;
              </button>
            )}

          </div>

          {/* Lightbox Footer */}
          <div className="h-14 px-6 border-t border-border-color flex items-center justify-between text-[10px] text-text-muted shrink-0 bg-black/45 backdrop-blur-xs font-mono font-bold">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-muted" />
              {new Date(activePhoto.createdAt).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            <button
              onClick={() => requestDelete(activePhoto.id)}
              className="flex items-center gap-1 py-1 px-2.5 rounded-lg border border-rose-500/20 hover:bg-rose-550/10 text-text-muted hover:text-rose-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить</span>
            </button>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-sm bg-bg-card border border-border-color rounded-[32px] p-6 shadow-hover m-4 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Удалить изображение?
              </h3>
            </div>
            
            <p className="text-xs text-text-secondary leading-relaxed">
              Вы уверены, что хотите удалить это фото из галереи? Это действие необратимо и удалит изображение у всех участников.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPhotoToDeleteId(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-border-color hover:bg-bg-app text-text-secondary hover:text-text-primary text-xs font-semibold transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  if (photoToDeleteId) {
                    if (activePhotoIndex !== null && gallery[activePhotoIndex]?.id === photoToDeleteId) {
                      setActivePhotoIndex(null);
                    }
                    deleteGalleryItem(photoToDeleteId);
                  }
                  setShowDeleteConfirm(false);
                  setPhotoToDeleteId(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-soft transition-all cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM ADMIN REQUIRED WARNING MODAL */}
      {showAdminRequired && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-sm bg-bg-card border border-border-color rounded-[32px] p-6 shadow-hover m-4 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                Доступ ограничен
              </h3>
            </div>
            
            <p className="text-xs text-text-secondary leading-relaxed">
              Удаление изображений доступно только администраторам. Пожалуйста, авторизуйтесь в <strong>Панели Админа</strong> (кнопка в левом нижнем углу меню).
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdminRequired(false)}
                className="w-full py-2.5 bg-accent-color hover:bg-accent-hover text-white rounded-xl text-xs font-bold shadow-soft transition-all cursor-pointer text-center"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
