import { useState, useEffect } from 'react';
import { StreamingProvider, useStreaming } from './context/StreamingContext';
import { Dashboard } from './components/Dashboard';
import { ShowDetails } from './components/ShowDetails';
import { VideoPlayer } from './components/VideoPlayer';
import { AdminPanel } from './components/AdminPanel';
import { MinecraftView } from './components/MinecraftView';
import { GalleryView } from './components/GalleryView';
import { CoWatchRoom } from './components/CoWatchRoom';
import { NewsView } from './components/NewsView';
import { Settings, Home, Menu, X, Tv, Gamepad2, Image, Sun, Moon, Users, Newspaper } from 'lucide-react';

function AppContent() {
  const {
    activeShowId,
    activeEpisodeId,
    setActiveShowId,
    setActiveEpisodeId,
    setActiveNewsId
  } = useStreaming();

  const [activeTab, setActiveTab] = useState<'home' | 'shows' | 'news' | 'cowatch' | 'gallery' | 'minecraft' | 'admin'>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('penis_ink_theme', theme);
  }, [theme]);

  const handleSelectShow = (showId: string) => {
    setActiveShowId(showId);
    setActiveEpisodeId(null);
  };

  const handleSelectEpisode = (showId: string, episodeId: string) => {
    setActiveShowId(showId);
    setActiveEpisodeId(episodeId);
  };

  const handleClosePlayer = () => {
    setActiveEpisodeId(null);
  };

  const handleBackToCatalog = () => {
    setActiveShowId(null);
    setActiveEpisodeId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-app text-text-primary font-sans selection:bg-accent-color/20 antialiased w-full transition-colors duration-200">

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
          className={`fixed inset-y-0 left-0 z-50 w-64 md:my-4 md:ml-4 md:rounded-3xl border border-border-color bg-bg-card p-6 flex flex-col gap-8 shrink-0 transition-all duration-300 md:translate-x-0 md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:shadow-soft ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          {/* Sidebar Close button on mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 md:hidden p-1.5 rounded-lg bg-bg-app border border-border-color text-text-secondary hover:text-text-primary transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Brand Logo */}
          <div
            className="flex items-center justify-center group cursor-pointer select-none w-full max-w-[500px] h-[200px] overflow-hidden"
            onClick={() => {
              setActiveTab('home');
              handleBackToCatalog();
              setIsMobileMenuOpen(false);
            }}
          >
            <img src="/logo.png" alt="Varicose Squad Logo" className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02] theme-logo" />
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 flex flex-col gap-1.5">
            {/* Главная */}
            <button
              onClick={() => {
                setActiveTab('home');
                handleBackToCatalog();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-left cursor-pointer ${activeTab === 'home' && !activeShowId
                  ? 'bg-accent-light text-accent-color border border-accent-color/10 shadow-soft'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-app border border-transparent'
                }`}
            >
              <Home className="w-5 h-5" />
              <span>Главная</span>
            </button>

            {/* Сериалы */}
            <button
              onClick={() => {
                setActiveTab('shows');
                handleBackToCatalog();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-left cursor-pointer ${activeTab === 'shows' || activeShowId
                  ? 'bg-accent-light text-accent-color border border-accent-color/10 shadow-soft'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-app border border-transparent'
                }`}
            >
              <Tv className="w-5 h-5" />
              <span>Сериалы</span>
            </button>

            {/* Совместный просмотр */}
            <button
              onClick={() => {
                setActiveTab('cowatch');
                handleBackToCatalog();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-left cursor-pointer ${activeTab === 'cowatch'
                  ? 'bg-accent-light text-accent-color border border-accent-color/10 shadow-soft'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-app border border-transparent'
                }`}
            >
              <Users className="w-5 h-5" />
              <span>Совместный просмотр</span>
            </button>

            {/* Новости */}
            <button
              onClick={() => {
                setActiveTab('news');
                handleBackToCatalog();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-left cursor-pointer ${activeTab === 'news'
                  ? 'bg-accent-light text-accent-color border border-accent-color/10 shadow-soft'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-app border border-transparent'
                }`}
            >
              <Newspaper className="w-5 h-5" />
              <span>Новости</span>
            </button>

            {/* Майнкрафт */}
            <button
              onClick={() => {
                setActiveTab('minecraft');
                handleBackToCatalog();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-left cursor-pointer ${activeTab === 'minecraft'
                  ? 'bg-accent-light text-accent-color border border-accent-color/10 shadow-soft'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-app border border-transparent'
                }`}
            >
              <Gamepad2 className="w-5 h-5" />
              <span>Майнкрафт</span>
            </button>

            {/* Галерея */}
            <button
              onClick={() => {
                setActiveTab('gallery');
                handleBackToCatalog();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all text-left cursor-pointer ${activeTab === 'gallery'
                  ? 'bg-accent-light text-accent-color border border-accent-color/10 shadow-soft'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-app border border-transparent'
                }`}
            >
              <Image className="w-5 h-5" />
              <span>Галерея</span>
            </button>
          </nav>

          {/* Bottom Panel (Admin, Status & Theme) */}
          <div className="border-t border-border-color pt-4 space-y-3">
            {/* Admin Panel button */}
            <button
              onClick={() => {
                if (isAdminAuthenticated) {
                  setActiveTab('admin');
                  handleBackToCatalog();
                  setIsMobileMenuOpen(false);
                } else {
                  setShowPasswordModal(true);
                }
              }}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left cursor-pointer ${activeTab === 'admin'
                  ? 'bg-accent-light text-accent-color border border-accent-color/10 shadow-soft'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-app border border-transparent'
                }`}
            >
              <Settings className="w-4 h-4" />
              <span>Панель админа</span>
            </button>

            {/* Theme Switcher Segmented Control */}
            <div className="flex bg-bg-app border border-border-color p-0.5 rounded-xl text-[10px] font-bold text-text-secondary select-none">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  theme === 'light' 
                    ? 'bg-accent-color text-white shadow-soft font-extrabold' 
                    : 'hover:text-text-primary'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Светлая</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-accent-color text-white shadow-soft font-extrabold' 
                    : 'hover:text-text-primary'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Тёмная</span>
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* MOBILE HEADER */}
          <header className="md:hidden sticky top-0 z-30 h-16 bg-bg-card/90 backdrop-blur-md border-b border-border-color px-6 flex items-center justify-between shrink-0 transition-colors duration-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-1.5 rounded-lg bg-bg-app border border-border-color text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div 
                className="flex items-center h-12 cursor-pointer select-none"
                onClick={() => {
                  setActiveTab('home');
                  handleBackToCatalog();
                }}
              >
                <img src="/logo.png" alt="Varicose Squad Logo" className="h-full w-auto object-contain theme-logo" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Show simple category/indicator */}
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-color bg-accent-light border border-accent-color/20 px-2.5 py-0.5 rounded-lg font-sans">
                {activeTab === 'home' ? 'Главная' : activeTab === 'shows' ? 'Сериалы' : activeTab === 'news' ? 'Новости' : activeTab === 'cowatch' ? 'Совместный просмотр' : activeTab === 'gallery' ? 'Галерея' : activeTab === 'minecraft' ? 'Майнкрафт' : 'Админ'}
              </span>
            </div>
          </header>

          {/* Viewport content */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-10 py-6 overflow-y-auto">
            {activeTab === 'admin' ? (
              // Render Admin Panel
              <AdminPanel />
            ) : activeEpisodeId && activeShowId ? (
              // Render Video Player (with back-breadcrumb details view)
              <div className="space-y-6">
                <VideoPlayer
                  showId={activeShowId}
                  episodeId={activeEpisodeId}
                  onClose={handleClosePlayer}
                />
                <ShowDetails
                  showId={activeShowId}
                  onBack={handleBackToCatalog}
                  onSelectEpisode={(epId) => handleSelectEpisode(activeShowId, epId)}
                  isEpisodeActive={true}
                />
              </div>
            ) : activeShowId ? (
              // Render Show Details
              <ShowDetails
                showId={activeShowId}
                onBack={handleBackToCatalog}
                onSelectEpisode={(epId) => handleSelectEpisode(activeShowId, epId)}
              />
            ) : activeTab === 'cowatch' ? (
              // Render CoWatch Room
              <CoWatchRoom isInline={true} />
            ) : activeTab === 'gallery' ? (
              // Render Gallery View
              <GalleryView />
            ) : activeTab === 'minecraft' ? (
              // Render Minecraft View
              <MinecraftView />
            ) : activeTab === 'news' ? (
              // Render News View
              <NewsView />
            ) : activeTab === 'shows' ? (
              // Render Shows Catalog
              <Dashboard
                onSelectShow={handleSelectShow}
                onSelectEpisode={handleSelectEpisode}
                mode="catalog"
              />
            ) : (
              // Render Home Dashboard
              // Render Home Dashboard
              <Dashboard
                onSelectShow={handleSelectShow}
                onSelectEpisode={handleSelectEpisode}
                onSelectNews={(newsId) => {
                  setActiveNewsId(newsId);
                  setActiveTab('news');
                  handleBackToCatalog();
                }}
                mode="home"
              />
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-12 border-t border-border-color px-6 md:px-10 flex items-center justify-between text-[10px] text-text-muted shrink-0 font-sans mt-auto transition-colors duration-200">
        <span>&copy; {new Date().getFullYear()} varicose-squad. Все права сохранены.</span>
        <span className="font-mono text-accent-color/85">v1.1.0 (Google Drive Streamer)</span>
      </footer>

      {/* 4. Password Protection Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
          <div className={`w-80 bg-bg-card border border-border-color rounded-3xl p-6 shadow-soft space-y-4 text-center ${passwordError ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>

            <div className="w-12 h-12 rounded-full bg-accent-light border border-accent-color/30 text-accent-color flex items-center justify-center mx-auto">
              <Settings className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Панель администратора</h4>
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
                  setActiveTab('admin');
                  handleBackToCatalog();
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
              />

              {passwordError && (
                <p className="text-[10px] text-rose-500 font-semibold transition-all">Неверный пароль!</p>
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

export default function App() {
  return (
    <StreamingProvider>
      <AppContent />
    </StreamingProvider>
  );
}
