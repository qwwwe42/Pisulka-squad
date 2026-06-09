import React, { useState } from 'react';
import { useTracker } from '../context/TrackerContext';
import type { CalendarEvent } from '../types';
import { EventModal } from './EventModal';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  MapPin, Search
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { events } = useTracker();
  
  // Date context (June 6, 2026 as standard base today)
  const TODAY_STR = '2026-06-06';
  const [currentDate, setCurrentDate] = useState<Date>(new Date(TODAY_STR));
  const [miniDate, setMiniDate] = useState<Date>(new Date(TODAY_STR));
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');
  
  // Category filter state
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Meeting', 'Exam', 'Homework', 'Deadline', 'Other']);
  
  // Search query state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalDate, setModalDate] = useState<string>(TODAY_STR);

  // Sync mini calendar view month with currentDate month using render-based state adjustment
  const [prevCurrentDate, setPrevCurrentDate] = useState<Date>(currentDate);
  if (currentDate.getTime() !== prevCurrentDate.getTime()) {
    setPrevCurrentDate(currentDate);
    setMiniDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  }

  // Format date helper: YYYY-MM-DD
  const formatDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Filter & Search events
  const filteredEvents = events.filter(e => {
    const matchesCategory = selectedTypes.includes(e.type);
    const query = String(searchQuery || '').toLowerCase();
    const matchesSearch = query === '' || 
      String(e?.title || '').toLowerCase().includes(query) ||
      String(e?.notes || '').toLowerCase().includes(query) ||
      String(e?.location || '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  // Month navigation helpers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date(TODAY_STR));
  };

  // Event category color helpers
  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'Exam': return 'border-rose-500/30 text-rose-500 bg-rose-500/10';
      case 'Deadline': return 'border-amber-500/30 text-amber-500 bg-amber-500/10';
      case 'Meeting': return 'border-accent-color/30 text-accent-color bg-accent-color/10';
      case 'Homework': return 'border-purple-400/30 text-purple-400 bg-purple-400/10';
      default: return 'border-slate-700 text-slate-400 bg-slate-800/20';
    }
  };

  const getEventDotClass = (type: string) => {
    switch (type) {
      case 'Exam': return 'bg-rose-500';
      case 'Deadline': return 'bg-amber-500';
      case 'Meeting': return 'bg-accent-color';
      case 'Homework': return 'bg-purple-400';
      default: return 'bg-slate-400';
    }
  };

  // Calculate top offset and height for week/day timeline positioning (Hours: 7:00 to 22:00)
  const getEventPosition = (event: CalendarEvent) => {
    const startParts = event.startDateTime.split('T');
    const endParts = event.endDateTime.split('T');
    
    let startHour = 9;
    let startMin = 0;
    if (startParts[1]) {
      const [h, m] = startParts[1].split(':').map(Number);
      startHour = h;
      startMin = m;
    }
    
    let endHour = startHour + 1;
    let endMin = 0;
    if (endParts[1]) {
      const [h, m] = endParts[1].split(':').map(Number);
      endHour = h;
      endMin = m;
    }

    const startDecimal = startHour + startMin / 60;
    const endDecimal = endHour + endMin / 60;
    
    // Clamping hours between 7:00 and 22:00
    const startClamped = Math.max(7, Math.min(22, startDecimal));
    const endClamped = Math.max(7, Math.min(22, endDecimal));
    
    const rowHeight = 55;
    const top = (startClamped - 7) * rowHeight;
    const height = Math.max(22, (endClamped - startClamped) * rowHeight);
    
    return { top, height };
  };

  // Get Monday of the week containing date
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  // Renders Left Mini Calendar Month Grid
  const renderMiniCalendar = () => {
    const year = miniDate.getFullYear();
    const month = miniDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    const startDayOfWeek = firstDay.getDay();
    const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Align Mon

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const cells: React.ReactNode[] = [];

    // Prev Month padding
    for (let i = offset - 1; i >= 0; i--) {
      const dNum = prevMonthLastDay - i;
      cells.push(
        <span key={`prev-${dNum}`} className="text-center text-[9px] text-slate-400 py-0.5">
          {dNum}
        </span>
      );
    }

    // Active Month days
    for (let dNum = 1; dNum <= totalDays; dNum++) {
      const d = new Date(year, month, dNum);
      const isSelected = formatDateStr(d) === formatDateStr(currentDate);
      const isToday = formatDateStr(d) === TODAY_STR;
      
      cells.push(
        <button
          key={`curr-${dNum}`}
          onClick={() => setCurrentDate(d)}
          className={`text-center text-[9px] font-mono rounded-full hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center w-[18px] h-[18px] mx-auto ${
            isSelected 
              ? 'bg-accent-color text-slate-950 font-bold' 
              : isToday 
                ? 'border border-accent-color text-accent-color' 
                : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          {dNum}
        </button>
      );
    }

    // Next Month padding
    const totalCellsSoFar = cells.length;
    const remaining = 42 - totalCellsSoFar;
    for (let dNum = 1; dNum <= remaining; dNum++) {
      cells.push(
        <span key={`next-${dNum}`} className="text-center text-[9px] text-slate-400 py-0.5">
          {dNum}
        </span>
      );
    }

    return (
      <div className="space-y-1.5 border-b border-slate-800 pb-4 select-none">
        <div className="flex items-center justify-between text-[11px] px-1 pb-1">
          <span className="font-bold text-slate-100 capitalize">
            {miniDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </span>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => {
                const prev = new Date(miniDate);
                prev.setMonth(miniDate.getMonth() - 1);
                setMiniDate(prev);
              }}
              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => {
                const next = new Date(miniDate);
                next.setMonth(miniDate.getMonth() + 1);
                setMiniDate(next);
              }}
              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
            <span key={d} className="text-center text-[8px] font-bold text-slate-450">{d}</span>
          ))}
          {cells}
        </div>
      </div>
    );
  };

  // Render Month grid (Sleek dark theme layout)
  const renderMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    const startDayOfWeek = firstDay.getDay();
    const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Align Mon

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const cells: React.ReactNode[] = [];

    // 1. Prev month cells
    for (let i = offset - 1; i >= 0; i--) {
      const dNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dNum);
      const dStr = formatDateStr(d);
      const dayEvents = filteredEvents.filter(e => e.startDateTime.split('T')[0] === dStr);

      cells.push(
        <div 
          key={`prev-cell-${dNum}`}
          onClick={() => { setModalDate(dStr); setShowAddModal(true); }}
          className="min-h-[90px] p-2 bg-slate-950/40 border-b border-r border-slate-800 opacity-35 hover:bg-slate-800/20 cursor-pointer transition-colors"
        >
          <span className="text-[10px] font-mono text-slate-400">{dNum}</span>
          <div className="mt-1.5 space-y-1">
            {dayEvents.slice(0, 2).map(e => (
              <div key={e.id} className="w-full h-1.5 rounded-xs bg-slate-800" />
            ))}
          </div>
        </div>
      );
    }

    // 2. Current month cells
    for (let dNum = 1; dNum <= totalDays; dNum++) {
      const d = new Date(year, month, dNum);
      const dStr = formatDateStr(d);
      const dayEvents = filteredEvents.filter(e => e.startDateTime.split('T')[0] === dStr);
      const isToday = dStr === TODAY_STR;

      cells.push(
        <div 
          key={`curr-cell-${dNum}`}
          onClick={() => { setModalDate(dStr); setShowAddModal(true); }}
          className={`min-h-[90px] p-2 border-b border-r border-slate-800 hover:bg-slate-800/30 cursor-pointer transition-all flex flex-col justify-between ${
            isToday ? 'bg-slate-800/50' : 'bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between select-none">
            <span className={`text-[10px] font-bold font-mono px-1 rounded ${
              isToday ? 'bg-accent-color text-slate-950 font-bold' : 'text-slate-100'
            }`}>
              {dNum}
            </span>
          </div>

          <div className="mt-1.5 space-y-1 flex-1 overflow-y-auto max-h-[55px] scrollbar-none">
            {dayEvents.map(e => (
              <div 
                key={e.id}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedEvent(e);
                }}
                className="text-[9px] truncate px-1 py-0.5 rounded border border-slate-800 bg-slate-950 hover:border-accent-color/40 text-slate-400 hover:text-slate-100 transition-all flex items-center gap-1"
                title={e.title}
              >
                <span className={`w-1 h-1 rounded-full shrink-0 ${getEventDotClass(e.type)}`} />
                <span className="truncate">{e.title}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 3. Next month cells
    const totalCells = cells.length;
    const remaining = 42 - totalCells;
    for (let dNum = 1; dNum <= remaining; dNum++) {
      const d = new Date(year, month + 1, dNum);
      const dStr = formatDateStr(d);
      const dayEvents = filteredEvents.filter(e => e.startDateTime.split('T')[0] === dStr);

      cells.push(
        <div 
          key={`next-cell-${dNum}`}
          onClick={() => { setModalDate(dStr); setShowAddModal(true); }}
          className="min-h-[90px] p-2 bg-slate-950/40 border-b border-r border-slate-800 opacity-35 hover:bg-slate-800/20 cursor-pointer transition-colors"
        >
          <span className="text-[10px] font-mono text-slate-400">{dNum}</span>
          <div className="mt-1.5 space-y-1">
            {dayEvents.slice(0, 2).map(e => (
              <div key={e.id} className="w-full h-1.5 rounded-xs bg-slate-800" />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-slate-900 overflow-y-auto">
        <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950 shrink-0">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
            <div key={day} className="py-2 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 bg-slate-800/20 flex-1 min-h-[400px]">
          {cells}
        </div>
      </div>
    );
  };

  // Render Week timeline grid (Hourly columns 7:00 to 22:00)
  const renderWeekGrid = () => {
    const monday = getMonday(currentDate);
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDays.push(d);
    }

    const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7:00 to 22:00
    const rowHeight = 55;

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-slate-900 overflow-hidden">
        {/* Week Columns Header */}
        <div className="flex border-b border-slate-800 bg-slate-950 shrink-0 select-none">
          <div className="w-[50px] shrink-0" /> {/* Time column padding */}
          {weekDays.map((date, idx) => {
            const dStr = formatDateStr(date);
            const isToday = dStr === TODAY_STR;
            const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });
            const dayNum = date.getDate();

            return (
              <div key={idx} className="flex-1 text-center py-2.5 border-r border-slate-800 min-w-[70px]">
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">{dayName}</p>
                <p className={`text-xs font-bold font-mono inline-block w-6 h-6 leading-6 rounded-full mt-1 ${
                  isToday ? 'bg-accent-color text-slate-950 font-bold' : 'text-slate-200'
                }`}>
                  {dayNum}
                </p>
              </div>
            );
          })}
        </div>

        {/* Scrollable grid area */}
        <div className="flex-1 overflow-y-auto flex min-h-0 relative">
          
          {/* Time Labels Column */}
          <div className="w-[50px] shrink-0 border-r border-slate-800 bg-slate-950 text-right pr-2 text-[9px] font-mono text-slate-400 select-none pt-[10px]">
            {hours.map(hour => {
              const displayHour = hour > 12 ? hour - 12 : hour;
              const ampm = hour >= 12 ? 'PM' : 'AM';
              return (
                <div key={hour} style={{ height: `${rowHeight}px` }} className="pr-1">
                  {displayHour} {ampm}
                </div>
              );
            })}
          </div>

          {/* 7 Columns Timeline */}
          <div className="flex-1 flex bg-slate-900 relative min-h-[720px] select-none">
            {weekDays.map((date, colIdx) => {
              const dStr = formatDateStr(date);
              const dayEvents = filteredEvents.filter(e => e.startDateTime.split('T')[0] === dStr);
              
              return (
                <div 
                  key={colIdx} 
                  className="flex-1 relative border-r border-slate-800 min-w-[70px] h-full"
                  onClick={() => {
                    setModalDate(dStr);
                    setShowAddModal(true);
                  }}
                >
                  {/* Row grid lines inside column */}
                  {hours.map(hour => (
                    <div 
                      key={hour} 
                      style={{ height: `${rowHeight}px` }} 
                      className="border-b border-slate-800/60 hover:bg-slate-800/15 transition-colors cursor-crosshair"
                    />
                  ))}

                  {/* Absolute positioned Event capsules */}
                  {dayEvents.map(event => {
                    const { top, height } = getEventPosition(event);
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                        style={{ top: `${top}px`, height: `${height}px` }}
                        className={`absolute left-0.5 right-0.5 p-1.5 rounded-lg border text-[10px] flex flex-col justify-between shadow-md overflow-hidden select-none cursor-pointer transition-all hover:scale-[1.01] ${getEventBadgeClass(event.type)}`}
                      >
                        <div className="font-semibold truncate leading-tight">{event.title}</div>
                        <div className="text-[8px] font-mono opacity-80 mt-0.5">
                          {event.startDateTime.split('T')[1] || ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    );
  };

  // Render Day timeline grid (Hourly 7:00 to 22:00 for single day)
  const renderDayGrid = () => {
    const dStr = formatDateStr(currentDate);
    const dayEvents = filteredEvents.filter(e => e.startDateTime.split('T')[0] === dStr);
    const hours = Array.from({ length: 16 }, (_, i) => i + 7);
    const rowHeight = 55;

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-slate-900 overflow-hidden">
        {/* Day Header */}
        <div className="border-b border-slate-800 bg-slate-950 p-3 text-center shrink-0 select-none">
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            {currentDate.toLocaleDateString('ru-RU', { weekday: 'long' })}
          </p>
          <p className="text-sm font-bold text-slate-100 mt-0.5">
            {currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Scrollable timeline grid */}
        <div className="flex-1 overflow-y-auto flex min-h-0 relative">
          
          {/* Time Labels column */}
          <div className="w-[55px] shrink-0 border-r border-slate-800 bg-slate-950 text-right pr-2.5 text-[9px] font-mono text-slate-400 select-none pt-[10px]">
            {hours.map(hour => {
              const displayHour = hour > 12 ? hour - 12 : hour;
              const ampm = hour >= 12 ? 'PM' : 'AM';
              return (
                <div key={hour} style={{ height: `${rowHeight}px` }}>
                  {displayHour} {ampm}
                </div>
              );
            })}
          </div>

          {/* Single Column Timeline */}
          <div 
            className="flex-1 relative bg-slate-900 min-h-[720px] select-none"
            onClick={() => {
              setModalDate(dStr);
              setShowAddModal(true);
            }}
          >
            {/* Grid rows */}
            {hours.map(hour => (
              <div 
                key={hour} 
                style={{ height: `${rowHeight}px` }} 
                className="border-b border-slate-800/60 hover:bg-slate-800/15 transition-colors cursor-crosshair"
              />
            ))}

            {/* Event cards */}
            {dayEvents.map(event => {
              const { top, height } = getEventPosition(event);
              return (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEvent(event);
                  }}
                  style={{ top: `${top}px`, height: `${height}px` }}
                  className={`absolute left-3 right-3 p-2 rounded-lg border text-xs flex flex-col justify-between shadow-md overflow-hidden select-none cursor-pointer transition-all hover:scale-[1.01] ${getEventBadgeClass(event.type)}`}
                >
                  <div className="font-bold truncate">{event.title}</div>
                  {event.location && (
                    <div className="text-[9px] opacity-75 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  <div className="text-[9px] font-mono opacity-80 mt-1 flex justify-between">
                    <span>{event.type}</span>
                    <span>{event.startDateTime.split('T')[1] || ''}</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    );
  };

  // Get next 3 upcoming events for right sidebar
  const upcomingEvents = events
    .filter(e => {
      const eDate = new Date(e.startDateTime);
      const today = new Date(TODAY_STR);
      return eDate >= today;
    })
    .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))
    .slice(0, 3);

  const monthNameStr = currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full w-full min-h-0 bg-slate-950 overflow-hidden text-slate-250 font-sans">
      
      {/* 1. Left Sidebar: Mini Calendar & Categories */}
      <aside className="w-full lg:w-56 border-r border-slate-800 bg-slate-950 p-3.5 flex flex-col gap-5 shrink-0 overflow-y-auto scrollbar-none">
        
        {/* Logo label */}
        <div className="flex items-center gap-2 select-none">
          <CalendarIcon className="w-4 h-4 text-accent-color" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">Calendar</span>
        </div>

        {/* Mini Calendar */}
        {renderMiniCalendar()}

        {/* Calendars/Sources filter list */}
        <div className="space-y-3 select-none flex-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
            study.antigravity
          </span>
          <div className="space-y-2 text-xs">
            {[
              { type: 'Meeting', label: 'Встречи', color: 'border-accent-color' },
              { type: 'Exam', label: 'Экзамены', color: 'border-rose-500' },
              { type: 'Homework', label: 'Д/З', color: 'border-purple-400' },
              { type: 'Deadline', label: 'Дедлайны', color: 'border-amber-500' },
              { type: 'Other', label: 'Другое', color: 'border-slate-700' }
            ].map(cat => {
              const isChecked = selectedTypes.includes(cat.type);
              return (
                <div 
                  key={cat.type} 
                  onClick={() => {
                    setSelectedTypes(prev => 
                      isChecked 
                        ? prev.filter(t => t !== cat.type) 
                        : [...prev, cat.type]
                    );
                  }}
                  className="flex items-center gap-2.5 cursor-pointer hover:text-slate-100 transition-colors"
                >
                  <div className={`w-3 h-3 rounded border flex items-center justify-center transition-all ${
                    isChecked ? 'bg-accent-color border-accent-color' : 'border-slate-700'
                  }`}>
                    {isChecked && <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                  </div>
                  <span className="truncate text-[11px] text-slate-400">{cat.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Calendar account shortcut */}
        <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400 hover:text-slate-100 cursor-pointer select-none transition-colors" onClick={() => { setModalDate(formatDateStr(new Date(TODAY_STR))); setShowAddModal(true); }}>
          + Add calendar account
        </div>
      </aside>

      {/* 2. Center Panel: Core view space */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-900">
        
        {/* Calendar Control Header */}
        <div className="h-12 border-b border-slate-800 bg-slate-950 px-4 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold text-slate-100 capitalize select-none tracking-wide">
              {monthNameStr}
            </h3>
            
            <div className="flex items-center p-0.5 rounded border border-slate-800 bg-slate-900">
              <button 
                onClick={handlePrev}
                className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleNext}
                className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <button 
              onClick={handleToday}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-semibold text-slate-100 rounded transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>

          {/* View options */}
          <div className="flex items-center p-0.5 rounded border border-slate-800 bg-slate-900 text-[10px] font-mono">
            {(['day', 'week', 'month'] as const).map(mode => {
              const labelMap = { day: 'Day', week: 'Week', month: 'Month' };
              const isActive = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-slate-100 font-semibold'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {labelMap[mode]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Inner views */}
        {viewMode === 'month' && renderMonthGrid()}
        {viewMode === 'week' && renderWeekGrid()}
        {viewMode === 'day' && renderDayGrid()}
      </main>

      {/* 3. Right Sidebar: Search, Upcoming, Shortcuts */}
      <aside className="w-full lg:w-60 border-l border-slate-800 bg-slate-950 p-3.5 flex flex-col gap-5 shrink-0 overflow-y-auto scrollbar-none">
        
        {/* Search Widget */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
          <input 
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-[10px] text-slate-200 focus:outline-none focus:border-accent-color placeholder-slate-400"
          />
        </div>

        {/* Upcoming Section */}
        <div className="space-y-2 select-none">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
            Upcoming events
          </span>
          <div className="space-y-2">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map(e => {
                const dateObj = new Date(e.startDateTime);
                const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                const timeStr = e.startDateTime.split('T')[1] || '';
                return (
                  <div 
                    key={e.id} 
                    onClick={() => setSelectedEvent(e)}
                    className="p-2.5 rounded bg-slate-900 border border-slate-800 hover:border-accent-color/40 transition-colors cursor-pointer text-[10px] space-y-1 group"
                  >
                    <div className="flex justify-between text-[8px] font-mono text-accent-color">
                      <span>{dateStr} {timeStr}</span>
                      <span className="text-slate-400 uppercase font-bold">{e.type}</span>
                    </div>
                    <p className="font-bold text-slate-100 group-hover:text-accent-color transition-colors truncate">{e.title}</p>
                    {e.location && (
                      <p className="text-[8px] text-slate-400 flex items-center gap-0.5 truncate pt-0.5">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span>{e.location}</span>
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-[10px] text-slate-400 italic py-2">No upcoming events</p>
            )}
          </div>
        </div>

      </aside>

      {/* Add Event Modal */}
      {showAddModal && (
        <EventModal
          defaultDate={modalDate}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Event/Task Modal */}
      {selectedEvent && (
        <EventModal
          eventToEdit={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
};
