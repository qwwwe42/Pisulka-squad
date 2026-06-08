import React, { useState, useEffect } from 'react';
import { useStreaming, getShowAverageRating, getOrCreateUserId } from '../context/StreamingContext';
import { 
  ArrowLeft, Play, Clock, Calendar, 
  CheckCircle2, Film, Tv, Lock, Users,
  X, Camera, MessageSquare, Send
} from 'lucide-react';
import type { Episode, Actor } from '../types/streaming';
import { ActorModal } from './ActorModal';
import { CoWatchRoom } from './CoWatchRoom';
import { getGoogleDriveEmbedUrl } from '../utils/drive';

const getTrailerEmbedUrl = (url: string) => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes('youtube.com/watch')) {
    try {
      const videoId = new URL(trimmed).searchParams.get('v');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : trimmed;
    } catch {
      return trimmed;
    }
  }
  if (trimmed.includes('youtu.be/')) {
    const videoId = trimmed.split('youtu.be/')[1]?.split('?')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : trimmed;
  }
  if (trimmed.includes('drive.google.com')) {
    return getGoogleDriveEmbedUrl(trimmed) || trimmed;
  }
  return trimmed;
};

const getAvatarGradient = (name: string) => {
  const colors = [
    'from-purple-600 to-indigo-650',
    'from-cyan-600 to-blue-650',
    'from-emerald-600 to-teal-650',
    'from-pink-600 to-rose-650',
    'from-amber-600 to-orange-650',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const getInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
};

const formatCommentDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

interface ShowDetailsProps {
  showId: string;
  onBack: () => void;
  onSelectEpisode: (episodeId: string) => void;
  isEpisodeActive?: boolean;
}

export const ShowDetails: React.FC<ShowDetailsProps> = ({ showId, onBack, onSelectEpisode, isEpisodeActive = false }) => {
  const { shows, watchProgress, rateShow, addComment } = useStreaming();
  
  const show = shows.find(s => s.id === showId);
  const [nextReleaseTimeLeft, setNextReleaseTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showCoWatchModal, setShowCoWatchModal] = useState(false);

  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('penis_ink_nickname') || '';
  });
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');

  const currentUserId = getOrCreateUserId();

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError('');

    const trimmedNickname = nickname.trim();
    const trimmedText = commentText.trim();

    if (!trimmedNickname) {
      setCommentError('Пожалуйста, укажите ваш псевдоним.');
      return;
    }
    if (!trimmedText) {
      setCommentError('Пожалуйста, напишите текст комментария.');
      return;
    }
    if (!show) return;

    try {
      localStorage.setItem('penis_ink_nickname', trimmedNickname);
      await addComment(show.id, trimmedNickname, trimmedText);
      setCommentText('');
    } catch {
      setCommentError('Не удалось отправить комментарий. Попробуйте еще раз.');
    }
  };

  const [prevShowIdAndRelease, setPrevShowIdAndRelease] = useState(() => `${showId}-${show?.nextEpisodeRelease || ''}`);

  const currentKey = `${showId}-${show?.nextEpisodeRelease || ''}`;
  if (currentKey !== prevShowIdAndRelease) {
    setPrevShowIdAndRelease(currentKey);
    setNextReleaseTimeLeft(null);
  }

  // Countdown timer for next episode
  useEffect(() => {
    if (!show || !show.nextEpisodeRelease) {
      return;
    }

    const interval = setInterval(() => {
      const releaseTime = new Date(show.nextEpisodeRelease!).getTime();
      const now = new Date().getTime();
      const difference = releaseTime - now;

      if (difference <= 0) {
        setNextReleaseTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setNextReleaseTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [show]);

  if (!show) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-text-muted text-sm font-semibold">Сериал не найден.</p>
        <button onClick={onBack} className="px-4 py-2 bg-bg-card text-text-primary rounded-xl hover:bg-bg-app border border-border-color text-xs transition-all">
          Назад на главную
        </button>
      </div>
    );
  }

  // Determine if episode is released
  const isEpisodeReleased = (episode: Episode) => {
    const releaseTime = new Date(episode.releaseDate).getTime();
    const now = Date.now();
    return now >= releaseTime;
  };

  const getEpisodeReleaseText = (episode: Episode) => {
    const d = new Date(episode.releaseDate);
    return d.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Back Button */}
      {!isEpisodeActive && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-xs font-semibold bg-bg-card border border-border-color hover:border-accent-color/30 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer self-start shadow-soft hover:scale-[1.01]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к списку</span>
        </button>
      )}

      {/* Banner / Poster Info Row */}
      {!isEpisodeActive && (
        <div className="relative rounded-[32px] overflow-hidden border border-border-color bg-bg-card shadow-soft">
          
          {/* Cover background image */}
          <div className="absolute inset-0 z-0">
            {show.coverImage ? (
              <img src={show.coverImage} alt="cover" className="w-full h-full object-cover opacity-15 filter blur-xs" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-accent-light via-bg-card/50 to-bg-card opacity-40" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/85 to-transparent" />
          </div>

          {/* Content detail overlay */}
          <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
            {/* Thumbnail poster */}
            <div className="w-40 md:w-48 aspect-[2/3] rounded-2xl overflow-hidden bg-bg-app border border-border-color shadow-soft shrink-0 self-center md:self-start">
              {show.thumbnailImage ? (
                <img src={show.thumbnailImage} alt={show.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-bg-app flex items-center justify-center text-text-muted text-xs">Нет постера</div>
              )}
            </div>

            {/* Details column */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-accent-light text-accent-color border border-accent-color/20 flex items-center gap-1">
                    {show.category === 'Movies' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                    <span>{show.category === 'Anime' ? 'Аниме' : show.category === 'Series' ? 'Сериал' : show.category === 'Movies' ? 'Фильм' : 'Другое'}</span>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-bg-app text-text-secondary border border-border-color">
                    {show.status === 'ongoing' ? 'В эфире (Онгоинг)' : 'Выпущен полностью'}
                  </span>
                </div>

                {/* Rating Widget */}
                {(() => {
                  const { average, count } = getShowAverageRating(show.ratings);
                  const userId = getOrCreateUserId();
                  const userRating = show.ratings?.[userId] || 0;
                  
                  return (
                    <div className="flex items-center gap-3 bg-bg-app border border-border-color px-3.5 py-1 rounded-xl text-xs backdrop-blur-xs select-none shadow-soft">
                      <div className="flex items-center gap-1 font-mono text-yellow-500 font-bold">
                        <span className="text-[14px]">★</span>
                        <span>{count > 0 ? average : '0.0'}</span>
                        <span className="text-[9px] text-text-muted font-semibold font-sans normal-case">
                          ({count} {count % 10 === 1 && count % 100 !== 11 ? 'оценка' : (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) ? 'оценки' : 'оценок'})
                        </span>
                      </div>
                      
                      <span className="text-border-color font-semibold">|</span>
                      
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isHighlighted = star <= userRating;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => rateShow(show.id, star)}
                              className={`text-[13px] focus:outline-none transition-all hover:scale-125 cursor-pointer ${
                                isHighlighted 
                                  ? 'text-yellow-500 font-bold filter drop-shadow-[0_0_3px_rgba(234,179,8,0.4)]' 
                                  : 'text-text-muted hover:text-yellow-500'
                              }`}
                              title={`Оценить на ${star}`}
                            >
                              ★
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

               <h1 className="text-xl md:text-3xl font-extrabold text-text-primary">{show.title}</h1>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed max-w-3xl">{show.description}</p>

              <div className="flex flex-wrap items-center gap-3">
                {show.trailerUrl && (
                  <button
                    onClick={() => setShowTrailerModal(true)}
                    className="flex items-center gap-2 bg-accent-color hover:bg-accent-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-soft w-fit hover:scale-[1.01]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Смотреть трейлер</span>
                  </button>
                )}

                <button
                  onClick={() => setShowCoWatchModal(true)}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-soft w-fit hover:scale-[1.01]"
                >
                  <Users className="w-4 h-4" />
                  <span>Совместный просмотр</span>
                </button>
              </div>

              {/* Sub countdown block inside detail info */}
              {nextReleaseTimeLeft && (
                <div className="p-4 rounded-2xl bg-accent-light border border-accent-color/20 max-w-sm space-y-2.5 shadow-soft">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent-color uppercase font-mono">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>До выхода следующей серии осталось</span>
                  </div>
                  <div className="flex gap-2 text-center">
                    <div className="flex-1 bg-bg-app border border-border-color rounded-xl p-1.5 font-mono">
                      <div className="text-sm font-bold text-text-primary">{nextReleaseTimeLeft.days.toString().padStart(2, '0')}</div>
                      <div className="text-[8px] text-text-muted uppercase">дн</div>
                    </div>
                    <div className="flex-1 bg-bg-app border border-border-color rounded-xl p-1.5 font-mono">
                      <div className="text-sm font-bold text-text-primary">{nextReleaseTimeLeft.hours.toString().padStart(2, '0')}</div>
                      <div className="text-[8px] text-text-muted uppercase">ч</div>
                    </div>
                    <div className="flex-1 bg-bg-app border border-border-color rounded-xl p-1.5 font-mono">
                      <div className="text-sm font-bold text-text-primary">{nextReleaseTimeLeft.minutes.toString().padStart(2, '0')}</div>
                      <div className="text-[8px] text-text-muted uppercase">мин</div>
                    </div>
                    <div className="flex-1 bg-accent-light border border-accent-color/20 rounded-xl p-1.5 font-mono">
                      <div className="text-sm font-bold text-accent-color">{nextReleaseTimeLeft.seconds.toString().padStart(2, '0')}</div>
                      <div className="text-[8px] text-accent-color/80 uppercase">сек</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Episodes Section */}
      {!isEpisodeActive && (
        <div className="space-y-4">
          <div className="border-b border-border-color pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 font-mono">
              <Tv className="w-4 h-4 text-accent-color" />
              <span>Список серий ({show.episodes.length})</span>
            </h3>
          </div>

          {show.episodes.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-color rounded-2xl bg-bg-card text-text-muted text-xs shadow-soft">
              Серии пока не добавлены. Пожалуйста, добавьте серии через Панель Админа.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {show.episodes.map((episode) => {
                const released = isEpisodeReleased(episode);
                const progress = watchProgress[episode.id];
                const isCompleted = progress?.completed || false;
                const hasProgress = progress && !progress.completed && progress.watchedDuration > 10;
                const percent = hasProgress ? (progress.watchedDuration / progress.totalDuration) * 100 : 0;

                return (
                  <div 
                    key={episode.id}
                    className={`group relative rounded-2xl border p-3 flex gap-4 transition-all duration-300 shadow-soft hover:shadow-hover ${
                      released 
                        ? 'bg-bg-card border-border-color hover:border-accent-color/40 hover:scale-[1.005] cursor-pointer' 
                        : 'bg-bg-app border-border-color text-text-muted cursor-not-allowed select-none'
                    }`}
                    onClick={() => {
                      if (released) {
                        onSelectEpisode(episode.id);
                      }
                    }}
                  >
                    {/* Episode Thumbnail Container */}
                    <div className="relative w-28 md:w-32 aspect-[16/9] rounded-xl overflow-hidden bg-bg-app shrink-0 self-center border border-border-color">
                      {episode.thumbnail ? (
                        <img src={episode.thumbnail} alt={episode.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-bg-app flex items-center justify-center">
                          {released ? (
                            <Play className="w-5 h-5 text-text-muted group-hover:text-accent-color group-hover:scale-110 transition-all" />
                          ) : (
                            <Lock className="w-5 h-5 text-text-muted" />
                          )}
                        </div>
                      )}

                      {/* Left Top Episode Number badge */}
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-bg-card/95 text-[8px] font-bold text-accent-color border border-border-color font-mono backdrop-blur-xs">
                        C{episode.number}
                      </div>

                      {/* Stills gallery count badge */}
                      {episode.stills && episode.stills.length > 0 && (
                        <div 
                          className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-bg-card/95 text-[8px] font-bold text-accent-color border border-border-color font-mono flex items-center gap-1 backdrop-blur-xs"
                          title={`Кадры со съемок: ${episode.stills.length}`}
                        >
                          <Camera className="w-2.5 h-2.5" />
                          <span>{episode.stills.length}</span>
                        </div>
                      )}

                      {/* Progress indicator */}
                      {released && isCompleted && (
                        <div className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-bg-card/95 text-emerald-500 border border-border-color backdrop-blur-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 fill-current text-emerald-500" />
                        </div>
                      )}

                      {/* Play button overlay */}
                      {released && (
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="p-2 bg-accent-color text-white rounded-full shadow-soft">
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Direct progress bar line */}
                      {released && hasProgress && (
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-border-color">
                          <div className="h-full bg-accent-color" style={{ width: `${percent}%` }} />
                        </div>
                      )}
                    </div>

                    {/* Text Description column */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-accent-color font-bold">Серия {episode.number}</span>
                          {episode.duration && (
                            <span className="text-[9px] text-text-muted font-mono">({episode.duration})</span>
                          )}
                        </div>
                        <h4 className={`text-xs font-bold truncate mt-0.5 ${released ? 'text-text-primary group-hover:text-accent-color transition-colors' : 'text-text-muted'}`}>
                          {episode.title}
                        </h4>
                        {episode.description && (
                          <p className={`text-[10px] line-clamp-2 mt-1 leading-relaxed ${released ? 'text-text-secondary' : 'text-text-muted'}`}>
                            {episode.description}
                          </p>
                        )}
                      </div>

                      {/* Release date or play button indicator at bottom */}
                      <div className="mt-1.5 text-[9px] font-mono flex items-center justify-between">
                        {!released ? (
                          <span className="text-yellow-600 flex items-center gap-1 font-bold">
                            <Lock className="w-3 h-3 text-yellow-500" />
                            <span>Выйдет: {getEpisodeReleaseText(episode)}</span>
                          </span>
                        ) : (
                          <span className="text-text-muted flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-text-muted" />
                            <span>Выпущено</span>
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cast / Actors Section */}
      {show.actors && show.actors.length > 0 && (
        <div className="space-y-4">
          <div className="border-b border-border-color pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 font-mono">
              <Users className="w-4 h-4 text-accent-color" />
              <span>В ролях ({show.actors.length})</span>
            </h3>
          </div>
          
          {/* Horizontal scrollable list */}
          <div className="flex overflow-x-auto pb-4 gap-4 snap-x hide-scrollbar">
            {show.actors.map((actor) => (
              <div 
                key={actor.id} 
                onClick={() => setSelectedActor(actor)}
                className="shrink-0 w-36 md:w-40 snap-start bg-bg-card rounded-2xl overflow-hidden border border-border-color hover:border-accent-color/30 hover:shadow-hover hover:scale-[1.01] transition-all group cursor-pointer shadow-soft"
              >
                <div className="aspect-[3/4] w-full bg-bg-app overflow-hidden relative">
                  {actor.imageUrl ? (
                    <img 
                      src={actor.imageUrl} 
                      alt={actor.name} 
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-text-muted bg-bg-app">
                      <Users className="w-8 h-8 mb-2 opacity-20" />
                      <span className="text-[10px] uppercase font-bold tracking-widest opacity-30">Нет фото</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black via-black/20 to-transparent opacity-40" />
                </div>
                
                <div className="p-3">
                  <h4 className="text-xs font-bold text-text-primary line-clamp-1" title={actor.name}>{actor.name}</h4>
                  <p className="text-[10px] text-accent-color font-bold line-clamp-1 mb-1.5" title={actor.role}>{actor.role}</p>
                  
                  {actor.filmography && (
                    <p className="text-[9px] text-text-muted line-clamp-2 leading-tight" title={actor.filmography}>
                      {actor.filmography}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments Section */}
      {!isEpisodeActive && show && (
        <div className="space-y-4">
          <div className="border-b border-border-color pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 font-mono">
              <MessageSquare className="w-4 h-4 text-accent-color" />
              <span>Комментарии ({show.comments?.length || 0})</span>
            </h3>
          </div>

          {/* Comment input form */}
          <form onSubmit={handleSubmitComment} className="space-y-3 bg-bg-card border border-border-color p-4 rounded-2xl shadow-soft">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="w-full md:w-1/4 font-sans">
                <label htmlFor="nickname" className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                  Ваш псевдоним
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Введите никнейм..."
                  className="w-full bg-bg-app border border-border-color rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all"
                  maxLength={25}
                />
              </div>
              <div className="flex-1 font-sans">
                <label htmlFor="comment" className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                  Комментарий
                </label>
                <textarea
                  id="comment"
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Оставьте ваш отзыв или мнение о сериале..."
                  className="w-full bg-bg-app border border-border-color rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all resize-none"
                  maxLength={500}
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-2 font-sans">
              <div>
                {commentError && <span className="text-[10px] text-rose-500 font-semibold">{commentError}</span>}
              </div>
              <button
                type="submit"
                className="bg-accent-color hover:bg-accent-hover text-white rounded-xl px-4 py-2 flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-soft active:scale-95 self-end"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Отправить</span>
              </button>
            </div>
          </form>

          {/* Comments list */}
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {!show.comments || show.comments.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border-color rounded-2xl bg-bg-card text-text-muted text-xs font-sans shadow-soft">
                Комментариев пока нет. Будьте первым, кто оставит свой отзыв!
              </div>
            ) : (
              [...show.comments]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((comment) => {
                  const isOwner = comment.userId === currentUserId;
                  const gradient = getAvatarGradient(comment.author);
                  const initials = getInitials(comment.author);

                  return (
                    <div 
                      key={comment.id}
                      className="flex gap-3 bg-bg-card border border-border-color rounded-2xl p-4 hover:border-accent-color/25 transition-all group font-sans shadow-soft"
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} text-white font-bold flex items-center justify-center text-[10px] shrink-0 uppercase tracking-wider`}>
                        {initials}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-bold text-text-primary truncate">{comment.author}</span>
                            {isOwner && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-light text-accent-color border border-accent-color/20 font-semibold font-mono">
                                Вы
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-text-muted font-mono shrink-0">
                            {formatCommentDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap break-words select-text">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {selectedActor && (
        <ActorModal actor={selectedActor} onClose={() => setSelectedActor(null)} />
      )}

      {showCoWatchModal && (
        <CoWatchRoom
          showId={show.id}
          showTitle={show.title}
          defaultVideoUrl={show.episodes?.[0]?.driveUrl || ''}
          onClose={() => setShowCoWatchModal(false)}
        />
      )}

      {showTrailerModal && show.trailerUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
          <div className="relative w-full max-w-4xl aspect-[16/9] bg-black border border-border-color rounded-[32px] overflow-hidden shadow-hover m-4">
            <button
              onClick={() => setShowTrailerModal(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-bg-card border border-border-color text-text-secondary hover:text-text-primary hover:border-accent-color/30 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <iframe 
              src={getTrailerEmbedUrl(show.trailerUrl)}
              title={`${show.title} - Трейлер`}
              className="w-full h-full border-none"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};
