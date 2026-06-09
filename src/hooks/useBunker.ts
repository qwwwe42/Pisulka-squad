import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, arrayUnion, deleteDoc, getDocs } from 'firebase/firestore';
import type { BunkerRoom, BunkerUserProfile, PlayerTraits, BunkerRole, BunkerMessage } from '../types/bunker';
import { generatePlayerTraits, generateGameInfo } from '../utils/bunkerGeneration';
import { defaultBunkerPools } from '../utils/bunkerDefaultPools';
import { getOrCreateUserId } from '../context/StreamingContext'; 

const generateRoomCode = () => Math.floor(10000 + Math.random() * 90000).toString();

export const useBunker = () => {
  const currentUserId = getOrCreateUserId();
  const [activeRoom, setActiveRoom] = useState<BunkerRoom | null>(null);
  const [roomsList, setRoomsList] = useState<BunkerRoom[]>([]);
  const [profile, setProfile] = useState<BunkerUserProfile | null>(null);
  
  useEffect(() => {
    const savedProfile = localStorage.getItem(`bunker_profile_${currentUserId}`);
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    } else {
      const newProfile: BunkerUserProfile = {
        id: currentUserId,
        nickname: `Guest_${Math.floor(Math.random() * 10000)}`,
        role: 'guest',
        isRegistered: false
      };
      localStorage.setItem(`bunker_profile_${currentUserId}`, JSON.stringify(newProfile));
      setProfile(newProfile);
    }
  }, [currentUserId]);

  const updateProfile = (nickname: string, role: BunkerRole) => {
    const p: BunkerUserProfile = { id: currentUserId, nickname, role, isRegistered: role !== 'guest' };
    localStorage.setItem(`bunker_profile_${currentUserId}`, JSON.stringify(p));
    setProfile(p);
  };

  useEffect(() => {
    const q = query(collection(db, 'bunker_rooms'), where('status', '==', 'lobby'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rooms: BunkerRoom[] = [];
      const now = Date.now();
      const TWELVE_HOURS = 12 * 60 * 60 * 1000;

      snapshot.forEach(docSnap => {
        const roomData = docSnap.data() as BunkerRoom;
        
        if (now - roomData.createdAt > TWELVE_HOURS) {
          deleteDoc(doc(db, 'bunker_rooms', roomData.id)).catch(() => {});
          return;
        }
        
        if (!roomData.players || roomData.players.length === 0) {
          deleteDoc(doc(db, 'bunker_rooms', roomData.id)).catch(() => {});
          return;
        }

        // Hide room from lobby if host heartbeat is expired (longer than 50 seconds)
        const hostHb = roomData.heartbeats?.[roomData.hostId];
        const isHostActive = hostHb && (now - hostHb < 50000);
        if (roomData.hostId && !isHostActive) {
          return;
        }

        rooms.push(roomData);
      });
      setRoomsList(rooms);
    });
    return () => unsubscribe();
  }, []);

  const createRoom = async (capacity: number, enabledPacks: string[]) => {
    if (!profile) return;
    const roomId = generateRoomCode();
    const roomRef = doc(db, 'bunker_rooms', roomId);
    
    const newRoom: BunkerRoom = {
      id: roomId,
      hostId: currentUserId,
      status: 'lobby',
      settings: { capacity, enabledPacks },
      players: [{
        id: currentUserId,
        nickname: profile.nickname,
        role: profile.role,
        isAlive: true,
        hasVoted: false
      }],
      cataclysm: null,
      bunkerInfo: null,
      traits: {},
      revealedTraits: {},
      gameState: {
        round: 0,
        phase: 'reveal',
        votes: {},
        discussionTimerEndsAt: null
      },
      chat: [],
      logs: [`Комната создана ведущим ${profile.nickname}`],
      createdAt: Date.now(),
      heartbeats: {
        [currentUserId]: Date.now()
      },
      lastActivityAt: Date.now()
    };

    await setDoc(roomRef, newRoom);
    subscribeToRoom(roomId);
    return roomId;
  };

  const joinRoom = async (roomId: string) => {
    if (!profile) return;
    const roomRef = doc(db, 'bunker_rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) throw new Error('Комната не найдена');
    
    const roomData = roomSnap.data() as BunkerRoom;
    if (roomData.status !== 'lobby') throw new Error('Игра уже началась');
    
    const isAlreadyPlayer = roomData.players.some(p => p.id === currentUserId);
    if (!isAlreadyPlayer) {
      if (roomData.players.length >= 16) throw new Error('Комната заполнена (макс 16)');
      
      await updateDoc(roomRef, {
        players: arrayUnion({
          id: currentUserId,
          nickname: profile.nickname,
          role: profile.role,
          isAlive: true,
          hasVoted: false
        }),
        [`heartbeats.${currentUserId}`]: Date.now(),
        lastActivityAt: Date.now()
      });
    }
    subscribeToRoom(roomId);
  };

  const subscribeToRoom = (roomId: string) => {
    const unsubscribe = onSnapshot(doc(db, 'bunker_rooms', roomId), (doc) => {
      if (doc.exists()) {
        setActiveRoom(doc.data() as BunkerRoom);
      } else {
        setActiveRoom(null);
      }
    });
    return unsubscribe; // Return so component can clean up
  };

  const startGame = async () => {
    if (!activeRoom || activeRoom.hostId !== currentUserId) return;
    
    let pools = defaultBunkerPools;
    try {
      const poolsSnap = await getDoc(doc(db, 'bunker_pools', 'base'));
      if (poolsSnap.exists()) {
        pools = poolsSnap.data() as any;
      } else {
        // Seed default pools if it doesn't exist
        await setDoc(doc(db, 'bunker_pools', 'base'), defaultBunkerPools);
      }
    } catch (e) {
      console.warn('Failed to load custom bunker pools, using defaults');
    }

    const traits: Record<string, PlayerTraits> = {};
    const revealedTraits: Record<string, Record<keyof PlayerTraits, boolean>> = {};
    
    activeRoom.players.forEach(p => {
      traits[p.id] = generatePlayerTraits(pools);
      revealedTraits[p.id] = {
        gender: false,
        physique: false,
        humanTrait: false,
        profession: false,
        health: false,
        hobby: false,
        phobia: false,
        largeInventory: false,
        backpack: false,
        additionalInfo: false,
        specialAction1: false,
        specialAction2: false
      };
    });

    const gameInfo = generateGameInfo();

    await updateDoc(doc(db, 'bunker_rooms', activeRoom.id), {
      status: 'playing',
      traits,
      revealedTraits,
      cataclysm: gameInfo.cataclysm,
      bunkerInfo: gameInfo.bunkerInfo,
      'gameState.round': 1,
      'gameState.phase': 'reveal',
      logs: arrayUnion(`Игра началась! Раунд 1: Открытие профессий и фактов.`)
    });
  };

  const nextPhase = async (phase: 'reveal' | 'discussion' | 'voting') => {
    if (!activeRoom || activeRoom.hostId !== currentUserId) return;
    const updates: any = {
      'gameState.phase': phase
    };
    if (phase === 'discussion') {
      updates['gameState.discussionTimerEndsAt'] = Date.now() + 2 * 60 * 1000;
      updates.logs = arrayUnion('Началось обсуждение. У вас есть 2 минуты.');
    } else if (phase === 'voting') {
      updates.logs = arrayUnion('Время голосования! Выберите, кого исключить из бункера.');
    }
    await updateDoc(doc(db, 'bunker_rooms', activeRoom.id), updates);
  };

  const processVoting = async () => {
    if (!activeRoom || activeRoom.hostId !== currentUserId) return;
    
    const votes = activeRoom.gameState.votes;
    const voteCounts: Record<string, number> = {};
    Object.values(votes).forEach(targetId => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    let maxVotes = 0;
    let candidates: string[] = [];
    Object.entries(voteCounts).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        candidates = [id];
      } else if (count === maxVotes) {
        candidates.push(id);
      }
    });

    if (candidates.length === 1) {
      const loserId = candidates[0];
      const newPlayers = activeRoom.players.map(p => 
        p.id === loserId ? { ...p, isAlive: false } : { ...p, hasVoted: false }
      );
      
      const aliveCount = newPlayers.filter(p => p.isAlive).length;
      const isFinished = aliveCount <= activeRoom.settings.capacity;

      await updateDoc(doc(db, 'bunker_rooms', activeRoom.id), {
        players: newPlayers,
        'gameState.votes': {},
        'gameState.phase': 'reveal',
        'gameState.round': activeRoom.gameState.round + 1,
        status: isFinished ? 'finished' : 'playing',
        logs: arrayUnion(
          `Голосование завершено. Выбывает ${activeRoom.players.find(p => p.id === loserId)?.nickname}.`,
          isFinished ? 'Игра окончена! Оставшиеся спасены.' : `Начинается Раунд ${activeRoom.gameState.round + 1}.`
        )
      });
    } else {
      await updateDoc(doc(db, 'bunker_rooms', activeRoom.id), {
        'gameState.votes': {},
        logs: arrayUnion('Голосование завершилось вничью. Голосуйте еще раз!')
      });
    }
  };

  const revealTrait = async (traitKey: keyof PlayerTraits) => {
    if (!profile || !activeRoom) return;

    const path = `revealedTraits.${currentUserId}.${traitKey}`;
    const val = activeRoom.traits[currentUserId]?.[traitKey];
    let logMsg = '';
    
    if (traitKey === 'specialAction1' || traitKey === 'specialAction2') {
      logMsg = `${profile?.nickname} вскрыл спец-возможность: ${(val as any)?.text}`;
    } else {
      logMsg = `${profile?.nickname} вскрыл карту [${traitKey}]: ${val}`;
    }

    await updateDoc(doc(db, 'bunker_rooms', activeRoom.id), {
      [path]: true,
      logs: arrayUnion(logMsg)
    });
  };

  const submitVote = async (targetUserId: string) => {
    if (!activeRoom) return;
    const path = `gameState.votes.${currentUserId}`;
    
    const newPlayers = activeRoom.players.map(p => 
      p.id === currentUserId ? { ...p, hasVoted: true } : p
    );

    await updateDoc(doc(db, 'bunker_rooms', activeRoom.id), {
      [path]: targetUserId,
      players: newPlayers
    });
  };

  const sendMessage = async (text: string) => {
    if (!activeRoom || !profile) return;
    const msg: BunkerMessage = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: currentUserId,
      senderName: profile.nickname,
      text,
      sentAt: Date.now()
    };
    await updateDoc(doc(db, 'bunker_rooms', activeRoom.id), {
      chat: arrayUnion(msg)
    });
  };

  const leaveRoom = async (roomDataToLeave?: BunkerRoom) => {
    const dataToUse = roomDataToLeave || activeRoom;
    if (!dataToUse || !profile) {
      setActiveRoom(null);
      return;
    }
    
    const roomId = dataToUse.id;
    const currentData = dataToUse;
    setActiveRoom(null); // Сразу очищаем локальный стейт, чтобы UI переключился

    try {
      const roomRef = doc(db, 'bunker_rooms', roomId);
      const newPlayers = currentData.players.filter(p => p.id !== currentUserId);
      
      if (newPlayers.length === 0 || currentData.hostId === currentUserId) {
        // Не ждем ответа (чтобы успело отработать в beforeunload)
        deleteDoc(roomRef).catch(() => {});
      } else {
        const updates: any = { 
          players: newPlayers,
          [`heartbeats.${currentUserId}`]: null
        };
        updates.logs = arrayUnion(`Игрок ${profile.nickname} покинул игру.`);
        updateDoc(roomRef, updates).catch(() => {});
      }
    } catch (e) {
      console.error('Ошибка при выходе из комнаты:', e);
    }
  };

  // 1. Loop to update current user's heartbeat in the active room
  useEffect(() => {
    if (!activeRoom) return;

    const sendHeartbeat = async () => {
      try {
        const roomRef = doc(db, 'bunker_rooms', activeRoom.id);
        await updateDoc(roomRef, {
          [`heartbeats.${currentUserId}`]: Date.now(),
          lastActivityAt: Date.now()
        });
      } catch (e) {
        console.warn('Failed to update player heartbeat:', e);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 20000); // every 20 seconds
    return () => clearInterval(interval);
  }, [activeRoom?.id, currentUserId]);

  // 2. Room membership check: remove expired players (longer than 50 seconds)
  useEffect(() => {
    if (!activeRoom) return;

    const now = Date.now();
    const activePlayers = activeRoom.players.filter(p => {
      const hb = activeRoom.heartbeats?.[p.id];
      return hb && (now - hb < 50000);
    });

    // We only clean up if we are the first active player in the players list,
    // which prevents write collisions.
    const isFirstActive = activePlayers[0]?.id === currentUserId;
    if (!isFirstActive) return;

    const expiredPlayers = activeRoom.players.filter(p => {
      const hb = activeRoom.heartbeats?.[p.id];
      return !hb || (now - hb >= 50000);
    });

    if (expiredPlayers.length === 0) return;

    const cleanup = async () => {
      try {
        const roomRef = doc(db, 'bunker_rooms', activeRoom.id);
        const remainingPlayers = activeRoom.players.filter(p => !expiredPlayers.some(ep => ep.id === p.id));

        if (remainingPlayers.length === 0) {
          await deleteDoc(roomRef);
          setActiveRoom(null);
        } else {
          // If the host is timed out, delete the room immediately
          const isHostExpired = expiredPlayers.some(ep => ep.id === activeRoom.hostId);
          if (isHostExpired) {
            await deleteDoc(roomRef);
            setActiveRoom(null);
            return;
          }

          const updates: Record<string, any> = {
            players: remainingPlayers
          };
          expiredPlayers.forEach(ep => {
            updates[`heartbeats.${ep.id}`] = null;
          });
          updates.logs = arrayUnion(
            ...expiredPlayers.map(ep => `Игрок ${ep.nickname} отключился по таймауту.`)
          );

          await updateDoc(roomRef, updates);
        }
      } catch (e) {
        console.error('Error cleaning up expired players:', e);
      }
    };

    const timer = setTimeout(cleanup, 2000);
    return () => clearTimeout(timer);
  }, [activeRoom, currentUserId]);

  // 3. Background cleaner for dead/abandoned rooms (runs on every client in lobby/game)
  useEffect(() => {
    const runCleaner = async () => {
      try {
        const roomsSnap = await getDocs(collection(db, 'bunker_rooms'));
        const now = Date.now();
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
        const HEARTBEAT_TIMEOUT = 60000; // 1 minute

        roomsSnap.forEach(async (docSnap) => {
          const room = docSnap.data() as BunkerRoom;
          let shouldDelete = false;

          if (now - room.createdAt > TWELVE_HOURS) {
            shouldDelete = true;
          } else if (!room.players || room.players.length === 0) {
            shouldDelete = true;
          } else {
            const hostHb = room.heartbeats?.[room.hostId];
            if (!hostHb || (now - hostHb > HEARTBEAT_TIMEOUT)) {
              shouldDelete = true;
            }
          }

          if (shouldDelete) {
            await deleteDoc(doc(db, 'bunker_rooms', room.id)).catch(() => {});
          }
        });
      } catch (e) {
        console.warn('Background cleaner run failed:', e);
      }
    };

    runCleaner();
    const interval = setInterval(runCleaner, 60000); // run every 1 minute
    return () => clearInterval(interval);
  }, []);

  return {
    currentUserId,
    profile,
    updateProfile,
    activeRoom,
    roomsList,
    createRoom,
    joinRoom,
    subscribeToRoom,
    leaveRoom,
    startGame,
    nextPhase,
    processVoting,
    revealTrait,
    submitVote,
    sendMessage
  };
};
