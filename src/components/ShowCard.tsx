import React from 'react';
import type { Show } from '../types/streaming';
import { Film, Tv, Play } from 'lucide-react';
import { getShowAverageRating } from '../context/StreamingContext';

interface ShowCardProps {
  show: Show;
  onClick: () => void;
}

export const ShowCard: React.FC<ShowCardProps> = ({ show, onClick }) => {
  const getCategoryIcon = () => {
    switch (show.category) {
      case 'Movies':
        return <Film className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Tv className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  const getCategoryLabel = () => {
    switch (show.category) {
      case 'Anime':
        return 'Аниме';
      case 'Series':
        return 'Сериал';
      case 'Movies':
        return 'Фильм';
      default:
        return 'Другое';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="group relative bg-slate-900/60 rounded-xl overflow-hidden border border-slate-800/80 hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950 shrink-0">
        {show.thumbnailImage ? (
          <img 
            src={show.thumbnailImage} 
            alt={show.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 flex items-center justify-center">
            <span className="text-slate-600 font-medium text-sm truncate max-w-[80%]">{show.title}</span>
          </div>
        )}
        
        {/* Hover Overlay Play Button */}
        <div className="absolute inset-0 bg-slate-950/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="p-3 bg-purple-600 text-white rounded-full shadow-lg scale-90 group-hover:scale-100 transition-transform duration-300 ease-out hover:bg-purple-500">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Category Badge */}
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-950/75 text-slate-200 border border-slate-800 flex items-center gap-1.5 backdrop-blur-xs">
          {getCategoryIcon()}
          <span>{getCategoryLabel()}</span>
        </div>

        {/* Rating Badge */}
        {(() => {
          const { average, count } = getShowAverageRating(show.ratings);
          return count > 0 ? (
            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-950/80 text-yellow-400 border border-yellow-950/30 flex items-center gap-1 backdrop-blur-xs font-mono">
              <span>★</span>
              <span>{average}</span>
            </div>
          ) : null;
        })()}

        {/* Episode Count */}
        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-950/80 text-purple-300 border border-purple-950/50 backdrop-blur-xs">
          {show.episodes.length} сер.
        </div>
      </div>

      {/* Info details */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-1.5">
        <div>
          <h4 className="text-sm font-semibold text-slate-100 group-hover:text-purple-400 line-clamp-1 transition-colors duration-200">
            {show.title}
          </h4>
          <p className="text-xs text-slate-400/80 line-clamp-2 mt-1 leading-relaxed">
            {show.description}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/40 text-[10px] text-slate-500">
          <span>{show.status === 'ongoing' ? 'Онгоинг' : 'Завершен'}</span>
          {show.status === 'ongoing' && show.nextEpisodeRelease && (
            <span className="text-purple-400/90 font-medium animate-pulse">Таймер активен</span>
          )}
        </div>
      </div>
    </div>
  );
};
