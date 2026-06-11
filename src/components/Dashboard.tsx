import React, { useState, useEffect, useRef } from 'react';
import { useStreaming } from '../context/StreamingContext';
import { ShowCard } from './ShowCard';
import { Play, Search, Clock, Calendar, Plus, X, FileText, CheckCircle2, Newspaper, ChevronLeft, ChevronRight, Tv } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { NewsVideoField } from './NewsVideoField';
import { LiveCoWatchWidget } from './LiveCoWatchWidget';

interface DashboardProps {
  onSelectShow: (showId: string) => void;
  onSelectEpisode: (showId: string, episodeId: string) => void;
  onSelectNews?: (newsId: string) => void;
  onNavigateToShows?: () => void;
  mode?: 'home' | 'catalog';
}

// Pure CSS Confetti generator
function triggerCelebration() {
  // Respect reduced-motion preferences (#14)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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

export const Dashboard: React.FC<DashboardProps> = ({ onSelectShow, onSelectEpisode, onSelectNews, onNavigateToShows, mode = 'home' }) => {
  const { shows, watchProgress, loadDemoData, news, addNews, eventTimerConfig } = useStreaming();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [newsFormErrors, setNewsFormErrors] = useState<{ title?: string; content?: string; general?: string }>({});

  // Event Timer states
  const [eventTimeLeft, setEventTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [eventTimerIsDone, setEventTimerIsDone] = useState(false);

  useEffect(() => {
    if (!eventTimerConfig || !eventTimerConfig.isActive) {
      setEventTimeLeft(null);
      return;
    }

    const targetTime = new Date(eventTimerConfig.endDatetime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const difference = targetTime - now;

      if (difference <= 0) {
        setEventTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setEventTimerIsDone(true);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setEventTimeLeft({ days, hours, minutes, seconds });
        setEventTimerIsDone(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [eventTimerConfig]);
  
  // Public News Modal State
  const [showAddNewsModal, setShowAddNewsModal] = useState(false);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsTag, setNewsTag] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImage, setNewsImage] = useState('');
  const [newsVideoUrl, setNewsVideoUrl] = useState('');
  const [newsVideoSource, setNewsVideoSource] = useState<'link' | 'upload'>('link');
  const [newsHashtags, setNewsHashtags] = useState('');
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);
  const [newsSuccess, setNewsSuccess] = useState(false);
  const newsModalRef = useRef<HTMLDivElement>(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);

  // Focus trap and Escape close for news modal
  useEffect(() => {
    if (!showAddNewsModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddNewsModal(false);
        return;
      }

      if (e.key === 'Tab' && newsModalRef.current) {
        const focusable = newsModalRef.current.querySelectorAll<HTMLElement>(
          'input, textarea, button, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddNewsModal]);
  
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

  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = carouselRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 5);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
    }
  };

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener('scroll', checkScroll);

    const observer = new ResizeObserver(() => {
      checkScroll();
    });
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      observer.disconnect();
    };
  }, [continueWatchingItems]);

  const handleScrollCarousel = (direction: 'left' | 'right') => {
    const el = carouselRef.current;
    if (el) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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
    <div className="page-section space-y-8 glass-panel">
      
      {/* EVENT COUNTDOWN TIMER BANNER */}
      {mode === 'home' && eventTimerConfig && eventTimerConfig.isActive && (
        <div 
          className="relative rounded-[32px] overflow-hidden border border-border-color bg-bg-card shadow-soft transition-all duration-500 bg-cover bg-center min-h-[220px] flex items-center p-6 md:p-8 group"
          style={{ 
            backgroundImage: `url("${eventTimerConfig.bgImageUrl || 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?q=80&w=1200&auto=format&fit=crop'}")` 
          }}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-xs transition-opacity group-hover:bg-black/60 duration-300 z-0" />
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-accent-color/15 rounded-full filter blur-3xl z-0 pointer-events-none group-hover:bg-accent-color/20 transition-all duration-500" />
          
          <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left space-y-2 max-w-xl">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-accent-light text-accent-color border border-accent-color/25 inline-block">
                Активное событие
              </span>
              <h2 className="text-xl md:text-3xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
                {eventTimerConfig.eventName}
              </h2>
              {!eventTimerIsDone && (
                <p className="text-[11px] text-text-secondary">
                  До запуска осталось совсем немного! Следите за обратным отсчетом.
                </p>
              )}
            </div>

            <div className="shrink-0 w-full md:w-auto flex justify-center">
              {!eventTimerIsDone && eventTimeLeft ? (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-bg-app/80 border border-border-color rounded-2xl flex items-center justify-center text-xl font-black text-text-primary font-mono shadow-md backdrop-blur-sm">
                      {eventTimeLeft.days.toString().padStart(2, '0')}
                    </div>
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mt-1">дн</span>
                  </div>
                  
                  <span className="text-xl font-bold text-white mb-4">:</span>

                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-bg-app/80 border border-border-color rounded-2xl flex items-center justify-center text-xl font-black text-text-primary font-mono shadow-md backdrop-blur-sm">
                      {eventTimeLeft.hours.toString().padStart(2, '0')}
                    </div>
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mt-1">ч</span>
                  </div>

                  <span className="text-xl font-bold text-white mb-4">:</span>

                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-bg-app/80 border border-border-color rounded-2xl flex items-center justify-center text-xl font-black text-text-primary font-mono shadow-md backdrop-blur-sm">
                      {eventTimeLeft.minutes.toString().padStart(2, '0')}
                    </div>
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mt-1">мин</span>
                  </div>

                  <span className="text-xl font-bold text-white mb-4">:</span>

                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-accent-color border border-accent-color/30 rounded-2xl flex items-center justify-center text-xl font-black text-white font-mono shadow-lg shadow-accent-color/20">
                      {eventTimeLeft.seconds.toString().padStart(2, '0')}
                    </div>
                    <span className="text-[11px] font-bold text-accent-color uppercase tracking-widest mt-1">сек</span>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-6 py-4 text-center backdrop-blur-sm animate-scale-in shadow-md shadow-emerald-950/10">
                  <span className="text-lg md:text-xl font-black text-emerald-400 uppercase tracking-wider block drop-shadow-md animate-pulse">
                    {eventTimerConfig.finishText}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-accent-light text-accent-color border border-accent-color/20">
                  Рекомендуем ({featuredShow.category})
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-bg-app text-text-secondary border border-border-color">
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
                  <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-accent-color uppercase font-mono">
                    <Clock className="w-3.5 h-3.5 text-accent-color" />
                    <span>До новой серии осталось</span>
                  </div>

                  {/* Digital Clock digits */}
                  <div className="grid grid-cols-4 gap-3 mt-5">
                    {/* Days */}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-bg-app border border-border-color rounded-2xl flex items-center justify-center text-xl font-bold text-text-primary font-mono shadow-sm">
                        {timeLeft.days.toString().padStart(2, '0')}
                      </div>
                      <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mt-1.5">дн</span>
                    </div>

                    {/* Hours */}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-bg-app border border-border-color rounded-2xl flex items-center justify-center text-xl font-bold text-text-primary font-mono shadow-sm">
                        {timeLeft.hours.toString().padStart(2, '0')}
                      </div>
                      <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mt-1.5">ч</span>
                    </div>

                    {/* Minutes */}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-bg-app border border-border-color rounded-2xl flex items-center justify-center text-xl font-bold text-text-primary font-mono shadow-sm">
                        {timeLeft.minutes.toString().padStart(2, '0')}
                      </div>
                      <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mt-1.5">мин</span>
                    </div>

                    {/* Seconds */}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-accent-light border border-accent-color/30 rounded-2xl flex items-center justify-center text-xl font-bold text-accent-color font-mono shadow-sm">
                        {timeLeft.seconds.toString().padStart(2, '0')}
                      </div>
                      <span className="text-[11px] font-bold text-accent-color uppercase tracking-wider mt-1.5">сек</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-text-muted mt-5 font-mono italic">
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
          <Calendar className="w-12 h-12 text-text-muted mx-auto" />
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
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest flex items-center gap-2 font-mono">
                <Clock className="w-4 h-4 text-accent-color" />
                <span>Продолжить просмотр</span>
              </h3>
              <span className="text-[11px] text-text-muted">{continueWatchingItems.length} серий</span>
            </div>
            {canScrollRight && (
              <span className="text-xs text-text-muted animate-[pulse_2s_infinite] select-none font-medium hidden sm:inline">
                Листайте →
              </span>
            )}
          </div>

          <div className="relative group/carousel">
            {/* Left Chevron Button */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => handleScrollCarousel('left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-bg-card/90 border border-border-color hover:border-accent-color/30 text-text-primary flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer hidden md:flex"
                aria-label="Прокрутить влево"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Right Chevron Button */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => handleScrollCarousel('right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-bg-card/90 border border-border-color hover:border-accent-color/30 text-text-primary flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer hidden md:flex"
                aria-label="Прокрутить вправо"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Left Fade Gradient */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-bg-app via-bg-app/40 to-transparent pointer-events-none z-10 animate-fade-in" />
            )}

            {/* Right Fade Gradient */}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-bg-app via-bg-app/40 to-transparent pointer-events-none z-10 animate-fade-in" />
            )}

            <div 
              ref={carouselRef}
              className="flex overflow-x-auto pb-3 gap-4 scrollbar-none snap-x snap-mandatory scroll-smooth -mx-2 px-2"
            >
              {continueWatchingItems.map((progress) => {
                const showItem = shows.find(s => s.id === progress.showId);
                const epItem = showItem?.episodes.find(e => e.id === progress.episodeId);
                
                if (!showItem || !epItem) return null;

                const percent = (progress.watchedDuration / progress.totalDuration) * 100;

                return (
                  <button 
                    type="button"
                    key={progress.episodeId}
                    onClick={() => onSelectEpisode(showItem.id, epItem.id)}
                    aria-label={`Смотреть: ${showItem.title}, серия ${epItem.number}`}
                    className="snap-start shrink-0 w-64 bg-bg-card border border-border-color rounded-2xl overflow-hidden cursor-pointer group shadow-soft hover:shadow-hover hover:scale-[1.01] transition-all duration-300 text-left"
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
                          <Play className="w-4 h-4 fill-current ml-0.5" aria-hidden="true" />
                        </div>
                      </div>

                      {/* Top Episode Number badge */}
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-bg-card/95 text-[11px] font-bold text-accent-color border border-border-color font-mono backdrop-blur-xs">
                        С{epItem.number}
                      </div>

                      {/* Progress bar line */}
                      <div className="absolute bottom-0 inset-x-0 h-1 bg-border-color">
                        <div className="h-full bg-accent-color" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <div className="p-3 space-y-1">
                      <p className="text-[11px] text-accent-color font-bold truncate font-mono uppercase tracking-wider">
                        {showItem.title}
                      </p>
                      <h4 className="text-xs font-bold text-text-primary group-hover:text-accent-color truncate transition-colors duration-200">
                        {epItem.title}
                      </h4>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2.45 CATALOG ON HOME */}
      {mode === 'home' && shows.length > 0 && (
        <div className="space-y-4 bg-bg-card border border-border-color rounded-[32px] p-6 md:p-8 shadow-soft">
          <div className="border-b border-border-color pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest font-mono flex items-center gap-2">
              <Tv className="w-4 h-4 text-accent-color" />
              <span>Все сериалы</span>
            </h3>
            {onNavigateToShows && filteredShows.length > 8 && (
              <button
                onClick={onNavigateToShows}
                className="text-xs font-bold text-accent-color hover:text-accent-hover transition-colors flex items-center gap-1 cursor-pointer"
              >
                Показать все
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
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

          {filteredShows.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredShows.slice(0, 8).map((show) => (
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

          {filteredShows.length > 8 && onNavigateToShows && (
            <div className="flex justify-center pt-2">
              <button
                onClick={onNavigateToShows}
                className="px-6 py-2.5 bg-accent-color hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1"
              >
                Показать все
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2.48 LIVE CO-WATCH WIDGET */}
      {mode === 'home' && (
        <LiveCoWatchWidget />
      )}

      {/* 2.5 WELCOME CARD (LATEST NEWS) */}
      {mode === 'home' && (
        <div className="space-y-4 bg-bg-card border border-border-color rounded-[32px] p-6 md:p-8 shadow-soft relative overflow-hidden">
          <div className="border-b border-border-color pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest font-mono">
              Новости Сообщества
            </h3>
            <button
              onClick={() => {
                setShowAddNewsModal(true);
                setNewsTitle('');
                setNewsTag('');
                setNewsContent('');
                setNewsImage('');
                setNewsVideoUrl('');
                setNewsVideoSource('link');
                setNewsHashtags('');
                setNewsSuccess(false);
                setNewsFormErrors({});
              }}
              className="px-3.5 py-1.5 bg-accent-color hover:bg-accent-hover text-white rounded-xl text-[11px] font-bold shadow-soft transition-all cursor-pointer flex items-center gap-1 active:scale-95 duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Опубликовать новость</span>
            </button>
          </div>

          {news && news.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {news.slice(0, 4).map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => onSelectNews?.(item.id)}
                  className="p-5 bg-bg-card border border-border-color hover:border-accent-color/25 rounded-2xl space-y-2.5 shadow-soft hover:shadow-hover transition-all duration-300 font-sans cursor-pointer group"
                >
                  <span className="text-[11px] font-mono font-bold text-accent-color bg-accent-light px-2 py-0.5 rounded border border-accent-color/20 w-fit block">{item.tag}</span>
                  <h4 className="text-xs font-bold text-text-primary">{item.title}</h4>
                  {item.imageUrl ? (
                    <div className="rounded-xl overflow-hidden border border-border-color/60 aspect-video max-h-36 w-full bg-bg-app flex items-center justify-start relative shrink-0">
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      {item.videoUrl && (
                        <div className="absolute inset-0 bg-black/15 flex items-center justify-center">
                          <div className="p-2 bg-accent-color text-white rounded-full scale-95 shadow-md">
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : item.videoUrl ? (
                    <div className="rounded-xl overflow-hidden border border-border-color/60 aspect-video max-h-36 w-full bg-bg-app flex items-center justify-start relative shrink-0">
                      {(() => {
                        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                        const match = item.videoUrl.match(regExp);
                        const ytThumb = (match && match[2].length === 11) ? `https://img.youtube.com/vi/${match[2]}/0.jpg` : null;
                        if (ytThumb) {
                          return <img src={ytThumb} alt={item.title} className="w-full h-full object-cover" />;
                        }
                        const isDirect = item.videoUrl && !item.videoUrl.match(regExp) && !item.videoUrl.includes('drive.google.com');
                        if (isDirect) {
                          return (
                            <video 
                              src={item.videoUrl} 
                              className="w-full h-full object-cover" 
                              preload="metadata" 
                              muted 
                              playsInline 
                            />
                          );
                        }
                        return (
                          <div className="w-full h-full bg-gradient-to-tr from-accent-light/40 to-bg-card flex flex-col items-center justify-center gap-1.5 text-text-muted select-none">
                            <Newspaper className="w-6 h-6 opacity-45" />
                            <span className="text-[11px] font-bold tracking-wider font-mono">VARICOSE SQUAD</span>
                          </div>
                        );
                      })()}
                      <div className="absolute inset-0 bg-black/15 flex items-center justify-center">
                        <div className="p-2 bg-accent-color text-white rounded-full scale-95 shadow-md">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
                    {item.content}
                  </p>
                  {/* Hashtags */}
                  {item.hashtags && item.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.hashtags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-bold text-accent-color bg-accent-light px-1.5 py-0.5 rounded border border-accent-color/5"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 rounded-2xl border border-dashed border-border-color bg-bg-app text-text-muted text-xs font-semibold">
              <p className="mb-2">Новостей пока нет.</p>
              <button
                onClick={() => {
                  setShowAddNewsModal(true);
                  setNewsTitle('');
                  setNewsTag('');
                  setNewsContent('');
                  setNewsImage('');
                  setNewsVideoUrl('');
                  setNewsVideoSource('link');
                  setNewsHashtags('');
                  setNewsSuccess(false);
                  setNewsFormErrors({});
                  setIsVideoUploading(false);
                  setVideoUploadProgress(0);
                }}
                className="px-4 py-2 bg-accent-light hover:bg-accent-color hover:text-white border border-accent-color/20 text-accent-color rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Опубликовать новость</span>
              </button>
            </div>
          )}
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
          <Calendar className="w-12 h-12 text-text-muted mx-auto" />
          <h2 className="text-lg font-bold text-text-primary">Каталог пуст</h2>
          <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
            Пожалуйста, перейдите в <strong>Панель Админа</strong>, чтобы добавить сериалы.
          </p>
        </div>
      )}

      {/* 2.6 PUBLIC NEWS PUBLISHING MODAL */}
      {showAddNewsModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAddNewsModal(false); } }}
          className="modal-overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs"
        >
          <div 
            ref={newsModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-news-modal-title"
            className="modal-content-enter w-full max-w-md bg-bg-card border border-border-color rounded-[32px] p-6 shadow-hover m-4 relative"
          >
            
            {newsSuccess ? (
              <div className="flex flex-col items-center text-center py-6 space-y-4 animate-fade-in">
                <div className="relative">
                  <div className="absolute inset-0 w-16 h-16 rounded-full bg-green-500/20 animate-ping" />
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/35">
                    <CheckCircle2 className="w-9 h-9 text-white" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">Новость опубликована!</h4>
                  <p className="text-[11px] text-text-secondary">Ваша новость успешно размещена в Ленте Сообщества.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-border-color">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-accent-color" />
                    <h3 id="add-news-modal-title" className="text-sm font-bold text-text-primary uppercase tracking-wider">
                      Опубликовать новость
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowAddNewsModal(false)}
                    className="p-1.5 rounded-lg bg-bg-app hover:bg-border-color text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newsTitle.trim() || !newsContent.trim()) {
                      setNewsFormErrors({
                        title: !newsTitle.trim() ? 'Пожалуйста, введите заголовок' : undefined,
                        content: !newsContent.trim() ? 'Пожалуйста, введите содержание новости' : undefined
                      });
                      return;
                    }
                    setIsSubmittingNews(true);
                    setNewsFormErrors({});
                    const hashtagsArray = newsHashtags
                      .split(',')
                      .map(tag => tag.trim().replace(/^#/, ''))
                      .filter(tag => tag.length > 0);

                    try {
                      await addNews({
                        title: newsTitle.trim(),
                        content: newsContent.trim(),
                        tag: newsTag.trim() || 'НОВОСТЬ',
                        imageUrl: newsImage || undefined,
                        videoUrl: newsVideoUrl.trim() || undefined,
                        hashtags: hashtagsArray.length > 0 ? hashtagsArray : undefined,
                        date: new Date().toISOString()
                      });
                      setNewsSuccess(true);
                      setTimeout(() => {
                        setShowAddNewsModal(false);
                      }, 1800);
                    } catch (err) {
                      console.error(err);
                      setNewsFormErrors({ general: 'Не удалось опубликовать новость. Попробуйте ещё раз.' });
                    } finally {
                      setIsSubmittingNews(false);
                    }
                  }}
                  className="space-y-4 pt-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                      Заголовок новости *
                    </label>
                    <input
                      type="text"
                      placeholder="Например: Собрание в 20:00!"
                      value={newsTitle}
                      onChange={(e) => {
                        setNewsTitle(e.target.value);
                        if (newsFormErrors.title) setNewsFormErrors(prev => ({ ...prev, title: undefined }));
                      }}
                      className="w-full ide-input"
                      maxLength={80}
                      required
                    />
                    {newsFormErrors.title && (
                      <p className="text-xs text-rose-500 mt-1 font-semibold">{newsFormErrors.title}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                      Тег / Категория (макс. 18 симв.)
                    </label>
                    <input
                      type="text"
                      placeholder="Например: ИВЕНТ"
                      value={newsTag}
                      onChange={(e) => setNewsTag(e.target.value)}
                      className="w-full ide-input font-bold"
                      maxLength={18}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                      Содержание новости *
                    </label>
                    <textarea
                      placeholder="Напишите текст новости для сообщества..."
                      value={newsContent}
                      onChange={(e) => {
                        setNewsContent(e.target.value);
                        if (newsFormErrors.content) setNewsFormErrors(prev => ({ ...prev, content: undefined }));
                      }}
                      className="w-full ide-input min-h-24 resize-none py-2.5 leading-relaxed"
                      required
                    />
                    {newsFormErrors.content && (
                      <p className="text-xs text-rose-500 mt-1 font-semibold">{newsFormErrors.content}</p>
                    )}
                  </div>

                  {/* Video Input Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                      Видео к новости (необязательно)
                    </label>
                    <NewsVideoField
                      videoUrl={newsVideoUrl}
                      onVideoUrlChange={setNewsVideoUrl}
                      source={newsVideoSource}
                      onSourceChange={setNewsVideoSource}
                      disabled={isSubmittingNews}
                      onUploadStateChange={(uploading, progress) => {
                        setIsVideoUploading(uploading);
                        setVideoUploadProgress(progress);
                      }}
                    />
                  </div>

                  {/* Hashtags Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                      Хэштеги (через запятую)
                    </label>
                    <input 
                      type="text" 
                      value={newsHashtags}
                      onChange={(e) => setNewsHashtags(e.target.value)}
                      placeholder="важно, майнкрафт, релиз..."
                      className="w-full ide-input"
                    />
                  </div>

                  {/* Image Upload Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block font-mono">
                      Изображение (необязательно)
                    </label>
                    
                    {newsImage ? (
                      <div className="relative aspect-video rounded-xl border border-border-color overflow-hidden bg-bg-app">
                        <img 
                          src={newsImage} 
                          alt="Превью" 
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setNewsImage('')}
                          className="absolute top-2 right-2 p-1 rounded-md bg-black/60 hover:bg-black/80 text-slate-350 hover:text-white transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="border border-dashed border-border-color rounded-xl p-4 text-center flex flex-col items-center justify-center gap-2 bg-bg-app">
                        <p className="text-text-muted text-[11px] font-semibold font-sans">Выберите изображение JPG, PNG или WebP</p>
                        <ImageUploader 
                          onImageUploaded={(base64) => setNewsImage(base64)}
                          maxWidth={1000}
                        />
                      </div>
                    )}
                  </div>

                  {newsFormErrors.general && (
                    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs p-3 rounded-xl">
                      {newsFormErrors.general}
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAddNewsModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-border-color hover:bg-bg-app text-text-secondary hover:text-text-primary text-xs font-semibold transition-all cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingNews || isVideoUploading}
                      className="flex-1 py-2.5 bg-accent-color hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-soft transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isSubmittingNews 
                        ? 'Публикация...' 
                        : isVideoUploading 
                          ? `Загрузка видео... ${videoUploadProgress}%` 
                          : 'Опубликовать'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
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
