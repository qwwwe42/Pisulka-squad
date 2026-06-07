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
    // If already authenticated as admin, show custom confirmation modal
    if (sessionStorage.getItem('penis_ink_admin') === 'true') {
      setPhotoToDeleteId(itemId);
      setShowDeleteConfirm(true);
    } else {
      // If not admin, show custom warning modal
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
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      
      {/* HEADER SECTION */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-purple-900/10 via-slate-900/30 to-slate-900/20 border border-slate-900/80 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full filter blur-[80px] pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-pink-500/5 rounded-full filter blur-[60px] pointer-events-none -ml-10 -mb-10" />

        <div className="space-y-1 relative z-10">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            Галерея Squad
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Делитесь скриншотами из игр, моментами из аниме и совместными воспоминаниями.
          </p>
        </div>

        <button
          onClick={handleOpenUploadModal}
          className="relative z-10 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-650 hover:from-purple-500 hover:to-pink-550 text-white font-bold text-xs shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.45)] hover:scale-102 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить фото</span>
        </button>
      </div>

      {/* GALLERY GRID */}
      {gallery.length === 0 ? (
        <div className="text-center py-20 rounded-3xl border border-dashed border-slate-900/80 bg-slate-900/10">
          <p className="text-slate-500 text-sm font-semibold">Галерея пока пуста. Будьте первым, кто добавит фото!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {gallery.map((item, index) => (
            <div 
              key={item.id}
              className="group relative bg-slate-900/20 backdrop-blur-md border border-slate-900 hover:border-purple-500/30 rounded-2xl overflow-hidden transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02] flex flex-col"
            >
              {/* Image Container */}
              <div 
                className="relative aspect-video sm:aspect-square overflow-hidden cursor-pointer bg-slate-950"
                onClick={() => setActivePhotoIndex(index)}
              >
                <img 
                  src={item.imageUrl} 
                  alt={item.caption || "Изображение"} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="p-3 rounded-full bg-purple-600/90 text-white shadow-lg backdrop-blur-xs scale-90 group-hover:scale-100 transition-transform duration-300">
                    <Maximize2 className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {/* Card Footer Info */}
              <div className="p-4 flex-1 flex flex-col justify-between gap-3 bg-slate-950/40">
                {item.caption && (
                  <p className="text-slate-200 text-xs font-semibold leading-relaxed break-words line-clamp-3">
                    {item.caption}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mt-auto pt-2 border-t border-slate-900/50">
                  <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                    <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="truncate text-slate-400">{item.uploadedBy}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-600">
                      {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </span>
                    <button
                      onClick={() => requestDelete(item.id)}
                      className="p-1 rounded hover:bg-rose-955/20 text-slate-700 hover:text-rose-500 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 m-4 animate-[scaleIn_0.2s_ease-out]">
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Добавить новое фото
              </h3>
              <button 
                onClick={handleCloseUploadModal}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Uploader Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Изображение
                </label>
                
                {selectedImage ? (
                  <div className="relative aspect-video rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                    <img 
                      src={selectedImage} 
                      alt="Превью" 
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 p-1 rounded-md bg-black/60 hover:bg-black/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 bg-slate-950/20">
                    <p className="text-slate-500 text-xs font-semibold">Выберите файл формата JPG, PNG или WebP</p>
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
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-950 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedImage}
                  className="flex-1 py-2.5 bg-purple-650 hover:bg-purple-550 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-950/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
          <div className="h-16 px-6 border-b border-slate-900/60 flex items-center justify-between shrink-0 bg-slate-950/60 backdrop-blur-xs">
            <div className="space-y-0.5 truncate max-w-[70%]">
              {activePhoto.caption ? (
                <h4 className="text-xs font-bold text-white truncate">{activePhoto.caption}</h4>
              ) : (
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Просмотр изображения</span>
              )}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold truncate">
                <span>Опубликовал:</span>
                <span className="text-purple-400">{activePhoto.uploadedBy}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                {activePhotoIndex + 1} / {gallery.length}
              </span>
              <button
                onClick={() => setActivePhotoIndex(null)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
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
                className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-purple-650/80 border border-slate-800 text-white font-bold text-xl flex items-center justify-center transition-all cursor-pointer select-none"
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
                className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-purple-650/80 border border-slate-800 text-white font-bold text-xl flex items-center justify-center transition-all cursor-pointer select-none"
              >
                &#8250;
              </button>
            )}

          </div>

          {/* Lightbox Footer */}
          <div className="h-14 px-6 border-t border-slate-900/60 flex items-center justify-between text-[10px] text-slate-500 shrink-0 bg-slate-950/60 backdrop-blur-xs font-mono font-bold">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
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
              className="flex items-center gap-1 py-1 px-2.5 rounded-lg border border-rose-950/30 hover:bg-rose-950/20 text-slate-600 hover:text-rose-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить</span>
            </button>
          </div>
        </div>
      )}
      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 m-4 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Удалить изображение?
              </h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Вы уверены, что хотите удалить это фото из галереи? Это действие необратимо и удалит изображение у всех участников.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPhotoToDeleteId(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-955 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
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
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/20 transition-all cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM ADMIN REQUIRED WARNING MODAL */}
      {showAdminRequired && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 m-4 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Доступ ограничен
              </h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Удаление изображений доступно только администраторам. Пожалуйста, авторизуйтесь в <strong>Панели Админа</strong> (кнопка в левом нижнем углу меню).
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdminRequired(false)}
                className="w-full py-2.5 bg-purple-650 hover:bg-purple-550 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-950/20 transition-all cursor-pointer text-center"
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
