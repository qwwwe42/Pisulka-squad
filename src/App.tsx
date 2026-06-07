import { useState } from 'react';
import { StreamingProvider, useStreaming } from './context/StreamingContext';
import { Dashboard } from './components/Dashboard';
import { ShowDetails } from './components/ShowDetails';
import { VideoPlayer } from './components/VideoPlayer';
import { AdminPanel } from './components/AdminPanel';
import { MinecraftView } from './components/MinecraftView';
import { Settings, Home, Cloud, CloudOff, Menu, X, Tv, Gamepad2 } from 'lucide-react';

function AppContent() {
  const {
    activeShowId,
    activeEpisodeId,
    setActiveShowId,
    setActiveEpisodeId,
    isFirebaseConnected
  } = useStreaming();

  const [activeTab, setActiveTab] = useState<'home' | 'shows' | 'minecraft' | 'admin'>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('penis_ink_admin') === 'true';
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

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
    <div className="min-h-screen flex bg-[#0a0b0d] text-slate-200 font-sans selection:bg-purple-500/20 antialiased w-full">

      {/* Backdrop for Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-900 bg-[#0a0b0d] p-6 flex flex-col gap-8 shrink-0 transition-transform duration-300 md:translate-x-0 md:sticky md:top-0 md:h-screen ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Sidebar Close button on mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 md:hidden p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Logo */}
        <div
          className="flex items-center gap-2.5 group cursor-pointer select-none"
          onClick={() => {
            setActiveTab('home');
            handleBackToCatalog();
            setIsMobileMenuOpen(false);
          }}
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-650 shadow-[0_0_15px_rgba(168,85,247,0.35)] transition-transform duration-300 group-hover:scale-105">
            <span className="text-white font-extrabold text-sm font-mono tracking-tighter">PS</span>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider font-sans bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-350">
              pisulka-squad
            </h1>
            <p className="text-[9px] font-bold tracking-[0.15em] text-purple-400 uppercase font-sans">
              Media Portal
            </p>
          </div>
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
            className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left cursor-pointer ${activeTab === 'home' && !activeShowId
                ? 'bg-purple-650/15 text-purple-400 border border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.1)]'
                : 'text-slate-405 hover:text-slate-205 hover:bg-slate-900 border border-transparent'
              }`}
          >
            <Home className="w-4 h-4" />
            <span>Главная</span>
          </button>

          {/* Сериалы */}
          <button
            onClick={() => {
              setActiveTab('shows');
              handleBackToCatalog();
              setIsMobileMenuOpen(false);
            }}
            className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left cursor-pointer ${activeTab === 'shows' || activeShowId
                ? 'bg-purple-650/15 text-purple-400 border border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.1)]'
                : 'text-slate-405 hover:text-slate-205 hover:bg-slate-900 border border-transparent'
              }`}
          >
            <Tv className="w-4 h-4" />
            <span>Сериалы</span>
          </button>

          {/* Майнкрафт */}
          <button
            onClick={() => {
              setActiveTab('minecraft');
              handleBackToCatalog();
              setIsMobileMenuOpen(false);
            }}
            className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left cursor-pointer ${activeTab === 'minecraft'
                ? 'bg-purple-650/15 text-purple-400 border border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.1)]'
                : 'text-slate-405 hover:text-slate-205 hover:bg-slate-900 border border-transparent'
              }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Майнкрафт</span>
          </button>
        </nav>

        {/* Bottom Panel (Admin & Status) */}
        <div className="border-t border-slate-900 pt-4 space-y-3">
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
                ? 'bg-purple-650/15 text-purple-400 border border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.1)]'
                : 'text-slate-405 hover:text-slate-205 hover:bg-slate-900 border border-transparent'
              }`}
          >
            <Settings className="w-4 h-4" />
            <span>Панель админа</span>
          </button>

          {/* Firestore Connection status */}
          <div
            className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-[10px] font-bold ${isFirebaseConnected
                ? 'bg-green-950/10 border-green-900/30 text-green-500'
                : 'bg-amber-950/10 border-amber-900/30 text-amber-500'
              }`}
          >
            {isFirebaseConnected ? (
              <>
                <Cloud className="w-4 h-4 text-green-500 shrink-0" />
                <span className="truncate">База онлайн</span>
              </>
            ) : (
              <>
                <CloudOff className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">База оффлайн</span>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">

        {/* MOBILE HEADER */}
        <header className="md:hidden sticky top-0 z-30 h-16 bg-[#0a0b0d]/90 backdrop-blur-md border-b border-slate-900 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            <span className="text-xs font-black tracking-widest uppercase text-slate-200">
              pisulka-squad
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Show simple category/indicator */}
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-800/30 px-2.5 py-0.5 rounded font-sans">
              {activeTab === 'home' ? 'Главная' : activeTab === 'shows' ? 'Сериалы' : activeTab === 'minecraft' ? 'Майнкрафт' : 'Админ'}
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
          ) : activeTab === 'minecraft' ? (
            // Render Minecraft View
            <MinecraftView />
          ) : activeTab === 'shows' ? (
            // Render Shows Catalog
            <Dashboard
              onSelectShow={handleSelectShow}
              onSelectEpisode={handleSelectEpisode}
              mode="catalog"
            />
          ) : (
            // Render Home Dashboard
            <Dashboard
              onSelectShow={handleSelectShow}
              onSelectEpisode={handleSelectEpisode}
              mode="home"
            />
          )}
        </main>

        {/* Footer */}
        <footer className="h-12 border-t border-slate-900/60 px-6 md:px-10 flex items-center justify-between text-[10px] text-slate-600 shrink-0 font-sans">
          <span>&copy; {new Date().getFullYear()} pisulka-squad. Все права сохранены.</span>
          <span className="font-mono text-purple-900/80">v1.1.0 (Google Drive Streamer)</span>
        </footer>
      </div>

      {/* 4. Password Protection Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
          <div className={`w-80 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-center ${passwordError ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>

            <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
              <Settings className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Панель администратора</h4>
              <p className="text-[11px] text-slate-500">Введите пароль для доступа к настройкам.</p>
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
                className="w-full text-center ide-input tracking-[6px] text-sm font-bold font-mono"
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
                  className="flex-1 py-2 rounded-xl border border-slate-800 hover:bg-slate-950 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-950/20 transition-all cursor-pointer"
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
