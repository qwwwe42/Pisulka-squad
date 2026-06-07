import React from 'react';
import type { Course } from '../types';
import { useTracker } from '../context/TrackerContext';
import { Clock, CheckSquare, Calendar, ChevronRight } from 'lucide-react';

interface CourseCardProps {
  course: Course;
  onClick: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onClick }) => {
  const { getCourseTimeProgress, getCourseTaskProgress } = useTracker();

  const timeProgress = getCourseTimeProgress(course);
  const taskProgress = getCourseTaskProgress(course);
  const totalTasks = course.tasks.length;
  const completedTasks = course.tasks.filter(t => t.done).length;

  const getStatusStyle = (status: Course['status']) => {
    switch (status) {
      case 'active':
        return {
          cardBorder: 'glass-card-active',
          badge: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.15)]',
          label: 'Активен',
          progressColor: 'from-cyan-500 to-indigo-500'
        };
      case 'completed':
        return {
          cardBorder: 'glass-card-completed',
          badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]',
          label: 'Завершен',
          progressColor: 'from-emerald-500 to-teal-500'
        };
      case 'paused':
        return {
          cardBorder: 'glass-card-paused',
          badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)]',
          label: 'На паузе',
          progressColor: 'from-amber-500 to-orange-500'
        };
    }
  };

  const statusConfig = getStatusStyle(course.status);

  // Format date utility (YYYY-MM-DD -> DD.MM.YYYY)
  const formatDate = (dateStr: string) => {
    return dateStr.split('-').reverse().join('.');
  };

  return (
    <div
      onClick={onClick}
      className={`glass-panel glass-panel-hover ${statusConfig.cardBorder} p-6 flex flex-col justify-between gap-5 cursor-pointer relative group overflow-hidden`}
    >
      {/* Subtle overlay glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" />

      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${statusConfig.badge}`}>
            {statusConfig.label}
          </span>
          <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1">
            {course.useManualProgress ? 'Manual Mode' : 'Auto Mode'}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-1">
          {course.title}
        </h3>

        {/* Description */}
        {course.description && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        )}
      </div>

      {/* Progress Bars Container */}
      <div className="space-y-4">
        {/* Time Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Временной прогресс
            </span>
            <span className="text-indigo-300">{timeProgress}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${statusConfig.progressColor} transition-all duration-500`}
              style={{ width: `${timeProgress}%` }}
            />
          </div>
        </div>

        {/* Task Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400 flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
              Задачи: {completedTasks}/{totalTasks}
            </span>
            <span className="text-purple-300">{taskProgress}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${taskProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-900/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(course.startDate)}</span>
          <span className="px-1 text-slate-700">|</span>
          <span>{formatDate(course.endDate)}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-all duration-300 transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
};
