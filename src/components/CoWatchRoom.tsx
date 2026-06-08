import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { 
  X, Send, Users, MessageSquare, Play, Pause, 
  Volume2, VolumeX, LogOut, Copy, Check, Info, Film, Maximize2, Settings
} from 'lucide-react';
import { getOrCreateUserId } from '../context/StreamingContext';

interface Participant {
  id: string;
  name: string;
  joinedAt: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: string;
}

interface QueuedVideo {
  id: string;
  title: string;
  url: string;
  addedBy: string;
}

interface RoomData {
  id: string;
  hostId: string;
  hostName: string;
  showId: string;
  showTitle: string;
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  playbackRate?: number;
  lastUpdated: string;
  participants: Participant[];
  messages: Message[];
  pings?: Record<string, any>;
  queue?: QueuedVideo[];
  settings?: {
    queueMode: 'host' | 'all';
  };
}

interface CoWatchRoomProps {
  showId?: string;
  showTitle?: string;
  defaultVideoUrl?: string;
  onClose?: () => void;
  isInline?: boolean;
}

interface VideoSource {
  type: 'html5' | 'hls' | 'youtube' | 'vimeo' | 'twitch' | 'dailymotion' | 'vk';
  embedUrl?: string;
  directUrl?: string;
  id?: string;
}

const parseVideoUrl = (url: string): VideoSource => {
  const trimmed = url.trim();
  
  if (!trimmed) {
    return { type: 'html5', directUrl: '' };
  }

  // Google Drive
  if (trimmed.includes('drive.google.com')) {
    return {
      type: 'html5',
      directUrl: trimmed
    };
  }

  // YouTube
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
    let id = '';
    if (trimmed.includes('youtube.com/watch')) {
      try {
        id = new URL(trimmed).searchParams.get('v') || '';
      } catch (e) {
        // Fallback simple parsing
        const match = trimmed.match(/[?&]v=([^&#]+)/);
        id = match ? match[1] : '';
      }
    } else if (trimmed.includes('youtu.be/')) {
      id = trimmed.split('youtu.be/')[1]?.split('?')[0] || '';
    }
    return {
      type: 'youtube',
      id,
      embedUrl: `https://www.youtube.com/embed/${id}`
    };
  }

  // Vimeo
  if (trimmed.includes('vimeo.com')) {
    const match = trimmed.match(/vimeo\.com\/(\d+)/);
    const id = match ? match[1] : '';
    if (!id) throw new Error('Некорректная ссылка Vimeo. Ссылка должна содержать ID видео.');
    return {
      type: 'vimeo',
      id,
      embedUrl: `https://player.vimeo.com/video/${id}?api=1`
    };
  }

  // Twitch
  if (trimmed.includes('twitch.tv')) {
    let channel = '';
    let videoId = '';
    if (trimmed.includes('/videos/')) {
      const match = trimmed.match(/twitch\.tv\/videos\/(\d+)/);
      videoId = match ? match[1] : '';
      if (!videoId) throw new Error('Некорректная ссылка на Twitch видео.');
    } else {
      const parts = trimmed.split('/');
      channel = parts[parts.length - 1]?.split('?')[0] || '';
      if (!channel) throw new Error('Некорректная ссылка на Twitch канал.');
    }
    const parentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const embedUrl = videoId
      ? `https://player.twitch.tv/?video=${videoId}&parent=${parentDomain}&autoplay=false`
      : `https://player.twitch.tv/?channel=${channel}&parent=${parentDomain}&autoplay=false`;
    return {
      type: 'twitch',
      id: videoId || channel,
      embedUrl
    };
  }

  // Dailymotion
  if (trimmed.includes('dailymotion.com') || trimmed.includes('dai.ly')) {
    let id = '';
    if (trimmed.includes('dailymotion.com/video/')) {
      id = trimmed.split('dailymotion.com/video/')[1]?.split('?')[0] || '';
    } else if (trimmed.includes('dai.ly/')) {
      id = trimmed.split('dai.ly/')[1]?.split('?')[0] || '';
    }
    if (!id) throw new Error('Некорректная ссылка Dailymotion. Не удалось определить ID видео.');
    return {
      type: 'dailymotion',
      id,
      embedUrl: `https://www.dailymotion.com/embed/video/${id}`
    };
  }

  // VK Video
  if (trimmed.includes('vk.com/video') || trimmed.includes('vkvideo.ru')) {
    let oid = '';
    let id = '';
    let hash = '';
    if (trimmed.includes('video_ext.php')) {
      try {
        const urlObj = new URL(trimmed);
        oid = urlObj.searchParams.get('oid') || '';
        id = urlObj.searchParams.get('id') || '';
        hash = urlObj.searchParams.get('hash') || '';
      } catch (e) {
        // Fallback parsing
        const oidMatch = trimmed.match(/[?&]oid=(-?\d+)/);
        const idMatch = trimmed.match(/[?&]id=(\d+)/);
        const hashMatch = trimmed.match(/[?&]hash=([^&#]+)/);
        oid = oidMatch ? oidMatch[1] : '';
        id = idMatch ? idMatch[1] : '';
        hash = hashMatch ? hashMatch[1] : '';
      }
    } else {
      const match = trimmed.match(/video(-?\d+)_(\d+)/);
      if (match) {
        oid = match[1];
        id = match[2];
      }
    }
    if (!oid || !id) throw new Error('Некорректная ссылка VK Video. Не удалось определить oid и id видео.');
    return {
      type: 'vk',
      id: `${oid}_${id}`,
      embedUrl: `https://vk.com/video_ext.php?oid=${oid}&id=${id}${hash ? `&hash=${hash}` : ''}`
    };
  }

  // Direct video file formats
  if (trimmed.endsWith('.mp4') || trimmed.includes('.mp4?') ||
      trimmed.endsWith('.webm') || trimmed.includes('.webm?') ||
      trimmed.endsWith('.mpd') || trimmed.includes('.mpd?')) {
    return { type: 'html5', directUrl: trimmed };
  }

  // HLS stream
  if (trimmed.endsWith('.m3u8') || trimmed.includes('.m3u8?')) {
    return { type: 'hls', directUrl: trimmed };
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Treat general unparsed http link as a direct file link fallback
    return { type: 'html5', directUrl: trimmed };
  }

  throw new Error('Источник не поддерживается. Укажите прямую ссылку на видеофайл (MP4/WebM/HLS) или ссылку на легальную платформу (YouTube, Vimeo, Twitch, Dailymotion, VK Video).');
};

const loadHls = (): Promise<any> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    if ((window as any).Hls) {
      resolve((window as any).Hls);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1';
    script.onload = () => resolve((window as any).Hls);
    document.head.appendChild(script);
  });
};

// Generate random 5-character digit code
const generateRoomCode = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

export const CoWatchRoom: React.FC<CoWatchRoomProps> = ({ 
  showId, 
  showTitle, 
  defaultVideoUrl, 
  onClose,
  isInline = false
}) => {
  const userId = getOrCreateUserId();
  
  // Local state
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('penis_ink_nickname') || '';
  });
  const [isJoined, setIsJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState(defaultVideoUrl || '');
  const [customShowTitle, setCustomShowTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Active room state
  const [roomCode, setRoomCode] = useState('');
  const [room, setRoom] = useState<RoomData | null>(null);
  const [chatInput, setChatInput] = useState('');

  // Player state
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [localVolume, setLocalVolume] = useState(1);
  const [localIsMuted, setLocalIsMuted] = useState(false);
  const [localPlaybackRate, setLocalPlaybackRate] = useState(1);
  const [showSpeedControls, setShowSpeedControls] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);

  // Local quality settings
  const [localQuality, setLocalQuality] = useState(() => localStorage.getItem('penis_ink_quality') || 'auto');
  const [showQualityControls, setShowQualityControls] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<string[]>(['auto']);
  const hlsRef = useRef<any>(null);

  // Fullscreen controls autohide
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsHovered = useRef(false);
  const mouseTimer = useRef<number | null>(null);

  // Queue tab & inputs
  const [sideTab, setSideTab] = useState<'chat' | 'queue'>('chat');
  const [queueInputUrl, setQueueInputUrl] = useState('');
  const [queueInputTitle, setQueueInputTitle] = useState('');

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeRef = useRef<HTMLIFrameElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  // Event blocking counters to prevent infinite sync loops
  const ignorePlayEvent = useRef(0);
  const ignorePauseEvent = useRef(0);
  const ignoreSeekEvent = useRef(0);
  const ignoreYTEvent = useRef(0);

  const pingStartRef = useRef(0);
  const pingCompleted = useRef(false);
  const hostInitialized = useRef(false);

  const isHost = room ? room.hostId === userId : false;

  // Handle Nickname Save
  const handleSaveNickname = (name: string) => {
    const trimmed = name.trim();
    setNickname(trimmed);
    localStorage.setItem('penis_ink_nickname', trimmed);
  };

  // Copy Room Code Helper
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Create Room Action
  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      setErrorMsg('Пожалуйста, введите ваш никнейм');
      return;
    }
    setErrorMsg('');

    const newCode = generateRoomCode();
    const cleanUrl = videoUrlInput.trim();
    if (cleanUrl) {
      try {
        parseVideoUrl(cleanUrl);
      } catch (err: any) {
        setErrorMsg(err.message);
        return;
      }
    }

    const hostParticipant: Participant = {
      id: userId,
      name: nickname.trim(),
      joinedAt: new Date().toISOString()
    };

    const finalShowTitle = cleanUrl ? (showTitle || customShowTitle.trim() || 'Произвольное видео') : 'Ожидание видео';
    const finalShowId = showId || 'custom';

    const newRoom: RoomData = {
      id: newCode,
      hostId: userId,
      hostName: nickname.trim(),
      showId: finalShowId,
      showTitle: finalShowTitle,
      videoUrl: cleanUrl,
      isPlaying: false,
      currentTime: 0,
      lastUpdated: new Date().toISOString(),
      participants: [hostParticipant],
      queue: [],
      settings: {
        queueMode: 'host'
      },
      messages: [
        {
          id: 'system-created',
          senderId: 'system',
          senderName: 'Система',
          text: `Комната создана пользователем ${nickname.trim()}. Присоединяйтесь по коду ${newCode}!`,
          sentAt: new Date().toISOString()
        }
      ]
    };

    try {
      await setDoc(doc(db, 'rooms', newCode), newRoom);
      setRoomCode(newCode);
      setIsJoined(true);
    } catch (e) {
      console.error(e);
      setErrorMsg('Не удалось создать комнату в Firestore');
    }
  };

  // Join Room Action
  const handleJoinRoom = async () => {
    if (!nickname.trim()) {
      setErrorMsg('Пожалуйста, введите ваш никнейм');
      return;
    }
    const cleanCode = roomCodeInput.trim();
    if (!cleanCode) {
      setErrorMsg('Введите код комнаты');
      return;
    }
    setErrorMsg('');

    try {
      const roomRef = doc(db, 'rooms', cleanCode);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        setErrorMsg('Комната с таким кодом не найдена');
        return;
      }

      const pUser: Participant = {
        id: userId,
        name: nickname.trim(),
        joinedAt: new Date().toISOString()
      };

      // Add user to participants list
      await updateDoc(roomRef, {
        participants: arrayUnion(pUser),
        messages: arrayUnion({
          id: `system-joined-${Date.now()}`,
          senderId: 'system',
          senderName: 'Система',
          text: `${nickname.trim()} присоединился к комнате.`,
          sentAt: new Date().toISOString()
        })
      });

      setRoomCode(cleanCode);
      setIsJoined(true);
    } catch (e) {
      console.error(e);
      setErrorMsg('Ошибка подключения к комнате');
    }
  };

  // Leave Room Action
  const handleLeaveRoom = async () => {
    if (!roomCode) return;

    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const pUser = room?.participants.find(p => p.id === userId);

      if (pUser) {
        await updateDoc(roomRef, {
          participants: arrayRemove(pUser),
          messages: arrayUnion({
            id: `system-left-${Date.now()}`,
            senderId: 'system',
            senderName: 'Система',
            text: `${nickname} покинул комнату.`,
            sentAt: new Date().toISOString()
          })
        });
      }
    } catch (e) {
      console.warn('Error removing participant from room:', e);
    }

    setIsJoined(false);
    setRoom(null);
    setRoomCode('');
  };

  // Send Chat Message Action
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !roomCode) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: userId,
      senderName: nickname,
      text: chatInput.trim(),
      sentAt: new Date().toISOString()
    };

    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const currentMessages = (roomSnap.data() as RoomData).messages || [];
        // Keep only last 50 messages to save doc size
        const updatedMessages = [...currentMessages, newMessage].slice(-50);
        await updateDoc(roomRef, {
          messages: updatedMessages
        });
      }
      setChatInput('');
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Subscribe to Room Data in real-time
  useEffect(() => {
    if (!roomCode || !isJoined) return;

    const unsub = onSnapshot(doc(db, 'rooms', roomCode), (snapshot) => {
      if (!snapshot.exists()) {
        setIsJoined(false);
        setRoom(null);
        return;
      }
      const data = snapshot.data() as RoomData;
      setRoom(data);

      // Check for ping response to calculate clock offset
      const pingTimestamp = (data as any).pings?.[userId];
      if (pingTimestamp && typeof pingTimestamp.toDate === 'function') {
        const serverTime = pingTimestamp.toDate().getTime();
        const clientTimeBefore = pingStartRef.current;
        if (clientTimeBefore > 0) {
          const clientTimeAfter = Date.now();
          const estimatedServerTime = serverTime + (clientTimeAfter - clientTimeBefore) / 2;
          const calculatedOffset = estimatedServerTime - clientTimeAfter;
          setClockOffset(calculatedOffset);
          pingStartRef.current = 0; // Reset
        }
      }
    });

    return () => unsub();
  }, [roomCode, isJoined, userId]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.messages]);

  const getCurrentServerTime = () => Date.now() + clockOffset;

  // Trigger Firestore ping to calculate clock offset
  useEffect(() => {
    if (!isJoined || !roomCode || pingCompleted.current) return;
    pingCompleted.current = true;

    const runPing = async () => {
      pingStartRef.current = Date.now();
      const roomRef = doc(db, 'rooms', roomCode);
      try {
        await updateDoc(roomRef, {
          [`pings.${userId}`]: serverTimestamp()
        });
      } catch (e) {
        console.error('Failed to write ping timestamp', e);
      }
    };
    runPing();
  }, [isJoined, roomCode, userId]);

  // Load YouTube Iframe API if URL is YouTube
  const isYoutube = room ? room.videoUrl.includes('youtube.com') || room.videoUrl.includes('youtu.be') : false;

  useEffect(() => {
    if (!isYoutube) return;

    // Load YouTube Iframe API if not loaded
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, [isYoutube]);

  // Initialize YouTube Player
  useEffect(() => {
    if (!isYoutube || !roomCode) return;

    let player: any = null;
    let checkInterval = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player && youtubeRef.current) {
        clearInterval(checkInterval);
        initializePlayer();
      }
    }, 200);

    function initializePlayer() {
      if (!youtubeRef.current) return;
      player = new (window as any).YT.Player(youtubeRef.current, {
        events: {
          onReady: (event: any) => {
            ytPlayerRef.current = event.target;
            event.target.setVolume(localVolume * 100);
            if (localIsMuted) {
              event.target.mute();
            } else {
              event.target.unMute();
            }
          },
          onStateChange: (event: any) => {
            const state = event.data;
            const time = event.target.getCurrentTime();

            if (!isHost) return;

            if (ignoreYTEvent.current > 0) {
              ignoreYTEvent.current--;
              return;
            }

            if (state === (window as any).YT.PlayerState.PLAYING) {
              updateDoc(doc(db, 'rooms', roomCode), {
                isPlaying: true,
                currentTime: time,
                lastUpdated: serverTimestamp()
              }).catch(console.error);
            } else if (state === (window as any).YT.PlayerState.PAUSED) {
              updateDoc(doc(db, 'rooms', roomCode), {
                isPlaying: false,
                currentTime: time,
                lastUpdated: serverTimestamp()
              }).catch(console.error);
            }
          }
        }
      });
    }

    return () => {
      clearInterval(checkInterval);
      if (player && typeof player.destroy === 'function') {
        player.destroy();
      }
      ytPlayerRef.current = null;
    };
  }, [isYoutube, roomCode, isHost]);

  // Poll YouTube current time for custom controls slider
  useEffect(() => {
    if (!isYoutube || !isJoined) return;

    const interval = setInterval(() => {
      const ytPlayer = ytPlayerRef.current;
      if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        setLocalCurrentTime(ytPlayer.getCurrentTime());
        if (typeof ytPlayer.getDuration === 'function') {
          setLocalDuration(ytPlayer.getDuration());
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isYoutube, isJoined]);

  // Host updates playback state in Firestore to prevent drifts
  useEffect(() => {
    if (!room || !isJoined || !isHost) return;

    const interval = setInterval(() => {
      let time = 0;
      if (isYoutube && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        time = ytPlayerRef.current.getCurrentTime();
      } else if (!isYoutube && videoRef.current) {
        time = videoRef.current.currentTime;
      }
      
      // Host pushes current time periodically to prevent massive drifts
      if (time > 0 && Math.abs(room.currentTime - time) > 1.5) {
        updateDoc(doc(db, 'rooms', roomCode), {
          currentTime: time,
          lastUpdated: serverTimestamp()
        }).catch(console.error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [room?.currentTime, isHost, isJoined, roomCode, isYoutube]);

  // Sync host player state with the database exactly once on load
  useEffect(() => {
    if (!room || !isJoined || !isHost) return;
    if (hostInitialized.current) return;

    const player = videoRef.current;
    const ytPlayer = ytPlayerRef.current;

    if (isYoutube) {
      if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
        hostInitialized.current = true;
        if (room.isPlaying) {
          ignoreYTEvent.current++;
          ytPlayer.playVideo();
        } else {
          ignoreYTEvent.current++;
          ytPlayer.pauseVideo();
        }
        ignoreYTEvent.current++;
        ytPlayer.seekTo(room.currentTime, true);
        if (room.playbackRate) {
          ytPlayer.setPlaybackRate(room.playbackRate);
          setLocalPlaybackRate(room.playbackRate);
        }
      }
    } else {
      if (player) {
        hostInitialized.current = true;
        player.currentTime = room.currentTime;
        if (room.isPlaying) {
          ignorePlayEvent.current++;
          player.play().catch(() => {
            ignorePlayEvent.current = Math.max(0, ignorePlayEvent.current - 1);
          });
        } else {
          ignorePauseEvent.current++;
          player.pause();
        }
        if (room.playbackRate) {
          player.playbackRate = room.playbackRate;
          setLocalPlaybackRate(room.playbackRate);
        }
      }
    }
  }, [room, isHost, isJoined, isYoutube]);

  // Guest synchronizes with Firestore state
  useEffect(() => {
    if (!room || !isJoined || isHost) return;

    const source = room.videoUrl ? parseVideoUrl(room.videoUrl) : null;
    if (!source) return;

    const player = videoRef.current;
    const ytPlayer = ytPlayerRef.current;

    // Calculate latency correction based on server timestamp
    let lastUpdatedServerTime = Date.now();
    if (room.lastUpdated) {
      if (typeof room.lastUpdated === 'string') {
        lastUpdatedServerTime = new Date(room.lastUpdated).getTime();
      } else if (typeof (room.lastUpdated as any).toDate === 'function') {
        lastUpdatedServerTime = (room.lastUpdated as any).toDate().getTime();
      } else if ((room.lastUpdated as any).seconds) {
        lastUpdatedServerTime = (room.lastUpdated as any).seconds * 1000 + ((room.lastUpdated as any).nanoseconds || 0) / 1000000;
      }
    }

    const nowServerTime = getCurrentServerTime();
    const elapsedSeconds = Math.max(0, (nowServerTime - lastUpdatedServerTime) / 1000);
    
    const targetTime = room.isPlaying 
      ? room.currentTime + elapsedSeconds * (room.playbackRate || 1)
      : room.currentTime;

    if (source.type === 'youtube') {
      if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
        const ytState = ytPlayer.getPlayerState();
        if (room.isPlaying && ytState !== (window as any).YT.PlayerState.PLAYING) {
          sendPlayerCommand('play');
        } else if (!room.isPlaying && ytState !== (window as any).YT.PlayerState.PAUSED) {
          sendPlayerCommand('pause');
        }
        const ytTime = ytPlayer.getCurrentTime();
        if (Math.abs(ytTime - targetTime) > 1.0) {
          sendPlayerCommand('seek', targetTime);
        }
      }
    } else if (source.type === 'html5' || source.type === 'hls') {
      if (player) {
        if (room.isPlaying && player.paused) {
          sendPlayerCommand('play');
        } else if (!room.isPlaying && !player.paused) {
          sendPlayerCommand('pause');
        }
        const diff = player.currentTime - targetTime;
        if (Math.abs(diff) > 1.0) {
          sendPlayerCommand('seek', targetTime);
          player.playbackRate = room.playbackRate || 1;
        } else if (Math.abs(diff) > 0.15) {
          // Soft drift correction by modifying playbackRate
          const adjustment = diff < 0 ? 1.05 : 0.95;
          player.playbackRate = (room.playbackRate || 1) * adjustment;
        } else {
          player.playbackRate = room.playbackRate || 1;
        }
      }
    } else {
      // Vimeo, Dailymotion, VK Video
      if (room.isPlaying) {
        sendPlayerCommand('play');
      } else {
        sendPlayerCommand('pause');
      }
      sendPlayerCommand('seek', targetTime);
    }
  }, [room?.isPlaying, room?.currentTime, room?.lastUpdated, room?.playbackRate, isHost, isJoined, clockOffset]);

  // Host Player Event Handlers
  const handleHostPlay = () => {
    if (!isHost || !roomCode) return;
    if (ignorePlayEvent.current > 0) {
      ignorePlayEvent.current--;
      return;
    }
    let time = 0;
    if (videoRef.current) time = videoRef.current.currentTime;
    
    updateDoc(doc(db, 'rooms', roomCode), {
      isPlaying: true,
      currentTime: time,
      lastUpdated: serverTimestamp()
    }).catch(console.error);
  };

  const handleHostPause = () => {
    if (!isHost || !roomCode) return;
    if (ignorePauseEvent.current > 0) {
      ignorePauseEvent.current--;
      return;
    }
    let time = 0;
    if (videoRef.current) time = videoRef.current.currentTime;

    updateDoc(doc(db, 'rooms', roomCode), {
      isPlaying: false,
      currentTime: time,
      lastUpdated: serverTimestamp()
    }).catch(console.error);
  };

  const handleHostSeek = () => {
    if (!isHost || !roomCode) return;
    if (ignoreSeekEvent.current > 0) {
      ignoreSeekEvent.current--;
      return;
    }
    let time = 0;
    if (videoRef.current) time = videoRef.current.currentTime;

    updateDoc(doc(db, 'rooms', roomCode), {
      currentTime: time,
      lastUpdated: serverTimestamp()
    }).catch(console.error);
  };

  const sendPlayerCommand = (command: 'play' | 'pause' | 'seek', value?: number) => {
    const source = room?.videoUrl ? parseVideoUrl(room.videoUrl) : null;
    if (!source) return;

    if (source.type === 'youtube') {
      const ytPlayer = ytPlayerRef.current;
      if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
        ignoreYTEvent.current++;
        if (command === 'play') {
          ytPlayer.playVideo();
        } else if (command === 'pause') {
          ytPlayer.pauseVideo();
        } else if (command === 'seek' && value !== undefined) {
          ytPlayer.seekTo(value, true);
        }
      }
    } else if (source.type === 'html5' || source.type === 'hls') {
      const player = videoRef.current;
      if (player) {
        if (command === 'play') {
          if (player.paused) {
            ignorePlayEvent.current++;
            player.play().catch(() => {
              ignorePlayEvent.current = Math.max(0, ignorePlayEvent.current - 1);
            });
          }
        } else if (command === 'pause') {
          if (!player.paused) {
            ignorePauseEvent.current++;
            player.pause();
          }
        } else if (command === 'seek' && value !== undefined) {
          if (Math.abs(player.currentTime - value) > 1.0) {
            ignoreSeekEvent.current++;
            player.currentTime = value;
          }
        }
      }
    } else {
      const iframe = youtubeRef.current;
      if (!iframe || !iframe.contentWindow) return;

      if (source.type === 'vimeo') {
        if (command === 'play') {
          iframe.contentWindow.postMessage(JSON.stringify({ method: 'play' }), '*');
        } else if (command === 'pause') {
          iframe.contentWindow.postMessage(JSON.stringify({ method: 'pause' }), '*');
        } else if (command === 'seek' && value !== undefined) {
          iframe.contentWindow.postMessage(JSON.stringify({ method: 'seekTo', value }), '*');
        }
      } else if (source.type === 'dailymotion') {
        if (command === 'play') {
          iframe.contentWindow.postMessage(JSON.stringify({ command: 'play' }), '*');
        } else if (command === 'pause') {
          iframe.contentWindow.postMessage(JSON.stringify({ command: 'pause' }), '*');
        } else if (command === 'seek' && value !== undefined) {
          iframe.contentWindow.postMessage(JSON.stringify({ command: 'seek', value }), '*');
        }
      } else if (source.type === 'vk') {
        if (command === 'play') {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', command: 'play' }), '*');
        } else if (command === 'pause') {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', command: 'pause' }), '*');
        } else if (command === 'seek' && value !== undefined) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', command: 'seek', seekTime: value }), '*');
        }
      } else if (source.type === 'twitch') {
        if (command === 'play') {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', command: 'play' }), '*');
        } else if (command === 'pause') {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', command: 'pause' }), '*');
        }
      }
    }
  };

  const handleAddToQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueInputUrl.trim() || !roomCode || !room) return;
    
    const canModifyQueue = isHost || room.settings?.queueMode === 'all';
    if (!canModifyQueue) {
      alert('У вас нет прав для изменения очереди');
      return;
    }

    try {
      const cleanUrl = queueInputUrl.trim();
      parseVideoUrl(cleanUrl); // Validate first

      const title = queueInputTitle.trim() || 'Видео из очереди';
      const newVideo: QueuedVideo = {
        id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title,
        url: cleanUrl,
        addedBy: nickname
      };

      const roomRef = doc(db, 'rooms', roomCode);
      const currentQueue = room.queue || [];
      await updateDoc(roomRef, {
        queue: [...currentQueue, newVideo],
        messages: arrayUnion({
          id: `system-qadd-${Date.now()}`,
          senderId: 'system',
          senderName: 'Система',
          text: `${nickname} добавил видео "${title}" в очередь.`,
          sentAt: new Date().toISOString()
        })
      });

      setQueueInputUrl('');
      setQueueInputTitle('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteFromQueue = async (itemId: string) => {
    if (!roomCode || !room) return;
    
    const canModifyQueue = isHost || room.settings?.queueMode === 'all';
    if (!canModifyQueue) return;

    const currentQueue = room.queue || [];
    const item = currentQueue.find(q => q.id === itemId);
    const updatedQueue = currentQueue.filter(q => q.id !== itemId);

    try {
      const roomRef = doc(db, 'rooms', roomCode);
      await updateDoc(roomRef, {
        queue: updatedQueue,
        messages: arrayUnion({
          id: `system-qdel-${Date.now()}`,
          senderId: 'system',
          senderName: 'Система',
          text: `${nickname} удалил видео "${item?.title || 'Без названия'}" из очереди.`,
          sentAt: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlayQueueItem = async (itemId: string) => {
    if (!roomCode || !room) return;
    
    const canModifyQueue = isHost || room.settings?.queueMode === 'all';
    if (!canModifyQueue) return;

    const currentQueue = room.queue || [];
    const itemIndex = currentQueue.findIndex(q => q.id === itemId);
    if (itemIndex === -1) return;

    const item = currentQueue[itemIndex];
    const updatedQueue = currentQueue.filter(q => q.id !== itemId);

    try {
      const roomRef = doc(db, 'rooms', roomCode);
      await updateDoc(roomRef, {
        videoUrl: item.url,
        showTitle: item.title,
        isPlaying: true,
        currentTime: 0,
        lastUpdated: serverTimestamp(),
        queue: updatedQueue,
        messages: arrayUnion({
          id: `system-qplay-${Date.now()}`,
          senderId: 'system',
          senderName: 'Система',
          text: `${nickname} запустил воспроизведение видео "${item.title}" из очереди.`,
          sentAt: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveQueueItem = async (itemId: string, direction: 'up' | 'down') => {
    if (!roomCode || !room) return;

    const canModifyQueue = isHost || room.settings?.queueMode === 'all';
    if (!canModifyQueue) return;

    const currentQueue = [...(room.queue || [])];
    const index = currentQueue.findIndex(q => q.id === itemId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = currentQueue[index];
      currentQueue[index] = currentQueue[index - 1];
      currentQueue[index - 1] = temp;
    } else if (direction === 'down' && index < currentQueue.length - 1) {
      const temp = currentQueue[index];
      currentQueue[index] = currentQueue[index + 1];
      currentQueue[index + 1] = temp;
    } else {
      return;
    }

    try {
      const roomRef = doc(db, 'rooms', roomCode);
      await updateDoc(roomRef, {
        queue: currentQueue
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleQueueMode = async () => {
    if (!roomCode || !room || !isHost) return;
    const nextMode = room.settings?.queueMode === 'host' ? 'all' : 'host';
    try {
      const roomRef = doc(db, 'rooms', roomCode);
      await updateDoc(roomRef, {
        'settings.queueMode': nextMode
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleVideoEnded = async () => {
    if (!isHost || !roomCode || !room) return;

    const queue = room.queue || [];
    if (queue.length > 0) {
      const nextVideo = queue[0];
      const updatedQueue = queue.slice(1);

      try {
        await updateDoc(doc(db, 'rooms', roomCode), {
          videoUrl: nextVideo.url,
          showTitle: nextVideo.title,
          isPlaying: true,
          currentTime: 0,
          lastUpdated: serverTimestamp(),
          queue: updatedQueue,
          messages: arrayUnion({
            id: `system-next-${Date.now()}`,
            senderId: 'system',
            senderName: 'Система',
            text: `Автопереход к следующему видео: "${nextVideo.title}"`,
            sentAt: new Date().toISOString()
          })
        });
      } catch (e) {
        console.error('Failed to transition to next video in queue', e);
      }
    } else {
      await updateDoc(doc(db, 'rooms', roomCode), {
        isPlaying: false,
        lastUpdated: serverTimestamp()
      });
    }
  };

  const applyHlsQuality = (hls: any, quality: string) => {
    if (!hls) return;
    if (quality === 'auto') {
      hls.currentLevel = -1;
    } else {
      const height = parseInt(quality);
      const levelIndex = hls.levels.findIndex((l: any) => l.height === height);
      if (levelIndex !== -1) {
        hls.currentLevel = levelIndex;
      }
    }
  };

  const handleQualityChange = (quality: string) => {
    setLocalQuality(quality);
    localStorage.setItem('penis_ink_quality', quality);
    setShowQualityControls(false);

    const source = room?.videoUrl ? parseVideoUrl(room.videoUrl) : null;
    if (source?.type === 'hls' && hlsRef.current) {
      applyHlsQuality(hlsRef.current, quality);
    } else if (source?.type === 'youtube' && ytPlayerRef.current) {
      let ytQuality = 'default';
      if (quality === '1080p') ytQuality = 'hd1080';
      else if (quality === '720p') ytQuality = 'hd720';
      else if (quality === '480p') ytQuality = 'large';
      else if (quality === '360p') ytQuality = 'medium';
      else if (quality === '240p') ytQuality = 'small';
      else if (quality === '144p') ytQuality = 'tiny';
      
      if (typeof ytPlayerRef.current.setPlaybackQuality === 'function') {
        ytPlayerRef.current.setPlaybackQuality(ytQuality);
      }
    }
  };

  // HLS loading and management useEffect
  useEffect(() => {
    if (!room?.videoUrl) return;
    const source = parseVideoUrl(room.videoUrl);
    const video = videoRef.current;

    if (source.type === 'hls' && video) {
      let hlsInstance: any = null;
      loadHls().then((Hls) => {
        if (!Hls) return;
        if (Hls.isSupported()) {
          hlsInstance = new Hls();
          hlsRef.current = hlsInstance;
          hlsInstance.loadSource(source.directUrl || room.videoUrl);
          hlsInstance.attachMedia(video);

          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            const qualities = hlsInstance.levels.map((l: any) => `${l.height}p`);
            const uniqueQualities = Array.from(new Set(qualities)) as string[];
            setAvailableQualities(['auto', ...uniqueQualities]);
            
            const saved = localStorage.getItem('penis_ink_quality') || 'auto';
            applyHlsQuality(hlsInstance, saved);
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = source.directUrl || room.videoUrl;
        }
      });

      return () => {
        if (hlsInstance) {
          hlsInstance.destroy();
        }
        hlsRef.current = null;
      };
    } else if (source.type === 'html5' && video) {
      video.src = source.directUrl || room.videoUrl;
      setAvailableQualities(['auto']);
    }
  }, [room?.videoUrl]);

  // YouTube quality checker useEffect
  useEffect(() => {
    if (!isYoutube || !isJoined) return;
    const interval = setInterval(() => {
      const ytPlayer = ytPlayerRef.current;
      if (ytPlayer && typeof ytPlayer.getAvailableQualityLevels === 'function') {
        const levels = ytPlayer.getAvailableQualityLevels();
        if (levels && levels.length > 0) {
          clearInterval(interval);
          const mapped = levels.map((l: string) => {
            if (l === 'hd1080') return '1080p';
            if (l === 'hd720') return '720p';
            if (l === 'large') return '480p';
            if (l === 'medium') return '360p';
            if (l === 'small') return '240p';
            if (l === 'tiny') return '144p';
            return '';
          }).filter(Boolean);
          setAvailableQualities(['auto', ...mapped]);
          
          const saved = localStorage.getItem('penis_ink_quality') || 'auto';
          let ytQuality = 'default';
          if (saved === '1080p') ytQuality = 'hd1080';
          else if (saved === '720p') ytQuality = 'hd720';
          else if (saved === '480p') ytQuality = 'large';
          else if (saved === '360p') ytQuality = 'medium';
          else if (saved === '240p') ytQuality = 'small';
          else if (saved === '144p') ytQuality = 'tiny';
          ytPlayer.setPlaybackQuality(ytQuality);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isYoutube, isJoined, room?.videoUrl]);

  // General iframe message listener for embeds (Vimeo, Dailymotion, VK Video)
  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      if (typeof e.data !== 'string' && typeof e.data !== 'object') return;
      
      let parsed: any = {};
      if (typeof e.data === 'string') {
        try {
          parsed = JSON.parse(e.data);
        } catch (err) {
          if (e.data.includes('=')) {
            const [key, val] = e.data.split('=');
            if (key === 'timeupdate') {
              setLocalCurrentTime(parseFloat(val));
            } else if (key === 'durationchange') {
              setLocalDuration(parseFloat(val));
            }
          }
          return;
        }
      } else {
        parsed = e.data;
      }

      // Vimeo
      if (parsed.event === 'timeupdate' && parsed.data) {
        if (parsed.data.seconds !== undefined) setLocalCurrentTime(parsed.data.seconds);
        if (parsed.data.duration !== undefined) setLocalDuration(parsed.data.duration);
      }
      
      // VK
      if (parsed.event === 'timeupdate' && parsed.currentTime !== undefined) {
        setLocalCurrentTime(parsed.currentTime);
      }
      if (parsed.event === 'durationchange' && parsed.duration !== undefined) {
        setLocalDuration(parsed.duration);
      }

      // Video Ended checks
      if (parsed.event === 'finish' || parsed.event === 'ended' || parsed.event === 'finished' || parsed.event === 'video_ended' || e.data === 'ended') {
        handleVideoEnded();
      }

      if (!isHost || !roomCode) return;

      // Vimeo Host Play/Pause
      if (parsed.event === 'play') {
        updateDoc(doc(db, 'rooms', roomCode), {
          isPlaying: true,
          lastUpdated: serverTimestamp()
        }).catch(console.error);
      }
      if (parsed.event === 'pause') {
        updateDoc(doc(db, 'rooms', roomCode), {
          isPlaying: false,
          lastUpdated: serverTimestamp()
        }).catch(console.error);
      }

      // VK Host Play/Pause
      if (parsed.event === 'started' || parsed.event === 'resumed') {
        updateDoc(doc(db, 'rooms', roomCode), {
          isPlaying: true,
          lastUpdated: serverTimestamp()
        }).catch(console.error);
      }
      if (parsed.event === 'paused') {
        updateDoc(doc(db, 'rooms', roomCode), {
          isPlaying: false,
          lastUpdated: serverTimestamp()
        }).catch(console.error);
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [isHost, roomCode, room?.queue]);

  // Fullscreen event listener and autohide logic
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen) {
        setShowControls(true);
        if (mouseTimer.current) {
          window.clearTimeout(mouseTimer.current);
          mouseTimer.current = null;
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (mouseTimer.current) {
        window.clearTimeout(mouseTimer.current);
      }
    };
  }, []);

  const resetHideTimer = () => {
    setShowControls(true);

    if (mouseTimer.current) {
      window.clearTimeout(mouseTimer.current);
    }

    if (!document.fullscreenElement) {
      mouseTimer.current = null;
      return;
    }

    mouseTimer.current = window.setTimeout(() => {
      if (!controlsHovered.current) {
        setShowControls(false);
      }
    }, 2500);
  };

  useEffect(() => {
    const isCurrentlyFullscreen = !!document.fullscreenElement;
    if (!isCurrentlyFullscreen) return;

    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = () => {
      resetHideTimer();
    };

    const handleKeyDown = () => {
      resetHideTimer();
    };

    container.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    resetHideTimer();

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Helper to extract YouTube video ID
  const getYoutubeId = (url: string) => {
    const trimmed = url.trim();
    if (trimmed.includes('youtube.com/watch')) {
      return new URL(trimmed).searchParams.get('v') || '';
    }
    if (trimmed.includes('youtu.be/')) {
      return trimmed.split('youtu.be/')[1]?.split('?')[0] || '';
    }
    return '';
  };

  const youtubeId = room ? getYoutubeId(room.videoUrl) : '';

  const toggleHostPlay = () => {
    if (!isHost || !roomCode) return;
    const nextPlaying = !room?.isPlaying;
    let time = 0;

    if (isYoutube) {
      const ytPlayer = ytPlayerRef.current;
      if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        time = ytPlayer.getCurrentTime();
        if (nextPlaying) {
          ignoreYTEvent.current++;
          ytPlayer.playVideo();
        } else {
          ignoreYTEvent.current++;
          ytPlayer.pauseVideo();
        }
      }
    } else {
      const player = videoRef.current;
      if (player) {
        time = player.currentTime;
        if (nextPlaying) {
          ignorePlayEvent.current++;
          player.play().catch(() => {
            ignorePlayEvent.current = Math.max(0, ignorePlayEvent.current - 1);
          });
        } else {
          ignorePauseEvent.current++;
          player.pause();
        }
      }
    }

    updateDoc(doc(db, 'rooms', roomCode), {
      isPlaying: nextPlaying,
      currentTime: time,
      lastUpdated: serverTimestamp()
    }).catch(console.error);
  };

  const handlePlayPauseClick = () => {
    if (!isHost) return;
    toggleHostPlay();
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHost || !roomCode) return;
    const seekTime = parseFloat(e.target.value);
    setLocalCurrentTime(seekTime);

    if (isYoutube) {
      const ytPlayer = ytPlayerRef.current;
      if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
        ignoreYTEvent.current++;
        ytPlayer.seekTo(seekTime, true);
      }
    } else {
      const player = videoRef.current;
      if (player) {
        ignoreSeekEvent.current++;
        player.currentTime = seekTime;
      }
    }

    updateDoc(doc(db, 'rooms', roomCode), {
      currentTime: seekTime,
      lastUpdated: serverTimestamp()
    }).catch(console.error);
  };

  const handleVolumeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setLocalVolume(vol);
    setLocalIsMuted(vol === 0);

    if (isYoutube) {
      const ytPlayer = ytPlayerRef.current;
      if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
        ytPlayer.setVolume(vol * 100);
        if (vol === 0) {
          ytPlayer.mute();
        } else {
          ytPlayer.unMute();
        }
      }
    } else {
      const player = videoRef.current;
      if (player) {
        player.volume = vol;
        player.muted = vol === 0;
      }
    }
  };

  const toggleLocalMute = () => {
    const nextMuted = !localIsMuted;
    setLocalIsMuted(nextMuted);

    if (isYoutube) {
      const ytPlayer = ytPlayerRef.current;
      if (ytPlayer && typeof ytPlayer.mute === 'function') {
        if (nextMuted) {
          ytPlayer.mute();
        } else {
          ytPlayer.unMute();
          ytPlayer.setVolume(localVolume * 100);
        }
      }
    } else {
      const player = videoRef.current;
      if (player) {
        player.muted = nextMuted;
      }
    }
  };

  const changeHostSpeed = (rate: number) => {
    if (!isHost || !roomCode) return;
    setLocalPlaybackRate(rate);
    setShowSpeedControls(false);

    if (isYoutube) {
      const ytPlayer = ytPlayerRef.current;
      if (ytPlayer && typeof ytPlayer.setPlaybackRate === 'function') {
        ytPlayer.setPlaybackRate(rate);
      }
    } else {
      const player = videoRef.current;
      if (player) {
        player.playbackRate = rate;
      }
    }

    updateDoc(doc(db, 'rooms', roomCode), {
      playbackRate: rate,
      lastUpdated: serverTimestamp()
    }).catch(console.error);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Fullscreen failed', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setLocalCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setLocalDuration(videoRef.current.duration);
  };

  const roomContent = (
    <div className={`w-full bg-bg-card border border-border-color rounded-[32px] overflow-hidden flex flex-col md:flex-row shadow-soft relative ${isInline ? 'h-[calc(100vh-10rem)] md:h-[calc(100vh-8rem)]' : 'w-full max-w-6xl h-[90vh]'}`}>
        
        {/* Close Room button (Outside joint watch) */}
        {!isJoined && onClose && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-bg-app border border-border-color text-text-secondary hover:text-text-primary transition-all cursor-pointer z-10 shadow-soft"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* ==================================================================
            SCREEN A: JOIN OR CREATE SCREEN
            ================================================================== */}
        {!isJoined ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-accent-light border border-accent-color/30 flex items-center justify-center text-accent-color shadow-soft">
              <Users className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-text-primary">Совместный просмотр</h2>
              <p className="text-xs text-text-secondary mt-1">Смотрите видео вместе, синхронизируйте плеер и общайтесь в реальном времени!</p>
            </div>

            {/* Nickname input */}
            <div className="w-full space-y-1 text-left max-w-md">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Ваш никнейм</label>
              <input 
                type="text" 
                value={nickname}
                onChange={(e) => handleSaveNickname(e.target.value)}
                placeholder="Никнейм для чата..."
                className="w-full ide-input rounded-xl text-center py-2.5 font-bold"
              />
            </div>

            {/* TAB SELECTOR */}
            <div className="flex bg-bg-app border border-border-color p-0.5 rounded-xl text-xs font-bold text-text-secondary select-none w-full max-w-md">
              <button 
                onClick={() => { setErrorMsg(''); setActiveTab('create'); }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${activeTab === 'create' ? 'bg-accent-color text-white shadow-soft font-extrabold' : 'hover:text-text-primary'}`}
              >
                Создать комнату
              </button>
              <button 
                onClick={() => { setErrorMsg(''); setActiveTab('join'); }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${activeTab === 'join' ? 'bg-accent-color text-white shadow-soft font-extrabold' : 'hover:text-text-primary'}`}
              >
                Войти в комнату
              </button>
            </div>

            {/* TAB PANELS */}
            <div className="w-full max-w-md bg-bg-app/50 border border-border-color rounded-2xl p-5 space-y-4 shadow-soft">
              {activeTab === 'create' ? (
                <div className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Название сериала / видео</label>
                    {showTitle ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-text-primary bg-bg-card border border-border-color rounded-xl px-3 py-2">
                        <Film className="w-4 h-4 text-accent-color" />
                        <span className="truncate">{showTitle}</span>
                      </div>
                    ) : (
                      <input 
                        type="text"
                        value={customShowTitle}
                        onChange={(e) => setCustomShowTitle(e.target.value)}
                        placeholder="Название видео..."
                        className="w-full ide-input text-xs"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Ссылка на видео (YouTube или Direct MP4)</label>
                    <input 
                      type="text"
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      placeholder="Вставьте URL видео..."
                      className="w-full ide-input text-xs"
                    />
                  </div>

                  <button 
                    onClick={handleCreateRoom}
                    className="w-full py-2.5 bg-accent-color hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-soft cursor-pointer transition-all active:scale-[0.98]"
                  >
                    Создать комнату
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Код комнаты (5 цифр)</label>
                    <input 
                      type="text"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value)}
                      placeholder="Например: 78945"
                      maxLength={5}
                      className="w-full ide-input text-center text-sm font-mono tracking-widest font-extrabold rounded-xl py-2"
                    />
                  </div>

                  <button 
                    onClick={handleJoinRoom}
                    className="w-full py-2.5 bg-accent-color hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-soft cursor-pointer transition-all active:scale-[0.98]"
                  >
                    Войти в комнату
                  </button>
                </div>
              )}
            </div>

            {errorMsg && (
              <p className="text-[10px] text-rose-500 font-bold bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl w-full max-w-md">{errorMsg}</p>
            )}
          </div>
        ) : (
          
          // ==================================================================
          // SCREEN B: ACTIVE WATCH ROOM INTERFACE
          // ==================================================================
          <div className="flex-1 flex flex-col md:flex-row h-full">
            
            {/* 1. Left Section: Player & Room Info */}
            <div className="flex-1 flex flex-col p-4 md:p-6 border-r border-border-color min-w-0">
              
              {/* Header Info */}
              <div className="flex items-center justify-between pb-4 border-b border-border-color shrink-0">
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-text-primary truncate flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>Совместный просмотр: {room?.showTitle}</span>
                  </h3>
                  <p className="text-[10px] text-text-secondary truncate mt-0.5 max-w-md">Ссылка: {room?.videoUrl}</p>
                </div>

                {/* Share Room Info */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-bg-app border border-border-color rounded-xl p-0.5 text-xs font-bold shadow-soft">
                    <span className="px-3 text-text-secondary font-mono tracking-wider">{roomCode}</span>
                    <button 
                      onClick={handleCopyCode}
                      className="p-1.5 rounded-lg bg-bg-card hover:bg-bg-app text-text-secondary hover:text-text-primary transition-all cursor-pointer border border-border-color shadow-soft"
                      title="Копировать код комнаты"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button 
                    onClick={handleLeaveRoom}
                    className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white transition-all cursor-pointer shadow-soft"
                    title="Выйти из комнаты"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Player Area with custom controls */}
              <div 
                ref={containerRef}
                className={`flex-1 bg-black rounded-2xl overflow-hidden border border-border-color shadow-soft relative mt-4 min-h-[300px] flex items-center justify-center group/player ${
                  isFullscreen && !showControls ? 'cursor-none' : ''
                }`}
              >
                {!room?.videoUrl ? (
                  // Empty Room Placeholder
                  <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-md">
                    <div className="w-14 h-14 rounded-2xl bg-accent-light border border-accent-color/20 flex items-center justify-center text-accent-color shadow-soft animate-pulse">
                      <Film className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white">Видео не выбрано</h4>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {isHost 
                          ? 'Укажите ссылку на видео ниже или добавьте видео в очередь.' 
                          : 'Организатор еще не выбрал видео для просмотра.'}
                      </p>
                    </div>
                    {isHost && (
                      <div className="w-full flex gap-2 pt-2">
                        <input 
                          type="text" 
                          placeholder="Ссылка на видео (YouTube, MP4, HLS...)" 
                          value={videoUrlInput}
                          onChange={(e) => setVideoUrlInput(e.target.value)}
                          className="flex-1 ide-input text-xs py-2 bg-slate-900 border-slate-800 text-white rounded-xl"
                        />
                        <button 
                          onClick={async () => {
                            const cleanUrl = videoUrlInput.trim();
                            if (!cleanUrl) return;
                            try {
                              parseVideoUrl(cleanUrl);
                              const roomRef = doc(db, 'rooms', roomCode);
                              await updateDoc(roomRef, {
                                videoUrl: cleanUrl,
                                showTitle: 'Произвольное видео',
                                isPlaying: false,
                                currentTime: 0,
                                lastUpdated: serverTimestamp()
                              });
                            } catch (err: any) {
                              setErrorMsg(err.message);
                              alert(err.message);
                            }
                          }}
                          className="px-4 py-2 bg-accent-color hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-soft cursor-pointer transition-all active:scale-95"
                        >
                          Выбрать
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Active player rendering
                  <>
                    {(() => {
                      const source = parseVideoUrl(room.videoUrl);
                      if (source.type === 'youtube') {
                        return (
                          <iframe 
                            ref={youtubeRef}
                            src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&autoplay=0&mute=${localIsMuted ? 1 : 0}&rel=0&controls=0`}
                            className="w-full h-full border-none absolute inset-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                          />
                        );
                      } else if (source.type === 'vimeo' || source.type === 'twitch' || source.type === 'dailymotion' || source.type === 'vk') {
                        return (
                          <iframe 
                            ref={youtubeRef}
                            src={source.embedUrl}
                            className="w-full h-full border-none absolute inset-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                          />
                        );
                      } else {
                        // html5 or hls
                        return (
                          <video 
                            ref={videoRef}
                            className="w-full h-full object-contain absolute inset-0"
                            controls={false}
                            onPlay={isHost ? handleHostPlay : undefined}
                            onPause={isHost ? handleHostPause : undefined}
                            onSeeked={isHost ? handleHostSeek : undefined}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={handleVideoEnded}
                          />
                        );
                      }
                    })()}
                  </>
                )}

                {/* Overlay to block direct guest clicks on video content but keep controls clickable */}
                {!isHost && room?.videoUrl && (
                  <div 
                    className="absolute inset-x-0 top-0 bottom-16 bg-transparent cursor-not-allowed z-10" 
                    title="Управление плеером доступно только создателю комнаты" 
                  />
                )}

                {/* Custom Controls Bar */}
                {room?.videoUrl && (
                  <div 
                    onMouseEnter={() => { controlsHovered.current = true; resetHideTimer(); }}
                    onMouseLeave={() => { controlsHovered.current = false; resetHideTimer(); }}
                    className={`absolute bottom-0 inset-x-0 h-16 bg-slate-950/80 border-t border-slate-900/60 transition-all duration-300 flex flex-col justify-end px-4 pb-2 z-20 space-y-1.5 select-none ${
                      isFullscreen 
                        ? (showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none')
                        : 'opacity-0 group-hover/player:opacity-100 focus-within:opacity-100'
                    }`}
                  >
                    
                    {/* Progress Bar */}
                    <div className="flex items-center gap-2.5">
                      <span className="text-[9px] font-mono text-slate-300">{formatTime(localCurrentTime)}</span>
                      <input 
                        type="range"
                        min="0"
                        max={localDuration || 100}
                        value={localCurrentTime}
                        onChange={handleSeekChange}
                        disabled={!isHost}
                        className={`flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600 hover:h-1.5 transition-all ${!isHost ? 'opacity-75 cursor-not-allowed' : ''}`}
                      />
                      <span className="text-[9px] font-mono text-slate-300">{formatTime(localDuration)}</span>
                    </div>

                    {/* Control Buttons Row */}
                    <div className="flex items-center justify-between text-slate-300 text-xs">
                      <div className="flex items-center gap-4">
                        {/* Play/Pause */}
                        <button 
                          onClick={handlePlayPauseClick} 
                          disabled={!isHost}
                          className={`hover:text-purple-400 transition-colors ${!isHost ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {room?.isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                        </button>

                        {/* Volume Controls */}
                        <div className="flex items-center gap-1.5 group/volume">
                          <button onClick={toggleLocalMute} className="hover:text-purple-400 transition-colors cursor-pointer">
                            {localIsMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                          <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={localIsMuted ? 0 : localVolume}
                            onChange={handleVolumeSliderChange}
                            className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-300 group-hover/volume:w-20 transition-all duration-300"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Local Quality selector */}
                        <div className="relative">
                          <button 
                            onClick={() => {
                              setShowQualityControls(!showQualityControls);
                              setShowSpeedControls(false);
                            }}
                            className="hover:text-purple-400 transition-colors text-[10px] font-mono font-bold flex items-center gap-0.5 border border-slate-800 rounded px-1.5 py-0.5 cursor-pointer bg-slate-900"
                          >
                            <span>{localQuality}</span>
                          </button>

                          {showQualityControls && (
                            <div className="absolute bottom-8 right-0 bg-slate-950 border border-slate-900 rounded-lg py-1 shadow-2xl text-[10px] min-w-[75px] z-30 flex flex-col max-h-[150px] overflow-y-auto">
                              {availableQualities.map((q) => (
                                <button
                                  key={q}
                                  onClick={() => handleQualityChange(q)}
                                  className={`w-full text-left px-2.5 py-1.5 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer ${
                                    localQuality === q ? 'text-purple-400 font-bold' : 'text-slate-300'
                                  }`}
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Playback speed selector (only for host) */}
                        {isHost && (
                          <div className="relative">
                            <button 
                              onClick={() => {
                                setShowSpeedControls(!showSpeedControls);
                                setShowQualityControls(false);
                              }}
                              className="hover:text-purple-400 transition-colors text-[10px] font-mono font-bold flex items-center gap-0.5 border border-slate-800 rounded px-1.5 py-0.5 cursor-pointer bg-slate-900"
                            >
                              <Settings className="w-3.5 h-3.5" />
                              <span>{localPlaybackRate}x</span>
                            </button>

                            {showSpeedControls && (
                              <div className="absolute bottom-8 right-0 bg-slate-950 border border-slate-900 rounded-lg py-1 shadow-2xl text-[10px] min-w-[65px] z-30 flex flex-col">
                                {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                                  <button
                                    key={rate}
                                    onClick={() => changeHostSpeed(rate)}
                                    className={`w-full text-left px-2.5 py-1.5 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer ${
                                      localPlaybackRate === rate ? 'text-purple-400 font-bold' : 'text-slate-300'
                                    }`}
                                  >
                                    {rate}x
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Fullscreen */}
                        <button onClick={toggleFullscreen} className="hover:text-purple-400 transition-colors cursor-pointer">
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Guest Controls Notice */}
              {!isHost && (
                <div className="mt-3 bg-accent-light border border-accent-color/10 text-accent-color rounded-2xl p-3 text-[10px] font-medium flex items-center gap-2 shrink-0">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Вы находитесь в режиме гостя. Воспроизведение синхронизировано с плеером организатора ({room?.hostName}).</span>
                </div>
              )}
            </div>

            {/* 2. Right Section: Chat & Participants */}
            <div className="w-full md:w-80 flex flex-col h-full bg-bg-app/40">
              
              {/* Active Participants List */}
              <div className="p-4 border-b border-border-color flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-accent-color" />
                    <span>В комнате ({room?.participants.length || 0})</span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1.5 max-h-[80px] overflow-y-auto">
                  {room?.participants.map(p => (
                    <span 
                      key={p.id} 
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border flex items-center gap-1 truncate ${p.id === room.hostId 
                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-500' 
                        : 'bg-bg-card border-border-color text-text-secondary'}`}
                    >
                      {p.id === room.hostId && <span className="text-[8px]">★</span>}
                      <span className="truncate">{p.name}</span>
                      {p.id === userId && <span className="text-[7px] opacity-75 font-normal font-sans">(Вы)</span>}
                    </span>
                  ))}
                </div>
              </div>

              {/* TAB SELECTOR for Sidebar */}
              <div className="flex bg-bg-app/50 border-b border-border-color p-1 text-xs font-bold text-text-secondary select-none shrink-0">
                <button 
                  onClick={() => setSideTab('chat')}
                  className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${sideTab === 'chat' ? 'bg-bg-card text-text-primary shadow-soft' : 'hover:text-text-primary'}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Чат</span>
                </button>
                <button 
                  onClick={() => setSideTab('queue')}
                  className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${sideTab === 'queue' ? 'bg-bg-card text-text-primary shadow-soft' : 'hover:text-text-primary'}`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Очередь ({room?.queue?.length || 0})</span>
                </button>
              </div>

              {sideTab === 'chat' ? (
                <>
                  {/* Messages viewport */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans min-h-0 flex flex-col">
                    {room?.messages.map((msg, index) => {
                      const isSystem = msg.senderId === 'system';
                      const isSelf = msg.senderId === userId;
                      
                      if (isSystem) {
                        return (
                          <div key={msg.id || index} className="text-center">
                            <span className="inline-block bg-bg-card border border-border-color text-text-muted px-2.5 py-0.5 rounded-full text-[9px] font-semibold leading-relaxed">
                              {msg.text}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={msg.id || index} 
                          className={`flex flex-col gap-0.5 max-w-[85%] ${isSelf ? 'self-end items-end' : 'self-start items-start'}`}
                        >
                          <span className="text-[8px] font-bold text-text-muted px-1 truncate">{msg.senderName}</span>
                          <div 
                            className={`p-2.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-soft ${isSelf 
                              ? 'bg-accent-color text-white rounded-tr-xs' 
                              : 'bg-bg-card border border-border-color text-text-primary rounded-tl-xs'}`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input form */}
                  <form onSubmit={handleSendMessage} className="p-4 bg-bg-card border-t border-border-color shrink-0 flex gap-2">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Сообщение..."
                      className="flex-1 ide-input text-xs py-2 rounded-xl"
                      required
                    />
                    <button 
                      type="submit" 
                      className="p-2 bg-accent-color hover:bg-accent-hover text-white rounded-xl cursor-pointer transition-all shadow-soft flex items-center justify-center shrink-0 active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 bg-bg-app/20">
                  {/* Host Queue settings */}
                  {isHost && (
                    <div className="p-3 border-b border-border-color bg-bg-app/50 flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-bold text-text-secondary">Кто может менять очередь:</span>
                      <button
                        onClick={toggleQueueMode}
                        className="px-2 py-1 bg-bg-card border border-border-color rounded-lg text-[9px] font-bold text-text-primary hover:bg-bg-app transition-all cursor-pointer shadow-soft"
                      >
                        {room?.settings?.queueMode === 'host' ? 'Только хост' : 'Все участники'}
                      </button>
                    </div>
                  )}

                  {/* List of queue items */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-2.5 min-h-0">
                    {!room?.queue || room.queue.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 text-text-muted">
                        <Film className="w-8 h-8 opacity-40 animate-pulse" />
                        <p className="text-[10px] font-bold">Очередь пуста</p>
                        <p className="text-[9px]">Добавьте ссылки на видео ниже, чтобы смотреть их по очереди.</p>
                      </div>
                    ) : (
                      room.queue.map((item, idx) => {
                        const canModifyQueue = isHost || room.settings?.queueMode === 'all';
                        return (
                          <div 
                            key={item.id} 
                            className="bg-bg-card border border-border-color rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-soft group/qitem"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-text-primary truncate">{item.title}</p>
                              <p className="text-[8px] text-text-muted mt-0.5 truncate">Добавил: {item.addedBy}</p>
                            </div>
                            
                            {canModifyQueue && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handlePlayQueueItem(item.id)}
                                  className="p-1 rounded bg-accent-color/10 hover:bg-accent-color text-accent-color hover:text-white transition-all cursor-pointer"
                                  title="Воспроизвести сейчас"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                </button>
                                <button
                                  onClick={() => handleMoveQueueItem(item.id, 'up')}
                                  disabled={idx === 0}
                                  className={`p-1 rounded border border-border-color hover:bg-bg-app text-text-secondary transition-all ${idx === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                  title="Вверх"
                                >
                                  <span className="text-[9px] font-bold">↑</span>
                                </button>
                                <button
                                  onClick={() => handleMoveQueueItem(item.id, 'down')}
                                  disabled={idx === (room.queue || []).length - 1}
                                  className={`p-1 rounded border border-border-color hover:bg-bg-app text-text-secondary transition-all ${idx === (room.queue || []).length - 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                  title="Вниз"
                                >
                                  <span className="text-[9px] font-bold">↓</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteFromQueue(item.id)}
                                  className="p-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all cursor-pointer"
                                  title="Удалить"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add to queue form */}
                  {(isHost || room?.settings?.queueMode === 'all') && (
                    <form onSubmit={handleAddToQueue} className="p-3 bg-bg-card border-t border-border-color shrink-0 space-y-2">
                      <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Добавить видео в очередь</div>
                      <input 
                        type="text" 
                        value={queueInputTitle}
                        onChange={(e) => setQueueInputTitle(e.target.value)}
                        placeholder="Название видео..."
                        className="w-full ide-input text-[11px] py-1.5 rounded-lg"
                      />
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={queueInputUrl}
                          onChange={(e) => setQueueInputUrl(e.target.value)}
                          placeholder="Ссылка на видео (YouTube, Direct...)"
                          className="flex-1 ide-input text-[11px] py-1.5 rounded-lg"
                          required
                        />
                        <button 
                          type="submit"
                          className="px-3 bg-accent-color hover:bg-accent-hover text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-soft active:scale-95 shrink-0"
                        >
                          Добавить
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

    </div>
  );

  if (isInline) {
    return roomContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 md:p-6 animate-[fadeIn_0.2s_ease-out]">
      {roomContent}
    </div>
  );
};
