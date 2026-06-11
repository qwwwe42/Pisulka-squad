import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { StreamingProvider, useStreaming } from './context/StreamingContext';
import { Dashboard } from './components/Dashboard';
import { ShowDetails } from './components/ShowDetails';
import { VideoPlayer } from './components/VideoPlayer';
import { AdminPanel } from './components/AdminPanel';
import { MinecraftView } from './components/MinecraftView';
import { MinecraftModsView } from './components/MinecraftModsView';
import { MinecraftRain } from './components/MinecraftRain';
import { GalleryView } from './components/GalleryView';
import { CoWatchRoom } from './components/CoWatchRoom';
import { NewsView } from './components/NewsView';
import { BunkerGame } from './components/bunker/BunkerGame';
import { Breadcrumbs } from './components/Breadcrumbs';
import { Settings, Home, Menu, X, Tv, Gamepad2, Image, Sun, Moon, Users, Newspaper, ChevronDown } from 'lucide-react';

// Helper: derive the "tab" key from the current pathname for background config lookup
function getActiveTab(pathname: string): string {
  if (pathname.startsWith('/shows')) return 'shows';
  if (pathname.startsWith('/news')) return 'news';
  if (pathname.startsWith('/cowatch')) return 'cowatch';
  if (pathname.startsWith('/gallery')) return 'gallery';
  if (pathname.startsWith('/minecraft')) return 'minecraft';
  if (pathname.startsWith('/bunker')) return 'bunker';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'home';
}

// Helper: derive minecraft sub-tab from pathname
function getMinecraftSubTab(pathname: string): 'main' | 'mods' {
  return pathname === '/minecraft/mods' ? 'mods' : 'main';
}

// Helper: full Russian page label for mobile badge
function getPageLabel(pathname: string): string {
  if (pathname === '/') return 'Главная';
  if (pathname.startsWith('/shows')) return 'Сериалы';
  if (pathname.startsWith('/news')) return 'Новости';
  if (pathname.startsWith('/cowatch')) return 'Совместный просмотр';
  if (pathname.startsWith('/gallery')) return 'Галерея';
  if (pathname === '/minecraft/mods') return 'Minecraft: Моды';
  if (pathname.startsWith('/minecraft')) return 'Minecraft';
  if (pathname.startsWith('/bunker')) return 'Бункер';
  if (pathname.startsWith('/admin')) return 'Админ';
  return 'Главная';
}

function AppContent() {
  const {
    activeShowId,
    setActiveShowId,
    setActiveEpisodeId,
    setActiveNewsId,
    backgroundsConfig
  } = useStreaming();

  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const activeTab = getActiveTab(pathname);
  const minecraftSubTab = getMinecraftSubTab(pathname);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGamesMenuOpen, setIsGamesMenuOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('penis_ink_admin') === 'true';
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('penis_ink_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });

  // Scroll restoration
  const scrollPositions = useRef<Record<string, number>>({});
  const mainRef = useRef<HTMLElement>(null);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      // Save scroll position of the previous page
      if (mainRef.current) {
        scrollPositions.current[prevPathname.current] = mainRef.current.scrollTop;
      }
      prevPathname.current = pathname;

      // Restore scroll position of the new page (delayed to let render complete)
      requestAnimationFrame(() => {
        if (mainRef.current) {
          const saved = scrollPositions.current[pathname];
          mainRef.current.scrollTop = saved ?? 0;
        }
      });
    }
  }, [pathname]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('theme-pink');
    } else {
      document.documentElement.classList.remove('theme-pink');
    }
    localStorage.setItem('penis_ink_theme', theme);
  }, [theme]);

  // Auto-open games accordion when on games routes
  useEffect(() => {
    if (['minecraft', 'bunker'].includes(activeTab)) {
      setIsGamesMenuOpen(true);
    }
  }, [activeTab]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleSelectShow = useCallback((showId: string) => {
    setActiveShowId(showId);
    setActiveEpisodeId(null);
    navigate(`/shows/${showId}`);
  }, [navigate, setActiveShowId, setActiveEpisodeId]);

  const handleSelectEpisode = useCallback((showId: string, episodeId: string) => {
    setActiveShowId(showId);
    setActiveEpisodeId(episodeId);
    navigate(`/shows/${showId}/ep/${episodeId}`);
  }, [navigate, setActiveShowId, setActiveEpisodeId]);

  const handleClosePlayer = useCallback(() => {
    const showId = activeShowId;
    setActiveEpisodeId(null);
    if (showId) {
      navigate(`/shows/${showId}`);
    } else {
      navigate('/shows');
    }
  }, [navigate, activeShowId, setActiveEpisodeId]);

  const handleBackToCatalog = useCallback(() => {
    setActiveShowId(null);
    setActiveEpisodeId(null);
  }, [setActiveShowId, setActiveEpisodeId]);

  const handleNavClick = useCallback((path: string) => {
    handleBackToCatalog();
    navigate(path);
  }, [navigate, handleBackToCatalog]);

  // Focus trap for password modal
  const passwordModalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showPasswordModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPasswordModal(false);
        setPasswordInput('');
        setPasswordError(false);
        return;
      }

      if (e.key === 'Tab' && passwordModalRef.current) {
        const focusable = passwordModalRef.current.querySelectorAll<HTMLElement>(
          'input, button, [tabindex]:not([tabindex="-1"])'
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
  }, [showPasswordModal]);

  // Sync activeShowId/activeEpisodeId from URL params
  // This is handled by the route components themselves reading useParams

  return (
    <div className={`min-h-screen flex flex-col ${((backgroundsConfig[activeTab]?.imageUrl || backgroundsConfig[activeTab]?.videoUrl) && theme === 'dark') ? 'bg-transparent' : 'bg-bg-app'} text-text-primary font-sans selection:bg-accent-color/20 antialiased w-full transition-colors duration-200 relative z-0`}>

      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10000] focus:px-4 focus:py-2 focus:bg-accent-color focus:text-white focus:rounded-xl focus:text-sm focus:font-bold focus:shadow-lg"
      >
        Перейти к контенту
      </a>

      {activeTab === 'minecraft' && minecraftSubTab === 'mods' && (
        <MinecraftRain intensity="normal" />
      )}

      {/* Ambient background decoration blobs (for a living, dynamic feel) */}
      <div className="fixed inset-0 pointer-events-none z-[-3] overflow-hidden">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
        <div className="ambient-blob ambient-blob-3" />
      </div>

      {/* BACKGROUND MEDIA LAYER */}
      {((backgroundsConfig[activeTab]?.imageUrl || backgroundsConfig[activeTab]?.videoUrl) && theme === 'dark') && (
        <div className="tab-background">
          {backgroundsConfig[activeTab]?.videoUrl ? (
            <video
              className="fixed inset-0 z-[-2] w-full h-full object-cover transition-all duration-500"
              src={backgroundsConfig[activeTab].videoUrl}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <div 
              className="fixed inset-0 z-[-2] bg-cover bg-center bg-no-repeat transition-all duration-500"
              style={{ 
                backgroundImage: `url("${backgroundsConfig[activeTab].imageUrl}")`,
                backgroundAttachment: window.innerWidth > 768 ? 'fixed' : 'scroll'
              }}
            />
          )}
          <div 
            className="fixed inset-0 z-[-1] transition-all duration-500 pointer-events-none"
            style={{ backgroundColor: `rgba(0,0,0, ${(backgroundsConfig[activeTab]?.overlayOpacity ?? 50) / 100})` }}
          />
        </div>
      )}

      {/* Flex row container that wraps sidebar and main content area */}
      <div className="flex-1 flex flex-row min-w-0 w-full relative">
        {/* Backdrop for Mobile Sidebar */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* LEFT SIDEBAR NAVIGATION */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 md:my-4 md:ml-4 md:rounded-2xl border border-border-sidebar bg-bg-sidebar backdrop-blur-[12px] shadow-sidebar p-4 flex flex-col gap-6 shrink-0 transition-all duration-300 md:translate-x-0 md:sticky md:top-4 md:h-[calc(100vh-2rem)] ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ 
            zIndex: 9999,
            ...(activeTab === 'minecraft' && minecraftSubTab === 'mods' 
              ? { backgroundColor: theme === 'dark' ? '#141416' : '#FFEBF2' } 
              : {})
          }}
        >
          {/* Sidebar Close button on mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 md:hidden p-1.5 rounded-lg bg-bg-app border border-border-color text-text-secondary hover:text-text-primary transition-all cursor-pointer"
            aria-label="Закрыть меню"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Brand Logo */}
          <div
            className="flex items-center justify-center group cursor-pointer select-none w-full h-16 md:h-20 overflow-hidden"
            onClick={() => handleNavClick('/')}
            role="button"
            tabIndex={0}
            aria-label="Varicose Squad — на главную"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNavClick('/'); } }}
          >
            <img src="/logo.png" alt="Varicose Squad" className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02] theme-logo" />
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 flex flex-col gap-1.5" aria-label="Основная навигация">
            {/* Главная */}
            <button
              onClick={() => handleNavClick('/')}
              aria-current={activeTab === 'home' ? 'page' : undefined}
              className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-left cursor-pointer nav-btn-dynamic ${activeTab === 'home'
                  ? 'bg-accent-light text-accent-color border border-accent-color/10 shadow-soft active-nav-btn'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-app border border-transparent'
                }`}
            >
              <Home className="w-5 h-5" aria-hidden="true" />
              <span>Главная</span>
            </button>

            {/* Сериалы */}
            <button
              onClick={() => handleNavClick('/shows')}
              aria-current={activeTab === 'shows' ? 'page' : undefined}
              className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-left cursor-pointer nav-btn-dynamic ${activeTab === 'shows'
                  ? 'bg-accent-light text-accent-color border border-accent-color/10 shadow-soft active-nav-btn'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-app border border-transparent'
                }`}
            >
              <Tv className="w-5 h-5" aria-hidden="true" />
              <span>Сериалы</span>
            </button>

            {/* Новости */}
            <button
              onClick={() => handleNavClick('/news')}
              aria-current={activeTab === 'news' ? 'page' : undefined}
              className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-left cursor-pointer nav-btn-dynamic ${activeTab === 'news'
                  ? 'bg-accent-light text-accent-color border border-accent-color/10 shadow-soft active-nav-btn'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-app border border-transparent'
                }`}
            >
              <Newspaper className="w-5 h-5" aria-hidden="true" />
              <span>Новости</span>
            </button>

            {/* Совместный просмотр — TOP-LEVEL (#8) */}
            <button
              onClick={() => handleNavClick('/cowatch')}
              aria-current={activeTab === 'cowatch' ? 'page' : undefined}
              className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-left cursor-pointer nav-btn-dynamic ${activeTab === 'cowatch'
                  ? 'bg-accent-light text-accent-color border border-accent-color/10 shadow-soft active-nav-btn'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-app border border-transparent'
                }`}
            >
              <Users className="w-5 h-5" aria-hidden="true" />
              <span>Совместный просмотр</span>
            </button>

            {/* Игры (Аккордеон) — without Co-watch (#8) */}
            <div className="flex flex-col">
              <button
                onClick={() => setIsGamesMenuOpen(!isGamesMenuOpen)}
                aria-expanded={isGamesMenuOpen || ['minecraft', 'bunker'].includes(activeTab)}
                className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-between transition-all text-left cursor-pointer btn-dynamic ${
                  ['minecraft', 'bunker'].includes(activeTab) || isGamesMenuOpen
                    ? 'bg-accent-light text-accent-color border border-accent-color/10 shadow-soft'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-app border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Gamepad2 className="w-5 h-5" aria-hidden="true" />
                  <span>Игры</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isGamesMenuOpen || ['minecraft', 'bunker'].includes(activeTab) ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              
              {/* Подменю Игры */}
              <div 
                className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ease-in-out pl-4 pr-2 ${
                  isGamesMenuOpen || ['minecraft', 'bunker'].includes(activeTab) ? 'max-h-[300px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
                }`}
              >
                {/* Бункер */}
                <button
                  onClick={() => handleNavClick('/bunker')}
                  aria-current={activeTab === 'bunker' ? 'page' : undefined}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer flex items-center gap-2 nav-btn-dynamic min-h-[44px] ${
                    activeTab === 'bunker'
                      ? 'bg-accent-color/10 text-accent-color active-nav-btn'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-app'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" aria-hidden="true"></span>
                  Бункер
                </button>

                {/* Minecraft */}
                <div className="flex flex-col">
                  <button
                    onClick={() => handleNavClick('/minecraft')}
                    aria-current={activeTab === 'minecraft' && minecraftSubTab === 'main' ? 'page' : undefined}
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer flex items-center gap-2 nav-btn-dynamic min-h-[44px] ${
                      activeTab === 'minecraft' && minecraftSubTab === 'main'
                        ? 'bg-accent-color/10 text-accent-color active-nav-btn'
                        : activeTab === 'minecraft'
                        ? 'text-text-primary bg-bg-app/50 active-nav-btn'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-app'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" aria-hidden="true"></span>
                    Minecraft
                  </button>
                  
                  {/* Minecraft Sub-tabs (Main / Mods) */}
                  <div className={`flex flex-col gap-0.5 overflow-hidden transition-all duration-300 ease-in-out pl-6 ${
                    activeTab === 'minecraft' ? 'max-h-20 opacity-100 mt-1' : 'max-h-0 opacity-0 mt-0'
                  }`}>
                    <button
                      onClick={() => navigate('/minecraft')}
                      aria-current={activeTab === 'minecraft' && minecraftSubTab === 'main' ? 'page' : undefined}
                      className={`w-full px-4 py-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer uppercase tracking-wider min-h-[44px] ${
                        minecraftSubTab === 'main' && activeTab === 'minecraft'
                          ? 'text-accent-color bg-accent-light/50'
                          : 'text-text-muted hover:text-text-primary hover:bg-bg-app'
                      }`}
                    >
                      Главная
                    </button>
                    <button
                      onClick={() => navigate('/minecraft/mods')}
                      aria-current={activeTab === 'minecraft' && minecraftSubTab === 'mods' ? 'page' : undefined}
                      className={`w-full px-4 py-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer uppercase tracking-wider min-h-[44px] ${
                        minecraftSubTab === 'mods' && activeTab === 'minecraft'
                          ? 'text-accent-color bg-accent-light/50'
                          : 'text-text-muted hover:text-text-primary hover:bg-bg-app'
                      }`}
                    >
                      Моды
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Галерея */}
            <button
              onClick={() => handleNavClick('/gallery')}
              aria-current={activeTab === 'gallery' ? 'page' : undefined}
              className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-left cursor-pointer nav-btn-dynamic ${activeTab === 'gallery'
                  ? 'bg-accent-light text-accent-color border border-accent-color/10 shadow-soft active-nav-btn'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-app border border-transparent'
                }`}
            >
              <Image className="w-5 h-5" aria-hidden="true" />
              <span>Галерея</span>
            </button>
          </nav>

          {/* Bottom Panel (Admin, Status & Theme) */}
          <div className="border-t border-border-color pt-4 space-y-3">
            {/* Admin Panel button */}
            <button
              onClick={() => {
                if (isAdminAuthenticated) {
                  handleNavClick('/admin');
                } else {
                  setShowPasswordModal(true);
                }
              }}
              aria-current={activeTab === 'admin' ? 'page' : undefined}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left cursor-pointer nav-btn-dynamic ${activeTab === 'admin'
                  ? 'bg-accent-light text-accent-color border border-accent-color/10 shadow-soft active-nav-btn'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-app border border-transparent'
                }`}
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
              <span>Панель админа</span>
            </button>

            {/* Theme Switcher Segmented Control */}
            <div className="flex bg-bg-app border border-border-color p-0.5 rounded-xl text-xs font-bold text-text-secondary select-none" role="radiogroup" aria-label="Выбор темы">
              <button
                onClick={() => setTheme('light')}
                role="radio"
                aria-checked={theme === 'light'}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  theme === 'light' 
                    ? 'bg-accent-color text-white shadow-soft font-extrabold' 
                    : 'hover:text-text-primary'
                }`}
              >
                <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Розовая</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                role="radio"
                aria-checked={theme === 'dark'}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-accent-color text-white shadow-soft font-extrabold' 
                    : 'hover:text-text-primary'
                }`}
              >
                <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Тёмная</span>
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${activeTab === 'minecraft' && !backgroundsConfig['minecraft']?.imageUrl ? 'minecraft-bg-theme' : ''} relative z-10`}>

          {/* MOBILE HEADER */}
          <header className="md:hidden sticky top-0 z-30 h-16 bg-bg-card/90 backdrop-blur-md border-b border-border-color px-6 flex items-center justify-between shrink-0 transition-colors duration-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-1.5 rounded-lg bg-bg-app border border-border-color text-text-secondary hover:text-text-primary cursor-pointer"
                aria-label="Открыть меню навигации"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </button>
              <div 
                className="flex items-center h-12 cursor-pointer select-none"
                onClick={() => handleNavClick('/')}
                role="button"
                tabIndex={0}
                aria-label="На главную"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNavClick('/'); } }}
              >
                <img src="/logo.png" alt="Varicose Squad" className="h-full w-auto object-contain theme-logo" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Show simple category/indicator */}
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent-color bg-accent-light border border-accent-color/20 px-2.5 py-1 rounded-lg font-sans">
                {getPageLabel(pathname)}
              </span>
            </div>
          </header>

          {/* Breadcrumbs */}
          <Breadcrumbs />

          {/* Viewport content */}
          <main 
            ref={mainRef}
            id="main-content"
            className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-10 py-6 overflow-y-auto"
          >
            <div className="page-enter">
              <Routes>
                {/* Home */}
                <Route path="/" element={
                  <Dashboard
                    onSelectShow={handleSelectShow}
                    onSelectEpisode={handleSelectEpisode}
                    onSelectNews={(newsId) => {
                      setActiveNewsId(newsId);
                      navigate(`/news/${newsId}`);
                    }}
                    onNavigateToShows={() => navigate('/shows')}
                    mode="home"
                  />
                } />

                {/* Shows Catalog */}
                <Route path="/shows" element={
                  <Dashboard
                    onSelectShow={handleSelectShow}
                    onSelectEpisode={handleSelectEpisode}
                    mode="catalog"
                  />
                } />

                {/* Show Details */}
                <Route path="/shows/:showId" element={
                  <ShowDetailsRoute
                    onBack={() => navigate('/shows')}
                    onSelectEpisode={handleSelectEpisode}
                  />
                } />

                {/* Video Player + Show Details */}
                <Route path="/shows/:showId/ep/:episodeId" element={
                  <VideoPlayerRoute
                    onClosePlayer={handleClosePlayer}
                    onSelectEpisode={handleSelectEpisode}
                    onBack={() => navigate('/shows')}
                  />
                } />

                {/* News */}
                <Route path="/news" element={<NewsView />} />
                <Route path="/news/:newsId" element={<NewsRoute />} />

                {/* Co-Watch */}
                <Route path="/cowatch" element={<CoWatchRoom isInline={true} />} />
                <Route path="/cowatch/:roomId" element={<CoWatchRoomRoute />} />

                {/* Gallery */}
                <Route path="/gallery" element={<GalleryView />} />

                {/* Minecraft */}
                <Route path="/minecraft" element={<MinecraftView />} />
                <Route path="/minecraft/mods" element={<MinecraftModsView />} />

                {/* Bunker */}
                <Route path="/bunker" element={<BunkerGame />} />

                {/* Admin */}
                <Route path="/admin" element={<AdminPanel />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-12 border-t border-border-color px-6 md:px-10 flex items-center justify-between text-xs text-text-muted shrink-0 font-sans mt-auto transition-colors duration-200">
        <span>&copy; {new Date().getFullYear()} Varicose Squad. Все права сохранены.</span>
        <span className="font-mono text-accent-color/85">v1.1.0 (Google Drive Streamer)</span>
      </footer>

      {/* 4. Password Protection Modal */}
      {showPasswordModal && (
        <div
          className="modal-overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-password-title"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowPasswordModal(false); setPasswordInput(''); setPasswordError(false); } }}
        >
          <div
            ref={passwordModalRef}
            className={`modal-content-enter w-80 bg-bg-card border border-border-color rounded-3xl p-6 shadow-soft space-y-4 text-center ${passwordError ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
          >

            <div className="w-12 h-12 rounded-full bg-accent-light border border-accent-color/30 text-accent-color flex items-center justify-center mx-auto">
              <Settings className="w-6 h-6" aria-hidden="true" />
            </div>

            <div className="space-y-1">
              <h4 id="admin-password-title" className="text-sm font-bold text-text-primary uppercase tracking-wider">Панель администратора</h4>
              <p className="text-[11px] text-text-secondary">Введите пароль для доступа к настройкам.</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (passwordInput === '676767') {
                  setIsAdminAuthenticated(true);
                  sessionStorage.setItem('penis_ink_admin', 'true');
                  setShowPasswordModal(false);
                  setPasswordInput('');
                  setPasswordError(false);
                  handleNavClick('/admin');
                } else {
                  setPasswordError(true);
                  // Reset error shake after animation completes
                  setTimeout(() => setPasswordError(false), 400);
                }
              }}
              className="space-y-3"
            >
              <input
                type="password"
                placeholder="••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full text-center ide-input bg-bg-app border border-border-color rounded-xl tracking-[6px] text-sm font-bold font-mono text-text-primary"
                autoFocus
                required
                aria-label="Пароль администратора"
              />

              {passwordError && (
                <p className="text-xs text-rose-500 font-semibold transition-all">Неверный пароль!</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                    setPasswordError(false);
                  }}
                  className="flex-1 py-2 rounded-xl border border-border-color hover:bg-bg-app text-text-secondary hover:text-text-primary text-xs font-semibold transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-accent-color hover:bg-accent-hover text-white rounded-xl text-xs font-semibold shadow-soft transition-all cursor-pointer"
                >
                  Войти
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}

// Route wrapper for ShowDetails — reads showId from URL params
function ShowDetailsRoute({ onBack, onSelectEpisode }: { onBack: () => void; onSelectEpisode: (showId: string, episodeId: string) => void }) {
  const { showId } = useRouteParams();
  const { setActiveShowId, setActiveEpisodeId } = useStreaming();

  useEffect(() => {
    if (showId) {
      setActiveShowId(showId);
      setActiveEpisodeId(null);
    }
  }, [showId, setActiveShowId, setActiveEpisodeId]);

  if (!showId) return <Navigate to="/shows" replace />;

  return (
    <ShowDetails
      showId={showId}
      onBack={onBack}
      onSelectEpisode={(epId) => onSelectEpisode(showId, epId)}
    />
  );
}

// Route wrapper for VideoPlayer + ShowDetails
function VideoPlayerRoute({ onClosePlayer, onSelectEpisode, onBack }: { onClosePlayer: () => void; onSelectEpisode: (showId: string, episodeId: string) => void; onBack: () => void }) {
  const { showId, episodeId } = useRouteParams();
  const { setActiveShowId, setActiveEpisodeId } = useStreaming();

  useEffect(() => {
    if (showId && episodeId) {
      setActiveShowId(showId);
      setActiveEpisodeId(episodeId);
    }
  }, [showId, episodeId, setActiveShowId, setActiveEpisodeId]);

  if (!showId || !episodeId) return <Navigate to="/shows" replace />;

  return (
    <div className="space-y-6">
      <VideoPlayer
        showId={showId}
        episodeId={episodeId}
        onClose={onClosePlayer}
      />
      <ShowDetails
        showId={showId}
        onBack={onBack}
        onSelectEpisode={(epId) => onSelectEpisode(showId, epId)}
        isEpisodeActive={true}
      />
    </div>
  );
}

// Route wrapper for News with newsId
function NewsRoute() {
  const { newsId } = useRouteParams();
  const { setActiveNewsId } = useStreaming();

  useEffect(() => {
    if (newsId) {
      setActiveNewsId(newsId);
    }
  }, [newsId, setActiveNewsId]);

  return <NewsView />;
}

// Route wrapper for CoWatch with roomId
function CoWatchRoomRoute() {
  const { roomId } = useRouteParams();
  return <CoWatchRoom isInline={true} initialRoomCode={roomId || undefined} />;
}

// Helper to extract route params
function useRouteParams() {
  const params = useParams<{ showId?: string; episodeId?: string; newsId?: string; roomId?: string }>();
  return {
    showId: params.showId,
    episodeId: params.episodeId,
    newsId: params.newsId,
    roomId: params.roomId,
  };
}

export default function App() {
  return (
    <StreamingProvider>
      <AppContent />
    </StreamingProvider>
  );
}
