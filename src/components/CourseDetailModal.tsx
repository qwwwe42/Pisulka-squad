import React, { useState } from 'react';
import type { Course } from '../types';
import { useTracker } from '../context/TrackerContext';
import { TaskList } from './TaskList';
import { X, Trash2, Calendar, Settings, CheckSquare, Clock, AlertTriangle } from 'lucide-react';

interface CourseDetailModalProps {
  courseId: string;
  onClose: () => void;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({ courseId, onClose }) => {
  const { 
    courses, 
    updateCourse, 
    deleteCourse, 
    getCourseTimeProgress,
    triggerConfirm
  } = useTracker();

  const course = courses.find(c => c.id === courseId);

  // Local state for editing metadata
  const [title, setTitle] = useState(course?.title || '');
  const [description, setDescription] = useState(course?.description || '');
  const [startDate, setStartDate] = useState(course?.startDate || '');
  const [endDate, setEndDate] = useState(course?.endDate || '');
  const [status, setStatus] = useState(course?.status || 'active');
  const [useManualProgress, setUseManualProgress] = useState(course?.useManualProgress || false);
  const [manualProgressPercent, setManualProgressPercent] = useState(course?.manualProgressPercent || 0);

  // Validation state
  const [error, setError] = useState<string | null>(null);

  // Sync state if course updates in background using render-based state adjustment
  const currentSyncKey = `${courseId}-${course?.title || ''}-${course?.description || ''}-${course?.startDate || ''}-${course?.endDate || ''}-${course?.status || ''}-${course?.useManualProgress || ''}-${course?.manualProgressPercent || 0}`;
  const [prevSyncKey, setPrevSyncKey] = useState(currentSyncKey);
  if (currentSyncKey !== prevSyncKey) {
    setPrevSyncKey(currentSyncKey);
    setTitle(course?.title || '');
    setDescription(course?.description || '');
    setStartDate(course?.startDate || '');
    setEndDate(course?.endDate || '');
    setStatus(course?.status || 'active');
    setUseManualProgress(course?.useManualProgress || false);
    setManualProgressPercent(course?.manualProgressPercent || 0);
  }

  // If course was deleted, close
  if (!course) {
    return null;
  }

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!title.trim()) {
      setError('Название курса не может быть пустым.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('Дата окончания не может быть раньше даты начала.');
      return;
    }

    updateCourse(courseId, {
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      status,
      useManualProgress,
      manualProgressPercent
    });

    // Show visual confirmation on the save button or context
    const saveBtn = document.getElementById('save-details-btn');
    if (saveBtn) {
      const originalText = saveBtn.innerText;
      saveBtn.innerText = 'Сохранено!';
      saveBtn.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
      setTimeout(() => {
        saveBtn.innerText = originalText;
        saveBtn.classList.remove('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
      }, 1500);
    }
  };

  const handleDeleteCourse = () => {
    triggerConfirm("Вы точно хотите это сделать?", () => {
      deleteCourse(courseId);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      <div 
        className="relative w-full max-w-5xl glass-modal overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${
              course.status === 'active' ? 'bg-cyan-400 animate-pulse' :
              course.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400'
            }`} />
            <h2 className="text-xl font-bold tracking-wide text-slate-100 truncate max-w-md">
              Детали курса: {course.title}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Course Parameters Form */}
          <form onSubmit={handleSaveDetails} className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 pb-2 border-b border-slate-900">
              <Settings className="w-4 h-4 text-cyan-400" />
              Параметры Обучения
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 shadow-[0_0_8px_rgba(244,63,94,0.15)] animate-[shake_0.4s_ease-in-out]">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Title & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Название курса</label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full glass-input"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Статус</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Course['status'])}
                  className="w-full glass-input cursor-pointer"
                >
                  <option value="active">Активен</option>
                  <option value="completed">Завершен</option>
                  <option value="paused">На паузе</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Описание / Заметки</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Заметки о курсе, ссылки на материалы, расписание..."
                className="w-full glass-input resize-none"
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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full glass-input cursor-pointer"
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
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full glass-input cursor-pointer"
                  required
                />
              </div>
            </div>

            {/* Progress Settings */}
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-300">Расчет прогресса времени</h4>
                  <p className="text-[10px] text-slate-500">Автоматически по датам или вручную слайдером</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUseManualProgress(!useManualProgress)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    useManualProgress ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      useManualProgress ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {useManualProgress ? (
                <div className="space-y-2 animate-[fadeIn_0.2s_ease-out]">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-cyan-400">Вручную заданный прогресс</span>
                    <span className="text-cyan-300">{manualProgressPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={manualProgressPercent}
                    onChange={(e) => setManualProgressPercent(Number(e.target.value))}
                    className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              ) : (
                <div className="text-xs text-slate-400 flex items-center justify-between bg-slate-950/40 p-2.5 rounded-xl border border-slate-900 font-mono">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Рассчитанный автопрогресс:
                  </span>
                  <span className="text-indigo-300 font-bold">{getCourseTimeProgress(course)}%</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-900/60">
              <button
                type="button"
                onClick={handleDeleteCourse}
                className="px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:shadow-[0_0_12px_rgba(244,63,94,0.2)] transition-all duration-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Удалить курс
              </button>
              <button
                type="submit"
                id="save-details-btn"
                className="px-6 py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 hover:shadow-[0_0_12px_rgba(6,182,212,0.2)] transition-all duration-300 text-xs font-semibold"
              >
                Сохранить изменения
              </button>
            </div>
          </form>

          {/* Right Column: Tasks Management */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 pb-2 border-b border-slate-900">
              <CheckSquare className="w-4 h-4 text-purple-400" />
              Задачи Курса
            </h3>

            <TaskList courseId={courseId} tasks={course.tasks} />
          </div>

        </div>
      </div>
    </div>
  );
};
