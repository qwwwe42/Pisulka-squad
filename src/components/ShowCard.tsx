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
        return <Film className="w-3.5 h-3.5 text-accent-color" />;
      default:
        return <Tv className="w-3.5 h-3.5 text-accent-color" />;
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
      className="group relative bg-bg-card rounded-3xl overflow-hidden border border-border-color shadow-soft card-glow-hover cursor-pointer flex flex-col h-full"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-bg-app shrink-0">
        {show.thumbnailImage ? (
          <img 
            src={show.thumbnailImage} 
            alt={show.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-bg-app flex items-center justify-center">
            <span className="text-text-muted font-semibold text-sm truncate max-w-[80%]">{show.title}</span>
          </div>
        )}
        
        {/* Hover Overlay Play Button */}
        <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="p-3 bg-accent-color text-white rounded-full shadow-soft scale-90 group-hover:scale-100 transition-transform duration-300 ease-out hover:bg-accent-hover hover:shadow-[0_0_15px_var(--accent-color)]">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Category Badge */}
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-bg-card/95 text-text-primary border border-border-color flex items-center gap-1.5 backdrop-blur-xs">
          {getCategoryIcon()}
          <span>{getCategoryLabel()}</span>
        </div>

        {/* Rating Badge */}
        {(() => {
          const { average, count } = getShowAverageRating(show.ratings);
          return count > 0 ? (
            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-bg-card/95 text-yellow-500 border border-border-color flex items-center gap-1 backdrop-blur-xs font-mono">
              <span>★</span>
              <span>{average}</span>
            </div>
          ) : null;
        })()}

        {/* Episode Count */}
        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-bg-card/95 text-accent-color border border-border-color backdrop-blur-xs">
          {show.episodes.length} сер.
        </div>
      </div>

      {/* Info details */}
      <div className="p-4.5 flex flex-col flex-1 justify-between gap-1.5">
        <div>
          <h4 className="text-sm font-extrabold text-text-primary group-hover:text-accent-color line-clamp-1 transition-all duration-300 group-hover:translate-x-1">
            {show.title}
          </h4>
          <p className="text-xs text-text-secondary line-clamp-2 mt-1 leading-relaxed">
            {show.description}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-color text-[10px] text-text-muted">
          <span>{show.status === 'ongoing' ? 'Онгоинг' : 'Завершен'}</span>
          {show.status === 'ongoing' && show.nextEpisodeRelease && (
            <span className="text-accent-color font-bold animate-pulse">Таймер активен</span>
          )}
        </div>
      </div>
    </div>
  );
};
