import React from 'react';
import { useTracker } from '../context/TrackerContext';
import { BookOpen, CheckSquare, Clock, Award, Terminal, CalendarRange } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { 
    courses, 
    events, 
    getCourseTimeProgress, 
    toggleTask
  } = useTracker();

  const TODAY_STR = '2026-06-06';
  
  const getTodayDate = () => new Date(TODAY_STR);
  
  const getNDaysLaterStr = (n: number) => {
    const d = getTodayDate();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };

  const SEVEN_DAYS_LATER_STR = getNDaysLaterStr(7);

  // Filters
  const activeCourses = courses.filter(c => c.status === 'active');
  const completedCourses = courses.filter(c => c.status === 'completed');

  // Stats
  const activeCoursesCount = activeCourses.length;
  const allActiveTasks = activeCourses.flatMap(c => c.tasks);
  const completedActiveTasks = allActiveTasks.filter(t => t.done).length;
  const overallTaskProgress = allActiveTasks.length > 0 
    ? Math.round((completedActiveTasks / allActiveTasks.length) * 100) 
    : 0;

  const avgTimeProgress = activeCourses.length > 0
    ? Math.round(activeCourses.reduce((acc, c) => acc + getCourseTimeProgress(c), 0) / activeCourses.length)
    : 0;

  // Today's events
  const todayEvents = events.filter(e => e.startDateTime.split('T')[0] === TODAY_STR);

  // Next 7 days events (excluding today, sorted)
  const next7DaysEvents = events.filter(e => {
    const eDate = e.startDateTime.split('T')[0];
    return eDate > TODAY_STR && eDate <= SEVEN_DAYS_LATER_STR;
  }).sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));

  // Quick tasks from active courses (undone tasks, limit to 6)
  const quickTasks = activeCourses
    .flatMap(c => c.tasks.map(t => ({ ...t, courseId: c.id, courseTitle: c.title })))
    .filter(t => !t.done)
    .slice(0, 6);

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'Exam': return 'border-rose-500 text-rose-500 bg-rose-500/5';
      case 'Deadline': return 'border-amber-500 text-amber-500 bg-amber-500/5';
      case 'Meeting': return 'border-accent-color text-accent-color bg-accent-color/5';
      case 'Homework': return 'border-purple-400 text-purple-400 bg-purple-400/5';
      default: return 'border-slate-700 text-slate-400';
    }
  };

  return (
    <div className="space-y-6 section-enter">
      
      {/* Banner */}
      <div className="p-5 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
        <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
          <Terminal className="w-3.5 h-3.5 text-accent-color" />
          <span>STUDY_PLANNER_SYSTEM_SHELL_INIT_SUCCESS</span>
        </div>
        <h2 className="text-xl font-bold text-slate-100 tracking-wide">
          Панель мониторинга прогресса
        </h2>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          Добро пожаловать в пульт управления обучением. Здесь выводится статус всех ваших активных курсов, расписание дедлайнов на ближайшие 7 дней и текущие задачи.
        </p>
      </div>

      {/* Grid: 4 Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Stat 1 */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Активные курсы</p>
            <h3 className="text-xl font-bold font-mono text-slate-100">{activeCoursesCount}</h3>
          </div>
          <BookOpen className="w-5 h-5 text-accent-color opacity-80" />
        </div>

        {/* Stat 2 */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Завершенные курсы</p>
            <h3 className="text-xl font-bold font-mono text-emerald-500">{completedCourses.length}</h3>
          </div>
          <Award className="w-5 h-5 text-emerald-500 opacity-80" />
        </div>

        {/* Stat 3 */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Выполнение задач</p>
            <h3 className="text-xl font-bold font-mono text-purple-400">{overallTaskProgress}%</h3>
          </div>
          <CheckSquare className="w-5 h-5 text-purple-400 opacity-80" />
        </div>

        {/* Stat 4 */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Пройдено времени</p>
            <h3 className="text-xl font-bold font-mono text-amber-500">{avgTimeProgress}%</h3>
          </div>
          <Clock className="w-5 h-5 text-amber-500 opacity-80" />
        </div>
      </div>

      {/* Columns: Today checklist & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left column: Сегодня */}
        <div className="p-5 bg-slate-950 border border-slate-800 rounded-lg space-y-4">
          <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent-color animate-pulse" />
              Сегодня ({TODAY_STR.split('-').reverse().join('.')})
            </h3>
            <span className="text-[10px] font-mono text-slate-400">LOG_STATE</span>
          </div>

          {/* Today's Events */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">События и встречи</h4>
            {todayEvents.length > 0 ? (
              <div className="space-y-2">
                {todayEvents.map(event => (
                  <div 
                    key={event.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getEventBadgeClass(event.type)}`}>
                          {event.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {event.startDateTime.split('T')[1]} - {event.endDateTime.split('T')[1]}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-100">{event.title}</p>
                      {event.location && (
                        <p className="text-[10px] text-slate-400">Локация: {event.location}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 border border-dashed border-slate-800 text-center text-slate-400 text-xs rounded">
                Событий на сегодня нет
              </div>
            )}
          </div>

          {/* Today's Tasks */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ближайшие задачи (Чек-лист)</h4>
            {quickTasks.length > 0 ? (
              <div className="space-y-1.5">
                {quickTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded hover:border-slate-700 transition-colors text-xs"
                  >
                    <label className="flex items-center gap-3.5 cursor-pointer group select-none">
                      <input 
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTask(task.courseId, task.id)}
                        className="rounded border-slate-700 bg-slate-900 text-accent-color focus:ring-accent-color/50 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <p className="text-slate-100 group-hover:text-accent-color transition-colors">{task.text}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{task.courseTitle}</span>
                      </div>
                    </label>
                    {task.dueDate && (
                      <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-400 shrink-0">
                        до {task.dueDate.split('-').reverse().slice(0, 2).join('.')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 border border-dashed border-slate-800 text-center text-slate-400 text-xs rounded">
                Нет невыполненных задач
              </div>
            )}
          </div>
        </div>

        {/* Right column: График на неделю */}
        <div className="p-5 bg-slate-950 border border-slate-800 rounded-lg space-y-4">
          <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarRange className="w-4.5 h-4.5 text-purple-400" />
              График на 7 дней
            </h3>
            <span className="text-[10px] font-mono text-slate-400">SCHEDULE_STATE</span>
          </div>

          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            {next7DaysEvents.length > 0 ? (
              <div className="relative border-l border-slate-800 pl-4 ml-2 space-y-4">
                {next7DaysEvents.map(event => {
                  const dateObj = new Date(event.startDateTime);
                  const day = dateObj.getDate();
                  const monthName = dateObj.toLocaleDateString('ru-RU', { month: 'short' });
                  const weekDay = dateObj.toLocaleDateString('ru-RU', { weekday: 'short' });
                  
                  return (
                    <div key={event.id} className="relative group text-xs">
                      {/* Dot marker */}
                      <span className="absolute -left-[20.5px] top-1.5 w-2 h-2 rounded-full bg-slate-800 border border-slate-950 group-hover:bg-accent-color transition-colors" />

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-400">
                            {day} {monthName} ({weekDay})
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {event.startDateTime.split('T')[1] || '00:00'}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold border uppercase tracking-wider ${getEventBadgeClass(event.type)}`}>
                            {event.type}
                          </span>
                        </div>
                        <h4 className="font-semibold text-slate-100 group-hover:text-accent-color transition-colors">
                          {event.title}
                        </h4>
                        {event.notes && (
                          <p className="text-[11px] text-slate-400">{event.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-slate-800 text-center text-slate-400 text-xs rounded py-16">
                Событий на следующие 7 дней не запланировано
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
