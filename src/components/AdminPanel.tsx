import React, { useState } from 'react';
import { useStreaming, DEFAULT_MINECRAFT_CONFIG } from '../context/StreamingContext';
import { 
  Plus, Trash2, Database, AlertCircle, 
  Check, Info, Tv, CheckCircle2, Sparkles,
  Edit3, Eye, EyeOff, Camera, FileText, Gamepad2, Clock,
  Cloud, CloudOff, X, Smile, ArrowUp, ArrowDown, Box, Image as ImageIcon,
  Loader2
} from 'lucide-react';
import type { Show, MinecraftPlayer, NewsArticle, Episode, EmojiItem } from '../types/streaming';
import { ImageUploader } from './ImageUploader';
import { AdminBunkerDB } from './AdminBunkerDB';

const generateId = (prefix: string) => `${prefix}-${Date.now()}`;

const DEFAULT_PLAYERS: MinecraftPlayer[] = [
  { name: 'screp', role: 'Админ', online: true },
  { name: 'antigravity', role: 'Игрок', online: true },
  { name: 'Steve', role: 'Игрок', online: true },
  { name: 'Alex', role: 'Игрок', online: true },
  { name: 'Notch', role: 'Легенда', online: true },
  { name: 'miner_49er', role: 'Игрок', online: true }
];

// Timezone helpers
const formatKyivDateTimeLocal = (dateOrIso: string) => {
  if (!dateOrIso) return '';
  try {
    const date = new Date(dateOrIso);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Kiev',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const p: Record<string, string> = {};
    parts.forEach(part => { p[part.type] = part.value; });
    // Return in format YYYY-MM-DDTHH:mm
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  } catch (e) {
    console.error('Failed to format Kyiv date:', e);
    return '';
  }
};

const parseKyivDateTimeLocal = (kyivDateTimeStr: string) => {
  const utcDate = new Date(kyivDateTimeStr + ":00Z");
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Kiev',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(utcDate);
  const p: Record<string, string> = {};
  parts.forEach(part => { p[part.type] = part.value; });
  
  const formattedUTCDate = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second || 0)
  );
  
  const offsetMs = formattedUTCDate - utcDate.getTime();
  return new Date(utcDate.getTime() - offsetMs);
};

export const AdminPanel: React.FC = () => {
  const { 
    shows, addShow, updateShow, deleteShow, 
    addEpisode, deleteEpisode, isFirebaseConnected,
    news, addNews, updateNews, deleteNews,
    minecraftConfig, updateMinecraftConfig,
    reactionsConfig, updateReactionsConfig,
    backgroundsConfig, updateBackgroundsConfig,
    eventTimerConfig, updateEventTimerConfig
  } = useStreaming();

  // Unique actors pool database aggregated from all shows
  const uniqueActorsPool = React.useMemo(() => {
    const pool: { name: string; imageUrl?: string; imageUrls?: string[]; filmography?: string }[] = [];
    const names = new Set<string>();

    shows.forEach(show => {
      (show.actors || []).forEach(actor => {
        const normalizedName = actor.name.trim();
        if (normalizedName && !names.has(normalizedName)) {
          names.add(normalizedName);
          pool.push({
            name: actor.name,
            imageUrl: actor.imageUrl,
            imageUrls: actor.imageUrls,
            filmography: actor.filmography
          });
        }
      });
    });

    return pool.sort((a, b) => a.name.localeCompare(b.name));
  }, [shows]);

  // Tabs
  const [adminTab, setAdminTab] = useState<'shows' | 'episodes' | 'schedule' | 'db' | 'manage' | 'news' | 'minecraft' | 'reactions' | 'backgrounds' | 'bunker_db' | 'event_timer'>('shows');

  // Notification message
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Success Animation State
  const [showCreatedAnimation, setShowCreatedAnimation] = useState<{ visible: boolean; title: string }>({ visible: false, title: '' });

  // Show Form State
  const [showTitle, setShowTitle] = useState('');
  const [showDescription, setShowDescription] = useState('');
  const [showCategory, setShowCategory] = useState<Show['category']>('Anime');
  const [showStatus, setShowStatus] = useState<Show['status']>('ongoing');
  const [showCover, setShowCover] = useState('');
  const [showThumb, setShowThumb] = useState('');
  const [showTrailerUrl, setShowTrailerUrl] = useState('');

  // Edit Show Form State
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<Show['category']>('Anime');
  const [editStatus, setEditStatus] = useState<Show['status']>('ongoing');
  const [editCover, setEditCover] = useState('');
  const [editThumb, setEditThumb] = useState('');
  const [editTrailerUrl, setEditTrailerUrl] = useState('');

  const startEditing = (show: Show) => {
    setEditingShow(show);
    setEditTitle(show.title);
    setEditDescription(show.description);
    setEditCategory(show.category);
    setEditStatus(show.status);
    setEditCover(show.coverImage || '');
    setEditThumb(show.thumbnailImage || '');
    setEditTrailerUrl(show.trailerUrl || '');
  };

  const handleUpdateShowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShow || !editTitle.trim()) return;

    try {
      await updateShow(editingShow.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
        status: editStatus,
        coverImage: editCover.trim(),
        thumbnailImage: editThumb.trim(),
        trailerUrl: editTrailerUrl.trim() || undefined
      });
      setEditingShow(null);
      showStatusMsg(`Сериал «${editTitle.trim()}» успешно обновлен!`);
    } catch {
      showStatusMsg('Ошибка при обновлении сериала', 'error');
    }
  };

  // Episode Form State
  const [selectedShowId, setSelectedShowId] = useState('');
  const [isAddingShow, setIsAddingShow] = useState(false);
  const [epNumber, setEpNumber] = useState(1);
  const [epTitle, setEpTitle] = useState('');
  const [epDesc, setEpDesc] = useState('');
  const [epUrl, setEpUrl] = useState('');
  const [epReleaseDate, setEpReleaseDate] = useState('2026-06-06');
  const [epReleaseTime, setEpReleaseTime] = useState('19:00');
  const [epDuration, setEpDuration] = useState('24:00');
  const [epThumb, setEpThumb] = useState('');
  const [epStills, setEpStills] = useState<string[]>([]);

  // Edit Episode Form State
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [editEpNumber, setEditEpNumber] = useState(1);
  const [editEpTitle, setEditEpTitle] = useState('');
  const [editEpDesc, setEditEpDesc] = useState('');
  const [editEpUrl, setEditEpUrl] = useState('');
  const [editEpDuration, setEditEpDuration] = useState('24:00');
  const [editEpThumb, setEditEpThumb] = useState('');
  const [editEpStills, setEditEpStills] = useState<string[]>([]);

  // Countdown Form State
  const [scheduleShowId, setScheduleShowId] = useState('');
  const [schedType, setSchedType] = useState<'manual' | 'weekly'>('weekly');
  const [schedDay, setSchedDay] = useState(0); // Sunday
  const [schedTime, setSchedTime] = useState('18:00');
  const [schedOneOff, setSchedOneOff] = useState('2026-06-06T18:00');

  // Actor Form State
  const [actorName, setActorName] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [actorImage, setActorImage] = useState('');
  const [actorGallery, setActorGallery] = useState<string[]>([]);
  const [actorFilmography, setActorFilmography] = useState('');
  const [editingActorId, setEditingActorId] = useState<string | null>(null);

  // News Form State
  const [newsTitle, setNewsTitle] = useState('');
  const [newsTag, setNewsTag] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImage, setNewsImage] = useState('');
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);

  // Reactions Settings Form State
  const [newEmojiChar, setNewEmojiChar] = useState('');
  const [newEmojiLabel, setNewEmojiLabel] = useState('');

  // Minecraft Form State
  const [mcServerIp, setMcServerIp] = useState('');
  const [mcVersion, setMcVersion] = useState('');
  const [mcDescription, setMcDescription] = useState('');
  const [mcRules, setMcRules] = useState<{ title: string; description: string }[]>([]);
  const [mcSteps, setMcSteps] = useState<{ title: string; description: string }[]>([]);
  const [mcPlayers, setMcPlayers] = useState<MinecraftPlayer[]>([]);
  
  // Mods Form State
  const [modUrl, setModUrl] = useState('');
  const [isFetchingMod, setIsFetchingMod] = useState(false);
  const [modError, setModError] = useState('');

  // Modpack Form State
  const [modpackTitle, setModpackTitle] = useState('');
  const [modpackDesc, setModpackDesc] = useState('');
  const [modpackVersion, setModpackVersion] = useState('');
  const [modpackUrl, setModpackUrl] = useState('');

  // Backgrounds Form State
  const [editingBgTabId, setEditingBgTabId] = useState<string>('home');
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [bgVideoUrl, setBgVideoUrl] = useState('');
  const [bgOverlay, setBgOverlay] = useState(80);
  const [isSavingBg, setIsSavingBg] = useState(false);

  // Event Timer Form State
  const [timerEventName, setTimerEventName] = useState('');
  const [timerEndDatetime, setTimerEndDatetime] = useState('');
  const [timerIsActive, setTimerIsActive] = useState(true);
  const [timerBgImageUrl, setTimerBgImageUrl] = useState('');
  const [timerFinishText, setTimerFinishText] = useState('');
  const [isSavingTimer, setIsSavingTimer] = useState(false);

  // Load event timer settings when tab changes
  React.useEffect(() => {
    if (adminTab === 'event_timer' && eventTimerConfig) {
      setTimerEventName(eventTimerConfig.eventName);
      setTimerEndDatetime(formatKyivDateTimeLocal(eventTimerConfig.endDatetime));
      setTimerIsActive(eventTimerConfig.isActive);
      setTimerBgImageUrl(eventTimerConfig.bgImageUrl || '');
      setTimerFinishText(eventTimerConfig.finishText);
    }
  }, [adminTab, eventTimerConfig]);

  const handleSaveTimer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timerEventName.trim() || !timerEndDatetime) {
      showStatusMsg('Заполните обязательные поля', 'error');
      return;
    }
    setIsSavingTimer(true);
    try {
      const utcDate = parseKyivDateTimeLocal(timerEndDatetime);
      
      await updateEventTimerConfig({
        eventName: timerEventName.trim(),
        endDatetime: utcDate.toISOString(),
        isActive: timerIsActive,
        bgImageUrl: timerBgImageUrl.trim() || undefined,
        finishText: timerFinishText.trim() || 'Событие началось!'
      });
      showStatusMsg('Настройки таймера ивентов сохранены');
    } catch (err) {
      console.error(err);
      showStatusMsg('Не удалось сохранить настройки таймера', 'error');
    } finally {
      setIsSavingTimer(false);
    }
  };

  const TABS_FOR_BG = [
    { id: 'home', label: 'Главная' },
    { id: 'shows', label: 'Сериалы' },
    { id: 'news', label: 'Новости' },
    { id: 'bunker', label: 'Бункер' },
    { id: 'cowatch', label: 'Совместный просмотр' },
    { id: 'minecraft', label: 'Майнкрафт' },
    { id: 'gallery', label: 'Галерея' }
  ];

  // Load selected background into form
  React.useEffect(() => {
    if (adminTab === 'backgrounds') {
      const bg = backgroundsConfig[editingBgTabId];
      if (bg) {
        setBgImageUrl(bg.imageUrl || '');
        setBgVideoUrl(bg.videoUrl || '');
        setBgOverlay(bg.overlayOpacity);
      } else {
        setBgImageUrl('');
        setBgVideoUrl('');
        setBgOverlay(80);
      }
    }
  }, [adminTab, editingBgTabId, backgroundsConfig]);

  const handleSaveBackground = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingBg) return;

    setIsSavingBg(true);
    try {
      const url = bgImageUrl.trim();
      const videoUrlVal = bgVideoUrl.trim();
      const newConfig = { ...backgroundsConfig };
      
      if (!url && !videoUrlVal) {
        delete newConfig[editingBgTabId];
        await updateBackgroundsConfig(newConfig);
        showStatusMsg('Фон успешно удален');
        return;
      }

      // Check if image is valid (only if it's an external URL and url is provided)
      if (url && url.startsWith('http')) {
        try {
          await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              reject(new Error('Timeout loading image'));
            }, 6000); // 6s timeout
            
            const img = new Image();
            img.onload = () => {
              clearTimeout(timer);
              resolve(true);
            };
            img.onerror = () => {
              clearTimeout(timer);
              reject(new Error('Image failed to load'));
            };
            img.src = url;
          });
        } catch {
          // Warning only, do not block save
          showStatusMsg('Предупреждение: ссылка на картинку недоступна, но настройки сохранены', 'info');
        }
      }

      // Show saving state
      showStatusMsg('Сохранение фона...', 'info');

      newConfig[editingBgTabId] = {
        imageUrl: url || undefined,
        videoUrl: videoUrlVal || undefined,
        overlayOpacity: bgOverlay
      };
      
      await updateBackgroundsConfig(newConfig);
      showStatusMsg('Фон успешно сохранен');
    } catch (err) {
      console.error(err);
      showStatusMsg('Системная ошибка при сохранении фона', 'error');
    } finally {
      setIsSavingBg(false);
    }
  };

  const handleDeleteBackground = async () => {
    if (!confirm('Сбросить фон для этой вкладки?')) return;
    if (isSavingBg) return;

    setIsSavingBg(true);
    try {
      const newConfig = { ...backgroundsConfig };
      delete newConfig[editingBgTabId];
      await updateBackgroundsConfig(newConfig);
      showStatusMsg('Фон сброшен');
      setBgImageUrl('');
      setBgVideoUrl('');
      setBgOverlay(80);
    } catch {
      showStatusMsg('Ошибка при сбросе', 'error');
    } finally {
      setIsSavingBg(false);
    }
  };

  const [prevMinecraftConfig, setPrevMinecraftConfig] = useState(minecraftConfig);
  if (minecraftConfig !== prevMinecraftConfig) {
    setPrevMinecraftConfig(minecraftConfig);
    if (minecraftConfig) {
      setMcServerIp(minecraftConfig.serverIp || '');
      setMcVersion(minecraftConfig.version || '');
      setMcDescription(minecraftConfig.description || '');
      setMcRules(minecraftConfig.rules || []);
      setMcSteps(minecraftConfig.steps || []);
      setMcPlayers(minecraftConfig.players || DEFAULT_PLAYERS);
      
      if (minecraftConfig.modpack) {
        setModpackTitle(minecraftConfig.modpack.title);
        setModpackDesc(minecraftConfig.modpack.description);
        setModpackVersion(minecraftConfig.modpack.version || '');
        setModpackUrl(minecraftConfig.modpack.driveUrl);
      }
    }
  }

  const handleSaveMinecraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcServerIp.trim() || !mcVersion.trim() || !mcDescription.trim()) {
      showStatusMsg('Заполните все основные поля Майнкрафт', 'error');
      return;
    }
    try {
      await updateMinecraftConfig({
        ...(minecraftConfig || DEFAULT_MINECRAFT_CONFIG),
        serverIp: mcServerIp.trim(),
        version: mcVersion.trim(),
        description: mcDescription.trim(),
        rules: mcRules,
        steps: mcSteps,
        players: mcPlayers,
        modpack: modpackUrl ? {
          title: modpackTitle.trim() || 'Сборка модов',
          description: modpackDesc.trim() || 'Наш официальный пак модов',
          version: modpackVersion.trim() || mcVersion.trim(),
          driveUrl: modpackUrl.trim()
        } : undefined
      });
      showStatusMsg('Настройки Майнкрафт сохранены');
    } catch {
      showStatusMsg('Не удалось сохранить настройки', 'error');
    }
  };

  const handleFetchAndAddMod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modUrl) return;
    setIsFetchingMod(true);
    setModError('');
    try {
      const match = modUrl.match(/modrinth\.com\/(?:mod|plugin)\/([^/?]+)/);
      if (!match) {
        throw new Error('Некорректная ссылка на Modrinth');
      }
      const slug = match[1];
      const res = await fetch(`https://api.modrinth.com/v2/project/${slug}`);
      if (!res.ok) {
        throw new Error('Мод не найден или ошибка API Modrinth');
      }
      const data = await res.json();
      
      const newMod = {
        id: Date.now().toString(),
        slug: data.slug,
        title: data.title,
        description: data.description,
        icon_url: data.icon_url,
        link: modUrl,
        createdAt: Date.now()
      };

      const currentConfig = minecraftConfig || DEFAULT_MINECRAFT_CONFIG;
      const updatedMods = [...(currentConfig.mods || []), newMod];
      await updateMinecraftConfig({ ...currentConfig, mods: updatedMods });
      setModUrl('');
      showStatusMsg('Мод успешно добавлен!');
    } catch (err: any) {
      setModError(err.message);
    } finally {
      setIsFetchingMod(false);
    }
  };

  const handleDeleteMod = async (modId: string) => {
    if (!confirm('Удалить мод?')) return;
    const currentConfig = minecraftConfig || DEFAULT_MINECRAFT_CONFIG;
    const updatedMods = (currentConfig.mods || []).filter(m => m.id !== modId);
    await updateMinecraftConfig({ ...currentConfig, mods: updatedMods });
    showStatusMsg('Мод удален');
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsContent.trim()) {
      showStatusMsg('Заполните название и содержание новости', 'error');
      return;
    }

    try {
      if (editingNewsId) {
        await updateNews(editingNewsId, {
          title: newsTitle.trim(),
          content: newsContent.trim(),
          tag: newsTag.trim() || 'НОВОСТЬ',
          imageUrl: newsImage || undefined
        });
        showStatusMsg('Новость успешно обновлена!');
        setEditingNewsId(null);
      } else {
        await addNews({
          title: newsTitle.trim(),
          content: newsContent.trim(),
          tag: newsTag.trim() || 'НОВОСТЬ',
          imageUrl: newsImage || undefined,
          date: new Date().toISOString()
        });
        showStatusMsg('Новость успешно опубликована!');
      }

      setNewsTitle('');
      setNewsContent('');
      setNewsTag('');
      setNewsImage('');
    } catch {
      showStatusMsg('Ошибка при сохранении новости', 'error');
    }
  };

  const startEditingNews = (item: NewsArticle) => {
    setEditingNewsId(item.id);
    setNewsTitle(item.title);
    setNewsContent(item.content);
    setNewsTag(item.tag);
    setNewsImage(item.imageUrl || '');
  };

  const handleAddEmoji = async (e: React.FormEvent) => {
    e.preventDefault();
    const char = newEmojiChar.trim();
    const label = newEmojiLabel.trim();

    if (!char || !label) {
      showStatusMsg('Заполните все поля для эмодзи', 'error');
      return;
    }

    const currentList = reactionsConfig?.emojiList || [];
    if (currentList.some(item => item.emoji === char)) {
      showStatusMsg('Этот эмодзи уже добавлен в список', 'error');
      return;
    }

    const newId = 'emoji-' + Date.now();
    const newItem: EmojiItem = {
      id: newId,
      emoji: char,
      label: label,
      enabled: true
    };

    try {
      await updateReactionsConfig({
        emojiList: [...currentList, newItem]
      });
      setNewEmojiChar('');
      setNewEmojiLabel('');
      showStatusMsg('Эмодзи успешно добавлен!');
    } catch {
      showStatusMsg('Ошибка при добавлении эмодзи', 'error');
    }
  };

  const handleToggleEmojiEnabled = async (emojiId: string) => {
    const currentList = reactionsConfig?.emojiList || [];
    const updatedList = currentList.map(item => {
      if (item.id === emojiId) {
        return { ...item, enabled: !item.enabled };
      }
      return item;
    });

    try {
      await updateReactionsConfig({ emojiList: updatedList });
      showStatusMsg('Статус эмодзи обновлен');
    } catch {
      showStatusMsg('Ошибка при обновлении статуса', 'error');
    }
  };

  const handleDeleteEmoji = async (emojiId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот эмодзи из списка доступных? Реакции по нему у существующих новостей сохранятся, но новые пользователи не смогут его выбрать.')) {
      return;
    }
    const currentList = reactionsConfig?.emojiList || [];
    const updatedList = currentList.filter(item => item.id !== emojiId);

    try {
      await updateReactionsConfig({ emojiList: updatedList });
      showStatusMsg('Эмодзи удален из списка');
    } catch {
      showStatusMsg('Ошибка при удалении эмодзи', 'error');
    }
  };

  const handleMoveEmoji = async (index: number, direction: 'up' | 'down') => {
    const currentList = [...(reactionsConfig?.emojiList || [])];
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentList.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = currentList[index];
    currentList[index] = currentList[targetIndex];
    currentList[targetIndex] = temp;

    try {
      await updateReactionsConfig({ emojiList: currentList });
    } catch {
      showStatusMsg('Ошибка при изменении порядка', 'error');
    }
  };

  // Trigger transient status message
  const showStatusMsg = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusMsg({ text, type });
    if (type !== 'info') {
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  // Create Show Submission
  const handleCreateShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showTitle.trim()) return;

    const createdTitle = showTitle.trim();

    try {
      const defaultThumb = 'https://images.unsplash.com/photo-1574375927938-d5a98e8fed85?q=80&w=600&auto=format&fit=crop';
      const defaultCover = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1920&auto=format&fit=crop';

      const newShowId = await addShow({
        title: createdTitle,
        description: showDescription.trim(),
        category: showCategory,
        status: showStatus,
        coverImage: showCover.trim() || defaultCover,
        thumbnailImage: showThumb.trim() || defaultThumb,
        trailerUrl: showTrailerUrl.trim() || undefined
      });

      // Reset form
      setShowTitle('');
      setShowDescription('');
      setShowCover('');
      setShowThumb('');
      setShowTrailerUrl('');

      // Show success animation
      setShowCreatedAnimation({ visible: true, title: createdTitle });

      // Auto-dismiss animation after 1.5s, then switch to episodes tab
      setTimeout(() => {
        setShowCreatedAnimation({ visible: false, title: '' });
        setSelectedShowId(newShowId);
        setEpNumber(1);
        setIsAddingShow(false);
        setAdminTab('shows');
        showStatusMsg(`Сериал «${createdTitle}» добавлен! Теперь добавьте серии.`);
      }, 1500);
    } catch {
      showStatusMsg('Ошибка при добавлении сериала', 'error');
    }
  };

  // Create Episode Submission
  const handleCreateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShowId || !epTitle.trim() || !epUrl.trim()) {
      showStatusMsg('Пожалуйста, заполните обязательные поля.', 'error');
      return;
    }

    try {
      // Calculate release ISO string
      const isoDate = `${epReleaseDate}T${epReleaseTime}:00`;
      const releaseIso = new Date(isoDate).toISOString();

      const defaultEpThumb = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=400&auto=format&fit=crop';

      await addEpisode(selectedShowId, {
        number: Number(epNumber),
        title: epTitle.trim(),
        description: epDesc.trim() || undefined,
        driveUrl: epUrl.trim(),
        releaseDate: releaseIso,
        duration: epDuration.trim() || undefined,
        thumbnail: epThumb.trim() || defaultEpThumb,
        stills: epStills.length > 0 ? epStills : undefined
      });

      showStatusMsg(`Серия ${epNumber} успешно добавлена!`);
      
      // Increment next episode number
      setEpNumber(n => n + 1);
      setEpTitle('');
      setEpDesc('');
      setEpUrl('');
      setEpThumb('');
      setEpStills([]);
    } catch {
      showStatusMsg('Ошибка при добавлении серии', 'error');
    }
  };

  // Schedule Next Release Submission
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleShowId) {
      showStatusMsg('Выберите сериал для расписания', 'error');
      return;
    }

    try {
      let releaseIso = null;

      if (schedType === 'weekly') {
        // Find next release date for weekly schedule
        const now = new Date();
        const nextRel = new Date();
        const [hours, minutes] = schedTime.split(':').map(Number);
        
        // Find offset to target day of week
        nextRel.setDate(now.getDate() + (schedDay - now.getDay() + 7) % 7);
        nextRel.setHours(hours, minutes, 0, 0);

        // If target date is past, add 7 days
        if (nextRel.getTime() <= now.getTime()) {
          nextRel.setDate(nextRel.getDate() + 7);
        }
        releaseIso = nextRel.toISOString();
      } else {
        releaseIso = new Date(schedOneOff).toISOString();
      }

      await updateShow(scheduleShowId, {
        scheduleType: schedType,
        scheduleDay: schedType === 'weekly' ? schedDay : undefined,
        scheduleTime: schedType === 'weekly' ? schedTime : undefined,
        nextEpisodeRelease: releaseIso
      });

      showStatusMsg('Расписание таймера обновлено!');
      setScheduleShowId('');
    } catch {
      showStatusMsg('Ошибка при обновлении расписания', 'error');
    }
  };

  const handleAddActor = async () => {
    if (!editingShow || !actorName.trim() || !actorRole.trim()) {
      showStatusMsg('Заполните имя и роль актера', 'error');
      return;
    }
    
    let updatedActors = [...(editingShow.actors || [])];
    
    if (editingActorId) {
      // Edit existing actor
      updatedActors = updatedActors.map(a => 
        a.id === editingActorId 
          ? {
              ...a,
              name: actorName.trim(),
              role: actorRole.trim(),
              imageUrl: actorImage.trim() || undefined,
              imageUrls: actorGallery.length > 0 ? actorGallery : undefined,
              filmography: actorFilmography.trim() || undefined,
            }
          : a
      );
      showStatusMsg('Изменения актёра сохранены');
    } else {
      // Add new actor
      const newActor = {
        id: generateId('actor'),
        name: actorName.trim(),
        role: actorRole.trim(),
        imageUrl: actorImage.trim() || undefined,
        imageUrls: actorGallery.length > 0 ? actorGallery : undefined,
        filmography: actorFilmography.trim() || undefined,
      };
      updatedActors.push(newActor);
      showStatusMsg('Актер добавлен');
    }
    
    // Immediately update local state
    setEditingShow({ ...editingShow, actors: updatedActors });
    
    // IMMEDIATELY SAVE TO FIREBASE
    await updateShow(editingShow.id, { actors: updatedActors });
    
    // Reset fields
    setActorName('');
    setActorRole('');
    setActorImage('');
    setActorGallery([]);
    setActorFilmography('');
    setEditingActorId(null);
  };

  const handleEditActorClick = (actorId: string) => {
    if (!editingShow) return;
    const actorToEdit = (editingShow.actors || []).find(a => a.id === actorId);
    if (actorToEdit) {
      setActorName(actorToEdit.name);
      setActorRole(actorToEdit.role);
      setActorImage(actorToEdit.imageUrl || '');
      setActorGallery(actorToEdit.imageUrls || []);
      setActorFilmography(actorToEdit.filmography || '');
      setEditingActorId(actorId);
    }
  };

  const handleDeleteActor = async (actorId: string) => {
    if (!editingShow) return;
    if (confirm('Вы уверены, что хотите удалить этого актёра?')) {
      const updatedActors = (editingShow.actors || []).filter(a => a.id !== actorId);
      setEditingShow({ ...editingShow, actors: updatedActors });
      await updateShow(editingShow.id, { actors: updatedActors });
      
      if (editingActorId === actorId) {
        setActorName('');
        setActorRole('');
        setActorImage('');
        setActorGallery([]);
        setActorFilmography('');
        setEditingActorId(null);
      }
      showStatusMsg('Актер удален');
    }
  };

  const handleEditEpisodeClick = (ep: Episode) => {
    setEditingEpisodeId(ep.id);
    setEditEpNumber(ep.number);
    setEditEpTitle(ep.title);
    setEditEpDesc(ep.description || '');
    setEditEpUrl(ep.driveUrl);
    setEditEpDuration(ep.duration || '24:00');
    setEditEpThumb(ep.thumbnail || '');
    setEditEpStills(ep.stills || []);
  };

  const handleSaveEpisodeEdit = async () => {
    const activeShow = editingShow || selectedShow;
    if (!activeShow || !editingEpisodeId || !editEpTitle.trim() || !editEpUrl.trim()) {
      showStatusMsg('Заполните обязательные поля для серии', 'error');
      return;
    }

    try {
      const updatedEpisodes = activeShow.episodes.map(ep => 
        ep.id === editingEpisodeId 
          ? {
              ...ep,
              number: Number(editEpNumber),
              title: editEpTitle.trim(),
              description: editEpDesc.trim() || undefined,
              driveUrl: editEpUrl.trim(),
              duration: editEpDuration.trim() || undefined,
              thumbnail: editEpThumb.trim() || undefined,
              stills: editEpStills.length > 0 ? editEpStills : undefined
            }
          : ep
      ).sort((a, b) => a.number - b.number);

      if (editingShow) {
        setEditingShow({ ...editingShow, episodes: updatedEpisodes });
      }
      await updateShow(activeShow.id, { episodes: updatedEpisodes });
      
      setEditingEpisodeId(null);
      showStatusMsg('Изменения серии сохранены!');
    } catch {
      showStatusMsg('Ошибка при изменении серии', 'error');
    }
  };

  const selectedShow = shows.find(s => s.id === selectedShowId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-[fadeIn_0.2s_ease-out]">
      {/* 1. Left Nav Tabs */}
      <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between h-fit gap-6">
        <div className="space-y-1">
          <div className="px-2 pb-3 border-b border-slate-800/60 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Меню админа</span>
            <span className="flex items-center gap-1 text-[9px] font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${isFirebaseConnected ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span className="text-slate-500">{isFirebaseConnected ? 'Cloud' : 'Local'}</span>
            </span>
          </div>

          <nav className="space-y-1 pt-2">
            <button
              onClick={() => {
                setAdminTab('shows');
                setEditingShow(null);
                setSelectedShowId('');
                setScheduleShowId('');
                setIsAddingShow(false);
                setEditingEpisodeId(null);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                adminTab === 'shows' ? 'bg-purple-600/15 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Tv className="w-4 h-4" />
              Управление сериалами
            </button>
            <button
              onClick={() => setAdminTab('db')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                adminTab === 'db' ? 'bg-purple-600/15 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Database className="w-4 h-4" />
              База данных
            </button>
            <button
              onClick={() => {
                setAdminTab('news');
                setEditingNewsId(null);
                setNewsTitle('');
                setNewsContent('');
                setNewsTag('');
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                adminTab === 'news' ? 'bg-purple-600/15 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
              }`}
            >
              <FileText className="w-4 h-4" />
              Новости портала
            </button>
            <button
              onClick={() => {
                setAdminTab('minecraft');
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                adminTab === 'minecraft' ? 'bg-purple-600/15 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              Настройки Майнкрафт
            </button>
            <button
              onClick={() => {
                setAdminTab('reactions');
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                adminTab === 'reactions' ? 'bg-purple-650/15 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Smile className="w-4 h-4" />
              Настройка реакций
            </button>
            <button
              onClick={() => {
                setAdminTab('backgrounds');
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                adminTab === 'backgrounds' ? 'bg-purple-650/15 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Фоны вкладок
            </button>
            <button
              onClick={() => {
                setAdminTab('bunker_db');
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                adminTab === 'bunker_db' ? 'bg-purple-650/15 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Database className="w-4 h-4" />
              База Бункера
            </button>
            <button
              onClick={() => setAdminTab('event_timer')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                adminTab === 'event_timer' ? 'bg-purple-650/15 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Clock className="w-4 h-4" />
              Таймер ивентов
            </button>
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          {/* Firestore Connection status */}
          <div
            className={`px-3 py-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-[10px] font-bold ${isFirebaseConnected
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-500'
              }`}
          >
            {isFirebaseConnected ? (
              <>
                <Cloud className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate">База онлайн</span>
              </>
            ) : (
              <>
                <CloudOff className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">База оффлайн</span>
              </>
            )}
          </div>

          {/* Database status information */}
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850/60 text-[10px] text-slate-500 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-purple-400 mb-1 inline mr-1" />
            <span>Вы можете быстро загрузить демо-сериалы с тестовыми видеофайлами в разделе «База данных».</span>
          </div>
        </div>
      </div>

      {/* 2. Main Form Area */}
      <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 relative">
        {/* Banner notification msg */}
        {statusMsg && (
          <div className={`absolute top-4 right-4 z-20 px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 shadow-lg animate-[fadeIn_0.15s_ease-out] ${
            statusMsg.type === 'success' 
              ? 'bg-green-950/25 border-green-800/50 text-green-400' 
              : statusMsg.type === 'info'
              ? 'bg-purple-950/25 border-purple-800/50 text-purple-400'
              : 'bg-rose-950/25 border-rose-800/50 text-rose-450'
          }`}>
            {statusMsg.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : statusMsg.type === 'info' ? (
              <Info className="w-4 h-4 animate-pulse" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* TAB 1: SHOWS MANAGEMENT (UNIFIED) */}
        {adminTab === 'bunker_db' && (
          <AdminBunkerDB />
        )}

        {adminTab === 'shows' && (
          <div className="space-y-6">
            {isAddingShow ? (
              /* ADD SHOW FORM */
              <form onSubmit={handleCreateShow} className="space-y-4 font-sans">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-sans">Добавить новый сериал</h3>
                    <p className="text-xs text-slate-500 font-sans">Заполните поля, чтобы добавить медиакарточку в каталог.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingShow(false)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Назад к списку
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Название сериала *</label>
                    <input 
                      type="text" 
                      value={showTitle} 
                      onChange={(e) => setShowTitle(e.target.value)} 
                      placeholder="Например: Стальной алхимик" 
                      className="w-full ide-input font-sans text-xs" 
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Категория</label>
                      <select 
                        value={showCategory} 
                        onChange={(e) => setShowCategory(e.target.value as Show['category'])}
                        className="w-full ide-input cursor-pointer text-xs"
                      >
                        <option value="Anime">Аниме</option>
                        <option value="Series">Сериал</option>
                        <option value="Movies">Фильм</option>
                        <option value="Other">Другое</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Статус</label>
                      <select 
                        value={showStatus} 
                        onChange={(e) => setShowStatus(e.target.value as Show['status'])}
                        className="w-full ide-input cursor-pointer text-xs"
                      >
                        <option value="ongoing">Онгоинг</option>
                        <option value="completed">Завершен</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Описание сюжета *</label>
                  <textarea 
                    value={showDescription} 
                    onChange={(e) => setShowDescription(e.target.value)} 
                    placeholder="Краткое описание сюжета сериала..."
                    className="w-full ide-input min-h-[90px] py-2 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ссылка на трейлер (YouTube / Google Drive)</label>
                  <input 
                    type="text" 
                    value={showTrailerUrl} 
                    onChange={(e) => setShowTrailerUrl(e.target.value)} 
                    placeholder="https://www.youtube.com/watch?v=... или прямая ссылка" 
                    className="w-full ide-input text-xs" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL постера (Thumbnail)</label>
                      <ImageUploader onImageUploaded={setShowThumb} maxWidth={600} />
                    </div>
                    <input 
                      type="text" 
                      value={showThumb} 
                      onChange={(e) => setShowThumb(e.target.value)} 
                      placeholder="https://images.unsplash.com/... (600x900)" 
                      className="w-full ide-input text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL баннера (Cover Image)</label>
                      <ImageUploader onImageUploaded={setShowCover} maxWidth={1920} />
                    </div>
                    <input 
                      type="text" 
                      value={showCover} 
                      onChange={(e) => setShowCover(e.target.value)} 
                      placeholder="https://images.unsplash.com/... (1920x1080)" 
                      className="w-full ide-input text-xs" 
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingShow(false)}
                    className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 bg-purple-650 hover:bg-purple-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-950/20 cursor-pointer"
                  >
                    Создать карточку
                  </button>
                </div>
              </form>
            ) : editingShow ? (
              /* EDIT SHOW FORM */
              <form onSubmit={handleUpdateShowSubmit} className="space-y-4 font-sans">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-sans">Редактировать сериал</h3>
                    <p className="text-xs text-slate-500 font-sans">Измените необходимые поля и сохраните изменения.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingShow(null)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Назад к списку
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Название сериала *</label>
                    <input 
                      type="text" 
                      value={editTitle} 
                      onChange={(e) => setEditTitle(e.target.value)} 
                      className="w-full ide-input text-xs" 
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Категория</label>
                      <select 
                        value={editCategory} 
                        onChange={(e) => setEditCategory(e.target.value as Show['category'])}
                        className="w-full ide-input cursor-pointer text-xs"
                      >
                        <option value="Anime">Аниме</option>
                        <option value="Series">Сериал</option>
                        <option value="Movies">Фильм</option>
                        <option value="Other">Другое</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Статус</label>
                      <select 
                        value={editStatus} 
                        onChange={(e) => setEditStatus(e.target.value as Show['status'])}
                        className="w-full ide-input cursor-pointer text-xs"
                      >
                        <option value="ongoing">Онгоинг</option>
                        <option value="completed">Завершен</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Описание сюжета *</label>
                  <textarea 
                    value={editDescription} 
                    onChange={(e) => setEditDescription(e.target.value)} 
                    className="w-full ide-input min-h-[90px] py-2 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ссылка на трейлер (YouTube / Google Drive)</label>
                  <input 
                    type="text" 
                    value={editTrailerUrl} 
                    onChange={(e) => setEditTrailerUrl(e.target.value)} 
                    placeholder="https://www.youtube.com/watch?v=... или прямая ссылка" 
                    className="w-full ide-input text-xs" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL постера (Thumbnail)</label>
                      <ImageUploader onImageUploaded={setEditThumb} maxWidth={600} />
                    </div>
                    <input 
                      type="text" 
                      value={editThumb} 
                      onChange={(e) => setEditThumb(e.target.value)} 
                      className="w-full ide-input text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL баннера (Cover Image)</label>
                      <ImageUploader onImageUploaded={setEditCover} maxWidth={1920} />
                    </div>
                    <input 
                      type="text" 
                      value={editCover} 
                      onChange={(e) => setEditCover(e.target.value)} 
                      className="w-full ide-input text-xs" 
                    />
                  </div>
                </div>

                {/* List of episodes for editing show */}
                {editingShow.episodes.length > 0 && (
                  <div className="border-t border-slate-800/60 pt-4 space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-sans">Управление сериями ({editingShow.episodes.length})</h4>
                    <div className="bg-slate-950/50 rounded-xl border border-slate-850 overflow-hidden divide-y divide-slate-850 max-h-[300px] overflow-y-auto font-sans font-sans">
                      {editingShow.episodes.map(ep => (
                        <div key={ep.id} className="p-3 flex items-center justify-between gap-4 text-xs font-sans">
                          <div>
                            <span className="font-mono font-bold text-purple-400">Серия {ep.number}</span>
                            <span className="text-slate-300 font-semibold ml-2">{ep.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditEpisodeClick(ep)}
                              className={`cursor-pointer p-1 transition-colors ${editingEpisodeId === ep.id ? 'text-purple-400' : 'text-slate-500 hover:text-purple-400'}`}
                              title="Изменить серию"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Вы уверены, что хотите удалить эту серию?')) {
                                  deleteEpisode(editingShow.id, ep.id);
                                  setEditingShow(prev => prev ? {
                                    ...prev,
                                    episodes: prev.episodes.filter(e => e.id !== ep.id)
                                  } : prev);
                                  showStatusMsg('Серия удалена');
                                }
                              }}
                              className="text-slate-505 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                              title="Удалить серию"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Edit Episode Sub-form */}
                    {editingEpisodeId && (
                      <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-4 mt-3 animate-[fadeIn_0.2s_ease-out]">
                        <div className="text-xs font-bold text-slate-200 font-sans font-sans">Редактировать серию {editEpNumber}</div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Название серии *</label>
                            <input 
                              type="text" 
                              value={editEpTitle} 
                              onChange={(e) => setEditEpTitle(e.target.value)} 
                              className="w-full ide-input text-xs" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Продолжительность</label>
                            <input 
                              type="text" 
                              value={editEpDuration} 
                              onChange={(e) => setEditEpDuration(e.target.value)} 
                              className="w-full ide-input text-xs" 
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ссылка Google Диск *</label>
                          <input 
                            type="text" 
                            value={editEpUrl} 
                            onChange={(e) => setEditEpUrl(e.target.value)} 
                            className="w-full ide-input text-xs" 
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Описание серии</label>
                          <textarea 
                            value={editEpDesc} 
                            onChange={(e) => setEditEpDesc(e.target.value)} 
                            className="w-full ide-input min-h-[60px] text-xs" 
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans font-sans font-sans">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Миниатюра серии</label>
                              <ImageUploader onImageUploaded={setEditEpThumb} maxWidth={800} />
                            </div>
                            <input 
                              type="text" 
                              value={editEpThumb} 
                              onChange={(e) => setEditEpThumb(e.target.value)} 
                              className="w-full ide-input text-xs" 
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                              <Camera className="w-3.5 h-3.5 text-purple-400" />
                              <span>Кадры серии (Галерея)</span>
                            </label>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between border border-dashed border-slate-700/50 rounded-xl p-2 bg-slate-900/50">
                                <span className="text-[9px] text-slate-500">Добавить кадр</span>
                                <ImageUploader onImageUploaded={(b64) => setEditEpStills(prev => [...prev, b64])} maxWidth={800} />
                              </div>
                              {editEpStills.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                  {editEpStills.map((img, idx) => (
                                    <div key={idx} className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-slate-700 group">
                                      <img src={img} alt="" className="w-full h-full object-cover" />
                                      <button 
                                        type="button"
                                        onClick={() => setEditEpStills(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute inset-0 bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingEpisodeId(null);
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs font-semibold w-1/3 transition-colors"
                          >
                            Отмена
                          </button>
                          <button 
                            type="button"
                            onClick={handleSaveEpisodeEdit}
                            className="px-4 py-2 bg-purple-650 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold flex-1 transition-colors"
                          >
                            Сохранить изменения серии
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Manage Actors Section */}
                <div className="border-t border-slate-800/60 pt-4 mt-4 space-y-4">
                  <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-sans">Управление актёрами (Каст)</h4>
                  
                  {/* New Actor Form */}
                  <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 space-y-4 font-sans font-sans">
                    
                    {/* Database selection dropdown */}
                    {uniqueActorsPool.length > 0 && (
                      <div className="space-y-1.5 border-b border-slate-800/40 pb-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Выбрать из существующей базы актеров
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            const selectedActorName = e.target.value;
                            const found = uniqueActorsPool.find(a => a.name === selectedActorName);
                            if (found) {
                              setActorName(found.name);
                              setActorImage(found.imageUrl || '');
                              setActorGallery(found.imageUrls || []);
                              setActorFilmography(found.filmography || '');
                              // Leave actorRole alone to allow setting the show-specific role
                              showStatusMsg(`Данные актёра «${found.name}» успешно загружены!`);
                            }
                          }}
                          className="w-full ide-input cursor-pointer text-xs"
                        >
                          <option value="">-- Выберите актёра для автозаполнения полей --</option>
                          {uniqueActorsPool.map(a => (
                            <option key={a.name} value={a.name}>
                              {a.name} {a.filmography ? `(${a.filmography})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Имя актёра *</label>
                        <input 
                          type="text" 
                          value={actorName} 
                          onChange={(e) => setActorName(e.target.value)} 
                          className="w-full ide-input text-xs" 
                          placeholder="Киану Ривз"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Роль в сериале *</label>
                        <input 
                          type="text" 
                          value={actorRole} 
                          onChange={(e) => setActorRole(e.target.value)} 
                          className="w-full ide-input text-xs" 
                          placeholder="Джон Уик"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Фото актёра (URL или Загрузить)</label>
                        <ImageUploader onImageUploaded={setActorImage} maxWidth={400} />
                      </div>
                      <input 
                        type="text" 
                        value={actorImage} 
                        onChange={(e) => setActorImage(e.target.value)} 
                        className="w-full ide-input text-xs" 
                        placeholder="https://..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Дополнительные фото (Галерея)</label>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between border border-dashed border-slate-700/50 rounded-xl p-3 bg-slate-900/50 font-sans font-sans">
                          <span className="text-[10px] text-slate-555">Загрузите дополнительные фото</span>
                          <ImageUploader 
                            onImageUploaded={(b64) => setActorGallery(prev => [...prev, b64])} 
                            maxWidth={600} 
                          />
                        </div>
                        {actorGallery.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {actorGallery.map((img, idx) => (
                              <div key={idx} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-700 group">
                                <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                <button 
                                  type="button"
                                  onClick={() => setActorGallery(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute inset-0 bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Фильмография / Заметки</label>
                      <input 
                        type="text" 
                        value={actorFilmography} 
                        onChange={(e) => setActorFilmography(e.target.value)} 
                        className="w-full ide-input text-xs" 
                        placeholder="Матрица, Скорость, Константин..."
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      {editingActorId && (
                        <button 
                          type="button"
                          onClick={() => {
                            setActorName('');
                            setActorRole('');
                            setActorImage('');
                            setActorGallery([]);
                            setActorFilmography('');
                            setEditingActorId(null);
                          }}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs font-semibold w-1/3 transition-colors"
                        >
                          Отмена
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={handleAddActor}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold flex-1 transition-colors ${
                          editingActorId 
                            ? 'bg-purple-650 hover:bg-purple-600 text-white shadow-lg shadow-purple-950/20' 
                            : 'bg-slate-800 hover:bg-slate-700 text-purple-400'
                        }`}
                      >
                        {editingActorId ? 'Сохранить изменения актёра' : '+ Добавить актёра'}
                      </button>
                    </div>
                  </div>

                  {/* List of actors */}
                  {editingShow.actors && editingShow.actors.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      {editingShow.actors.map(actor => (
                        <div key={actor.id} className={`bg-slate-950 border p-3 rounded-xl flex items-start gap-3 relative transition-all ${editingActorId === actor.id ? 'border-purple-500 shadow-lg shadow-purple-950/20' : 'border-slate-800'}`}>
                          <div className="absolute top-2 right-2 flex gap-1 font-sans font-sans">
                            <button
                              type="button"
                              onClick={() => handleEditActorClick(actor.id)}
                              className={`cursor-pointer p-1 transition-colors ${editingActorId === actor.id ? 'text-purple-400' : 'text-slate-500 hover:text-purple-400'}`}
                              title="Изменить актёра"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteActor(actor.id)}
                              className="text-slate-500 hover:text-rose-500 cursor-pointer p-1 transition-colors"
                              title="Удалить актёра"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                            {actor.imageUrl ? (
                              <img src={actor.imageUrl} alt={actor.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                {actor.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="pr-6 font-sans">
                            <h5 className="text-xs font-bold text-slate-200">{actor.name}</h5>
                            <p className="text-[10px] text-purple-400 font-semibold mb-1">{actor.role}</p>
                            {actor.filmography && (
                              <p className="text-[9px] text-slate-550 line-clamp-2 leading-tight">
                                Известен по: {actor.filmography}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-end gap-3 mt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingShow(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-purple-650 hover:bg-purple-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-950/20 cursor-pointer"
                  >
                    Сохранить изменения
                  </button>
                </div>
              </form>
            ) : selectedShowId ? (
              /* EDIT EPISODES OF THE SHOW (was tab episodes) */
              <form onSubmit={handleCreateEpisode} className="space-y-4 font-sans font-sans">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 font-sans">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <Tv className="w-4.5 h-4.5 text-purple-400" />
                      <span>Серии: {selectedShow?.title}</span>
                    </h3>
                    <p className="text-xs text-slate-500">Добавление и редактирование серий для выбранного сериала.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedShowId('');
                      setEditingEpisodeId(null);
                    }}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Назад к списку
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5 sm:col-span-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Название серии *</label>
                    <input 
                      type="text" 
                      value={epTitle} 
                      onChange={(e) => setEpTitle(e.target.value)} 
                      placeholder="Например: Столп Звука Тенген Узуй" 
                      className="w-full ide-input text-xs" 
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Номер серии *</label>
                    <input 
                      type="number" 
                      min="1"
                      value={epNumber} 
                      onChange={(e) => setEpNumber(Number(e.target.value))} 
                      className="w-full ide-input text-xs" 
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ссылка Google Диск / Видеофайл *</label>
                    <input 
                      type="text" 
                      value={epUrl} 
                      onChange={(e) => setEpUrl(e.target.value)} 
                      placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing" 
                      className="w-full ide-input text-xs" 
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Продолжительность (ММ:СС)</label>
                    <input 
                      type="text" 
                      value={epDuration} 
                      onChange={(e) => setEpDuration(e.target.value)} 
                      placeholder="24:00" 
                      className="w-full ide-input text-xs" 
                    />
                  </div>
                </div>

                <div className="p-3 bg-purple-950/20 border border-purple-900/30 rounded-xl space-y-1 text-[10px] text-purple-300 leading-normal font-sans">
                  <p className="font-bold text-purple-400">⚠️ ВАЖНО: Настройка доступа на Google Диске для просмотра:</p>
                  <ol className="list-decimal list-inside space-y-0.5 opacity-90 text-[9px]">
                    <li>В Google Drive нажмите правой кнопкой на видеофайл -&gt; <strong>Поделиться</strong>.</li>
                    <li>В разделе <strong>«Общий доступ»</strong> измените «Ограниченный доступ» на <strong>«Все, у кого есть ссылка»</strong>.</li>
                    <li>Установите роль <strong>«Читатель»</strong> (Viewer).</li>
                    <li>Скопируйте ссылку и вставьте её выше. Без этого посторонние пользователи увидят ошибку доступа!</li>
                  </ol>
                </div>

                <div className="space-y-1.5 font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Краткий синопсис серии</label>
                  <textarea 
                    value={epDesc} 
                    onChange={(e) => setEpDesc(e.target.value)} 
                    placeholder="Что происходит в этой серии..."
                    className="w-full ide-input min-h-[70px] py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Дата публикации</label>
                    <input 
                      type="date" 
                      value={epReleaseDate} 
                      onChange={(e) => setEpReleaseDate(e.target.value)} 
                      className="w-full ide-input cursor-pointer text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Время публикации</label>
                    <input 
                      type="time" 
                      value={epReleaseTime} 
                      onChange={(e) => setEpReleaseTime(e.target.value)} 
                      className="w-full ide-input cursor-pointer text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-sans">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL миниатюры серии</label>
                      <ImageUploader onImageUploaded={setEpThumb} maxWidth={800} />
                    </div>
                    <input 
                      type="text" 
                      value={epThumb} 
                      onChange={(e) => setEpThumb(e.target.value)} 
                      placeholder="https://unsplash.com/... (400x225)" 
                      className="w-full ide-input text-xs" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5 font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <Camera className="w-3.5 h-3.5 text-purple-400" />
                    <span>Кадры со съемок (Галерея серии)</span>
                  </label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between border border-dashed border-slate-700/50 rounded-xl p-3 bg-slate-900/50 font-sans font-sans">
                      <span className="text-[10px] text-slate-550">Загрузите кадры серии</span>
                      <ImageUploader 
                        onImageUploaded={(b64) => setEpStills(prev => [...prev, b64])} 
                        maxWidth={800} 
                      />
                    </div>
                    {epStills.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {epStills.map((img, idx) => (
                          <div key={idx} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-700 group">
                            <img src={img} alt={`Still ${idx}`} className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setEpStills(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute inset-0 bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 bg-purple-650 hover:bg-purple-650 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-950/20 cursor-pointer"
                  >
                    Добавить эпизод
                  </button>
                </div>

                {/* List of episodes for selected show */}
                {selectedShow && selectedShow.episodes.length > 0 && (
                  <div className="mt-6 border-t border-slate-800/60 pt-4 space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-sans">Список серий ({selectedShow.episodes.length})</h4>
                    <div className="bg-slate-950/50 rounded-xl border border-slate-850 overflow-hidden divide-y divide-slate-850 max-h-[400px] overflow-y-auto">
                      {selectedShow.episodes.map(ep => (
                        <div key={ep.id} className="p-3 flex items-center justify-between gap-4 text-xs font-sans font-sans">
                          <div>
                            <span className="font-mono font-bold text-purple-400">Серия {ep.number}</span>
                            <span className="text-slate-300 font-semibold ml-2">{ep.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditEpisodeClick(ep)}
                              className={`cursor-pointer p-1 transition-colors ${editingEpisodeId === ep.id ? 'text-purple-400' : 'text-slate-500 hover:text-purple-400'}`}
                              title="Изменить серию"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Вы уверены, что хотите удалить эту серию?')) {
                                  deleteEpisode(selectedShow.id, ep.id);
                                  showStatusMsg('Серия удалена');
                                }
                              }}
                              className="text-slate-500 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                              title="Удалить серию"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Edit Episode Sub-form */}
                    {editingEpisodeId && (
                      <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-4 mt-3 animate-[fadeIn_0.2s_ease-out]">
                        <div className="text-xs font-bold text-slate-200 font-sans">Редактировать серию {editEpNumber}</div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Название серии *</label>
                            <input 
                              type="text" 
                              value={editEpTitle} 
                              onChange={(e) => setEditEpTitle(e.target.value)} 
                              className="w-full ide-input text-xs" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Продолжительность</label>
                            <input 
                              type="text" 
                              value={editEpDuration} 
                              onChange={(e) => setEditEpDuration(e.target.value)} 
                              className="w-full ide-input text-xs" 
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ссылка Google Диск *</label>
                          <input 
                            type="text" 
                            value={editEpUrl} 
                            onChange={(e) => setEditEpUrl(e.target.value)} 
                            className="w-full ide-input text-xs" 
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Описание серии</label>
                          <textarea 
                            value={editEpDesc} 
                            onChange={(e) => setEditEpDesc(e.target.value)} 
                            className="w-full ide-input min-h-[60px] text-xs" 
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between font-sans">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Миниатюра серии</label>
                              <ImageUploader onImageUploaded={setEditEpThumb} maxWidth={800} />
                            </div>
                            <input 
                              type="text" 
                              value={editEpThumb} 
                              onChange={(e) => setEditEpThumb(e.target.value)} 
                              className="w-full ide-input text-xs" 
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                              <Camera className="w-3.5 h-3.5 text-purple-400" />
                              <span>Кадры серии (Галерея)</span>
                            </label>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between border border-dashed border-slate-700/50 rounded-xl p-2 bg-slate-900/50">
                                <span className="text-[9px] text-slate-500">Добавить кадр</span>
                                <ImageUploader onImageUploaded={(b64) => setEditEpStills(prev => [...prev, b64])} maxWidth={800} />
                              </div>
                              {editEpStills.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                  {editEpStills.map((img, idx) => (
                                    <div key={idx} className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-slate-700 group">
                                      <img src={img} alt="" className="w-full h-full object-cover" />
                                      <button 
                                        type="button"
                                        onClick={() => setEditEpStills(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute inset-0 bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingEpisodeId(null);
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs font-semibold w-1/3 transition-colors"
                          >
                            Отмена
                          </button>
                          <button 
                            type="button"
                            onClick={handleSaveEpisodeEdit}
                            className="px-4 py-2 bg-purple-650 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold flex-1 transition-colors"
                          >
                            Сохранить изменения серии
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            ) : scheduleShowId ? (
              /* SCHEDULE FOR THE SHOW (was tab schedule) */
              <form onSubmit={handleSaveSchedule} className="space-y-4 font-sans font-sans">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 font-sans font-sans">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2 font-sans font-sans">
                      <Clock className="w-4.5 h-4.5 text-purple-400" />
                      <span>Таймер: {shows.find(s => s.id === scheduleShowId)?.title}</span>
                    </h3>
                    <p className="text-xs text-slate-550">Установите дату выхода для отсчёта до следующего эпизода.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScheduleShowId('')}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer font-sans"
                  >
                    Назад к списку
                  </button>
                </div>

                <div className="bg-slate-950/30 rounded-xl border border-slate-800/80 p-4 space-y-4">
                  <div className="flex items-center gap-6 text-xs font-semibold">
                    <label className="flex items-center gap-2 cursor-pointer font-sans">
                      <input 
                        type="radio" 
                        name="sched_type" 
                        checked={schedType === 'weekly'} 
                        onChange={() => setSchedType('weekly')} 
                        className="rounded-full text-purple-500 focus:ring-purple-500 bg-slate-900 border-slate-800"
                      />
                      <span>Еженедельное расписание</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-sans">
                      <input 
                        type="radio" 
                        name="sched_type" 
                        checked={schedType === 'manual'} 
                        onChange={() => setSchedType('manual')} 
                        className="rounded-full text-purple-500 focus:ring-purple-500 bg-slate-900 border-slate-800"
                      />
                      <span>Разовый таймер (Конкретная дата)</span>
                    </label>
                  </div>

                  {schedType === 'weekly' ? (
                    <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.15s_ease-out]">
                      <div className="space-y-1.5 font-sans font-sans font-sans">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">День недели</label>
                        <select 
                          value={schedDay} 
                          onChange={(e) => setSchedDay(Number(e.target.value))}
                          className="w-full ide-input cursor-pointer text-xs"
                        >
                          <option value="0">Воскресенье</option>
                          <option value="1">Понедельник</option>
                          <option value="2">Вторник</option>
                          <option value="3">Среда</option>
                          <option value="4">Четверг</option>
                          <option value="5">Пятница</option>
                          <option value="6">Суббота</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 font-sans">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Время выхода</label>
                        <input 
                          type="time" 
                          value={schedTime} 
                          onChange={(e) => setSchedTime(e.target.value)} 
                          className="w-full ide-input cursor-pointer text-xs" 
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 animate-[fadeIn_0.15s_ease-out] font-sans">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans font-sans">Дата и время выхода новой серии</label>
                      <input 
                        type="datetime-local" 
                        value={schedOneOff} 
                        onChange={(e) => setSchedOneOff(e.target.value)} 
                        className="w-full ide-input cursor-pointer text-xs" 
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-3 font-sans">
                  <button 
                    type="button" 
                    onClick={() => setScheduleShowId('')}
                    className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 bg-purple-650 hover:bg-purple-650 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-950/20 cursor-pointer"
                  >
                    Сохранить настройки таймера
                  </button>
                </div>
              </form>
            ) : (
              /* DEFAULT VIEW: LIST OF SHOWS (GRID) */
              <div className="space-y-4 font-sans font-sans">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 font-sans">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-sans">Управление сериалами</h3>
                    <p className="text-xs text-slate-550 font-sans font-medium">Редактируйте детали, управляйте сериями, настраивайте расписание или добавляйте новые релизы.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingShow(true);
                      setShowTitle('');
                      setShowDescription('');
                      setShowCover('');
                      setShowThumb('');
                      setShowTrailerUrl('');
                    }}
                    className="px-4 py-2 bg-purple-650 hover:bg-purple-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-950/20 cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 animate-[fadeIn_0.15s_ease-out] font-sans font-sans"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Добавить сериал</span>
                  </button>
                </div>

                {shows.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/20 rounded-2xl border border-slate-800/60 text-slate-550 text-xs font-sans font-sans">
                    Сериалы не найдены. Создайте первый сериал, нажав кнопку «Добавить сериал» выше.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                    {shows.map(show => (
                      <div key={show.id} className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800 flex gap-4 text-xs relative overflow-hidden group font-sans font-sans">
                        {/* Thumbnail preview */}
                        <div className="w-16 h-24 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 relative">
                          {show.thumbnailImage ? (
                            <img src={show.thumbnailImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 font-sans font-sans">
                              <Tv className="w-6 h-6" />
                            </div>
                          )}
                          {show.isHidden && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center font-sans font-sans">
                              <span className="px-1.5 py-0.5 bg-rose-600/80 text-[8px] font-bold text-white rounded uppercase tracking-wider">Скрыт</span>
                            </div>
                          )}
                        </div>

                        {/* Show Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 font-sans font-sans">
                          <div>
                            <div className="flex items-start justify-between gap-2 font-sans">
                              <h4 className="font-bold text-slate-200 truncate text-sm">{show.title}</h4>
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono font-semibold mt-0.5">
                              {show.category === 'Anime' ? 'Аниме' : show.category === 'Series' ? 'Сериал' : show.category === 'Movies' ? 'Фильм' : 'Другое'} • {show.status === 'ongoing' ? 'Онгоинг' : 'Завершен'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-sans line-clamp-2 mt-1.5 leading-relaxed">
                              {show.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-800/40 pt-2 mt-2 font-sans">
                            <span className="text-[10px] font-mono text-purple-400 font-bold">{show.episodes.length} серий</span>
                            
                            <div className="flex items-center gap-1.5 font-sans">
                              {/* Toggle visibility */}
                              <button
                                type="button"
                                onClick={() => {
                                  updateShow(show.id, { isHidden: !show.isHidden });
                                  showStatusMsg(
                                    show.isHidden 
                                      ? `Сериал «${show.title}» теперь виден пользователям.` 
                                      : `Сериал «${show.title}» скрыт из каталога.`
                                  );
                                }}
                                title={show.isHidden ? "Показать в каталоге" : "Скрыть из каталога"}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  show.isHidden 
                                    ? 'bg-rose-950/20 border-rose-900/40 text-rose-450 hover:bg-rose-900/20' 
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {show.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>

                              {/* Edit details */}
                              <button
                                type="button"
                                onClick={() => startEditing(show)}
                                title="Редактировать описание"
                                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-purple-400 hover:border-purple-900/40 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Episodes list/add */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedShowId(show.id);
                                  setEpNumber(show.episodes.length + 1);
                                  setEpTitle('');
                                  setEpDesc('');
                                  setEpUrl('');
                                  setEpThumb('');
                                  setEpStills([]);
                                }}
                                title="Управление сериями"
                                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-purple-450 hover:border-purple-900/40 transition-colors cursor-pointer"
                              >
                                <Tv className="w-3.5 h-3.5" />
                              </button>

                              {/* Timer / Schedule */}
                              {show.status === 'ongoing' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setScheduleShowId(show.id);
                                    setSchedType(show.scheduleType || 'weekly');
                                    setSchedDay(show.scheduleDay !== undefined ? show.scheduleDay : 0);
                                    setSchedTime(show.scheduleTime || '18:00');
                                    setSchedOneOff(show.nextEpisodeRelease ? new Date(show.nextEpisodeRelease).toISOString().slice(0, 16) : '2026-06-06T18:00');
                                  }}
                                  title="Настроить таймер"
                                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-450 hover:border-amber-900/40 transition-colors cursor-pointer"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Удалить сериал "${show.title}" и все его серии?`)) {
                                    deleteShow(show.id);
                                    showStatusMsg('Сериал удален');
                                  }
                                }}
                                title="Удалить"
                                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-900/40 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DATABASE TOOLS */}
        {adminTab === 'db' && (
          <div className="space-y-6 font-sans font-sans">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-sans">Инструменты базы данных</h3>
              <p className="text-xs text-slate-500">Управляйте глобальным состоянием хранилища.</p>
            </div>

            {/* List of current shows to delete */}
            {shows.length > 0 && (
              <div className="border-t border-slate-800/60 pt-6 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-sans">Список сериалов в базе ({shows.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {shows.map(show => (
                    <div key={show.id} className="p-3 bg-slate-950/30 rounded-xl border border-slate-800 flex items-center justify-between text-xs gap-3 font-sans">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-200 truncate">{show.title}</p>
                        <p className="text-[10px] text-slate-550 font-mono mt-0.5">{show.category} • {show.episodes.length} серий</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Удалить сериал "${show.title}" и все его серии?`)) {
                            deleteShow(show.id);
                            showStatusMsg('Сериал удален');
                          }
                        }}
                        className="text-slate-500 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: NEWS MANAGEMENT */}
        {adminTab === 'news' && (
          <div className="space-y-6 animate-[fadeIn_0.2s_ease-out] font-sans">
            <form onSubmit={handleSaveNews} className="space-y-4 font-sans font-sans">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-sans font-sans">
                  {editingNewsId ? 'Редактировать новость' : 'Опубликовать новость'}
                </h3>
                <p className="text-xs text-slate-550 font-sans">
                  Добавьте или обновите текст, который увидят пользователи на Главной странице.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Заголовок новости *</label>
                  <input 
                    type="text" 
                    value={newsTitle} 
                    onChange={(e) => setNewsTitle(e.target.value)} 
                    placeholder="Например: Открытие нового сервера!" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-purple-500/50" 
                    required 
                  />
                </div>
                <div className="space-y-1.5 font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Тег/Категория (макс. 18 симв.)</label>
                  <input 
                    type="text" 
                    value={newsTag} 
                    onChange={(e) => setNewsTag(e.target.value)} 
                    placeholder="Например: ИГРОВОЙ СЕРВЕР" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-purple-500/50 font-bold" 
                    maxLength={18}
                  />
                </div>
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans font-sans font-sans font-sans">Содержание новости *</label>
                <textarea 
                  value={newsContent} 
                  onChange={(e) => setNewsContent(e.target.value)} 
                  placeholder="Введите текст новости..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-purple-500/50 min-h-[140px] py-2.5 leading-relaxed resize-none"
                  required
                />
              </div>

              {/* Image Upload Selector */}
              <div className="space-y-1.5 font-sans">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Изображение к новости (необязательно)
                </label>
                
                {newsImage ? (
                  <div className="relative aspect-video max-w-sm rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                    <img 
                      src={newsImage} 
                      alt="Превью" 
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setNewsImage('')}
                      className="absolute top-2 right-2 p-1 rounded-md bg-black/60 hover:bg-black/80 text-slate-350 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-800 rounded-xl p-4 text-center flex flex-col items-center justify-center gap-2 bg-slate-950 max-w-sm">
                    <p className="text-slate-500 text-[10px] font-semibold font-sans">Выберите изображение JPG, PNG или WebP</p>
                    <ImageUploader 
                      onImageUploaded={(base64) => setNewsImage(base64)}
                      maxWidth={1000}
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-between gap-3 font-sans">
                {editingNewsId && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingNewsId(null);
                      setNewsTitle('');
                      setNewsContent('');
                      setNewsTag('');
                      setNewsImage('');
                    }}
                    className="px-5 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer font-sans font-sans"
                  >
                    Отменить редактирование
                  </button>
                )}
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-purple-650 hover:bg-purple-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-950/20 cursor-pointer ml-auto active:scale-95"
                >
                  {editingNewsId ? 'Сохранить новость' : 'Опубликовать новость'}
                </button>
              </div>
            </form>

            {/* List of current news */}
            <div className="border-t border-slate-800/60 pt-6 space-y-3 font-sans">
              <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-sans">Текущие новости ({news?.length || 0})</h4>
              {(!news || news.length === 0) ? (
                <div className="p-8 text-center bg-slate-900/10 border border-dashed border-slate-800/80 rounded-2xl text-slate-550 text-xs font-sans font-sans">
                  Новости не найдены. Создайте первую новость выше.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {news.map(item => (
                    <div key={item.id} className="p-4 bg-slate-900/20 border border-slate-900/60 rounded-xl flex items-start justify-between text-xs gap-4 group font-sans">
                      <div className="min-w-0 space-y-1 flex-1 font-sans font-sans">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-900/30">{item.tag}</span>
                          <span className="text-slate-500 font-mono text-[9px]">{new Date(item.date).toLocaleDateString('ru-RU')}</span>
                        </div>
                        <h4 className="font-bold text-slate-200 text-sm">{item.title}</h4>
                        <p className="text-slate-400 leading-relaxed line-clamp-2">{item.content}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-sans font-sans">
                        <button
                          type="button"
                          onClick={() => startEditingNews(item)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-purple-400 hover:border-purple-900/40 transition-all cursor-pointer font-sans"
                          title="Редактировать новость"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Удалить новость "${item.title}"?`)) {
                              deleteNews(item.id);
                              showStatusMsg('Новость удалена');
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-900/40 transition-all cursor-pointer font-sans"
                          title="Удалить новость"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: MINECRAFT CONFIG */}
        {adminTab === 'minecraft' && (
          <div className="space-y-6 animate-[fadeIn_0.2s_ease-out] font-sans">
            <form onSubmit={handleSaveMinecraft} className="space-y-6 font-sans">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-sans">
                  Настройки раздела Майнкрафт
                </h3>
                <p className="text-xs text-slate-550 font-sans">
                  Отредактируйте тексты, правила и IP сервера, отображаемые на вкладке игрового сервера.
                </p>
              </div>

              {/* Main Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans font-sans">
                <div className="space-y-1.5 font-sans font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IP Сервера *</label>
                  <input 
                    type="text" 
                    value={mcServerIp} 
                    onChange={(e) => setMcServerIp(e.target.value)} 
                    placeholder="Например: mc.varicose-squad.ru" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-purple-500/50 font-bold" 
                    required 
                  />
                </div>
                <div className="space-y-1.5 font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans font-sans">Версия сервера *</label>
                  <input 
                    type="text" 
                    value={mcVersion} 
                    onChange={(e) => setMcVersion(e.target.value)} 
                    placeholder="Например: 1.20.4" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-purple-500/50" 
                    required 
                  />
                </div>
                <div className="sm:col-span-3 space-y-1.5 font-sans font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans font-sans font-sans">Приветственное описание *</label>
                  <textarea 
                    value={mcDescription} 
                    onChange={(e) => setMcDescription(e.target.value)} 
                    placeholder="Описание под заголовком сервера..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-purple-500/50 min-h-[70px] py-2 leading-relaxed resize-none font-sans font-sans"
                    required
                  />
                </div>
              </div>

              {/* Instructions Steps */}
              <div className="space-y-3 pt-2 font-sans font-sans">
                <div className="border-b border-slate-800/60 pb-1.5 flex items-center justify-between font-sans">
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider font-sans font-sans">
                    Инструкция «Как начать играть»
                  </h4>
                  <button
                    type="button"
                    onClick={() => setMcSteps([...mcSteps, { title: 'Новый шаг', description: 'Описание...' }])}
                    className="px-2.5 py-1 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-900/40 text-purple-400 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    Добавить шаг
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 font-sans">
                  {mcSteps.map((step, idx) => (
                    <div key={idx} className="p-4 bg-slate-950/45 border border-slate-900 rounded-xl space-y-3 font-sans relative">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-2 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold text-[10px] font-mono">
                            {idx + 1}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Шаг {idx + 1}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMcSteps(mcSteps.filter((_, i) => i !== idx))}
                          className="p-1 rounded bg-rose-950/20 hover:bg-rose-900 border border-rose-900/30 text-rose-450 hover:text-white transition-all cursor-pointer font-sans"
                          title="Удалить шаг"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-1 space-y-1 font-sans">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Заголовок шага</label>
                          <input 
                            type="text" 
                            value={step.title} 
                            onChange={(e) => {
                              const nextSteps = [...mcSteps];
                              nextSteps[idx] = { ...step, title: e.target.value };
                              setMcSteps(nextSteps);
                            }}
                            className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 font-bold" 
                            required
                          />
                        </div>
                        <div className="md:col-span-3 space-y-1 font-sans">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Описание шага</label>
                          <textarea 
                            value={step.description} 
                            onChange={(e) => {
                              const nextSteps = [...mcSteps];
                              nextSteps[idx] = { ...step, description: e.target.value };
                              setMcSteps(nextSteps);
                            }}
                            className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 min-h-[50px] resize-none font-sans" 
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {mcSteps.length === 0 && (
                    <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs font-sans">
                      Шаги не добавлены. Добавьте первый шаг по кнопке выше.
                    </div>
                  )}
                </div>
              </div>

              {/* Rules */}
              <div className="space-y-3 pt-2 font-sans">
                <div className="border-b border-slate-800/60 pb-1.5 flex items-center justify-between font-sans">
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider font-sans">
                    Свод правил сервера
                  </h4>
                  <button
                    type="button"
                    onClick={() => setMcRules([...mcRules, { title: 'Новое правило', description: 'Описание...' }])}
                    className="px-2.5 py-1 bg-purple-650/10 hover:bg-purple-600/20 border border-purple-900/40 text-purple-400 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Добавить правило
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                  {mcRules.map((rule, idx) => (
                    <div key={idx} className="p-4 bg-slate-950/45 border border-slate-900 rounded-xl space-y-3 font-sans relative">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Правило {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setMcRules(mcRules.filter((_, i) => i !== idx))}
                          className="p-1 rounded bg-rose-950/20 hover:bg-rose-900 border border-rose-900/30 text-rose-450 hover:text-white transition-all cursor-pointer font-sans"
                          title="Удалить правило"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Название правила</label>
                          <input 
                            type="text" 
                            value={rule.title} 
                            onChange={(e) => {
                              const nextRules = [...mcRules];
                              nextRules[idx] = { ...rule, title: e.target.value };
                              setMcRules(nextRules);
                            }}
                            className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 font-bold" 
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Описание правила</label>
                          <textarea 
                            value={rule.description} 
                            onChange={(e) => {
                              const nextRules = [...mcRules];
                              nextRules[idx] = { ...rule, description: e.target.value };
                              setMcRules(nextRules);
                            }}
                            className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 min-h-[60px] resize-none font-sans" 
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {mcRules.length === 0 && (
                    <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs font-sans md:col-span-2">
                      Правила не добавлены. Добавьте первое правило по кнопке выше.
                    </div>
                  )}
                </div>
              </div>

              {/* Online Players Management */}
              <div className="space-y-3 pt-2 font-sans">
                <div className="border-b border-slate-800/60 pb-1.5 flex items-center justify-between font-sans">
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider font-sans">
                    Список игроков сервера (Онлайн / Офлайн)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setMcPlayers([...mcPlayers, { name: 'Игрок_' + (mcPlayers.length + 1), role: 'Игрок', online: true }])}
                    className="px-2.5 py-1 bg-purple-650/10 hover:bg-purple-600/20 border border-purple-900/40 text-purple-400 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Добавить игрока
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                  {mcPlayers.map((player, idx) => (
                    <div key={idx} className="p-4 bg-slate-950/45 border border-slate-900 rounded-xl space-y-3 font-sans relative">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Игрок {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setMcPlayers(mcPlayers.filter((_, i) => i !== idx))}
                          className="p-1 rounded bg-rose-950/20 hover:bg-rose-900 border border-rose-900/30 text-rose-450 hover:text-white transition-all cursor-pointer font-sans"
                          title="Удалить игрока"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Никнейм</label>
                          <input 
                            type="text" 
                            value={player.name} 
                            onChange={(e) => {
                              const nextPlayers = [...mcPlayers];
                              nextPlayers[idx] = { ...player, name: e.target.value };
                              setMcPlayers(nextPlayers);
                            }}
                            className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 font-bold" 
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Роль</label>
                            <input 
                              type="text" 
                              value={player.role} 
                              onChange={(e) => {
                                const nextPlayers = [...mcPlayers];
                                nextPlayers[idx] = { ...player, role: e.target.value };
                                setMcPlayers(nextPlayers);
                              }}
                              className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50" 
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Статус</label>
                            <button
                              type="button"
                              onClick={() => {
                                const nextPlayers = [...mcPlayers];
                                nextPlayers[idx] = { ...player, online: !player.online };
                                setMcPlayers(nextPlayers);
                              }}
                              className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                                player.online
                                  ? 'bg-green-950/20 border-green-900/40 text-green-400'
                                  : 'bg-slate-900 border-slate-850 text-slate-500'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${player.online ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                              {player.online ? 'В сети' : 'Офлайн'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {mcPlayers.length === 0 && (
                    <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs font-sans md:col-span-2">
                      Игроки не добавлены. Добавьте первого игрока по кнопке выше.
                    </div>
                  )}
                </div>
              </div>

              {/* Modpack Config */}
              <div className="space-y-3 pt-2 font-sans">
                <div className="border-b border-slate-800/60 pb-1.5 font-sans">
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider font-sans">
                    Единая сборка модов
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Укажите ссылку на Google Drive (архив или папку), чтобы пользователи могли скачать всю сборку одной кнопкой.
                    Оставьте ссылку пустой, чтобы скрыть блок.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                  <div className="space-y-1.5 font-sans">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ссылка Google Drive</label>
                    <input 
                      type="url" 
                      value={modpackUrl} 
                      onChange={(e) => setModpackUrl(e.target.value)} 
                      placeholder="https://drive.google.com/..." 
                      className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 font-bold" 
                    />
                  </div>
                  <div className="space-y-1.5 font-sans">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Название сборки</label>
                    <input 
                      type="text" 
                      value={modpackTitle} 
                      onChange={(e) => setModpackTitle(e.target.value)} 
                      placeholder="Например: Сборка Varicose Squad" 
                      className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50" 
                    />
                  </div>
                  <div className="space-y-1.5 font-sans">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Версия игры / доп. инфо</label>
                    <input 
                      type="text" 
                      value={modpackVersion} 
                      onChange={(e) => setModpackVersion(e.target.value)} 
                      placeholder="Например: 1.20.4 (Forge)" 
                      className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50" 
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5 font-sans">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Краткое описание сборки</label>
                    <textarea 
                      value={modpackDesc} 
                      onChange={(e) => setModpackDesc(e.target.value)} 
                      placeholder="Опишите, что входит в сборку..." 
                      className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 min-h-[50px] resize-none" 
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button for Minecraft Form */}
              <div className="pt-4 flex border-t border-slate-800/60 font-sans">
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-purple-650 hover:bg-purple-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-950/20 cursor-pointer ml-auto active:scale-95 transition-all"
                >
                  Сохранить основные настройки
                </button>
              </div>
            </form>

            {/* Mods Management Section */}
            <div className="pt-6 mt-6 border-t border-slate-800/60 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-sans">
                  Управление модами (Modrinth)
                </h3>
                <p className="text-xs text-slate-550 font-sans">
                  Вставьте ссылку на мод с Modrinth, и система автоматически подгрузит его данные.
                </p>
              </div>

              <form onSubmit={handleFetchAndAddMod} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex-1 w-full space-y-1.5 font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ссылка на мод (Modrinth) *</label>
                  <input 
                    type="url" 
                    value={modUrl} 
                    onChange={(e) => setModUrl(e.target.value)} 
                    placeholder="https://modrinth.com/mod/sodium" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-purple-500/50" 
                    required 
                  />
                  {modError && <p className="text-xs text-rose-500 font-bold mt-1">{modError}</p>}
                </div>
                <button 
                  type="submit" 
                  disabled={isFetchingMod}
                  className="px-6 py-2.5 h-[38px] bg-purple-650 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-950/20 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {isFetchingMod ? 'Загрузка...' : 'Добавить мод'}
                </button>
              </form>

              {/* List of current mods */}
              <div className="space-y-3 pt-2 font-sans">
                <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-sans">Текущие моды ({(minecraftConfig?.mods || []).length})</h4>
                {(!minecraftConfig?.mods || minecraftConfig.mods.length === 0) ? (
                  <div className="p-8 text-center bg-slate-900/10 border border-dashed border-slate-800/80 rounded-2xl text-slate-550 text-xs font-sans">
                    Список модов пуст. Добавьте первый мод выше.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {minecraftConfig.mods.map(mod => (
                      <div key={mod.id} className="p-3 bg-slate-900/20 border border-slate-900/60 rounded-xl flex items-center gap-4 group font-sans">
                        {mod.icon_url ? (
                          <img src={mod.icon_url} alt={mod.title} className="w-10 h-10 rounded-lg object-cover bg-slate-950 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center text-slate-500 shrink-0">
                            <Box className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-200 text-sm truncate">{mod.title}</h4>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{mod.link}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMod(mod.id)}
                          className="p-1.5 shrink-0 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-900/40 transition-all cursor-pointer font-sans"
                          title="Удалить мод"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: REACTIONS CONFIG */}
        {adminTab === 'reactions' && (
          <div className="space-y-6 animate-[fadeIn_0.2s_ease-out] font-sans">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-sans">
                Настройки реакций (эмодзи)
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Управляйте набором эмодзи, доступных пользователям для реакций под новостями.
              </p>
            </div>

            {/* Add New Emoji Form */}
            <form onSubmit={handleAddEmoji} className="bg-slate-950/45 border border-slate-900 rounded-xl p-4 space-y-4 font-sans">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider font-sans">
                Добавить новый эмодзи
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end font-sans">
                <div className="space-y-1.5 font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Символ эмодзи *</label>
                  <input
                    type="text"
                    value={newEmojiChar}
                    onChange={(e) => setNewEmojiChar(e.target.value)}
                    placeholder="Например: 🚀"
                    className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                    maxLength={5}
                    required
                  />
                </div>
                <div className="space-y-1.5 font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ярлык / Описание *</label>
                  <input
                    type="text"
                    value={newEmojiLabel}
                    onChange={(e) => setNewEmojiLabel(e.target.value)}
                    placeholder="Например: ракета"
                    className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-purple-650 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold h-fit flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить</span>
                </button>
              </div>
            </form>

            {/* Emoji List */}
            <div className="space-y-3 font-sans">
              <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-sans">Текущий набор эмодзи</h4>
              {(!reactionsConfig?.emojiList || reactionsConfig.emojiList.length === 0) ? (
                <div className="p-8 text-center bg-slate-900/10 border border-dashed border-slate-800/80 rounded-2xl text-slate-500 text-xs font-sans">
                  Список пуст. Добавьте первый эмодзи выше.
                </div>
              ) : (
                <div className="bg-slate-950/50 rounded-xl border border-slate-850 overflow-hidden divide-y divide-slate-850 max-h-[500px] overflow-y-auto font-sans">
                  {reactionsConfig.emojiList.map((item, index) => (
                    <div key={item.id} className="p-3 flex items-center justify-between gap-4 text-xs font-sans">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.emoji}</span>
                        <div>
                          <span className="text-slate-200 font-bold">{item.label}</span>
                          {!item.enabled && (
                            <span className="text-[9px] px-1.5 py-0.2 ml-2 rounded bg-slate-800 border border-slate-700 text-slate-400 font-semibold font-mono">
                              Отключен
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => handleMoveEmoji(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-450 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                          title="Переместить вверх"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => handleMoveEmoji(index, 'down')}
                          disabled={index === reactionsConfig.emojiList.length - 1}
                          className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-455 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                          title="Переместить вниз"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Enable/Disable Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleEmojiEnabled(item.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                            item.enabled
                              ? 'bg-emerald-950/25 border-emerald-900/40 text-emerald-400 hover:bg-emerald-900/30'
                              : 'bg-amber-950/25 border-amber-900/40 text-amber-400 hover:bg-amber-900/30'
                          }`}
                        >
                          {item.enabled ? 'Активен' : 'Отключен'}
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteEmoji(item.id)}
                          className="p-1 rounded bg-slate-900 border border-slate-850 text-slate-500 hover:text-rose-500 cursor-pointer transition-colors"
                          title="Удалить эмодзи"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 8: BACKGROUNDS */}
        {adminTab === 'backgrounds' && (
          <div className="space-y-6 animate-[fadeIn_0.2s_ease-out] font-sans">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-sans">
                Фоны вкладок
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Настройте индивидуальные полноэкранные фоновые изображения для разных разделов сайта.
              </p>
            </div>

            <div className="flex gap-4 border-b border-slate-800 pb-4 overflow-x-auto">
              {TABS_FOR_BG.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setEditingBgTabId(tab.id)}
                  disabled={isSavingBg}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    editingBgTabId === tab.id
                      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                      : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-transparent'
                  }`}
                >
                  {tab.label}
                  {(backgroundsConfig[tab.id]?.imageUrl || backgroundsConfig[tab.id]?.videoUrl) && (
                    <div className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-2" title="Фон установлен" />
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveBackground} className="bg-slate-950/45 border border-slate-900 rounded-xl p-4 space-y-4 font-sans">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider font-sans">
                Настройки фона: {TABS_FOR_BG.find(t => t.id === editingBgTabId)?.label}
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ссылка на картинку (Image URL) ИЛИ файл</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={bgImageUrl}
                        onChange={(e) => setBgImageUrl(e.target.value)}
                        disabled={isSavingBg}
                        placeholder="https://... или выберите файл"
                        className="flex-1 bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 disabled:opacity-55 font-mono"
                      />
                      <ImageUploader 
                        onImageUploaded={(base64) => setBgImageUrl(base64)}
                        maxWidth={1920}
                        className="shrink-0"
                        disabled={isSavingBg}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ссылка на фоновое видео (Video URL)</label>
                    <input
                      type="text"
                      value={bgVideoUrl}
                      onChange={(e) => setBgVideoUrl(e.target.value)}
                      disabled={isSavingBg}
                      placeholder="https://... (MP4 / WebM / прямая ссылка с диска)"
                      className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 disabled:opacity-55 font-mono"
                    />
                    <p className="text-[9px] text-slate-500 leading-normal">
                      Видео имеет приоритет над картинкой. Поддерживаются форматы MP4, WebM. Для Google Диска используйте формат: 
                      <code className="text-purple-400 ml-1 select-all font-mono">https://docs.google.com/uc?export=download&id=ID_ФАЙЛА</code>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Затемнение (Opacity): {bgOverlay}%</label>
                      <span className="text-[9px] text-slate-500">0% = светло, 100% = чёрный</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bgOverlay}
                      onChange={(e) => setBgOverlay(Number(e.target.value))}
                      disabled={isSavingBg}
                      className="w-full cursor-pointer accent-purple-500 disabled:opacity-50"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleDeleteBackground}
                      disabled={isSavingBg || !backgroundsConfig[editingBgTabId]}
                      className="px-4 py-2.5 bg-rose-950/20 hover:bg-rose-900/40 border border-rose-900/30 text-rose-400 disabled:opacity-30 rounded-lg text-xs font-semibold flex-1 cursor-pointer transition-all disabled:cursor-not-allowed"
                    >
                      Сбросить
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingBg}
                      className="px-4 py-2.5 bg-purple-650 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex-[2] cursor-pointer active:scale-95 transition-all shadow-lg shadow-purple-950/20 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                    >
                      {isSavingBg ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Сохранение...</span>
                        </>
                      ) : (
                        <span>Сохранить фон</span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Предпросмотр</label>
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
                    {bgVideoUrl ? (
                      <>
                        <video
                          className="absolute inset-0 w-full h-full object-cover"
                          src={bgVideoUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          key={bgVideoUrl}
                        />
                        <div 
                          className="absolute inset-0"
                          style={{ backgroundColor: `rgba(0,0,0,${bgOverlay / 100})` }}
                        />
                        <div className="relative z-10 w-3/4 h-1/2 rounded-lg bg-slate-900/60 border border-slate-800/80 backdrop-blur flex flex-col items-center justify-center shadow-2xl p-4 text-center">
                          <span className="text-slate-200 font-bold text-xs sm:text-sm">Пример контента (Видео)</span>
                          <span className="text-slate-400 text-[9px] sm:text-[10px] mt-1">Текст должен хорошо читаться поверх видео</span>
                        </div>
                      </>
                    ) : bgImageUrl ? (
                      <>
                        <div 
                          className="absolute inset-0 bg-cover bg-center" 
                          style={{ backgroundImage: `url(${bgImageUrl})` }}
                        />
                        <div 
                          className="absolute inset-0"
                          style={{ backgroundColor: `rgba(0,0,0,${bgOverlay / 100})` }}
                        />
                        <div className="relative z-10 w-3/4 h-1/2 rounded-lg bg-slate-900/60 border border-slate-800/80 backdrop-blur flex flex-col items-center justify-center shadow-2xl p-4 text-center">
                          <span className="text-slate-200 font-bold text-xs sm:text-sm">Пример контента (Картинка)</span>
                          <span className="text-slate-400 text-[9px] sm:text-[10px] mt-1">Текст должен хорошо читаться поверх фона</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-500 text-xs font-semibold">Нет изображения или видео</span>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TAB 9: EVENT TIMER CONFIG */}
        {adminTab === 'event_timer' && (
          <div className="space-y-6 animate-[fadeIn_0.2s_ease-out] font-sans">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-sans">
                Таймер обратного отсчета
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Настройте таймер для ближайшего события на главной странице. Таймер автоматически учитывает часовые пояса пользователей.
              </p>
            </div>

            <form onSubmit={handleSaveTimer} className="bg-slate-950/45 border border-slate-900 rounded-xl p-4 space-y-4 font-sans">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider font-sans">
                Настройки таймера
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Название события *</label>
                  <input
                    type="text"
                    value={timerEventName}
                    onChange={(e) => setTimerEventName(e.target.value)}
                    placeholder="Например: Запуск сервера Minecraft"
                    className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                    required
                  />
                </div>

                <div className="space-y-1.5 font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Дата и время окончания (по Киеву) *</label>
                  <input
                    type="datetime-local"
                    value={timerEndDatetime}
                    onChange={(e) => setTimerEndDatetime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                    required
                  />
                  <small className="text-[9px] text-slate-500 leading-normal block mt-1">
                    Введите дату и время события. Время будет автоматически сконвертировано в правильный часовой пояс Europe/Kiev.
                  </small>
                </div>

                <div className="space-y-1.5 font-sans md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Фоновое изображение</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={timerBgImageUrl}
                      onChange={(e) => setTimerBgImageUrl(e.target.value)}
                      placeholder="Ссылка на изображение или загрузите файл"
                      className="flex-1 bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                    />
                    <ImageUploader 
                      onImageUploaded={(base64) => setTimerBgImageUrl(base64)}
                      maxWidth={1200}
                      className="shrink-0"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 font-sans">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Текст по окончании отсчета *</label>
                  <input
                    type="text"
                    value={timerFinishText}
                    onChange={(e) => setTimerFinishText(e.target.value)}
                    placeholder="Например: Сервер запущен!"
                    className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                    required
                  />
                </div>

                <div className="space-y-1.5 font-sans flex items-end">
                  <button
                    type="button"
                    onClick={() => setTimerIsActive(!timerIsActive)}
                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer h-[34px] ${
                      timerIsActive
                        ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                        : 'bg-slate-900 border-slate-850 text-slate-500'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${timerIsActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                    {timerIsActive ? 'Таймер включен' : 'Таймер выключен'}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex border-t border-slate-800/60 font-sans">
                <button
                  type="submit"
                  disabled={isSavingTimer}
                  className="px-6 py-2.5 bg-purple-650 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-950/20 cursor-pointer ml-auto active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isSavingTimer ? 'Сохранение...' : 'Сохранить настройки таймера'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ====== Show Created Success Animation Overlay ====== */}
      {showCreatedAnimation.visible && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="flex flex-col items-center text-center space-y-5 animate-[scaleUp_0.4s_cubic-bezier(0.34,1.56,0.64,1)] font-sans">
            {/* Animated Glow Ring */}
            <div className="relative font-sans">
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-green-500/20 animate-ping" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
                <CheckCircle2 className="w-12 h-12 text-white animate-[bounceIn_0.5s_ease-out]" />
              </div>
            </div>

            {/* Sparkle decorations */}
            <div className="flex items-center gap-2 text-yellow-400 animate-[fadeIn_0.3s_ease-out_0.2s_both]">
              <Sparkles className="w-4 h-4 animate-bounce" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Успех!</span>
              <Sparkles className="w-4 h-4 animate-bounce" style={{ animationDelay: '0.15s' }} />
            </div>

            {/* Title */}
            <div className="space-y-1 animate-[fadeIn_0.3s_ease-out_0.3s_both] font-sans font-sans">
              <h3 className="text-lg font-extrabold text-white">Сериал добавлен</h3>
              <p className="text-sm text-green-300 font-semibold max-w-xs truncate">«{showCreatedAnimation.title}»</p>
            </div>

            <p className="text-[10px] text-slate-500 font-mono animate-[fadeIn_0.3s_ease-out_0.5s_both]">Переход к добавлению серий...</p>
          </div>
        </div>
      )}

      {/* Keyframes for success animation */}
      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
