/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db, storage } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import type { Show, Episode, WatchProgress, Comment, NewsArticle, MinecraftConfig, GalleryItem, EmojiItem, ReactionsConfig, BackgroundsConfig, TabBackground, EventTimerConfig } from '../types/streaming';


interface StreamingContextType {
  shows: Show[];
  watchProgress: Record<string, WatchProgress>;
  activeShowId: string | null;
  activeEpisodeId: string | null;
  activeNewsId: string | null;
  setActiveShowId: (id: string | null) => void;
  setActiveEpisodeId: (id: string | null) => void;
  setActiveNewsId: (id: string | null) => void;
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
  rateNews: (newsId: string, rating: number) => Promise<void>;
  addNewsComment: (newsId: string, author: string, text: string, parentId?: string, replyToAuthor?: string) => Promise<void>;
  reactionsConfig: ReactionsConfig;
  updateReactionsConfig: (config: ReactionsConfig) => Promise<void>;
  toggleNewsReaction: (newsId: string, emojiId: string) => Promise<void>;
  voteNewsPoll: (newsId: string, optionIds: string[]) => Promise<void>;
  minecraftConfig: MinecraftConfig;
  updateMinecraftConfig: (config: MinecraftConfig) => Promise<void>;
  gallery: GalleryItem[];
  addGalleryItem: (imageUrl: string, uploadedBy: string, caption?: string) => Promise<string>;
  deleteGalleryItem: (itemId: string) => Promise<void>;
  backgroundsConfig: BackgroundsConfig;
  updateBackgroundsConfig: (config: BackgroundsConfig) => Promise<void>;
  eventTimerConfig: EventTimerConfig;
  updateEventTimerConfig: (config: EventTimerConfig) => Promise<void>;
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
    content: 'Сегодня мы официально запустили наш собственный онлайн-кинотеатр **varicose-squad**. Добавляйте свои любимые сериалы с Google Диска, отслеживайте время выхода новых серий по таймерам, пишите отзывы в комментариях и делитесь впечатлениями с друзьями!',
    date: new Date('2026-06-07T12:00:00.000Z').toISOString(),
    tag: '07 ИЮНЯ 2026',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    hashtags: ['кинотеатр', 'релиз', 'важно']
  },
  {
    id: 'news-2',
    title: 'Запуск Minecraft сервера',
    content: 'Наш собственный сервер выживания теперь запущен на версии **1.20.4**! Заходите играть, кооперироваться с друзьями, строить базы и участвовать в регулярных турнирах. Адрес для входа: mc.varicose-squad.ru.',
    date: new Date('2026-06-07T10:00:00.000Z').toISOString(),
    tag: 'ИГРОВОЙ СЕРВЕР',
    hashtags: ['майнкрафт', 'сервер', 'игры']
  }
];

export const DEFAULT_EMOJI_LIST: EmojiItem[] = [
  { id: 'like', emoji: '👍', label: 'лайк', enabled: true },
  { id: 'heart', emoji: '❤️', label: 'сердечко', enabled: true },
  { id: 'laugh', emoji: '😂', label: 'смех', enabled: true },
  { id: 'cry', emoji: '😢', label: 'слёзы', enabled: true },
  { id: 'poop', emoji: '💩', label: 'какашка', enabled: true },
  { id: 'vomit', emoji: '🤮', label: 'рвота', enabled: true },
  { id: 'fire', emoji: '🔥', label: 'огонь', enabled: true },
  { id: 'surprise', emoji: '😮', label: 'удивление', enabled: true },
];

export const DEFAULT_MINECRAFT_CONFIG: MinecraftConfig = {
  serverIp: 'mc.varicose-squad.ru',
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
    { title: 'Добавьте сервер', description: 'Зайдите в раздел «Сетевая игра» → «Добавить» и вставьте скопированный IP-адрес: mc.varicose-squad.ru.' },
    { title: 'Создайте аккаунт при входе', description: 'При первом входе на сервер откройте чат (клавиша T) и зарегистрируйтесь с помощью команды: /register [ваш_пароль] [подтверждение_пароля]. В будущем для авторизации используйте команду /login [ваш_пароль].' }
  ],
  players: [
    { name: 'screp', role: 'Админ', online: true },
    { name: 'antigravity', role: 'Игрок', online: true },
    { name: 'Steve', role: 'Игрок', online: true },
    { name: 'Alex', role: 'Игрок', online: true },
    { name: 'Notch', role: 'Легенда', online: true },
    { name: 'miner_49er', role: 'Игрок', online: true }
  ],
  mods: []
};

export const DEFAULT_EVENT_TIMER_CONFIG: EventTimerConfig = {
  eventName: 'Запуск сервера Minecraft',
  endDatetime: '2026-06-12T13:00:00.000Z',
  isActive: true,
  bgImageUrl: '/images/minecraft_cat.png',
  finishText: 'Сервер запущен!'
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

export const getNewsAverageRating = (ratings?: Record<string, number>) => {
  if (!ratings) return { average: 0, count: 0 };
  const values = Object.values(ratings);
  if (values.length === 0) return { average: 0, count: 0 };
  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = Math.round((sum / values.length) * 10) / 10;
  return { average, count: values.length };
};

export const sortNewsItems = (items: NewsArticle[]): NewsArticle[] => {
  return [...items].sort((a, b) => {
    const ratingA = getNewsAverageRating(a.ratings);
    const ratingB = getNewsAverageRating(b.ratings);
    if (ratingB.average !== ratingA.average) {
      return ratingB.average - ratingA.average;
    }
    if (ratingB.count !== ratingA.count) {
      return ratingB.count - ratingA.count;
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
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
  const [reactionsConfig, setReactionsConfig] = useState<ReactionsConfig>(() => {
    try {
      const cached = localStorage.getItem('penis_ink_reactions_config');
      return cached ? JSON.parse(cached) : { emojiList: DEFAULT_EMOJI_LIST };
    } catch {
      return { emojiList: DEFAULT_EMOJI_LIST };
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
  const [gallery, setGallery] = useState<GalleryItem[]>(() => {
    try {
      const cached = localStorage.getItem('penis_ink_gallery');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [backgroundsConfig, setBackgroundsConfig] = useState<BackgroundsConfig>(() => {
    try {
      const cached = localStorage.getItem('penis_ink_backgrounds_config');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [eventTimerConfig, setEventTimerConfig] = useState<EventTimerConfig>(() => {
    try {
      const cached = localStorage.getItem('penis_ink_event_timer_config');
      return cached ? JSON.parse(cached) : DEFAULT_EVENT_TIMER_CONFIG;
    } catch {
      return DEFAULT_EVENT_TIMER_CONFIG;
    }
  });
  const [activeShowId, setActiveShowId] = useState<string | null>(null);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [activeNewsId, setActiveNewsId] = useState<string | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // Refs for managing the onSnapshot subscription
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isFirebaseConnectedRef = useRef(false);
  const isBackgroundSavingRef = useRef(false);

  // Keep the ref in sync with state
  useEffect(() => {
    isFirebaseConnectedRef.current = isFirebaseConnected;
  }, [isFirebaseConnected]);



  const handleWriteFailure = useCallback((e: unknown) => {
    console.error('Firestore write failed (will retry on next operation):', e);
    // Don't permanently block — just log the error.
    // The root cause (undefined properties) is fixed, so transient errors should be retried.
  }, []);

  async function seedFirestoreDemo(): Promise<boolean> {
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
  }

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
            // Also sort DEMO_NEWS just in case
            const sortedDemo = sortNewsItems(DEMO_NEWS);
            setNews(sortedDemo);
            localStorage.setItem('penis_ink_news', JSON.stringify(sortedDemo));
          } else {
            const sorted = sortNewsItems(firestoreNews);
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
            // Merge with DEFAULT_MINECRAFT_CONFIG to ensure no missing fields
            const mergedData: MinecraftConfig = {
              ...DEFAULT_MINECRAFT_CONFIG,
              ...data,
              rules: data.rules && data.rules.length > 0 ? data.rules : DEFAULT_MINECRAFT_CONFIG.rules,
              steps: data.steps && data.steps.length > 0 ? data.steps : DEFAULT_MINECRAFT_CONFIG.steps,
              players: data.players && data.players.length > 0 ? data.players : DEFAULT_MINECRAFT_CONFIG.players,
              mods: data.mods || DEFAULT_MINECRAFT_CONFIG.mods || []
            };

            // If critical fields are missing, write them back to Firestore to auto-heal
            if (!data.serverIp || !data.version) {
              setDoc(doc(db, 'settings', 'minecraft'), mergedData).catch(console.error);
            }

            setMinecraftConfig(mergedData);
            localStorage.setItem('penis_ink_minecraft_config', JSON.stringify(mergedData));
          } else {
            setDoc(doc(db, 'settings', 'minecraft'), DEFAULT_MINECRAFT_CONFIG).catch(console.error);
            setMinecraftConfig(DEFAULT_MINECRAFT_CONFIG);
            localStorage.setItem('penis_ink_minecraft_config', JSON.stringify(DEFAULT_MINECRAFT_CONFIG));
          }
        }, (error) => {
          console.warn('Firestore minecraft config onSnapshot error:', error);
        });

        // Start real-time listener for reactions settings
        const unsubReactions = onSnapshot(doc(db, 'settings', 'reactions'), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as ReactionsConfig;
            setReactionsConfig(data);
            localStorage.setItem('penis_ink_reactions_config', JSON.stringify(data));
          } else {
            const defaultConfig = { emojiList: DEFAULT_EMOJI_LIST };
            setDoc(doc(db, 'settings', 'reactions'), defaultConfig).catch(console.error);
            setReactionsConfig(defaultConfig);
            localStorage.setItem('penis_ink_reactions_config', JSON.stringify(defaultConfig));
          }
        }, (error) => {
          console.warn('Firestore reactions config onSnapshot error:', error);
        });

        // Start real-time listener for gallery
        const unsubGallery = onSnapshot(collection(db, 'gallery'), (snapshot) => {
          const firestoreGallery: GalleryItem[] = [];
          snapshot.forEach((docSnap) => {
            firestoreGallery.push({ id: docSnap.id, ...docSnap.data() } as GalleryItem);
          });

          if (firestoreGallery.length === 0) {
            const demoItems: GalleryItem[] = [
              {
                id: 'demo-gallery-1',
                imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
                uploadedBy: 'screp',
                caption: 'Первый запуск нашего Minecraft сервера!',
                createdAt: new Date('2026-06-07T10:00:00.000Z').toISOString()
              },
              {
                id: 'demo-gallery-2',
                imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop',
                uploadedBy: 'Steve',
                caption: 'Уютный вечер за просмотром аниме',
                createdAt: new Date('2026-06-07T11:00:00.000Z').toISOString()
              }
            ];
            demoItems.forEach(item => {
              setDoc(doc(db, 'gallery', item.id), item).catch(console.error);
            });
            setGallery(demoItems);
            localStorage.setItem('penis_ink_gallery', JSON.stringify(demoItems));
          } else {
            const sorted = firestoreGallery.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setGallery(sorted);
            localStorage.setItem('penis_ink_gallery', JSON.stringify(sorted));
          }
        }, (error) => {
          console.warn('Firestore gallery onSnapshot error:', error);
        });

        // Start real-time listener for backgrounds settings
        const unsubBackgrounds = onSnapshot(collection(db, 'backgrounds'), async (snapshot) => {
          if (snapshot.empty) {
            try {
              const oldDocSnap = await getDocs(collection(db, 'settings'));
              const backgroundsDoc = oldDocSnap.docs.find(d => d.id === 'backgrounds');
              if (backgroundsDoc && backgroundsDoc.exists()) {
                const oldData = backgroundsDoc.data() as BackgroundsConfig;
                if (Object.keys(oldData).length > 0) {
                  console.log('Migrating old settings/backgrounds to backgrounds collection...');
                  await updateBackgroundsConfig(oldData);
                  return;
                }
              }
            } catch (err) {
              console.warn('Migration check failed or no old backgrounds doc:', err);
            }

            // Seed Firestore backgrounds with local localStorage backgrounds if empty
            const localConfigStr = localStorage.getItem('penis_ink_backgrounds_config');
            if (localConfigStr) {
              try {
                const localConfig = JSON.parse(localConfigStr) as BackgroundsConfig;
                if (Object.keys(localConfig).length > 0) {
                  console.log('Seeding Firestore backgrounds with local localStorage backgrounds...');
                  await updateBackgroundsConfig(localConfig);
                  return;
                }
              } catch (e) {
                console.warn('Failed to parse local backgrounds for seeding:', e);
              }
            }
          }

          if (isBackgroundSavingRef.current) {
            console.log('Skipping background snapshot update because a save is in progress');
            return;
          }

          const config: BackgroundsConfig = {};
          snapshot.forEach((docSnap) => {
            config[docSnap.id] = docSnap.data() as TabBackground;
          });
          setBackgroundsConfig(config);
        }, (error) => {
          console.warn('Firestore backgrounds config onSnapshot error:', error);
        });

        // Start real-time listener for event timer settings
        const unsubEventTimer = onSnapshot(doc(db, 'settings', 'event_timer'), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as EventTimerConfig;
            setEventTimerConfig(data);
            localStorage.setItem('penis_ink_event_timer_config', JSON.stringify(data));
          } else {
            setDoc(doc(db, 'settings', 'event_timer'), DEFAULT_EVENT_TIMER_CONFIG).catch(console.error);
            setEventTimerConfig(DEFAULT_EVENT_TIMER_CONFIG);
            localStorage.setItem('penis_ink_event_timer_config', JSON.stringify(DEFAULT_EVENT_TIMER_CONFIG));
          }
        }, (error) => {
          console.warn('Firestore event timer config onSnapshot error:', error);
        });

        unsubscribeRef.current = () => {
          unsub();
          unsubNews();
          unsubMinecraft();
          unsubGallery();
          unsubReactions();
          unsubBackgrounds();
          unsubEventTimer();
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
        const cachedReactions = localStorage.getItem('penis_ink_reactions_config');
        if (!cachedReactions) {
          setReactionsConfig({ emojiList: DEFAULT_EMOJI_LIST });
          localStorage.setItem('penis_ink_reactions_config', JSON.stringify({ emojiList: DEFAULT_EMOJI_LIST }));
        }
        const cachedBackgrounds = localStorage.getItem('penis_ink_backgrounds_config');
        if (!cachedBackgrounds) {
          setBackgroundsConfig({});
          localStorage.setItem('penis_ink_backgrounds_config', JSON.stringify({}));
        }
        const cachedGallery = localStorage.getItem('penis_ink_gallery');
        if (!cachedGallery || JSON.parse(cachedGallery).length === 0) {
          const demoItems = [
            {
              id: 'demo-gallery-1',
              imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
              uploadedBy: 'screp',
              caption: 'Первый запуск нашего Minecraft сервера!',
              createdAt: new Date('2026-06-07T10:00:00.000Z').toISOString()
            },
            {
              id: 'demo-gallery-2',
              imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop',
              uploadedBy: 'Steve',
              caption: 'Уютный вечер за просмотром аниме',
              createdAt: new Date('2026-06-07T11:00:00.000Z').toISOString()
            }
          ];
          setGallery(demoItems);
          localStorage.setItem('penis_ink_gallery', JSON.stringify(demoItems));
        }

        const cachedEventTimer = localStorage.getItem('penis_ink_event_timer_config');
        if (!cachedEventTimer) {
          setEventTimerConfig(DEFAULT_EVENT_TIMER_CONFIG);
          localStorage.setItem('penis_ink_event_timer_config', JSON.stringify(DEFAULT_EVENT_TIMER_CONFIG));
        } else {
          try {
            setEventTimerConfig(JSON.parse(cachedEventTimer));
          } catch {
            setEventTimerConfig(DEFAULT_EVENT_TIMER_CONFIG);
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const uploadNewsMedia = async (newsItem: Partial<NewsArticle>): Promise<Partial<NewsArticle>> => {
    const updated = { ...newsItem };

    if (updated.videoUrl && updated.videoUrl.startsWith('data:video/')) {
      if (isFirebaseConnectedRef.current) {
        try {
          const extension = updated.videoUrl.split(';')[0].split('/')[1]?.split('+')[0] || 'mp4';
          const storageRef = ref(storage, `news_videos/video-${Date.now()}.${extension}`);
          await uploadString(storageRef, updated.videoUrl, 'data_url');
          updated.videoUrl = await getDownloadURL(storageRef);
        } catch (e) {
          console.warn('Firebase Storage video upload failed, keeping base64 fallback', e);
        }
      }
    }

    if (updated.imageUrl && updated.imageUrl.startsWith('data:image/')) {
      if (isFirebaseConnectedRef.current) {
        try {
          const extension = updated.imageUrl.split(';')[0].split('/')[1]?.split('+')[0] || 'webp';
          const storageRef = ref(storage, `news_images/image-${Date.now()}.${extension}`);
          await uploadString(storageRef, updated.imageUrl, 'data_url');
          updated.imageUrl = await getDownloadURL(storageRef);
        } catch (e) {
          console.warn('Firebase Storage image upload failed, keeping base64 fallback', e);
        }
      }
    }

    return updated;
  };

  const addNews = async (newsData: Omit<NewsArticle, 'id'>): Promise<string> => {
    const uploadedData = await uploadNewsMedia(newsData);
    const newNews: NewsArticle = {
      ...uploadedData,
      id: 'news-' + Date.now().toString()
    } as NewsArticle;

    const updatedNews = [newNews, ...news];
    const sortedNews = sortNewsItems(updatedNews);
    setNews(sortedNews);
    localStorage.setItem('penis_ink_news', JSON.stringify(sortedNews));

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
    const uploadedData = await uploadNewsMedia(updatedFields);
    const updatedNews = news.map((item) => {
      if (item.id === newsId) {
        return { ...item, ...uploadedData };
      }
      return item;
    });
    const sortedNews = sortNewsItems(updatedNews);

    setNews(sortedNews);
    localStorage.setItem('penis_ink_news', JSON.stringify(sortedNews));

    if (isFirebaseConnectedRef.current) {
      try {
        const targetNews = sortedNews.find(item => item.id === newsId);
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
    const sortedNews = sortNewsItems(updatedNews);

    setNews(sortedNews);
    localStorage.setItem('penis_ink_news', JSON.stringify(sortedNews));

    if (isFirebaseConnectedRef.current) {
      try {
        await deleteDoc(doc(db, 'news', newsId));
      } catch (e) {
        handleWriteFailure(e);
      }
    }
  };

  const rateNews = async (newsId: string, rating: number) => {
    const userId = getOrCreateUserId();
    const updatedNews = news.map((item) => {
      if (item.id === newsId) {
        const ratings = { ...(item.ratings || {}), [userId]: rating };
        return { ...item, ratings };
      }
      return item;
    });

    const sortedNews = sortNewsItems(updatedNews);
    setNews(sortedNews);
    localStorage.setItem('penis_ink_news', JSON.stringify(sortedNews));

    if (isFirebaseConnectedRef.current) {
      try {
        const targetNews = sortedNews.find(item => item.id === newsId);
        if (targetNews) {
          await setDoc(doc(db, 'news', newsId), targetNews);
        }
      } catch (e) {
        handleWriteFailure(e);
      }
    }
  };

  const addNewsComment = async (newsId: string, author: string, text: string, parentId?: string, replyToAuthor?: string) => {
    const userId = getOrCreateUserId();
    const newComment: Comment = {
      id: 'comment-' + Date.now().toString() + '-' + Math.random().toString(36).substring(2, 7),
      author,
      text,
      createdAt: new Date().toISOString(),
      userId,
      parentId,
      replyToAuthor
    };

    const updatedNews = news.map((item) => {
      if (item.id === newsId) {
        const comments = [...(item.comments || []), newComment];
        return { ...item, comments };
      }
      return item;
    });

    const sortedNews = sortNewsItems(updatedNews);
    setNews(sortedNews);
    localStorage.setItem('penis_ink_news', JSON.stringify(sortedNews));

    if (isFirebaseConnectedRef.current) {
      try {
        const targetNews = sortedNews.find(item => item.id === newsId);
        if (targetNews) {
          await setDoc(doc(db, 'news', newsId), targetNews);
        }
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

  const updateBackgroundsConfig = async (config: BackgroundsConfig) => {
    isBackgroundSavingRef.current = true;
    const resolvedConfig = { ...config };
    const tabIds = ['home', 'shows', 'news', 'bunker', 'cowatch', 'minecraft', 'gallery'];

    // Update state and local storage immediately with the tentative config (e.g. including Base64 URL)
    setBackgroundsConfig(resolvedConfig);
    localStorage.setItem('penis_ink_backgrounds_config', JSON.stringify(resolvedConfig));

    try {
      if (isFirebaseConnectedRef.current) {
        // Clean up the old single backgrounds settings document if it exists
        try {
          await deleteDoc(doc(db, 'settings', 'backgrounds'));
        } catch { /* ignore */ }

        let needsStateUpdate = false;

        for (const tabId of tabIds) {
          const bg = config[tabId];
          const prevBg = backgroundsConfig[tabId];

          // Skip Firestore operations if the background hasn't changed
          const isSame = (!bg && !prevBg) || (bg && prevBg && bg.imageUrl === prevBg.imageUrl && bg.videoUrl === prevBg.videoUrl && bg.overlayOpacity === prevBg.overlayOpacity);
          if (isSame) {
            continue;
          }

          if (bg) {
            let imageUrl = bg.imageUrl;
            if (imageUrl && imageUrl.startsWith('data:image/')) {
              try {
                const storageRef = ref(storage, `backgrounds/${tabId}-${Date.now()}.webp`);

                // Upload with 20s timeout
                await Promise.race([
                  uploadString(storageRef, imageUrl, 'data_url'),
                  new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Firebase Storage upload timeout')), 20000))
                ]);

                // Get download URL with 10s timeout
                imageUrl = await Promise.race([
                  getDownloadURL(storageRef),
                  new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Firebase Storage getDownloadURL timeout')), 10000))
                ]);

                resolvedConfig[tabId] = {
                  ...bg,
                  imageUrl
                };
                needsStateUpdate = true;
              } catch (storageError) {
                console.warn(`Firebase Storage upload failed for ${tabId}, using Base64 fallback in Firestore`, storageError);
              }
            }

            // Set document in Firestore with 15s timeout
            const docData: any = {
              overlayOpacity: resolvedConfig[tabId].overlayOpacity
            };
            if (resolvedConfig[tabId].imageUrl) docData.imageUrl = resolvedConfig[tabId].imageUrl;
            if (resolvedConfig[tabId].videoUrl) docData.videoUrl = resolvedConfig[tabId].videoUrl;

            await Promise.race([
              setDoc(doc(db, 'backgrounds', tabId), docData),
              new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Firestore setDoc timeout')), 15000))
            ]);
          } else {
            // Delete document in Firestore with 15s timeout
            await Promise.race([
              deleteDoc(doc(db, 'backgrounds', tabId)),
              new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Firestore deleteDoc timeout')), 15000))
            ]);
          }
        }

        if (needsStateUpdate) {
          // Update local state and storage again to replace Base64 URLs with public storage URLs
          setBackgroundsConfig(resolvedConfig);
          localStorage.setItem('penis_ink_backgrounds_config', JSON.stringify(resolvedConfig));
        }
      }
    } catch (e) {
      handleWriteFailure(e);
    } finally {
      isBackgroundSavingRef.current = false;
    }
  };

  const updateEventTimerConfig = async (newConfig: EventTimerConfig) => {
    setEventTimerConfig(newConfig);
    localStorage.setItem('penis_ink_event_timer_config', JSON.stringify(newConfig));

    if (isFirebaseConnectedRef.current) {
      try {
        await setDoc(doc(db, 'settings', 'event_timer'), newConfig);
      } catch (e) {
        handleWriteFailure(e);
      }
    }
  };

  const updateReactionsConfig = async (newConfig: ReactionsConfig) => {
    setReactionsConfig(newConfig);
    localStorage.setItem('penis_ink_reactions_config', JSON.stringify(newConfig));

    if (isFirebaseConnectedRef.current) {
      try {
        await setDoc(doc(db, 'settings', 'reactions'), newConfig);
      } catch (e) {
        handleWriteFailure(e);
      }
    }
  };

  const toggleNewsReaction = async (newsId: string, emojiId: string) => {
    const userId = getOrCreateUserId();
    const updatedNews = news.map((item) => {
      if (item.id === newsId) {
        const reactions = { ...(item.reactions || {}) };
        const userList = [...(reactions[emojiId] || [])];
        const index = userList.indexOf(userId);

        if (index > -1) {
          userList.splice(index, 1);
        } else {
          userList.push(userId);
        }

        if (userList.length === 0) {
          delete reactions[emojiId];
        } else {
          reactions[emojiId] = userList;
        }

        return { ...item, reactions };
      }
      return item;
    });

    const sortedNews = sortNewsItems(updatedNews);
    setNews(sortedNews);
    localStorage.setItem('penis_ink_news', JSON.stringify(sortedNews));

    if (isFirebaseConnectedRef.current) {
      try {
        const targetNews = sortedNews.find(item => item.id === newsId);
        if (targetNews) {
          await setDoc(doc(db, 'news', newsId), targetNews);
        }
      } catch (e) {
        handleWriteFailure(e);
      }
    }
  };

  const voteNewsPoll = async (newsId: string, optionIds: string[]) => {
    const userId = getOrCreateUserId();
    const updatedNews = news.map((item) => {
      if (item.id === newsId && item.poll) {
        const votes = { ...(item.poll.votes || {}) };
        votes[userId] = optionIds;
        return { ...item, poll: { ...item.poll, votes } };
      }
      return item;
    });

    const sortedNews = sortNewsItems(updatedNews);
    setNews(sortedNews);
    localStorage.setItem('penis_ink_news', JSON.stringify(sortedNews));

    if (isFirebaseConnectedRef.current) {
      try {
        const targetNews = sortedNews.find(item => item.id === newsId);
        if (targetNews) {
          await setDoc(doc(db, 'news', newsId), targetNews);
        }
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

  const addGalleryItem = async (imageUrl: string, uploadedBy: string, caption?: string): Promise<string> => {
    const newItem: GalleryItem = {
      id: 'gallery-' + Date.now().toString() + '-' + Math.random().toString(36).substring(2, 7),
      imageUrl,
      uploadedBy,
      caption,
      createdAt: new Date().toISOString()
    };

    const updatedGallery = [newItem, ...gallery];
    setGallery(updatedGallery);
    localStorage.setItem('penis_ink_gallery', JSON.stringify(updatedGallery));

    if (isFirebaseConnectedRef.current) {
      try {
        await setDoc(doc(db, 'gallery', newItem.id), newItem);
      } catch (e) {
        handleWriteFailure(e);
      }
    }

    return newItem.id;
  };

  const deleteGalleryItem = async (itemId: string) => {
    const updatedGallery = gallery.filter((item) => item.id !== itemId);
    setGallery(updatedGallery);
    localStorage.setItem('penis_ink_gallery', JSON.stringify(updatedGallery));

    if (isFirebaseConnectedRef.current) {
      try {
        await deleteDoc(doc(db, 'gallery', itemId));
      } catch (e) {
        handleWriteFailure(e);
      }
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
        for (const item of gallery) {
          await deleteDoc(doc(db, 'gallery', item.id));
        }
        await deleteDoc(doc(db, 'settings', 'minecraft'));
        await deleteDoc(doc(db, 'settings', 'reactions'));
        await deleteDoc(doc(db, 'settings', 'backgrounds'));
        for (const tabId of ['home', 'shows', 'news', 'bunker', 'cowatch', 'minecraft', 'gallery']) {
          await deleteDoc(doc(db, 'backgrounds', tabId));
        }
      } catch (e) {
        console.error('Firestore clear failed:', e);
      }
    }
    setShows([]);
    setWatchProgress({});
    setNews([]);
    setGallery([]);
    setMinecraftConfig(DEFAULT_MINECRAFT_CONFIG);
    setBackgroundsConfig({});
    localStorage.removeItem(LS_SHOWS_KEY);
    localStorage.removeItem(LS_PROGRESS_KEY);
    localStorage.removeItem(LS_SYNCED_KEY);
    localStorage.removeItem('penis_ink_news');
    localStorage.removeItem('penis_ink_minecraft_config');
    localStorage.removeItem('penis_ink_reactions_config');
    localStorage.removeItem('penis_ink_backgrounds_config');
    localStorage.removeItem('penis_ink_gallery');
    setActiveShowId(null);
    setActiveEpisodeId(null);
  };

  return (
    <StreamingContext.Provider value={{
      shows,
      watchProgress,
      activeShowId,
      activeEpisodeId,
      activeNewsId,
      setActiveShowId,
      setActiveEpisodeId,
      setActiveNewsId,
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
      rateNews,
      addNewsComment,
      minecraftConfig,
      updateMinecraftConfig,
      reactionsConfig,
      updateReactionsConfig,
      backgroundsConfig,
      updateBackgroundsConfig,
      eventTimerConfig,
      updateEventTimerConfig,
      toggleNewsReaction,
      voteNewsPoll,
      gallery,
      addGalleryItem,
      deleteGalleryItem,
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
