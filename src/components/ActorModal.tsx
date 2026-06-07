import React from 'react';
import { X, Users, Image as ImageIcon } from 'lucide-react';
import type { Actor } from '../types/streaming';

interface ActorModalProps {
  actor: Actor;
  onClose: () => void;
}

export const ActorModal: React.FC<ActorModalProps> = ({ actor, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_0.2s_ease-out]">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-slate-950/50 hover:bg-rose-500/80 text-white rounded-full transition-colors backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto hide-scrollbar flex-1">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row gap-6 p-6 sm:p-8 bg-slate-900/30">
            {/* Main Image */}
            <div className="w-32 sm:w-48 aspect-[3/4] shrink-0 bg-slate-900 rounded-xl overflow-hidden border border-slate-800/80 shadow-lg mx-auto sm:mx-0">
              {actor.imageUrl ? (
                <img src={actor.imageUrl} alt={actor.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-700">
                  <Users className="w-12 h-12 mb-2 opacity-20" />
                  <span className="text-xs uppercase font-bold tracking-widest opacity-30">Нет фото</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-center text-center sm:text-left">
              <h2 className="text-3xl font-black text-white tracking-tight mb-2">{actor.name}</h2>
              <div className="inline-block bg-purple-500/20 text-purple-400 font-bold px-3 py-1 rounded-full text-sm border border-purple-500/30 mb-4 self-center sm:self-start">
                Роль: {actor.role}
              </div>
              
              {actor.filmography && (
                <div className="mt-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Фильмография / Описание</h3>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {actor.filmography}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Gallery Section */}
          {actor.imageUrls && actor.imageUrls.length > 0 && (
            <div className="p-6 sm:p-8 border-t border-slate-800/80">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2 mb-6">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>Фотогалерея ({actor.imageUrls.length})</span>
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {actor.imageUrls.map((img, idx) => (
                  <div key={idx} className="aspect-square bg-slate-900 rounded-xl overflow-hidden border border-slate-800/80 hover:border-purple-500/50 transition-colors group">
                    <img 
                      src={img} 
                      alt={`${actor.name} gallery ${idx + 1}`} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
