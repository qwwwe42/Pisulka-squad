import React, { useState } from 'react';
import type { CalendarEvent } from '../types';
import { useTracker } from '../context/TrackerContext';
import { X, Trash2, Calendar, Clock, MapPin, AlignLeft, AlertTriangle } from 'lucide-react';

interface EventModalProps {
  eventToEdit?: CalendarEvent | null;
  defaultDate?: string; // Format YYYY-MM-DD
  onClose: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ eventToEdit, defaultDate, onClose }) => {
  const { addEvent, updateEvent, deleteEvent, courses, toggleTask, triggerConfirm } = useTracker();

  const [title, setTitle] = useState(() => eventToEdit?.title || '');
  const [startDateTime, setStartDateTime] = useState(() => eventToEdit?.startDateTime || `${defaultDate || '2026-06-06'}T12:00`);
  const [endDateTime, setEndDateTime] = useState(() => eventToEdit?.endDateTime || `${defaultDate || '2026-06-06'}T13:00`);
  const [type, setType] = useState<CalendarEvent['type']>(() => eventToEdit?.type || 'Meeting');
  const [location, setLocation] = useState(() => eventToEdit?.location || '');
  const [notes, setNotes] = useState(() => eventToEdit?.notes || '');

  const [error, setError] = useState<string | null>(null);

  // Check if it's a task event (auto-generated)
  const isTaskEvent = eventToEdit?.id.startsWith('task-ev-');
  let linkedCourseName = '';
  let linkedCourseId = '';
  let linkedTaskId = '';
  let isTaskDone = false;

  if (isTaskEvent && eventToEdit) {
    const taskId = eventToEdit.id.substring(8);
    const foundCourse = courses.find(c => c.tasks.some(t => t.id === taskId));
    if (foundCourse) {
      linkedCourseName = foundCourse.title;
      linkedCourseId = foundCourse.id;
      linkedTaskId = taskId;
      const foundTask = foundCourse.tasks.find(t => t.id === taskId);
      if (foundTask) {
        isTaskDone = foundTask.done;
      }
    }
  }

  // Sync state when eventToEdit or defaultDate changes using render-based state adjustment
  const syncKey = eventToEdit ? `edit-${eventToEdit.id}-${eventToEdit.title}-${eventToEdit.startDateTime}-${eventToEdit.endDateTime}-${eventToEdit.type}-${eventToEdit.location || ''}-${eventToEdit.notes || ''}` : `new-${defaultDate || ''}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setStartDateTime(eventToEdit.startDateTime);
      setEndDateTime(eventToEdit.endDateTime);
      setType(eventToEdit.type);
      setLocation(eventToEdit.location || '');
      setNotes(eventToEdit.notes || '');
    } else {
      const baseDate = defaultDate || '2026-06-06';
      setStartDateTime(`${baseDate}T12:00`);
      setEndDateTime(`${baseDate}T13:00`);
      setTitle('');
      setType('Meeting');
      setLocation('');
      setNotes('');
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('Название события не может быть пустым.');
      return;
    }

    if (new Date(endDateTime) < new Date(startDateTime)) {
      setError('Время завершения не может быть раньше времени начала.');
      return;
    }

    const eventData = {
      title: title.trim(),
      startDateTime,
      endDateTime,
      type,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (eventToEdit) {
      updateEvent(eventToEdit.id, eventData);
    } else {
      addEvent(eventData);
    }

    onClose();
  };

  const handleDelete = () => {
    if (eventToEdit) {
      triggerConfirm("Вы точно хотите это сделать?", () => {
        deleteEvent(eventToEdit.id);
        onClose();
      });
    }
  };

  // 1. Task event view
  if (isTaskEvent && eventToEdit) {
    // Clean task title from status prefix
    const cleanTitle = title.replace(/^([✓📌]\s\[.*?\]\s)/u, '');

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
        <div 
          className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>LINKED_TASK_SPEC</span>
            </h3>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details */}
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>КУРС: {linkedCourseName}</span>
                <span className="text-amber-500">Срок: {eventToEdit.startDateTime.split('T')[0].split('-').reverse().slice(0, 2).join('.')}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-100 leading-snug">
                {cleanTitle}
              </h4>
            </div>

            {/* Task completion toggle */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Статус выполнения:</span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={isTaskDone}
                  onChange={() => {
                    if (linkedCourseId && linkedTaskId) {
                      toggleTask(linkedCourseId, linkedTaskId);
                    }
                  }}
                  className="rounded border-slate-700 bg-slate-900 text-accent-color focus:ring-accent-color/50 w-4 h-4 cursor-pointer"
                />
                <span className={`font-mono text-[11px] font-bold ${isTaskDone ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isTaskDone ? 'ВЫПОЛНЕНО' : 'НЕ ВЫПОЛНЕНО'}
                </span>
              </label>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed">
              💡 Это событие привязано к задаче курса. Вы можете отметить её выполнение прямо здесь. Чтобы переименовать задачу или изменить срок, перейдите в свойства соответствующего курса в левом сайдбаре.
            </p>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end pt-3 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-slate-100 text-xs font-semibold transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Standard event view (Fallback/Regular)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
      <div 
        className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Calendar className="w-4 h-4 text-accent-color" />
            <span>{eventToEdit ? 'EDIT_EVENT_SPEC' : 'CREATE_EVENT_SPEC'}</span>
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-1.5 font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400">Название события *</label>
            <input 
              type="text"
              placeholder="Название встречи, экзамена..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full ide-input"
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#8b949e]">Тип события</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CalendarEvent['type'])}
              className="w-full ide-input cursor-pointer"
            >
              <option value="Meeting">Встреча (Meeting)</option>
              <option value="Exam">Экзамен (Exam)</option>
              <option value="Homework">Домашнее задание (Homework)</option>
              <option value="Deadline">Дедлайн (Deadline)</option>
              <option value="Other">Другое (Other)</option>
            </select>
          </div>

          {/* Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#8b949e] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Начало
              </label>
              <input
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="w-full ide-input cursor-pointer"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#8b949e] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Окончание
              </label>
              <input
                type="datetime-local"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                className="w-full ide-input cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#8b949e] flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Локация
            </label>
            <input 
              type="text"
              placeholder="Zoom, Discord, Кабинет..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full ide-input"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <AlignLeft className="w-3.5 h-3.5" /> Примечание
            </label>
            <textarea
              placeholder="Детали дедлайна..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full ide-input resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <div>
              {eventToEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500/20 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Удалить
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded text-xs font-semibold text-slate-400 hover:text-slate-100"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-slate-100 text-xs font-semibold transition-colors"
              >
                {eventToEdit ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
