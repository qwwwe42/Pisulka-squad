import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, arrayUnion, deleteDoc } from 'firebase/firestore';
import type { BunkerRoom, BunkerUserProfile, PlayerTraits, BunkerRole, BunkerMessage } from '../types/bunker';
import { generatePlayerTraits, generateGameInfo } from '../utils/bunkerGeneration';
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
      snapshot.forEach(doc => {
        rooms.push(doc.data() as BunkerRoom);
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
      createdAt: Date.now()
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
        })
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
    
    const traits: Record<string, PlayerTraits> = {};
    const revealedTraits: Record<string, Record<keyof PlayerTraits, boolean>> = {};
    
    activeRoom.players.forEach(p => {
      traits[p.id] = generatePlayerTraits(activeRoom.settings.enabledPacks);
      revealedTraits[p.id] = {
        profession: false,
        biology: false,
        health: false,
        hobby: false,
        phobia: false,
        inventory: false,
        character: false,
        fact: false,
        specialAction: false
      };
    });

    const info = generateGameInfo(activeRoom.settings.capacity, activeRoom.settings.enabledPacks);

    await updateDoc(doc(db, 'bunker_rooms', activeRoom.id), {
      status: 'playing',
      traits,
      revealedTraits,
      cataclysm: info.cataclysm,
      bunkerInfo: info.bunkerInfo,
      'gameState.round': 1,
      'gameState.phase': 'reveal',
      logs: arrayUnion('Игра началась! Изучите свои карты.')
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
    if (!activeRoom) return;
    const path = `revealedTraits.${currentUserId}.${traitKey}`;
    
    const val = activeRoom.traits[currentUserId]?.[traitKey];
    let logMsg = '';
    if (traitKey === 'specialAction') {
      logMsg = `${profile?.nickname} вскрыл спец-возможность: ${(val as any)?.text}`;
    } else if (traitKey === 'inventory') {
      logMsg = `${profile?.nickname} вскрыл инвентарь: ${(val as string[])[0]}`;
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

  const leaveRoom = async () => {
    if (!activeRoom || !profile) {
      setActiveRoom(null);
      return;
    }
    
    const roomId = activeRoom.id;
    setActiveRoom(null); // Сразу очищаем локальный стейт, чтобы UI переключился

    try {
      const roomRef = doc(db, 'bunker_rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const currentData = roomSnap.data() as BunkerRoom;
        const newPlayers = currentData.players.filter(p => p.id !== currentUserId);
        
        if (newPlayers.length === 0) {
          await deleteDoc(roomRef);
        } else {
          const updates: any = { players: newPlayers };
          if (currentData.hostId === currentUserId) {
            updates.hostId = newPlayers[0].id;
            updates.logs = arrayUnion(`Ведущий покинул игру. Новым ведущим становится ${newPlayers[0].nickname}.`);
          } else {
            updates.logs = arrayUnion(`Игрок ${profile.nickname} покинул игру.`);
          }
          await updateDoc(roomRef, updates);
        }
      }
    } catch (e) {
      console.error('Ошибка при выходе из комнаты:', e);
    }
  };

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
