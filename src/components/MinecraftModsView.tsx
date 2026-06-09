import React from 'react';
import { useStreaming } from '../context/StreamingContext';
import { ExternalLink, Puzzle, Box, Download, Clock } from 'lucide-react';

export const MinecraftModsView: React.FC = () => {
  const { minecraftConfig } = useStreaming();
  const mods = minecraftConfig?.mods || [];

  return (
    <div className="minecraft-view-container relative min-h-screen w-full flex flex-col items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-0 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 py-12 pb-32 animate-fade-in flex flex-col flex-1">
        
        {/* Header */}
        <div className="mb-12 md:mb-16 text-center animate-slide-up">
          <div className="inline-flex items-center justify-center p-4 bg-purple-500/20 rounded-full mb-6 ring-2 ring-purple-500/30">
            <Puzzle className="w-12 h-12 text-purple-400" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-accent-color to-purple-600 drop-shadow-sm font-sans tracking-tight">
            НАШИ МОДЫ
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-medium leading-relaxed bg-black/40 px-6 py-3 rounded-2xl border border-white/5 backdrop-blur-md">
            Список рекомендованных модификаций для комфортной игры на сервере.
          </p>
        </div>

        {/* Content */}
        {mods.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black/40 rounded-3xl border border-white/10 backdrop-blur-md">
            <Box className="w-20 h-20 text-slate-500 mb-6 opacity-50" />
            <h2 className="text-2xl font-bold text-slate-300 mb-2">Модов пока нет</h2>
            <p className="text-slate-400">Список модов пуст. Администратор скоро добавит их.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {mods.map((mod) => (
              <div 
                key={mod.id} 
                className="bg-black/60 rounded-3xl border border-white/10 overflow-hidden flex flex-col hover:border-purple-500/30 hover:bg-black/80 transition-all duration-300 group hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10 backdrop-blur-md"
              >
                <div className="p-6 flex flex-col h-full">
                  {/* Mod Header */}
                  <div className="flex items-start gap-4 mb-4">
                    {mod.icon_url ? (
                      <img src={mod.icon_url} alt={mod.title} className="w-16 h-16 rounded-2xl object-cover bg-black/50 border border-white/10 shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-black/50 border border-white/10 shrink-0 flex items-center justify-center text-slate-500">
                        <Box className="w-8 h-8" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="text-xl font-bold text-white truncate mb-1 group-hover:text-purple-400 transition-colors" title={mod.title}>
                        {mod.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-white/5 inline-flex px-2 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(mod.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>
                  
                  {/* Mod Description */}
                  <div className="flex-1">
                    <p className="text-sm text-slate-300 line-clamp-3 leading-relaxed mb-6">
                      {mod.description}
                    </p>
                  </div>
                  
                  {/* Mod Link */}
                  <a 
                    href={mod.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full mt-auto py-3 px-4 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all group-hover:shadow-lg group-hover:shadow-purple-600/20 border border-purple-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать мод</span>
                    <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
