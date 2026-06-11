import React, { useRef, useState, useEffect } from 'react';
import { useStreaming } from '../context/StreamingContext';
import { 
  getGoogleDriveEmbedUrl, 
  getGoogleDriveDirectStreamUrl 
} from '../utils/drive';
import { 
  X, Play, Pause, Volume2, VolumeX, Maximize2, 
  Tv, Eye, ChevronRight, Settings, RotateCcw, AlertTriangle,
  Camera
} from 'lucide-react';

interface VideoPlayerProps {
  showId: string;
  episodeId: string;
  onClose: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ showId, episodeId, onClose }) => {
  const { shows, watchProgress, updateWatchProgress, setActiveEpisodeId } = useStreaming();
  
  const show = shows.find(s => s.id === showId);
  const episode = show?.episodes.find(e => e.id === episodeId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [playerMode, setPlayerMode] = useState<'html5' | 'embed'>('embed');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedControls, setShowSpeedControls] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [lightsOut, setLightsOut] = useState(false);
  const [showAutoplayOverlay, setShowAutoplayOverlay] = useState(false);
  const [autoplayCountdown, setAutoplayCountdown] = useState(5);
  const [html5Error, setHtml5Error] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedStill, setSelectedStill] = useState<string | null>(null);

  const isGoogleDriveLink = episode?.driveUrl.includes('drive.google.com') || false;

  // Next episode reference
  const nextEpisode = show?.episodes.find(e => e.number === (episode?.number || 0) + 1);

  const [prevEpisodeId, setPrevEpisodeId] = useState<string | null>(null);
  if (episodeId !== prevEpisodeId) {
    setPrevEpisodeId(episodeId);
    setHtml5Error(null);
    setLoadError(null);
    setIsLoading(true);
    setShowAutoplayOverlay(false);
    setIsPlaying(false);
    
    // Auto-detect mode
    if (isGoogleDriveLink) {
      setPlayerMode('embed');
    } else {
      setPlayerMode('html5');
    }
  }

  // Load saved progress for HTML5 player
  useEffect(() => {
    if (playerMode === 'html5' && videoRef.current && episode) {
      const savedProgress = watchProgress[episode.id];
      if (savedProgress && savedProgress.watchedDuration > 5 && !savedProgress.completed) {
        videoRef.current.currentTime = savedProgress.watchedDuration;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMode, episodeId]);

  // Google Drive IFrame Load Timeout
  useEffect(() => {
    if (playerMode !== 'embed') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    const timer = setTimeout(() => {
      setIsLoading(currentLoading => {
        if (currentLoading) {
          setLoadError('Видео загружается слишком долго. Пожалуйста, откройте его в новой вкладке или попробуйте кастомный плеер.');
        }
        return currentLoading;
      });
    }, 15000);

    return () => clearTimeout(timer);
  }, [episodeId, playerMode]);

  // Save progress automatically (HTML5 player) every 5 seconds
  useEffect(() => {
    if (playerMode !== 'html5' || !isPlaying || !videoRef.current || !episode) return;

    const interval = setInterval(() => {
      if (videoRef.current) {
        const curTime = videoRef.current.currentTime;
        const totalDur = videoRef.current.duration || duration;
        if (totalDur > 0) {
          updateWatchProgress(episode.id, showId, curTime, totalDur);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, playerMode, episodeId]);

  // Autoplay countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (showAutoplayOverlay && nextEpisode) {
      if (autoplayCountdown > 0) {
        timer = setTimeout(() => setAutoplayCountdown(c => c - 1), 1000);
      } else {
        handlePlayNext();
      }
    }
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAutoplayOverlay, autoplayCountdown, nextEpisode]);

  if (!show || !episode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 bg-slate-950 rounded-2xl border border-slate-800 p-8">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4 animate-bounce" />
        <p className="text-base font-semibold">Серия или шоу не найдены.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
          Вернуться назад
        </button>
      </div>
    );
  }

  const embedUrl = getGoogleDriveEmbedUrl(episode.driveUrl) || episode.driveUrl;
  const directStreamUrl = getGoogleDriveDirectStreamUrl(episode.driveUrl) || episode.driveUrl;

  // Custom Controls Functions
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Playback failed', err);
        setHtml5Error('Не удалось запустить видео в кастомном плеере. Пожалуйста, используйте встроенный Google-плеер.');
      });
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    setHtml5Error(null);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTime = parseFloat(e.target.value);
    videoRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    videoRef.current.volume = vol;
    videoRef.current.muted = vol === 0;
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRef.current.muted = nextMute;
  };

  const changeSpeed = (rate: number) => {
    if (!videoRef.current) return;
    setPlaybackRate(rate);
    videoRef.current.playbackRate = rate;
    setShowSpeedControls(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Fullscreen failed', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    updateWatchProgress(episode.id, showId, duration, duration); // Completed
    if (nextEpisode) {
      setAutoplayCountdown(5);
      setShowAutoplayOverlay(true);
    }
  };

  function handlePlayNext() {
    if (nextEpisode) {
      setActiveEpisodeId(nextEpisode.id);
    }
  }

  const markAsWatchedManual = () => {
    updateWatchProgress(episode.id, showId, 100, 100);
  };

  return (
    <div className={`space-y-4 ${lightsOut ? 'relative z-50' : ''}`}>
      {/* Lights out overlay */}
      {lightsOut && (
        <div 
          onClick={() => setLightsOut(false)}
          className="fixed inset-0 bg-black/92 backdrop-blur-sm z-40 transition-all duration-300"
        />
      )}

      {/* Main Player Row */}
      <div className={`relative z-50 flex flex-col ${isTheaterMode ? 'w-full max-w-full' : 'max-w-5xl mx-auto'}`}>
        
        {/* Title bar above player */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-purple-400 font-mono font-medium">
              <span>Серия {episode.number}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 truncate mt-0.5">{episode.title}</h2>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {/* Player Mode Switcher */}
            {isGoogleDriveLink && (
              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs text-slate-400">
                <button
                  onClick={() => setPlayerMode('embed')}
                  className={`px-3 py-1 rounded-md transition-all font-medium ${
                    playerMode === 'embed' 
                      ? 'bg-purple-600 text-white shadow-md' 
                      : 'hover:text-slate-200'
                  }`}
                >
                  Встроенный
                </button>
                <button
                  onClick={() => {
                    setPlayerMode('html5');
                    setHtml5Error(null);
                  }}
                  className={`px-3 py-1 rounded-md transition-all font-medium ${
                    playerMode === 'html5' 
                      ? 'bg-purple-600 text-white shadow-md' 
                      : 'hover:text-slate-200'
                  }`}
                >
                  Кастомный
                </button>
              </div>
            )}

            {/* Lights Switcher */}
            <button
              onClick={() => setLightsOut(!lightsOut)}
              className={`p-2 rounded-lg border transition-all ${
                lightsOut 
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={lightsOut ? 'Включить свет' : 'Выключить свет'}
            >
              <Tv className="w-4 h-4" />
            </button>

            {/* Theater Mode Switcher */}
            <button
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className={`p-2 rounded-lg border transition-all bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hidden md:block ${
                isTheaterMode ? 'text-purple-400 border-purple-900/50 bg-purple-950/10' : ''
              }`}
              title={isTheaterMode ? 'Обычный режим' : 'Широкоформатный режим'}
            >
              <RotateCcw className="w-4 h-4 transform rotate-90" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Screen Container */}
        <div 
          ref={containerRef}
          className="relative mt-4 aspect-[16/9] w-full rounded-2xl bg-black overflow-hidden border border-slate-800/80 shadow-2xl shadow-purple-950/10 flex flex-col justify-center"
        >
          {playerMode === 'embed' ? (
            // EMBED PLAYER (GOOGLE DRIVE IFRAME)
            <iframe 
              src={embedUrl}
              title={episode.title}
              className="w-full h-full border-none"
              allow="autoplay; fullscreen"
              allowFullScreen
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            // CUSTOM HTML5 PLAYER
            <div className="relative w-full h-full group/player flex items-center justify-center">
              {html5Error ? (
                <div className="p-6 text-center max-w-md space-y-4">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
                  <p className="text-sm text-slate-300 font-medium">{html5Error}</p>
                  <button
                    onClick={() => setPlayerMode('embed')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-semibold text-xs shadow-lg shadow-purple-900/30"
                  >
                    Переключить на Встроенный Google-плеер
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={directStreamUrl}
                    className="w-full h-full object-contain"
                    onClick={togglePlay}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleVideoEnded}
                    onWaiting={() => setIsLoading(true)}
                    onCanPlay={() => {
                      setIsLoading(false);
                      setLoadError(null);
                    }}
                    onPlay={() => setIsLoading(false)}
                    onError={(e) => {
                      console.error('HTML5 Video Error:', e);
                      setHtml5Error('Ваш браузер не может воспроизвести этот видеофайл напрямую. Пожалуйста, используйте встроенный плеер.');
                      setIsLoading(false);
                    }}
                  />

                  {/* Autoplay Next Episode Overlay */}
                  {showAutoplayOverlay && nextEpisode && (
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-6 z-20 animate-fade-in">
                      <p className="text-xs text-purple-400 font-mono">СЛЕДУЮЩАЯ СЕРИЯ ЧЕРЕЗ</p>
                      <h3 className="text-5xl font-extrabold text-white font-mono mt-2 animate-pulse">{autoplayCountdown}</h3>
                      <p className="text-sm font-semibold text-slate-300 mt-4 max-w-sm truncate">
                        Серия {nextEpisode.number}: {nextEpisode.title}
                      </p>
                      <div className="flex gap-4 mt-6">
                        <button
                          onClick={() => setShowAutoplayOverlay(false)}
                          className="px-4 py-2 border border-slate-700 text-slate-300 hover:bg-slate-900 rounded-lg text-xs font-semibold"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={handlePlayNext}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <span>Смотреть</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Play/Pause Central Button Indicator */}
                  {!isPlaying && !showAutoplayOverlay && (
                    <div 
                      onClick={togglePlay}
                      className="absolute p-4 bg-purple-600/90 text-white rounded-full cursor-pointer hover:scale-110 hover:bg-purple-500 shadow-xl shadow-purple-950/20 transition-all duration-300 z-10"
                    >
                      <Play className="w-8 h-8 fill-current ml-0.5" />
                    </div>
                  )}

                  {/* Custom Controls Bar */}
                  <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-black via-black/80 to-transparent opacity-0 group-hover/player:opacity-100 focus-within:opacity-100 transition-opacity duration-300 flex flex-col justify-end px-4 pb-3 z-10 space-y-2 select-none">
                    
                    {/* Time Progress Bar */}
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-300">{formatTime(currentTime)}</span>
                      <input 
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600 hover:h-1.5 transition-all"
                      />
                      <span className="text-[10px] font-mono text-slate-300">{formatTime(duration)}</span>
                    </div>

                    {/* Button Bar */}
                    <div className="flex items-center justify-between text-slate-300">
                      <div className="flex items-center gap-4">
                        {/* Play/Pause */}
                        <button onClick={togglePlay} className="hover:text-purple-400 transition-colors">
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                        </button>

                        {/* Next Episode Button */}
                        {nextEpisode && (
                          <button 
                            onClick={handlePlayNext} 
                            className="hover:text-purple-400 transition-colors flex items-center gap-0.5"
                            title="Следующая серия"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}

                        {/* Volume controls */}
                        <div className="flex items-center gap-1.5 group/volume">
                          <button onClick={toggleMute} className="hover:text-purple-400 transition-colors">
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                          <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-300 group-hover/volume:w-20 transition-all duration-350"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Playback speed selector */}
                        <div className="relative">
                          <button 
                            onClick={() => setShowSpeedControls(!showSpeedControls)}
                            className="hover:text-purple-400 transition-colors text-xs font-mono font-bold flex items-center gap-0.5 border border-slate-700/60 rounded px-1.5 py-0.5"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span>{playbackRate}x</span>
                          </button>

                          {showSpeedControls && (
                            <div className="absolute bottom-8 right-0 bg-slate-900 border border-slate-800 rounded-lg py-1 shadow-2xl text-xs min-w-[70px] z-30">
                              {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                                <button
                                  key={rate}
                                  onClick={() => changeSpeed(rate)}
                                  className={`w-full text-left px-3 py-1.5 hover:bg-purple-600 hover:text-white transition-colors ${
                                    playbackRate === rate ? 'text-purple-400 font-semibold' : 'text-slate-300'
                                  }`}
                                >
                                  {rate}x
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Fullscreen */}
                        <button onClick={toggleFullscreen} className="hover:text-purple-400 transition-colors">
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                </>
              )}
            </div>
          )}

          {/* Loading and Loading Error Overlays */}
          {isLoading && !html5Error && !loadError && (
            <div 
              className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-30"
              aria-live="polite"
            >
              <div className="w-10 h-10 border-4 border-purple-500/25 border-t-purple-500 rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold text-slate-300">Загрузка видео...</p>
            </div>
          )}

          {loadError && !html5Error && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-6 z-35 animate-scale-in space-y-4">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" aria-hidden="true" />
              <p className="text-sm text-slate-300 font-medium max-w-sm">{loadError}</p>
              <div className="flex gap-3">
                {playerMode === 'embed' && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerMode('html5');
                      setLoadError(null);
                      setIsLoading(true);
                    }}
                    className="px-4 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Попробовать Кастомный
                  </button>
                )}
                <a
                  href={episode.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-lg shadow-purple-900/35"
                >
                  Открыть в новой вкладке
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Watch Status Overlay under player */}
        <div className="mt-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-950/40">
              <Eye className="w-4.5 h-4.5" />
            </span>
            <div>
              <p className="text-xs text-slate-400">Статус серии</p>
              <p className="text-xs font-semibold text-slate-200">
                {watchProgress[episode.id]?.completed 
                  ? 'Просмотрено полностью' 
                  : watchProgress[episode.id]?.watchedDuration 
                    ? `Просмотрено до ${formatTime(watchProgress[episode.id]?.watchedDuration)}`
                    : 'Не начато'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={markAsWatchedManual}
              className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-300 hover:text-white transition-colors rounded-lg text-xs font-semibold"
            >
              Отметить просмотренной
            </button>
            
            {nextEpisode && (
              <button
                onClick={handlePlayNext}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-purple-950/20 transition-all"
              >
                <span>Следующая серия</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Google Drive Sharing Helper Details */}
        <div className="mt-3 p-3.5 bg-slate-950/40 border border-slate-900/60 rounded-xl text-[10px] text-slate-400 leading-relaxed space-y-1">
          <p className="font-semibold text-purple-400">❓ Видео выдает ошибку или не загружается?</p>
          <p>
            Чтобы ваши друзья могли свободно смотреть видео, хранящееся на вашем Google Диске, файл должен быть открыт для общего доступа. 
            Пожалуйста, в вашем Google Диске нажмите правой кнопкой мыши на этот видеофайл &rarr; <strong>Поделиться</strong> &rarr; измените доступ с «Ограниченный» на <strong>«Все, у кого есть ссылка»</strong> (роль: <strong>Читатель</strong>).
          </p>
        </div>

        {/* Behind the scenes stills / Gallery */}
        {episode.stills && episode.stills.length > 0 && (
          <div className="mt-5 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Camera className="w-4 h-4 text-purple-400" />
              <span>Кадры со съемок ({episode.stills.length})</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {episode.stills.map((still, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedStill(still)}
                  className="aspect-[16/9] rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 hover:border-purple-500/40 hover:scale-[1.02] transition-all cursor-pointer group shadow-md"
                >
                  <img 
                    src={still} 
                    alt={`Кадр ${idx + 1}`} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Full screen Still Modal */}
      {selectedStill && (
        <div 
          onClick={() => setSelectedStill(null)}
          className="modal-overlay-enter fixed inset-0 z-[60] flex items-center justify-center bg-black/92 backdrop-blur-xs cursor-pointer"
        >
          <div className="modal-content-enter relative max-w-5xl max-h-[85vh] w-[90%] h-[90%] flex items-center justify-center">
            <button 
              onClick={() => setSelectedStill(null)}
              className="absolute -top-10 right-0 p-2 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Закрыть</span>
            </button>
            <img 
              src={selectedStill} 
              alt="Кадр в полный экран" 
              className="max-w-full max-h-full object-contain rounded-xl border border-slate-800/60 shadow-2xl cursor-default"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </div>
  );
};
