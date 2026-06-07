import React from 'react';
import { useTracker } from '../context/TrackerContext';
import { LayoutDashboard, BookOpen, Calendar, Activity } from 'lucide-react';
import { StorageExportImport } from './StorageExportImport';

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab } = useTracker();

  return (
    <header className="sticky top-0 z-40 w-full px-4 py-4 md:px-8 bg-slate-950/20 backdrop-blur-md border-b border-slate-900/60">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-transform duration-300 group-hover:scale-105">
            <Activity className="w-5.5 h-5.5 text-white" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-500 animate-ping opacity-25 group-hover:opacity-40 transition-opacity" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider font-sans bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
              ANTIGRAVITY
            </h1>
            <p className="text-[10px] font-medium tracking-[0.25em] text-cyan-400 uppercase">
              Study Tracker
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center p-1 rounded-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-lg">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)] border border-purple-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              activeTab === 'courses'
                ? 'bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)] border border-purple-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Courses
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              activeTab === 'calendar'
                ? 'bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)] border border-purple-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendar
          </button>
        </nav>

        {/* Database Actions */}
        <StorageExportImport />
      </div>
    </header>
  );
};
