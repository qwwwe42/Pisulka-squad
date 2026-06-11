import React, { useState } from 'react';
import { useTracker } from '../context/TrackerContext';
import type { Course } from '../types';
import { CourseCard } from './CourseCard';
import { CourseDetailModal } from './CourseDetailModal';
import { Plus, Filter, BookOpen, X, Calendar, AlertTriangle } from 'lucide-react';

export const CoursesView: React.FC = () => {
  const { courses, addCourse } = useTracker();
  
  // Tab/Filter states
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('all');
  
  // Modal states
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for new course
  const [newTitle, setNewTitle] = useState('');
  const [newStartDate, setNewStartDate] = useState('2026-06-06');
  const [newEndDate, setNewEndDate] = useState('2026-07-06');
  const [newStatus, setNewStatus] = useState<Course['status']>('active');
  const [newDescription, setNewDescription] = useState('');
  const [newUseManual, setNewUseManual] = useState(false);
  const [newManualPercent, setNewManualPercent] = useState(0);

  const [formError, setFormError] = useState<string | null>(null);

  // Filter courses
  const filteredCourses = courses.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const handleAddCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!newTitle.trim()) {
      setFormError('Название курса не может быть пустым.');
      return;
    }

    if (new Date(newEndDate) < new Date(newStartDate)) {
      setFormError('Дата окончания не может быть раньше даты начала.');
      return;
    }

    // Add Course
    addCourse({
      title: newTitle.trim(),
      startDate: newStartDate,
      endDate: newEndDate,
      status: newStatus,
      description: newDescription.trim() || undefined,
      useManualProgress: newUseManual,
      manualProgressPercent: newUseManual ? newManualPercent : undefined
    });

    // Reset Form & Close Modal
    setNewTitle('');
    setNewStartDate('2026-06-06');
    setNewEndDate('2026-07-06');
    setNewStatus('active');
    setNewDescription('');
    setNewUseManual(false);
    setNewManualPercent(0);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 section-enter">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-wide">Учебные Курсы и Цели</h2>
          <p className="text-xs text-slate-400">Управляйте дисциплинами, сроками и чек-листами.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 hover:border-cyan-500/60 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] text-cyan-400 transition-all duration-300 font-semibold text-xs flex items-center gap-2"
        >
          <Plus className="w-4.5 h-4.5" />
          Добавить курс
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-2.5 rounded-2xl bg-slate-900/30 border border-slate-900">
        <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 px-2">
          <Filter className="w-4 h-4" /> Фильтр статуса:
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'active', 'completed', 'paused'] as const).map(tab => {
            const labelMap = { all: 'Все', active: 'Активные', completed: 'Завершенные', paused: 'На паузе' };
            const isActive = filter === tab;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-500/15 border border-purple-500/40 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                    : 'bg-transparent border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {labelMap[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => setSelectedCourseId(course.id)}
            />
          ))}

          {/* Quick Dotted Card Placeholder */}
          <div
            onClick={() => setIsAddModalOpen(true)}
            className="h-full min-h-[220px] rounded-2xl border-2 border-dashed border-slate-800 hover:border-slate-700/60 bg-slate-950/20 hover:bg-slate-900/20 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all group gap-2"
          >
            <div className="p-3 rounded-full bg-slate-900/50 border border-slate-800 text-slate-500 group-hover:text-cyan-400 group-hover:border-cyan-500/30 group-hover:shadow-[0_0_8px_rgba(6,182,212,0.15)] transition-all">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-400 group-hover:text-slate-200 transition-colors">Создать новый курс</h4>
            <p className="text-xs text-slate-500 max-w-[200px]">Добавьте новую дисциплину и укажите дедлайны.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 py-24 glass-panel border-dashed border-2 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-600 animate-bounce" />
          <h3 className="text-lg font-bold">Курсы не найдены</h3>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            Похоже, в этой категории пока ничего нет. Добавьте свой первый курс, чтобы начать отслеживать свой учебный прогресс!
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="neon-btn-cyan text-xs"
          >
            Создать курс
          </button>
        </div>
      )}

      {/* Course Detail Modal */}
      {selectedCourseId && (
        <CourseDetailModal
          courseId={selectedCourseId}
          onClose={() => setSelectedCourseId(null)}
        />
      )}

      {/* Add Course Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay-enter fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="modal-content-enter w-full max-w-lg glass-modal overflow-hidden p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-900 pb-4">
              <h3 className="text-lg font-bold tracking-wide flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Новый учебный курс
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 shadow-[0_0_8px_rgba(244,63,94,0.15)] animate-[shake_0.4s_ease-in-out]">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAddCourseSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Название курса *</label>
                <input
                  type="text"
                  placeholder="Например: Нидерландский A1 — курс 1"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full glass-input text-xs"
                  required
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Статус</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as Course['status'])}
                  className="w-full glass-input text-xs cursor-pointer"
                >
                  <option value="active">Активен</option>
                  <option value="completed">Завершен</option>
                  <option value="paused">На паузе</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Описание / Заметки</label>
                <textarea
                  placeholder="Краткое описание курса..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  className="w-full glass-input text-xs resize-none"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    Дата начала
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full glass-input text-xs cursor-pointer"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-pink-400" />
                    Дата окончания
                  </label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full glass-input text-xs cursor-pointer"
                    required
                  />
                </div>
              </div>

              {/* Progress Mode toggle */}
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-900 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Ручной прогресс</span>
                  <input
                    type="checkbox"
                    checked={newUseManual}
                    onChange={(e) => setNewUseManual(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-900 text-cyan-600 focus:ring-cyan-500/50 w-4 h-4 cursor-pointer"
                  />
                </div>
                {newUseManual && (
                  <div className="space-y-1.5 animate-fade-in">
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span className="text-slate-400">Начальный прогресс</span>
                      <span className="text-cyan-300">{newManualPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newManualPercent}
                      onChange={(e) => setNewManualPercent(Number(e.target.value))}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-900/60">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-transparent hover:bg-slate-900 border border-transparent text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 transition-all font-semibold text-xs"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
