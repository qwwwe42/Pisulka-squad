import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove } from 'firebase/firestore';
import { 
  X, Send, Users, MessageSquare, Play, Pause, 
  Volume2, VolumeX, LogOut, Copy, Check, Info, Film
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

interface RoomData {
  id: string;
  hostId: string;
  hostName: string;
  showId: string;
  showTitle: string;
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: string;
  participants: Participant[];
  messages: Message[];
}

interface CoWatchRoomProps {
  showId?: string;
  showTitle?: string;
  defaultVideoUrl?: string;
  onClose?: () => void;
  isInline?: boolean;
}

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
  const [isMuted, setIsMuted] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeRef = useRef<HTMLIFrameElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const localUpdateRef = useRef<boolean>(false); // flag to prevent infinite sync loops

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
    if (!cleanUrl) {
      setErrorMsg('Пожалуйста, введите URL видео');
      return;
    }

    const hostParticipant: Participant = {
      id: userId,
      name: nickname.trim(),
      joinedAt: new Date().toISOString()
    };

    const finalShowTitle = showTitle || customShowTitle.trim() || 'Произвольное видео';
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
    });

    return () => unsub();
  }, [roomCode, isJoined]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.messages]);

  // 2. Playback Synchronization Logic (Host -> DB, DB -> Guests)
  useEffect(() => {
    if (!room || !isJoined) return;

    // Check if the URL is YouTube or Direct Video link
    const isYoutube = room.videoUrl.includes('youtube.com') || room.videoUrl.includes('youtu.be');

    // Host updates playback state in Firestore
    if (isHost) {
      const interval = setInterval(() => {
        let time = 0;
        if (!isYoutube && videoRef.current) {
          time = videoRef.current.currentTime;
        }
        
        // Host pushes current time periodically to prevent massive drifts
        if (time > 0 && Math.abs(room.currentTime - time) > 2) {
          updateDoc(doc(db, 'rooms', roomCode), {
            currentTime: time,
            lastUpdated: new Date().toISOString()
          }).catch(console.error);
        }
      }, 5000);

      return () => clearInterval(interval);
    } 
    
    // Guest synchronizes with Firestore state
    else {
      if (localUpdateRef.current) {
        localUpdateRef.current = false;
        return;
      }

      // Calculate latency correction
      const lastUpdate = new Date(room.lastUpdated).getTime();
      const now = Date.now();
      const diffSeconds = (now - lastUpdate) / 1000;
      
      const targetTime = room.isPlaying 
        ? room.currentTime + Math.min(diffSeconds, 5) // cap offset correction at 5s to prevent massive errors
        : room.currentTime;

      if (isYoutube) {
        // Post message to YouTube Iframe
        if (youtubeRef.current && youtubeRef.current.contentWindow) {
          const ytWindow = youtubeRef.current.contentWindow;
          // Play/Pause sync
          const playCommand = room.isPlaying ? 'playVideo' : 'pauseVideo';
          ytWindow.postMessage(`{"event":"command","func":"${playCommand}","args":""}`, '*');
          
          // Time sync (only seek if difference > 3s)
          ytWindow.postMessage(`{"event":"command","func":"seekTo","args":[${targetTime}, true]}`, '*');
        }
      } else {
        // HTML5 Video
        const player = videoRef.current;
        if (player) {
          // Play/Pause sync
          if (room.isPlaying && player.paused) {
            player.play().catch(() => {});
          } else if (!room.isPlaying && !player.paused) {
            player.pause();
          }

          // Time sync (seek if off by > 3s)
          if (Math.abs(player.currentTime - targetTime) > 3) {
            player.currentTime = targetTime;
          }
        }
      }
    }
  }, [room?.isPlaying, room?.currentTime, room?.lastUpdated, isHost, isJoined, roomCode]);

  // Host Player Event Handlers
  const handleHostPlay = () => {
    if (!isHost || !roomCode) return;
    let time = 0;
    if (videoRef.current) time = videoRef.current.currentTime;
    
    localUpdateRef.current = true;
    updateDoc(doc(db, 'rooms', roomCode), {
      isPlaying: true,
      currentTime: time,
      lastUpdated: new Date().toISOString()
    }).catch(console.error);
  };

  const handleHostPause = () => {
    if (!isHost || !roomCode) return;
    let time = 0;
    if (videoRef.current) time = videoRef.current.currentTime;

    localUpdateRef.current = true;
    updateDoc(doc(db, 'rooms', roomCode), {
      isPlaying: false,
      currentTime: time,
      lastUpdated: new Date().toISOString()
    }).catch(console.error);
  };

  const handleHostSeek = () => {
    if (!isHost || !roomCode) return;
    let time = 0;
    if (videoRef.current) time = videoRef.current.currentTime;

    localUpdateRef.current = true;
    updateDoc(doc(db, 'rooms', roomCode), {
      currentTime: time,
      lastUpdated: new Date().toISOString()
    }).catch(console.error);
  };

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

  const isYoutube = room ? room.videoUrl.includes('youtube.com') || room.videoUrl.includes('youtu.be') : false;
  const youtubeId = room ? getYoutubeId(room.videoUrl) : '';

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

              {/* Player Area */}
              <div className="flex-1 bg-black rounded-2xl overflow-hidden border border-border-color shadow-soft relative mt-4 min-h-[300px] flex items-center justify-center">
                {isYoutube ? (
                  // YouTube Video Player
                  <iframe 
                    ref={youtubeRef}
                    src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&autoplay=0&mute=${isMuted ? 1 : 0}&rel=0&controls=${isHost ? 1 : 0}`}
                    className="w-full h-full border-none absolute inset-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  // HTML5 Direct Video Player
                  <video 
                    ref={videoRef}
                    src={room?.videoUrl}
                    className="w-full h-full object-contain absolute inset-0"
                    controls={isHost}
                    onPlay={isHost ? handleHostPlay : undefined}
                    onPause={isHost ? handleHostPause : undefined}
                    onSeeked={isHost ? handleHostSeek : undefined}
                  />
                )}

                {/* Cover overlay for Guests to restrict control */}
                {!isHost && (
                  <div 
                    className="absolute inset-0 bg-transparent cursor-not-allowed" 
                    title="Управление плеером доступно только создателю комнаты" 
                  />
                )}
              </div>

              {/* Host Controller Tools (Custom play/pause indicator if YouTube is used) */}
              {isHost && isYoutube && (
                <div className="mt-3 bg-bg-app border border-border-color rounded-2xl p-3 flex items-center justify-between shrink-0 shadow-soft">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const nextState = !room?.isPlaying;
                        updateDoc(doc(db, 'rooms', roomCode), {
                          isPlaying: nextState,
                          lastUpdated: new Date().toISOString()
                        }).catch(console.error);
                      }}
                      className="px-4 py-2 bg-accent-color hover:bg-accent-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-soft cursor-pointer transition-all"
                    >
                      {room?.isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Пауза</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Старт</span>
                        </>
                      )}
                    </button>

                    <button 
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-2 bg-bg-card hover:bg-bg-app border border-border-color text-text-secondary hover:text-text-primary rounded-xl cursor-pointer transition-all flex items-center justify-center shadow-soft"
                      title={isMuted ? "Включить звук" : "Выключить звук"}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Синхронизация YouTube</span>
                    <button 
                      onClick={() => {
                        // Trigger seek synchronization to current time (e.g. restart sync)
                        updateDoc(doc(db, 'rooms', roomCode), {
                          lastUpdated: new Date().toISOString()
                        }).catch(console.error);
                      }}
                      className="px-3 py-1.5 bg-bg-card hover:bg-bg-app border border-border-color text-text-secondary hover:text-text-primary rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                    >
                      Обновить синхронизацию
                    </button>
                  </div>
                </div>
              )}

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

              {/* Live Chat Box Header */}
              <div className="px-4 py-2 border-b border-border-color bg-bg-app/50 flex items-center gap-1.5 shrink-0">
                <MessageSquare className="w-4 h-4 text-accent-color" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">Общий чат комнаты</span>
              </div>

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
