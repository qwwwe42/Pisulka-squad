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
  // Inject confetti elements
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

  // Clean up after 10 seconds
  setTimeout(() => {
    const el = document.getElementById('confetti-container');
    if (el) el.remove();
  }, 10000);
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectShow, onSelectEpisode, mode = 'home' }) => {
  const { shows, watchProgress, loadDemoData, news } = useStreaming();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  // 1. Determine featured show (prefer ongoing show with active countdown, else first show)
  const visibleShows = shows.filter(s => !s.isHidden);
  const ongoingWithCountdown = visibleShows.find(s => s.status === 'ongoing' && s.nextEpisodeRelease);
  const featuredShow = visibleShows.length > 0 ? (ongoingWithCountdown || visibleShows[0]) : null;

  // Countdown state
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  // Render-based state adjustment block
  const featuredShowIdAndRelease = featuredShow ? `${featuredShow.id}-${featuredShow.nextEpisodeRelease || ''}` : '';
  const [prevShowIdAndRelease, setPrevShowIdAndRelease] = useState(featuredShowIdAndRelease);
  if (featuredShowIdAndRelease !== prevShowIdAndRelease) {
    setPrevShowIdAndRelease(featuredShowIdAndRelease);
    setTimeLeft(null);
  }

  // 2. Countdown Ticker
  useEffect(() => {
    if (!featuredShow || !featuredShow.nextEpisodeRelease) {
      return;
    }

    const releaseTime = new Date(featuredShow.nextEpisodeRelease!).getTime();
    const initialDifference = releaseTime - new Date().getTime();

    // If the release date has already passed on initial load/mount, do not trigger confetti
    if (initialDifference <= 0) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = releaseTime - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
        triggerCelebration();
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

  // Continue Watching List
  const continueWatchingItems = Object.values(watchProgress)
    .filter(progress => {
      const show = shows.find(s => s.id === progress.showId);
      return show && !show.isHidden && !progress.completed && progress.watchedDuration > 10;
    })
    .sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime());

  // Filters
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
        <div className="relative rounded-3xl overflow-hidden border border-slate-800/80 bg-slate-950/40 shadow-2xl">
          {/* Blurred Background Banner */}
          <div className="absolute inset-0 z-0">
            {featuredShow.coverImage ? (
              <img 
                src={featuredShow.coverImage} 
                alt="cover" 
                className="w-full h-full object-cover opacity-35 scale-105 filter blur-xs"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-purple-950/50 via-slate-900/50 to-cyan-950/50 opacity-50" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
          </div>

          {/* Banner Contents */}
          <div className="relative z-10 p-6 md:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 min-h-[380px]">
            {/* Info details */}
            <div className="max-w-2xl space-y-4 text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-800/30">
                  Рекомендуем ({featuredShow.category})
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-800 text-slate-400">
                  {featuredShow.status === 'ongoing' ? 'В эфире (Онгоинг)' : 'Выпущен полностью'}
                </span>
              </div>
              
              <h1 className="text-2xl md:text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">
                {featuredShow.title}
              </h1>
              
              <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">
                {featuredShow.description}
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <button
                  onClick={() => onSelectShow(featuredShow.id)}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-900/20 hover:shadow-purple-700/30 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  Смотреть серии
                </button>

              </div>
            </div>

            {/* Countdown Box */}
            {timeLeft ? (
              <div className="w-full max-w-sm shrink-0 bg-slate-900/80 border border-purple-500/30 rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500" />
                
                {/* Glow ring in background */}
                <div className="absolute w-48 h-48 bg-purple-500/10 rounded-full filter blur-xl group-hover:bg-purple-500/15 transition-all duration-500" />

                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-purple-300 uppercase font-mono">
                    <Clock className="w-3.5 h-3.5 animate-pulse text-purple-400" />
                    <span>До новой серии осталось</span>
                  </div>

                  {/* Digital Clock digits */}
                  <div className="grid grid-cols-4 gap-3.5 mt-5">
                    {/* Days */}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center text-xl font-bold text-slate-100 font-mono shadow-inner shadow-black/80">
                        {timeLeft.days.toString().padStart(2, '0')}
                      </div>
                      <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">дн</span>
                    </div>

                    {/* Hours */}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center text-xl font-bold text-slate-100 font-mono shadow-inner shadow-black/80">
                        {timeLeft.hours.toString().padStart(2, '0')}
                      </div>
                      <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">ч</span>
                    </div>

                    {/* Minutes */}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center text-xl font-bold text-slate-100 font-mono shadow-inner shadow-black/80">
                        {timeLeft.minutes.toString().padStart(2, '0')}
                      </div>
                      <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">мин</span>
                    </div>

                    {/* Seconds */}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-purple-950/35 border border-purple-800/40 rounded-xl flex items-center justify-center text-xl font-bold text-purple-400 font-mono shadow-inner shadow-black/80">
                        {timeLeft.seconds.toString().padStart(2, '0')}
                      </div>
                      <span className="text-[9px] font-semibold text-purple-400/90 uppercase tracking-wider mt-1.5">сек</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-5 font-mono italic">
                    Каждую неделю: {['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][featuredShow.scheduleDay || 0]} в {featuredShow.scheduleTime || '00:00'}
                  </p>
                </div>
              </div>
            ) : (
              featuredShow.status === 'ongoing' && (
                <div className="w-full max-w-sm shrink-0 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center backdrop-blur-md text-slate-400 space-y-2">
                  <Calendar className="w-8 h-8 text-purple-500 mx-auto" />
                  <p className="text-xs font-semibold text-slate-300">Расписание не установлено</p>
                  <p className="text-[11px] text-slate-500">Администратор пока не добавил таймер обратного отсчета для следующих серий.</p>
                </div>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center space-y-4 bg-slate-900/20">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
          <h2 className="text-lg font-bold text-slate-300">Каталог пуст</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Пожалуйста, перейдите в <strong>Панель Админа</strong>, чтобы добавить сериалы или загрузить демонстрационные данные.
          </p>
          <button 
            onClick={loadDemoData}
            className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-900/50 text-purple-400 rounded-lg text-xs font-semibold cursor-pointer"
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
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Продолжить просмотр</span>
            </h3>
            <span className="text-[10px] text-slate-500">{continueWatchingItems.length} серий</span>
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
                  className="snap-start shrink-0 w-64 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300"
                >
                  <div className="relative aspect-[16/9] bg-slate-950">
                    {epItem.thumbnail ? (
                      <img src={epItem.thumbnail} alt={epItem.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                        <Play className="w-6 h-6 text-slate-600 group-hover:text-purple-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
                      <div className="p-2 bg-purple-600/90 text-white rounded-full scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Top Episode Number badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 text-[9px] font-bold text-purple-300 border border-purple-950/40 font-mono">
                      С{epItem.number}
                    </div>

                    {/* Progress bar line */}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-800">
                      <div className="h-full bg-purple-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>

                  <div className="p-3 space-y-1">
                    <p className="text-[10px] text-purple-400 font-medium truncate font-mono uppercase">
                      {showItem.title}
                    </p>
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-slate-100 truncate">
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
        <div className="space-y-4 bg-slate-900/10 border border-slate-800/60 rounded-3xl p-6 md:p-8">
          <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-sans">
              Новости Сообщества
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {news.slice(0, 4).map((item) => (
              <div key={item.id} className="p-4.5 bg-slate-950/40 border border-slate-900 hover:border-slate-800/65 rounded-2xl space-y-2.5 transition-all font-sans">
                <span className="text-[9px] font-mono font-bold text-purple-450 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-900/30 w-fit block">{item.tag}</span>
                <h4 className="text-xs font-bold text-slate-200">{item.title}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap break-words">
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
            {/* Category tabs */}
            <div className="flex bg-slate-950/80 border border-slate-800/80 p-0.5 rounded-xl text-xs text-slate-400 font-medium self-start">
              {['All', 'Anime', 'Series', 'Movies'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-lg transition-all ${
                    activeCategory === cat 
                      ? 'bg-purple-600 text-white shadow' 
                      : 'hover:text-slate-200'
                  }`}
                >
                  {cat === 'All' ? 'Все' : cat === 'Anime' ? 'Аниме' : cat === 'Series' ? 'Сериалы' : 'Фильмы'}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input 
                type="text"
                placeholder="Поиск по названию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 focus:border-purple-500/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 outline-none transition-all placeholder:text-slate-600"
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
            <div className="text-center py-12 text-slate-500 text-xs">
              Сериалы с заданными фильтрами не найдены.
            </div>
          )}
        </div>
      )}

      {mode === 'catalog' && shows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center space-y-4 bg-slate-900/20">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
          <h2 className="text-lg font-bold text-slate-300">Каталог пуст</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
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
