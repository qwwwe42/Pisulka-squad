import React, { useState, useEffect } from 'react';
import { useStreaming } from '../context/StreamingContext';
import { ShowCard } from './ShowCard';
import { Play, Search, Clock, Calendar } from 'lucide-react';

interface DashboardProps {
  onSelectShow: (showId: string) => void;
  onSelectEpisode: (showId: string, episodeId: string) => void;
  mode?: 'home' | 'catalog';
}

// Pure CSS Confetti generator
function triggerCelebration() {
  const colors = ['#a855f7', '#06b6d4', '#ec4899', '#eab308', '#22c55e'];
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '999';
  container.id = 'confetti-container';
  document.body.appendChild(container);

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-particle';
    confetti.style.position = 'absolute';
    confetti.style.width = `${Math.random() * 8 + 6}px`;
    confetti.style.height = `${Math.random() * 15 + 8}px`;
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.top = `-20px`;
    confetti.style.opacity = `${Math.random() * 0.6 + 0.4}`;
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    
    const duration = Math.random() * 3 + 2;
    const delay = Math.random() * 2;
    
    confetti.style.animation = `fall ${duration}s linear ${delay}s infinite`;
    container.appendChild(confetti);
  }

  setTimeout(() => {
    const el = document.getElementById('confetti-container');
    if (el) el.remove();
  }, 10000);
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectShow, onSelectEpisode, mode = 'home' }) => {
  const { shows, watchProgress, loadDemoData, news } = useStreaming();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const visibleShows = shows.filter(s => !s.isHidden);
  const ongoingWithCountdown = visibleShows.find(s => s.status === 'ongoing' && s.nextEpisodeRelease);
  const featuredShow = visibleShows.length > 0 ? (ongoingWithCountdown || visibleShows[0]) : null;

  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  const featuredShowIdAndRelease = featuredShow ? `${featuredShow.id}-${featuredShow.nextEpisodeRelease || ''}` : '';
  const [prevShowIdAndRelease, setPrevShowIdAndRelease] = useState(featuredShowIdAndRelease);
  if (featuredShowIdAndRelease !== prevShowIdAndRelease) {
    setPrevShowIdAndRelease(featuredShowIdAndRelease);
    setTimeLeft(null);
  }

  useEffect(() => {
    if (!featuredShow || !featuredShow.nextEpisodeRelease) {
      return;
    }

    const releaseTime = new Date(featuredShow.nextEpisodeRelease!).getTime();
    const initialDifference = releaseTime - new Date().getTime();
    const celebratedKey = `penis_ink_celebrated_${featuredShow.id}_${featuredShow.nextEpisodeRelease}`;

    if (initialDifference <= 0) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      localStorage.setItem(celebratedKey, 'true');
      return;
    }

    if (localStorage.getItem(celebratedKey) === 'true') {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = releaseTime - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
        
        if (localStorage.getItem(celebratedKey) !== 'true') {
          localStorage.setItem(celebratedKey, 'true');
          triggerCelebration();
        }
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [featuredShow]);

  const continueWatchingItems = Object.values(watchProgress)
    .filter(progress => {
      const show = shows.find(s => s.id === progress.showId);
      return show && !show.isHidden && !progress.completed && progress.watchedDuration > 10;
    })
    .sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime());

  const filteredShows = shows.filter(show => {
    if (show.isHidden) return false;
    const query = String(searchQuery || '').toLowerCase();
    const titleMatch = String(show?.title || '').toLowerCase().includes(query);
    const descMatch = String(show?.description || '').toLowerCase().includes(query);
    const matchesSearch = titleMatch || descMatch;
    const matchesCategory = activeCategory === 'All' || show.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      
      {/* 1. HERO BANNER & TIMER */}
      {mode === 'home' && (
        featuredShow ? (
        <div className="relative rounded-[32px] overflow-hidden border border-border-color bg-bg-card shadow-soft transition-all duration-300">
          {/* Blurred Background Banner */}
          <div className="absolute inset-0 z-0">
            {featuredShow.coverImage ? (
              <img 
                src={featuredShow.coverImage} 
                alt="cover" 
                className="w-full h-full object-cover opacity-15 scale-105 filter blur-xs"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-accent-light via-bg-card/50 to-bg-card opacity-50" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/90 to-transparent" />
          </div>

          {/* Banner Contents */}
          <div className="relative z-10 p-6 md:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 min-h-[380px]">
            {/* Info details */}
            <div className="max-w-2xl space-y-4 text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-accent-light text-accent-color border border-accent-color/20">
                  Рекомендуем ({featuredShow.category})
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-bg-app text-text-secondary border border-border-color">
                  {featuredShow.status === 'ongoing' ? 'В эфире (Онгоинг)' : 'Выпущен полностью'}
                </span>
              </div>
              
              <h1 className="text-2xl md:text-4xl font-extrabold text-text-primary tracking-tight leading-tight">
                {featuredShow.title}
              </h1>
              
              <p className="text-xs md:text-sm text-text-secondary line-clamp-3 leading-relaxed">
                {featuredShow.description}
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <button
                  onClick={() => onSelectShow(featuredShow.id)}
                  className="px-6 py-3 bg-accent-color hover:bg-accent-hover text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-soft hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  Смотреть серии
                </button>
              </div>
            </div>

            {/* Countdown Box */}
            {timeLeft ? (
              <div className="w-full max-w-sm shrink-0 bg-bg-card border border-border-color rounded-[32px] p-6 shadow-soft flex flex-col items-center justify-center backdrop-blur-md relative overflow-hidden group transition-all duration-300">
                <div className="absolute top-0 inset-x-0 h-1 bg-accent-color" />
                
                {/* Glow ring in background */}
                <div className="absolute w-48 h-48 bg-accent-color/5 rounded-full filter blur-xl group-hover:bg-accent-color/10 transition-all duration-500" />

                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-accent-color uppercase font-mono">
                    <Clock className="w-3.5 h-3.5 animate-pulse text-accent-color" />
                    <span>До новой серии осталось</span>
                  </div>

                  {/* Digital Clock digits */}
                  <div className="grid grid-cols-4 gap-3 mt-5">
                    {/* Days */}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-bg-app border border-border-color rounded-2xl flex items-center justify-center text-xl font-bold text-text-primary font-mono shadow-sm">
                        {timeLeft.days.toString().padStart(2, '0')}
                      </div>
                      <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider mt-1.5">дн</span>
                    </div>

                    {/* Hours */}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-bg-app border border-border-color rounded-2xl flex items-center justify-center text-xl font-bold text-text-primary font-mono shadow-sm">
                        {timeLeft.hours.toString().padStart(2, '0')}
                      </div>
                      <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider mt-1.5">ч</span>
                    </div>

                    {/* Minutes */}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-bg-app border border-border-color rounded-2xl flex items-center justify-center text-xl font-bold text-text-primary font-mono shadow-sm">
                        {timeLeft.minutes.toString().padStart(2, '0')}
                      </div>
                      <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider mt-1.5">мин</span>
                    </div>

                    {/* Seconds */}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-accent-light border border-accent-color/30 rounded-2xl flex items-center justify-center text-xl font-bold text-accent-color font-mono shadow-sm">
                        {timeLeft.seconds.toString().padStart(2, '0')}
                      </div>
                      <span className="text-[9px] font-bold text-accent-color uppercase tracking-wider mt-1.5">сек</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-text-muted mt-5 font-mono italic">
                    Каждую неделю: {['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][featuredShow.scheduleDay || 0]} в {featuredShow.scheduleTime || '00:00'}
                  </p>
                </div>
              </div>
            ) : (
              featuredShow.status === 'ongoing' && (
                <div className="w-full max-w-sm shrink-0 bg-bg-card border border-border-color rounded-[32px] p-6 text-center shadow-soft text-text-secondary space-y-2">
                  <Calendar className="w-8 h-8 text-accent-color mx-auto" />
                  <p className="text-xs font-semibold text-text-primary">Расписание не установлено</p>
                  <p className="text-[11px] text-text-muted">Администратор пока не добавил таймер обратного отсчета для следующих серий.</p>
                </div>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-[32px] border border-dashed border-border-color p-12 text-center space-y-4 bg-bg-card shadow-soft">
          <Calendar className="w-12 h-12 text-text-muted mx-auto animate-pulse" />
          <h2 className="text-lg font-bold text-text-primary">Каталог пуст</h2>
          <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
            Пожалуйста, перейдите в <strong>Панель Админа</strong>, чтобы добавить сериалы или загрузить демонстрационные данные.
          </p>
          <button 
            onClick={loadDemoData}
            className="px-4 py-2 bg-accent-light hover:bg-accent-color hover:text-white border border-accent-color/20 text-accent-color rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Загрузить демо-сериалы
          </button>
        </div>
      )
      )}

      {/* 2. CONTINUE WATCHING (История просмотров) */}
      {mode === 'home' && continueWatchingItems.length > 0 && (
        <div className="space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest flex items-center gap-2 font-mono">
              <Clock className="w-4 h-4 text-accent-color" />
              <span>Продолжить просмотр</span>
            </h3>
            <span className="text-[10px] text-text-muted">{continueWatchingItems.length} серий</span>
          </div>

          <div className="flex overflow-x-auto pb-3 gap-4 scrollbar-none snap-x snap-mandatory scroll-smooth -mx-2 px-2">
            {continueWatchingItems.map((progress) => {
              const showItem = shows.find(s => s.id === progress.showId);
              const epItem = showItem?.episodes.find(e => e.id === progress.episodeId);
              
              if (!showItem || !epItem) return null;

              const percent = (progress.watchedDuration / progress.totalDuration) * 100;

              return (
                <div 
                  key={progress.episodeId}
                  onClick={() => onSelectEpisode(showItem.id, epItem.id)}
                  className="snap-start shrink-0 w-64 bg-bg-card border border-border-color rounded-2xl overflow-hidden cursor-pointer group shadow-soft hover:shadow-hover hover:scale-[1.01] transition-all duration-300"
                >
                  <div className="relative aspect-[16/9] bg-bg-app">
                    {epItem.thumbnail ? (
                      <img src={epItem.thumbnail} alt={epItem.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-text-muted group-hover:text-accent-color" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                      <div className="p-2 bg-accent-color text-white rounded-full scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all shadow-md">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Top Episode Number badge */}
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-bg-card/95 text-[9px] font-bold text-accent-color border border-border-color font-mono backdrop-blur-xs">
                      С{epItem.number}
                    </div>

                    {/* Progress bar line */}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-border-color">
                      <div className="h-full bg-accent-color" style={{ width: `${percent}%` }} />
                    </div>
                  </div>

                  <div className="p-3 space-y-1">
                    <p className="text-[9px] text-accent-color font-bold truncate font-mono uppercase tracking-wider">
                      {showItem.title}
                    </p>
                    <h4 className="text-xs font-bold text-text-primary group-hover:text-accent-color truncate transition-colors duration-200">
                      {epItem.title}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2.5 WELCOME CARD (LATEST NEWS) */}
      {mode === 'home' && news && news.length > 0 && (
        <div className="space-y-4 bg-bg-card border border-border-color rounded-[32px] p-6 md:p-8 shadow-soft">
          <div className="border-b border-border-color pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest font-mono">
              Новости Сообщества
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {news.slice(0, 4).map((item) => (
              <div key={item.id} className="p-5 bg-bg-app border border-border-color hover:border-accent-color/25 rounded-2xl space-y-2.5 shadow-soft hover:shadow-hover transition-all duration-300 font-sans">
                <span className="text-[9px] font-mono font-bold text-accent-color bg-accent-light px-2 py-0.5 rounded border border-accent-color/20 w-fit block">{item.tag}</span>
                <h4 className="text-xs font-bold text-text-primary">{item.title}</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
                  {item.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. CATALOG */}
      {mode === 'catalog' && shows.length > 0 && (
        <div className="space-y-4 flex-1">
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border-color pb-3">
            {/* Category tabs */}
            <div className="flex bg-bg-card border border-border-color p-0.5 rounded-xl text-xs text-text-secondary font-semibold self-start shadow-soft select-none">
              {['All', 'Anime', 'Series', 'Movies'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                    activeCategory === cat 
                      ? 'bg-accent-color text-white shadow-soft' 
                      : 'hover:text-text-primary'
                  }`}
                >
                  {cat === 'All' ? 'Все' : cat === 'Anime' ? 'Аниме' : cat === 'Series' ? 'Сериалы' : 'Фильмы'}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64 shadow-soft rounded-xl">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
              <input 
                type="text"
                placeholder="Поиск по названию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-card border border-border-color hover:border-accent-color/30 focus:border-accent-color rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary outline-none transition-all placeholder:text-text-muted"
              />
            </div>
          </div>

          {/* Grid list */}
          {filteredShows.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredShows.map((show) => (
                <ShowCard 
                  key={show.id} 
                  show={show} 
                  onClick={() => onSelectShow(show.id)} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted text-xs">
              Сериалы с заданными фильтрами не найдены.
            </div>
          )}
        </div>
      )}

      {mode === 'catalog' && shows.length === 0 && (
        <div className="rounded-[32px] border border-dashed border-border-color p-12 text-center space-y-4 bg-bg-card shadow-soft">
          <Calendar className="w-12 h-12 text-text-muted mx-auto animate-pulse" />
          <h2 className="text-lg font-bold text-text-primary">Каталог пуст</h2>
          <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
            Пожалуйста, перейдите в <strong>Панель Админа</strong>, чтобы добавить сериалы.
          </p>
        </div>
      )}

      {/* Confetti Animation Style Keyframes Injector */}
      <style>{`
        .confetti-particle {
          will-change: transform, opacity;
        }
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
          }
          100% {
            transform: translateY(105vh) rotate(720deg);
          }
        }
      `}</style>
    </div>
  );
};
