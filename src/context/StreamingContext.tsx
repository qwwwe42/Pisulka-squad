import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import type { Show, Episode, WatchProgress, Comment, NewsArticle, MinecraftConfig } from '../types/streaming';

interface StreamingContextType {
  shows: Show[];
  watchProgress: Record<string, WatchProgress>;
  activeShowId: string | null;
  activeEpisodeId: string | null;
  setActiveShowId: (id: string | null) => void;
  setActiveEpisodeId: (id: string | null) => void;
  addShow: (show: Omit<Show, 'id' | 'episodes'>) => Promise<string>;
  updateShow: (showId: string, show: Partial<Show>) => Promise<void>;
  deleteShow: (showId: string) => Promise<void>;
  addEpisode: (showId: string, episode: Omit<Episode, 'id'>) => Promise<void>;
  updateEpisode: (showId: string, episodeId: string, episode: Partial<Episode>) => Promise<void>;
  deleteEpisode: (showId: string, episodeId: string) => Promise<void>;
  updateWatchProgress: (episodeId: string, showId: string, watchedDuration: number, totalDuration: number) => void;
  rateShow: (showId: string, rating: number) => Promise<void>;
  addComment: (showId: string, author: string, text: string) => Promise<void>;
  news: NewsArticle[];
  addNews: (newsItem: Omit<NewsArticle, 'id'>) => Promise<string>;
  updateNews: (newsId: string, newsItem: Partial<NewsArticle>) => Promise<void>;
  deleteNews: (newsId: string) => Promise<void>;
  minecraftConfig: MinecraftConfig;
  updateMinecraftConfig: (config: MinecraftConfig) => Promise<void>;
  loadDemoData: () => void;
  clearAllData: () => void;
  isFirebaseConnected: boolean;
}

const StreamingContext = createContext<StreamingContextType | undefined>(undefined);

const LS_SHOWS_KEY = 'penis_ink_shows';
const LS_PROGRESS_KEY = 'penis_ink_progress';
const LS_FIREBASE_FAIL_KEY = 'penis_ink_firebase_write_failed';
const LS_SYNCED_KEY = 'penis_ink_synced_shows';

const DEMO_SHOWS: Show[] = [
  {
    id: 'demo-anime-1',
    title: 'Клинок, рассекающий демонов: Квартал красных фонарей',
    description: 'Тандзиро и его друзья отправляются в Квартал красных фонарей, чтобы помочь столпу звука Тенгену Узую разыскать его пропавших жен-куноити и сразиться с коварным демоном высшей луны.',
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop',
    thumbnailImage: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop',
    category: 'Anime',
    status: 'ongoing',
    scheduleType: 'weekly',
    scheduleDay: 6,
    scheduleTime: '20:00',
    nextEpisodeRelease: (() => {
      const now = new Date();
      const nextSat = new Date();
      nextSat.setDate(now.getDate() + (6 - now.getDay() + 7) % 7);
      nextSat.setHours(20, 0, 0, 0);
      if (nextSat.getTime() <= now.getTime()) {
        nextSat.setDate(nextSat.getDate() + 7);
      }
      return nextSat.toISOString();
    })(),
    episodes: [
      {
        id: 'demo-ep-1',
        number: 1,
        title: 'Столп Звука Тенген Узуй',
        description: 'Тенген Узуй забирает Аой и Нахо на задание, но Тандзиро вызывается пойти вместо них вместе с Дзеницу и Иносукэ.',
        driveUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        releaseDate: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
        duration: '09:56',
        thumbnail: 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e01a?q=80&w=400&auto=format&fit=crop'
      },
      {
        id: 'demo-ep-2',
        number: 2,
        title: 'Проникновение в Квартал красных фонарей',
        description: 'Команда переодевается в девочек и устраивается в чайные дома, чтобы начать расследование исчезновения жен Тенгена.',
        driveUrl: 'https://drive.google.com/file/d/1t87s-a2J9_rJ-tU.../view',
        releaseDate: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
        duration: '23:40',
        thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=400&auto=format&fit=crop'
      },
      {
        id: 'demo-ep-3',
        number: 3,
        title: 'Скрытые намерения высшей луны',
        description: 'Иносукэ подозревает, что демон скрывается в доме Огимото, и начинает собственную охоту.',
        driveUrl: 'https://drive.google.com/file/d/1_9i9aX_Mee2vS-u.../view',
        releaseDate: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 2);
          return d.toISOString();
        })(),
        duration: '24:15',
        thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=400&auto=format&fit=crop'
      }
    ]
  },
  {
    id: 'demo-series-1',
    title: 'Мандалорец',
    description: 'Одинокий мандалорец-наемник живет на краю обитаемой галактики, где закон Новой Республики не имеет силы. Он сталкивается с необычным заказом, который навсегда изменит его судьбу.',
    coverImage: 'https://images.unsplash.com/photo-1593085512500-5d55148d6f0d?q=80&w=1920&auto=format&fit=crop',
    thumbnailImage: 'https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?q=80&w=600&auto=format&fit=crop',
    category: 'Series',
    status: 'completed',
    episodes: [
      {
        id: 'mando-ep-1',
        number: 1,
        title: 'Глава 1: Мандалорец',
        description: 'Охотник за головами получает высокооплачиваемый заказ от таинственного клиента, связанного с остатками Империи.',
        driveUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        releaseDate: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString(),
        duration: '10:53',
        thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop'
      }
    ]
  }
];

export const DEMO_NEWS: NewsArticle[] = [
  {
    id: 'news-1',
    title: 'Открытие Медиа-Портала!',
    content: 'Сегодня мы официально запустили наш собственный онлайн-кинотеатр **pisulka-squad**. Добавляйте свои любимые сериалы с Google Диска, отслеживайте время выхода новых серий по таймерам, пишите отзывы в комментариях и делитесь впечатлениями с друзьями!',
    date: new Date('2026-06-07T12:00:00.000Z').toISOString(),
    tag: '07 ИЮНЯ 2026'
  },
  {
    id: 'news-2',
    title: 'Запуск Minecraft сервера',
    content: 'Наш собственный сервер выживания теперь запущен на версии **1.20.4**! Заходите играть, кооперироваться с друзьями, строить базы и участвовать в регулярных турнирах. Адрес для входа: mc.pisulka-squad.ru.',
    date: new Date('2026-06-07T10:00:00.000Z').toISOString(),
    tag: 'ИГРОВОЙ СЕРВЕР'
  }
];

export const DEFAULT_MINECRAFT_CONFIG: MinecraftConfig = {
  serverIp: 'mc.pisulka-squad.ru',
  version: '1.20.4',
  description: 'Добро пожаловать в наш уютный уголок выживания! У нас нет токсичных игроков, только ламповая атмосфера, приватные территории, и веселое общение.',
  rules: [
    { title: 'Уважение игроков', description: 'Не оскорбляйте других участников, стройте дружеские отношения и помогайте новичкам.' },
    { title: 'Запрет читов и грифа', description: 'Любые чит-клиенты (X-Ray, Fly и т.д.) и воровство/разрушение чужих построек ведут к вечному бану.' },
    { title: 'Приваты территорий', description: 'Используйте деревянный топор для выделения региона и команду /rg claim [имя], чтобы защитить дом.' },
    { title: 'Регулярные эвенты', description: 'Администрация регулярно проводит конкурсы построек, ПвП турниры и викторины с крутыми призами.' }
  ],
  steps: [
    { title: 'Запустите Minecraft', description: 'Рекомендуемая версия клиента — 1.20.4 (поддерживается и чистый ванильный клиент, и любые лаунчеры, например, TLauncher или Legacy Launcher).' },
    { title: 'Добавьте сервер', description: 'Зайдите в раздел «Сетевая игра» → «Добавить» и вставьте скопированный IP-адрес: mc.pisulka-squad.ru.' },
    { title: 'Создайте аккаунт при входе', description: 'При первом входе на сервер откройте чат (клавиша T) и зарегистрируйтесь с помощью команды: /register [ваш_пароль] [подтверждение_пароля]. В будущем для авторизации используйте команду /login [ваш_пароль].' }
  ],
  players: [
    { name: 'screp', role: 'Админ', online: true },
    { name: 'antigravity', role: 'Игрок', online: true },
    { name: 'Steve', role: 'Игрок', online: true },
    { name: 'Alex', role: 'Игрок', online: true },
    { name: 'Notch', role: 'Легенда', online: true },
    { name: 'miner_49er', role: 'Игрок', online: true }
  ]
};

// ======================================================================
// LocalStorage helpers — localStorage is the definitive source of truth
// ======================================================================
const persistShowsToLS = (shows: Show[]) => {
  try {
    localStorage.setItem(LS_SHOWS_KEY, JSON.stringify(shows));
  } catch (e) {
    console.warn('Failed to persist shows to localStorage', e);
  }
};

const persistProgressToLS = (progress: Record<string, WatchProgress>) => {
  try {
    localStorage.setItem(LS_PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn('Failed to persist progress to localStorage', e);
  }
};

const loadShowsFromLS = (): Show[] | null => {
  try {
    const raw = localStorage.getItem(LS_SHOWS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
};

const loadProgressFromLS = (): Record<string, WatchProgress> => {
  try {
    const raw = localStorage.getItem(LS_PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
};

const loadSyncedShowsFromLS = (): string[] => {
  try {
    const raw = localStorage.getItem(LS_SYNCED_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};

const persistSyncedShowsToLS = (ids: string[]) => {
  try {
    localStorage.setItem(LS_SYNCED_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
};

export const getOrCreateUserId = (): string => {
  let id = localStorage.getItem('penis_ink_user_id');
  if (!id) {
    id = 'user-' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('penis_ink_user_id', id);
  }
  return id;
};

export const getShowAverageRating = (ratings?: Record<string, number>) => {
  if (!ratings) return { average: 0, count: 0 };
  const values = Object.values(ratings);
  if (values.length === 0) return { average: 0, count: 0 };
  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = Math.round((sum / values.length) * 10) / 10;
  return { average, count: values.length };
};

export const StreamingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from localStorage immediately on mount (synchronous, no flicker)
  const [shows, setShows] = useState<Show[]>(() => {
    const cached = loadShowsFromLS();
    return cached && cached.length > 0 ? cached : [];
  });
  const [news, setNews] = useState<NewsArticle[]>(() => {
    try {
      const cached = localStorage.getItem('penis_ink_news');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [minecraftConfig, setMinecraftConfig] = useState<MinecraftConfig>(() => {
    try {
      const cached = localStorage.getItem('penis_ink_minecraft_config');
      return cached ? JSON.parse(cached) : DEFAULT_MINECRAFT_CONFIG;
    } catch {
      return DEFAULT_MINECRAFT_CONFIG;
    }
  });
  const [watchProgress, setWatchProgress] = useState<Record<string, WatchProgress>>(() => loadProgressFromLS());
  const [activeShowId, setActiveShowId] = useState<string | null>(null);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // Refs for managing the onSnapshot subscription
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isFirebaseConnectedRef = useRef(false);

  // Keep the ref in sync with state
  useEffect(() => {
    isFirebaseConnectedRef.current = isFirebaseConnected;
  }, [isFirebaseConnected]);



  const handleWriteFailure = useCallback((e: unknown) => {
    console.error('Firestore write failed (will retry on next operation):', e);
    // Don't permanently block — just log the error.
    // The root cause (undefined properties) is fixed, so transient errors should be retried.
  }, []);

  // ====================================================================
  // 1. On mount: Try to connect Firebase. MERGE Firestore data with
  //    localStorage data (never replace). If Firebase fails, just use LS.
  // ====================================================================
  useEffect(() => {
    const connectFirebase = async () => {
      // Always clear any old failure flags — the root cause is fixed
      localStorage.removeItem(LS_FIREBASE_FAIL_KEY);

      // Auto-reset synced list if project ID changed (so local data uploads to new DB)
      const lastProjId = localStorage.getItem('penis_ink_last_project_id');
      const currentProjId = 'recipe-vault-e5912';
      if (lastProjId !== currentProjId) {
        localStorage.removeItem(LS_SYNCED_KEY);
        localStorage.setItem('penis_ink_last_project_id', currentProjId);
      }

      try {
        // Test connection with a read
        await getDocs(collection(db, 'shows'));
        setIsFirebaseConnected(true);
        isFirebaseConnectedRef.current = true;

        // Start real-time listener for shows
        const unsub = onSnapshot(collection(db, 'shows'), (snapshot) => {
          const firestoreShows: Show[] = [];
          snapshot.forEach((docSnap) => {
            firestoreShows.push({ id: docSnap.id, ...docSnap.data() } as Show);
          });

          const currentLocalShows = loadShowsFromLS() || [];

          if (firestoreShows.length === 0 && currentLocalShows.length === 0) {
            seedFirestoreDemo();
            return;
          }

          const syncedIds = new Set(loadSyncedShowsFromLS());
          const firestoreIds = new Set(firestoreShows.map(s => s.id));

          const nextLocalShows: Show[] = [];
          const nextSyncedIds: string[] = [];

          // Keep/update local shows based on Firestore status
          for (const localShow of currentLocalShows) {
            if (firestoreIds.has(localShow.id)) {
              // Show exists in Firestore. Prefer the Firestore version to get all real-time updates (edits, episodes, hidden state)
              const fsShow = firestoreShows.find(s => s.id === localShow.id)!;
              nextLocalShows.push(fsShow);
              nextSyncedIds.push(localShow.id);
            } else {
              // Show does NOT exist in Firestore.
              if (syncedIds.has(localShow.id)) {
                // This show was previously synced, meaning it has been deleted from Firestore.
                // We delete it locally.
                console.log(`Show ${localShow.title} (${localShow.id}) was deleted in Firestore. Removing locally.`);
              } else {
                // This show was never synced, meaning it was created locally offline.
                // Keep it and trigger background upload to Firestore.
                nextLocalShows.push(localShow);
                setDoc(doc(db, 'shows', localShow.id), localShow).catch(console.error);
              }
            }
          }

          // Add any new shows from Firestore that are not in local storage yet
          const localIds = new Set(currentLocalShows.map(s => s.id));
          for (const fsShow of firestoreShows) {
            if (!localIds.has(fsShow.id)) {
              nextLocalShows.push(fsShow);
              nextSyncedIds.push(fsShow.id);
            }
          }

          const sortedShows = nextLocalShows.sort((a, b) => {
            const titleA = a.title || '';
            const titleB = b.title || '';
            return titleA.localeCompare(titleB);
          });

          setShows(sortedShows);
          persistShowsToLS(sortedShows);
          persistSyncedShowsToLS(nextSyncedIds);

        }, (error) => {
          console.warn('Firestore onSnapshot error:', error);
        });

        // Start real-time listener for news
        const unsubNews = onSnapshot(collection(db, 'news'), (snapshot) => {
          const firestoreNews: NewsArticle[] = [];
          snapshot.forEach((docSnap) => {
            firestoreNews.push({ id: docSnap.id, ...docSnap.data() } as NewsArticle);
          });

          if (firestoreNews.length === 0) {
            DEMO_NEWS.forEach(item => {
              setDoc(doc(db, 'news', item.id), item).catch(console.error);
            });
            setNews(DEMO_NEWS);
            localStorage.setItem('penis_ink_news', JSON.stringify(DEMO_NEWS));
          } else {
            const sorted = firestoreNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setNews(sorted);
            localStorage.setItem('penis_ink_news', JSON.stringify(sorted));
          }
        }, (error) => {
          console.warn('Firestore news onSnapshot error:', error);
        });

        // Start real-time listener for minecraft settings
        const unsubMinecraft = onSnapshot(doc(db, 'settings', 'minecraft'), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as MinecraftConfig;
            setMinecraftConfig(data);
            localStorage.setItem('penis_ink_minecraft_config', JSON.stringify(data));
          } else {
            setDoc(doc(db, 'settings', 'minecraft'), DEFAULT_MINECRAFT_CONFIG).catch(console.error);
            setMinecraftConfig(DEFAULT_MINECRAFT_CONFIG);
            localStorage.setItem('penis_ink_minecraft_config', JSON.stringify(DEFAULT_MINECRAFT_CONFIG));
          }
        }, (error) => {
          console.warn('Firestore minecraft config onSnapshot error:', error);
        });

        unsubscribeRef.current = () => {
          unsub();
          unsubNews();
          unsubMinecraft();
        };
      } catch (err) {
        console.warn('Firebase connection failed, using localStorage:', err);
        setIsFirebaseConnected(false);
        if (!loadShowsFromLS() || loadShowsFromLS()!.length === 0) {
          setShows(DEMO_SHOWS);
          persistShowsToLS(DEMO_SHOWS);
        }
        const cachedNews = localStorage.getItem('penis_ink_news');
        if (!cachedNews || JSON.parse(cachedNews).length === 0) {
          setNews(DEMO_NEWS);
          localStorage.setItem('penis_ink_news', JSON.stringify(DEMO_NEWS));
        }
        const cachedMc = localStorage.getItem('penis_ink_minecraft_config');
        if (!cachedMc) {
          setMinecraftConfig(DEFAULT_MINECRAFT_CONFIG);
          localStorage.setItem('penis_ink_minecraft_config', JSON.stringify(DEFAULT_MINECRAFT_CONFIG));
        }
      }
    };

    connectFirebase();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  const seedFirestoreDemo = async (): Promise<boolean> => {
    try {
      for (const show of DEMO_SHOWS) {
        await setDoc(doc(db, 'shows', show.id), show);
      }
      persistShowsToLS(DEMO_SHOWS);
      return true;
    } catch (e) {
      console.error('Failed to seed demo data to Firestore:', e);
      handleWriteFailure(e);
      setShows(DEMO_SHOWS);
      persistShowsToLS(DEMO_SHOWS);
      return false;
    }
  };

  // ====================================================================
  // 2. CRUD Operations — ALWAYS write to localStorage first.
  //    Firestore is best-effort sync. If Firestore fails, we unsubscribe
  //    the listener so it can never overwrite our local data.
  // ====================================================================

  const addShow = async (showData: Omit<Show, 'id' | 'episodes'>): Promise<string> => {
    const newShow: Show = {
      ...showData,
      id: 'show-' + Date.now().toString(),
      episodes: []
    };

    const updatedShows = [...shows, newShow];
    // 1. Always write to state + localStorage FIRST
    setShows(updatedShows);
    persistShowsToLS(updatedShows);

    // 2. Best-effort Firestore sync
    if (isFirebaseConnectedRef.current) {
      try {
        await setDoc(doc(db, 'shows', newShow.id), newShow);
      } catch (e) {
        handleWriteFailure(e);
      }
    }

    return newShow.id;
  };

  const updateShow = async (showId: string, updatedFields: Partial<Show>) => {
    const updatedShows = shows.map((s) => {
      if (s.id === showId) {
        const nextShow = { ...s, ...updatedFields };
        if (updatedFields.status === 'completed') {
          nextShow.nextEpisodeRelease = null;
        }
        return nextShow;
      }
      return s;
    });

    // 1. Always write to state + localStorage FIRST
    setShows(updatedShows);
    persistShowsToLS(updatedShows);

    // 2. Best-effort Firestore sync
    if (isFirebaseConnectedRef.current) {
      try {
        const targetShow = updatedShows.find(s => s.id === showId);
        if (targetShow) {
          await setDoc(doc(db, 'shows', showId), targetShow);
        }
      } catch (e) {
        handleWriteFailure(e);
      }
    }
  };

  const deleteShow = async (showId: string) => {
    const updatedShows = shows.filter((s) => s.id !== showId);

    // 1. Always write to state + localStorage FIRST
    setShows(updatedShows);
    persistShowsToLS(updatedShows);

    // Remove from synced shows list so we don't think it was deleted in cloud and needs local deletion
    const synced = loadSyncedShowsFromLS();
    persistSyncedShowsToLS(synced.filter(id => id !== showId));

    // 2. Best-effort Firestore sync
    if (isFirebaseConnectedRef.current) {
      try {
        await deleteDoc(doc(db, 'shows', showId));
      } catch (e) {
        handleWriteFailure(e);
      }
    }

    if (activeShowId === showId) {
      setActiveShowId(null);
      setActiveEpisodeId(null);
    }
  };

  const addEpisode = async (showId: string, episodeData: Omit<Episode, 'id'>) => {
    const newEpisode: Episode = {
      ...episodeData,
      id: 'ep-' + Date.now().toString()
    };

    const updatedShows = shows.map((s) => {
      if (s.id === showId) {
        const episodes = [...s.episodes, newEpisode].sort((a, b) => a.number - b.number);
        return { ...s, episodes };
      }
      return s;
    });

    // 1. Always write to state + localStorage FIRST
    setShows(updatedShows);
    persistShowsToLS(updatedShows);

    // 2. Best-effort Firestore sync
    if (isFirebaseConnectedRef.current) {
      try {
        const targetShow = updatedShows.find(s => s.id === showId);
        if (targetShow) {
          await setDoc(doc(db, 'shows', showId), targetShow);
        }
      } catch (e) {
        handleWriteFailure(e);
      }
    }
  };

  const updateEpisode = async (showId: string, episodeId: string, updatedFields: Partial<Episode>) => {
    const updatedShows = shows.map((s) => {
      if (s.id === showId) {
        const episodes = s.episodes.map((ep) => {
          if (ep.id === episodeId) {
            return { ...ep, ...updatedFields };
          }
          return ep;
        }).sort((a, b) => a.number - b.number);
        return { ...s, episodes };
      }
      return s;
    });

    // 1. Always write to state + localStorage FIRST
    setShows(updatedShows);
    persistShowsToLS(updatedShows);

    // 2. Best-effort Firestore sync
    if (isFirebaseConnectedRef.current) {
      try {
        const targetShow = updatedShows.find(s => s.id === showId);
        if (targetShow) {
          await setDoc(doc(db, 'shows', showId), targetShow);
        }
      } catch (e) {
        handleWriteFailure(e);
      }
    }
  };

  const deleteEpisode = async (showId: string, episodeId: string) => {
    const updatedShows = shows.map((s) => {
      if (s.id === showId) {
        const episodes = s.episodes.filter((ep) => ep.id !== episodeId);
        return { ...s, episodes };
      }
      return s;
    });

    // 1. Always write to state + localStorage FIRST
    setShows(updatedShows);
    persistShowsToLS(updatedShows);

    // 2. Best-effort Firestore sync
    if (isFirebaseConnectedRef.current) {
      try {
        const targetShow = updatedShows.find(s => s.id === showId);
        if (targetShow) {
          await setDoc(doc(db, 'shows', showId), targetShow);
        }
      } catch (e) {
        handleWriteFailure(e);
      }
    }

    if (activeEpisodeId === episodeId) {
      setActiveEpisodeId(null);
    }
  };

  const updateWatchProgress = (episodeId: string, showId: string, watchedDuration: number, totalDuration: number) => {
    const completed = watchedDuration / totalDuration > 0.92;
    const updatedProgress = {
      ...watchProgress,
      [episodeId]: {
        episodeId,
        showId,
        watchedDuration,
        totalDuration,
        completed,
        lastWatched: new Date().toISOString()
      }
    };

    setWatchProgress(updatedProgress);
    persistProgressToLS(updatedProgress);
  };

  const rateShow = async (showId: string, rating: number) => {
    const userId = getOrCreateUserId();
    const updatedShows = shows.map((s) => {
      if (s.id === showId) {
        const ratings = { ...(s.ratings || {}), [userId]: rating };
        return { ...s, ratings };
      }
      return s;
    });

    setShows(updatedShows);
    persistShowsToLS(updatedShows);

    if (isFirebaseConnectedRef.current) {
      try {
        const targetShow = updatedShows.find(s => s.id === showId);
        if (targetShow) {
          await setDoc(doc(db, 'shows', showId), targetShow);
        }
      } catch (e) {
        handleWriteFailure(e);
      }
    }
  };

  const addComment = async (showId: string, author: string, text: string) => {
    const userId = getOrCreateUserId();
    const newComment: Comment = {
      id: 'comment-' + Date.now().toString() + '-' + Math.random().toString(36).substring(2, 7),
      author,
      text,
      createdAt: new Date().toISOString(),
      userId
    };

    const updatedShows = shows.map((s) => {
      if (s.id === showId) {
        const comments = [...(s.comments || []), newComment];
        return { ...s, comments };
      }
      return s;
    });

    setShows(updatedShows);
    persistShowsToLS(updatedShows);

    if (isFirebaseConnectedRef.current) {
      try {
        const targetShow = updatedShows.find(s => s.id === showId);
        if (targetShow) {
          await setDoc(doc(db, 'shows', showId), targetShow);
        }
      } catch (e) {
        handleWriteFailure(e);
      }
    }
  };

  const addNews = async (newsData: Omit<NewsArticle, 'id'>): Promise<string> => {
    const newNews: NewsArticle = {
      ...newsData,
      id: 'news-' + Date.now().toString()
    };

    const updatedNews = [newNews, ...news].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setNews(updatedNews);
    localStorage.setItem('penis_ink_news', JSON.stringify(updatedNews));

    if (isFirebaseConnectedRef.current) {
      try {
        await setDoc(doc(db, 'news', newNews.id), newNews);
      } catch (e) {
        handleWriteFailure(e);
      }
    }

    return newNews.id;
  };

  const updateNews = async (newsId: string, updatedFields: Partial<NewsArticle>) => {
    const updatedNews = news.map((item) => {
      if (item.id === newsId) {
        return { ...item, ...updatedFields };
      }
      return item;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setNews(updatedNews);
    localStorage.setItem('penis_ink_news', JSON.stringify(updatedNews));

    if (isFirebaseConnectedRef.current) {
      try {
        const targetNews = updatedNews.find(item => item.id === newsId);
        if (targetNews) {
          await setDoc(doc(db, 'news', newsId), targetNews);
        }
      } catch (e) {
        handleWriteFailure(e);
      }
    }
  };

  const deleteNews = async (newsId: string) => {
    const updatedNews = news.filter((item) => item.id !== newsId);

    setNews(updatedNews);
    localStorage.setItem('penis_ink_news', JSON.stringify(updatedNews));

    if (isFirebaseConnectedRef.current) {
      try {
        await deleteDoc(doc(db, 'news', newsId));
      } catch (e) {
        handleWriteFailure(e);
      }
    }
  };

  const updateMinecraftConfig = async (newConfig: MinecraftConfig) => {
    setMinecraftConfig(newConfig);
    localStorage.setItem('penis_ink_minecraft_config', JSON.stringify(newConfig));

    if (isFirebaseConnectedRef.current) {
      try {
        await setDoc(doc(db, 'settings', 'minecraft'), newConfig);
      } catch (e) {
        handleWriteFailure(e);
      }
    }
  };

  const loadDemoData = () => {
    const merged = [...shows];
    for (const demo of DEMO_SHOWS) {
      if (!merged.find(s => s.id === demo.id)) {
        merged.push(demo);
      }
    }

    setShows(merged);
    persistShowsToLS(merged);

    if (isFirebaseConnectedRef.current) {
      DEMO_SHOWS.forEach(show => {
        setDoc(doc(db, 'shows', show.id), show).catch(console.error);
      });
    }
  };

  const clearAllData = async () => {
    if (isFirebaseConnectedRef.current) {
      try {
        for (const show of shows) {
          await deleteDoc(doc(db, 'shows', show.id));
        }
        for (const item of news) {
          await deleteDoc(doc(db, 'news', item.id));
        }
        await deleteDoc(doc(db, 'settings', 'minecraft'));
      } catch (e) {
        console.error('Firestore clear failed:', e);
      }
    }
    setShows([]);
    setWatchProgress({});
    setNews([]);
    setMinecraftConfig(DEFAULT_MINECRAFT_CONFIG);
    localStorage.removeItem(LS_SHOWS_KEY);
    localStorage.removeItem(LS_PROGRESS_KEY);
    localStorage.removeItem(LS_SYNCED_KEY);
    localStorage.removeItem('penis_ink_news');
    localStorage.removeItem('penis_ink_minecraft_config');
    setActiveShowId(null);
    setActiveEpisodeId(null);
  };

  return (
    <StreamingContext.Provider value={{
      shows,
      watchProgress,
      activeShowId,
      activeEpisodeId,
      setActiveShowId,
      setActiveEpisodeId,
      addShow,
      updateShow,
      deleteShow,
      addEpisode,
      updateEpisode,
      deleteEpisode,
      updateWatchProgress,
      rateShow,
      addComment,
      news,
      addNews,
      updateNews,
      deleteNews,
      minecraftConfig,
      updateMinecraftConfig,
      loadDemoData,
      clearAllData,
      isFirebaseConnected
    }}>
      {children}
    </StreamingContext.Provider>
  );
};

export const useStreaming = () => {
  const context = useContext(StreamingContext);
  if (!context) {
    throw new Error('useStreaming must be used within a StreamingProvider');
  }
  return context;
};
