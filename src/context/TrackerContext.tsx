import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Course, Task, CalendarEvent, ProjectItem } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

interface TrackerContextType {
  courses: Course[];
  events: CalendarEvent[];
  projectItems: ProjectItem[];
  activeTab: 'dashboard' | 'courses' | 'calendar' | 'fileViewer';
  setActiveTab: (tab: 'dashboard' | 'courses' | 'calendar' | 'fileViewer') => void;
  
  // Course CRUD
  addCourse: (course: Omit<Course, 'id' | 'tasks'>) => void;
  updateCourse: (id: string, updated: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
  
  // Task CRUD
  addTask: (courseId: string, text: string, dueDate?: string) => void;
  toggleTask: (courseId: string, taskId: string) => void;
  deleteTask: (courseId: string, taskId: string) => void;
  
  // Event CRUD
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, updated: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  
  // Project Items CRUD
  addProjectItem: (name: string, type: 'folder' | 'file', parentId: string | null, fileType?: string, fileData?: string, fileSize?: string) => void;
  updateProjectItem: (id: string, updated: Partial<ProjectItem>) => void;
  deleteProjectItem: (id: string) => void;
  
  // Utility Progress functions
  getCourseTimeProgress: (course: Course) => number;
  getCourseTaskProgress: (course: Course) => number;
  
  // Storage operations
  exportData: () => void;
  importData: (jsonData: string) => boolean;
  resetData: () => void;
  
  // Confirmation dialog state
  confirmState: { isOpen: boolean; message: string; onConfirm: () => void };
  triggerConfirm: (message: string, onConfirm: () => void) => void;
  closeConfirm: () => void;
}

const TrackerContext = createContext<TrackerContextType | undefined>(undefined);

// Seeds for initial user load
const seedCourses: Course[] = [
  {
    id: 'c-1',
    title: 'Нидерландский A1 — курс 1',
    startDate: '2026-05-01',
    endDate: '2026-07-01',
    status: 'active',
    description: 'Изучение алфавита, базовой грамматики и словарного запаса для повседневного общения. Занятия по вторникам и четвергам.',
    useManualProgress: false,
    tasks: [
      { id: 't-1', text: 'Выучить алфавит и правила чтения', done: true, createdAt: '2026-05-02T10:00:00Z' },
      { id: 't-2', text: 'Пройти темы 1-5 в учебнике', done: true, createdAt: '2026-05-10T12:00:00Z' },
      { id: 't-3', text: 'Освоить времена глаголов (Present Simple)', done: false, createdAt: '2026-05-15T09:00:00Z', dueDate: '2026-06-10' },
      { id: 't-4', text: 'Сдать первый разговорный тест', done: false, createdAt: '2026-05-20T11:00:00Z', dueDate: '2026-06-15' },
    ]
  },
  {
    id: 'c-2',
    title: 'Введение в квантовые вычисления',
    startDate: '2026-05-25',
    endDate: '2026-06-25',
    status: 'active',
    description: 'Курс по основам квантовой механики, кубитам и простейшим квантовым алгоритмам (Дойч-Йожи, Гровер).',
    useManualProgress: false,
    tasks: [
      { id: 't-5', text: 'Посмотреть лекции про суперпозицию и запутанность', done: true, createdAt: '2026-05-26T08:00:00Z' },
      { id: 't-6', text: 'Решить домашку по матричным представлениям операторов', done: false, createdAt: '2026-05-30T14:00:00Z', dueDate: '2026-06-08' },
      { id: 't-7', text: 'Реализовать простейшую схему в Qiskit', done: false, createdAt: '2026-06-01T10:00:00Z', dueDate: '2026-06-18' },
    ]
  },
  {
    id: 'c-3',
    title: 'UX/UI Дизайн будущего',
    startDate: '2026-03-01',
    endDate: '2026-05-15',
    status: 'completed',
    description: 'Спекулятивный дизайн, трехмерные интерфейсы в AR/VR и основы нейроинтерфейсов.',
    useManualProgress: true,
    manualProgressPercent: 100,
    tasks: [
      { id: 't-8', text: 'Создать концепт UI для AR-очков', done: true, createdAt: '2026-03-05T09:00:00Z' },
      { id: 't-9', text: 'Защитить курсовой проект перед комиссией', done: true, createdAt: '2026-05-12T15:00:00Z' },
    ]
  }
];

const seedEvents: CalendarEvent[] = [
  {
    id: 'e-1',
    title: 'Встреча с ментором по Нидерландскому',
    startDateTime: '2026-06-06T16:00',
    endDateTime: '2026-06-06T17:00',
    type: 'Meeting',
    location: 'Discord, сервер Языки',
    notes: 'Обсудить произношение дифтонгов и проверить домашнее задание №3.'
  },
  {
    id: 'e-2',
    title: 'Дедлайн: Домашка по Квантам',
    startDateTime: '2026-06-08T23:59',
    endDateTime: '2026-06-09T00:00',
    type: 'Deadline',
    location: 'ЛМС МФТИ',
    notes: 'Загрузить PDF-файл с решением задач №2.4 - №2.8.'
  },
  {
    id: 'e-3',
    title: 'Контрольная работа: Базовая Грамматика',
    startDateTime: '2026-06-11T10:00',
    endDateTime: '2026-06-11T12:00',
    type: 'Exam',
    location: 'Аудитория 405',
    notes: 'Взять с собой ручку и словарь. Телефоны запрещены.'
  },
  {
    id: 'e-4',
    title: 'Прочитать статью о квантовой телепортации',
    startDateTime: '2026-06-07T12:00',
    endDateTime: '2026-06-07T14:00',
    type: 'Homework',
    location: 'Дома',
    notes: 'Статья на arXiv: quantum teleportation review.'
  }
];

const seedProjectItems: ProjectItem[] = [
  {
    id: 'p-1',
    name: 'Нидерландский язык',
    type: 'folder',
    parentId: null
  },
  {
    id: 'p-1-1',
    name: 'Словарь_А1.txt',
    type: 'file',
    parentId: 'p-1',
    fileType: 'txt',
    fileData: 'Hallo - Привет\nGoedemorgen - Доброе утро\nAlstublieft - Пожалуйста\nDank u wel - Спасибо\nTot ziens - До свидания',
    fileSize: '120 Bytes'
  },
  {
    id: 'p-2',
    name: 'Квантовая механика',
    type: 'folder',
    parentId: null
  },
  {
    id: 'p-2-1',
    name: 'Шпаргалка_Операторы.txt',
    type: 'file',
    parentId: 'p-2',
    fileType: 'txt',
    fileData: 'Оператор Гамильтона (H) выражает полную энергию квантовой системы.\nКубит - суперпозиция состояний |0> и |1>.\nСфера Блоха - геометрическое представление кубита.',
    fileSize: '190 Bytes'
  }
];

export const TrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<Course[]>(() => {
    const data = localStorage.getItem('antigravity_courses');
    return data ? JSON.parse(data) : seedCourses;
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const data = localStorage.getItem('antigravity_events');
    return data ? JSON.parse(data) : seedEvents;
  });

  const [projectItems, setProjectItems] = useState<ProjectItem[]>(() => {
    const data = localStorage.getItem('antigravity_project_items');
    return data ? JSON.parse(data) : seedProjectItems;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'courses' | 'calendar' | 'fileViewer'>('dashboard');

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  const triggerConfirm = (message: string, onConfirm: () => void) => {
    setConfirmState({
      isOpen: true,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const closeConfirm = () => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  // Firestore Sync Effect
  useEffect(() => {
    // 1. Subscribe to Courses
    const unsubscribeCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      const cloudCourses: Course[] = [];
      snapshot.forEach((doc) => {
        cloudCourses.push({ ...doc.data(), id: doc.id } as Course);
      });
      if (cloudCourses.length > 0) {
        setCourses(cloudCourses);
        localStorage.setItem('antigravity_courses', JSON.stringify(cloudCourses));
      } else {
        const local = localStorage.getItem('antigravity_courses');
        if (!local || JSON.parse(local).length === 0) {
          seedCourses.forEach(c => saveCourseToCloud(c));
        } else {
          try {
            const localCourses: Course[] = JSON.parse(local);
            localCourses.forEach(c => saveCourseToCloud(c));
          } catch (e) {
            seedCourses.forEach(c => saveCourseToCloud(c));
          }
        }
      }
    }, (error) => {
      console.warn("Firestore subscription error (courses). Using LocalStorage.", error);
    });

    // 2. Subscribe to Events
    const unsubscribeEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      const cloudEvents: CalendarEvent[] = [];
      snapshot.forEach((doc) => {
        cloudEvents.push({ ...doc.data(), id: doc.id } as CalendarEvent);
      });
      if (cloudEvents.length > 0) {
        setEvents(cloudEvents);
        localStorage.setItem('antigravity_events', JSON.stringify(cloudEvents));
      } else {
        const local = localStorage.getItem('antigravity_events');
        if (!local || JSON.parse(local).length === 0) {
          seedEvents.forEach(e => saveEventToCloud(e));
        } else {
          try {
            const localEvents: CalendarEvent[] = JSON.parse(local);
            localEvents.forEach(e => saveEventToCloud(e));
          } catch (e) {
            seedEvents.forEach(e => saveEventToCloud(e));
          }
        }
      }
    }, (error) => {
      console.warn("Firestore subscription error (events). Using LocalStorage.", error);
    });

    // 3. Subscribe to Project Items
    const unsubscribeProjectItems = onSnapshot(collection(db, 'project_items'), (snapshot) => {
      const cloudItems: ProjectItem[] = [];
      snapshot.forEach((doc) => {
        cloudItems.push({ ...doc.data(), id: doc.id } as ProjectItem);
      });
      if (cloudItems.length > 0) {
        setProjectItems(cloudItems);
        localStorage.setItem('antigravity_project_items', JSON.stringify(cloudItems));
      } else {
        const local = localStorage.getItem('antigravity_project_items');
        if (!local || JSON.parse(local).length === 0) {
          seedProjectItems.forEach(p => saveProjectItemToCloud(p));
        } else {
          try {
            const localItems: ProjectItem[] = JSON.parse(local);
            localItems.forEach(p => saveProjectItemToCloud(p));
          } catch (e) {
            seedProjectItems.forEach(p => saveProjectItemToCloud(p));
          }
        }
      }
    }, (error) => {
      console.warn("Firestore subscription error (project_items). Using LocalStorage.", error);
    });

    return () => {
      unsubscribeCourses();
      unsubscribeEvents();
      unsubscribeProjectItems();
    };
  }, []);

  // Sync changes to localStorage as secondary backup
  useEffect(() => {
    localStorage.setItem('antigravity_courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem('antigravity_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('antigravity_project_items', JSON.stringify(projectItems));
  }, [projectItems]);

  // Merge manual events with auto-events from tasks that have a dueDate
  const combinedEvents: CalendarEvent[] = [...events];
  courses.forEach(course => {
    course.tasks.forEach(task => {
      if (task.dueDate) {
        combinedEvents.push({
          id: `task-ev-${task.id}`,
          title: `${task.done ? '✓' : '📌'} [${course.title}] ${task.text}`,
          startDateTime: `${task.dueDate}T09:00`,
          endDateTime: `${task.dueDate}T10:00`,
          type: task.done ? 'Other' : 'Deadline', // Muted category if done
          notes: `Связано с задачей из курса "${course.title}". Статус: ${task.done ? 'Выполнено' : 'Не выполнено'}.`,
          location: 'Курс'
        });
      }
    });
  });

  // Firestore Write helper wrapper
  const saveCourseToCloud = async (course: Course) => {
    try {
      await setDoc(doc(db, 'courses', course.id), course);
    } catch (e) {
      console.warn("Error uploading course to Firestore (offline?):", e);
    }
  };

  const deleteCourseFromCloud = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'courses', id));
    } catch (e) {
      console.warn("Error deleting course from Firestore (offline?):", e);
    }
  };

  const saveEventToCloud = async (event: CalendarEvent) => {
    try {
      await setDoc(doc(db, 'events', event.id), event);
    } catch (e) {
      console.warn("Error uploading event to Firestore (offline?):", e);
    }
  };

  const deleteEventFromCloud = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (e) {
      console.warn("Error deleting event from Firestore (offline?):", e);
    }
  };

  const saveProjectItemToCloud = async (item: ProjectItem) => {
    try {
      // Limit size of files synced to Firestore to avoid Firestore document limits (1MB)
      if (item.fileData && item.fileData.length > 800 * 1024) {
        console.warn("File too large for firestore document, saving locally only.");
        // Store empty string in cloud but save locally
        const cloudItem = { ...item, fileData: '' };
        await setDoc(doc(db, 'project_items', item.id), cloudItem);
        return;
      }
      await setDoc(doc(db, 'project_items', item.id), item);
    } catch (e) {
      console.warn("Error uploading project item to Firestore (offline?):", e);
    }
  };

  const deleteProjectItemFromCloud = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'project_items', id));
    } catch (e) {
      console.warn("Error deleting project item from Firestore (offline?):", e);
    }
  };

  // Course CRUD handlers
  const addCourse = (newCourse: Omit<Course, 'id' | 'tasks'>) => {
    const course: Course = {
      ...newCourse,
      id: `c-${Date.now()}`,
      tasks: []
    };
    setCourses(prev => [...prev, course]);
    saveCourseToCloud(course);
  };

  const updateCourse = (id: string, updated: Partial<Course>) => {
    let updatedCourse: Course | null = null;
    setCourses(prev => prev.map(c => {
      if (c.id === id) {
        updatedCourse = { ...c, ...updated };
        return updatedCourse;
      }
      return c;
    }));
    
    // Propagate to Firestore
    setTimeout(() => {
      if (updatedCourse) {
        saveCourseToCloud(updatedCourse);
      }
    }, 50);
  };

  const deleteCourse = (id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id));
    deleteCourseFromCloud(id);
  };

  // Task CRUD handlers
  const addTask = (courseId: string, text: string, dueDate?: string) => {
    const task: Task = {
      id: `t-${Date.now()}`,
      text,
      done: false,
      createdAt: new Date().toISOString(),
      dueDate
    };
    
    let targetCourse: Course | null = null;
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        targetCourse = { ...c, tasks: [...c.tasks, task] };
        return targetCourse;
      }
      return c;
    }));

    setTimeout(() => {
      if (targetCourse) {
        saveCourseToCloud(targetCourse);
      }
    }, 50);
  };

  const toggleTask = (courseId: string, taskId: string) => {
    let targetCourse: Course | null = null;
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        targetCourse = {
          ...c,
          tasks: c.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
        };
        return targetCourse;
      }
      return c;
    }));

    setTimeout(() => {
      if (targetCourse) {
        saveCourseToCloud(targetCourse);
      }
    }, 50);
  };

  const deleteTask = (courseId: string, taskId: string) => {
    let targetCourse: Course | null = null;
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        targetCourse = {
          ...c,
          tasks: c.tasks.filter(t => t.id !== taskId)
        };
        return targetCourse;
      }
      return c;
    }));

    setTimeout(() => {
      if (targetCourse) {
        saveCourseToCloud(targetCourse);
      }
    }, 50);
  };

  // Event CRUD handlers
  const addEvent = (newEvent: Omit<CalendarEvent, 'id'>) => {
    const event: CalendarEvent = {
      ...newEvent,
      id: `e-${Date.now()}`
    };
    setEvents(prev => [...prev, event]);
    saveEventToCloud(event);
  };

  const updateEvent = (id: string, updated: Partial<CalendarEvent>) => {
    let targetEvent: CalendarEvent | null = null;
    setEvents(prev => prev.map(e => {
      if (e.id === id) {
        targetEvent = { ...e, ...updated };
        return targetEvent;
      }
      return e;
    }));

    setTimeout(() => {
      if (targetEvent) {
        saveEventToCloud(targetEvent);
      }
    }, 50);
  };

  const deleteEvent = (id: string) => {
    if (id.startsWith('task-ev-')) {
      const taskId = id.substring(8);
      const targetCourse = courses.find(c => c.tasks.some(t => t.id === taskId));
      if (targetCourse) {
        deleteTask(targetCourse.id, taskId);
      }
      return;
    }
    setEvents(prev => prev.filter(e => e.id !== id));
    deleteEventFromCloud(id);
  };

  // Project Items CRUD
  const addProjectItem = (
    name: string, 
    type: 'folder' | 'file', 
    parentId: string | null, 
    fileType?: string, 
    fileData?: string, 
    fileSize?: string
  ) => {
    const item: ProjectItem = {
      id: `p-${Date.now()}`,
      name,
      type,
      parentId,
      fileType,
      fileData,
      fileSize
    };
    setProjectItems(prev => [...prev, item]);
    saveProjectItemToCloud(item);
  };

  const deleteProjectItem = (id: string) => {
    // Delete target item
    setProjectItems(prev => prev.filter(item => {
      // Also delete files inside if this is a folder
      if (item.parentId === id) {
        deleteProjectItemFromCloud(item.id);
        return false;
      }
      return item.id !== id;
    }));
    deleteProjectItemFromCloud(id);
  };

  const updateProjectItem = (id: string, updated: Partial<ProjectItem>) => {
    let targetItem: ProjectItem | null = null;
    setProjectItems(prev => prev.map(item => {
      if (item.id === id) {
        targetItem = { ...item, ...updated };
        return targetItem;
      }
      return item;
    }));

    setTimeout(() => {
      if (targetItem) {
        saveProjectItemToCloud(targetItem);
      }
    }, 50);
  };

  // Helper calculation functions
  const getCourseTimeProgress = (course: Course): number => {
    if (course.useManualProgress) {
      return course.manualProgressPercent ?? 0;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(course.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(course.endDate);
    end.setHours(0, 0, 0, 0);

    const todayMs = today.getTime();
    const startMs = start.getTime();
    const endMs = end.getTime();

    if (todayMs < startMs) return 0;
    if (todayMs > endMs) return 100;
    
    const totalDuration = endMs - startMs;
    if (totalDuration <= 0) return 100;
    
    const elapsed = todayMs - startMs;
    return Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
  };

  const getCourseTaskProgress = (course: Course): number => {
    if (course.tasks.length === 0) return 0;
    const completed = course.tasks.filter(t => t.done).length;
    return Math.round((completed / course.tasks.length) * 100);
  };

  // Storage operations
  const exportData = () => {
    const dataStr = JSON.stringify({ courses, events, projectItems }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `antigravity_study_tracker_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed && Array.isArray(parsed.courses) && Array.isArray(parsed.events)) {
        setCourses(parsed.courses);
        setEvents(parsed.events);

        if (Array.isArray(parsed.projectItems)) {
          setProjectItems(parsed.projectItems);
          parsed.projectItems.forEach((p: ProjectItem) => saveProjectItemToCloud(p));
        }

        // Sync import to Cloud
        parsed.courses.forEach((c: Course) => saveCourseToCloud(c));
        parsed.events.forEach((e: CalendarEvent) => saveEventToCloud(e));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import JSON data:', e);
      return false;
    }
  };

  const resetData = async () => {
    // Delete all current records in cloud (if online)
    courses.forEach(c => deleteCourseFromCloud(c.id));
    events.forEach(e => deleteEventFromCloud(e.id));
    projectItems.forEach(p => deleteProjectItemFromCloud(p.id));

    // Reset local state to seed
    setCourses(seedCourses);
    setEvents(seedEvents);
    setProjectItems(seedProjectItems);
    setActiveTab('dashboard');

    // Populate seeds in cloud
    seedCourses.forEach(c => saveCourseToCloud(c));
    seedEvents.forEach(e => saveEventToCloud(e));
    seedProjectItems.forEach(p => saveProjectItemToCloud(p));
  };

  return (
    <TrackerContext.Provider
      value={{
        courses,
        events: combinedEvents, // expose merged events
        projectItems,
        activeTab,
        setActiveTab,
        addCourse,
        updateCourse,
        deleteCourse,
        addTask,
        toggleTask,
        deleteTask,
        addEvent,
        updateEvent,
        deleteEvent,
        addProjectItem,
        updateProjectItem,
        deleteProjectItem,
        getCourseTimeProgress,
        getCourseTaskProgress,
        exportData,
        importData,
        resetData,
        confirmState,
        triggerConfirm,
        closeConfirm
      }}
    >
      {children}
    </TrackerContext.Provider>
  );
};

export const useTracker = () => {
  const context = useContext(TrackerContext);
  if (context === undefined) {
    throw new Error('useTracker must be used within a TrackerProvider');
  }
  return context;
};
