import React, { useState } from 'react';
import type { BunkerRoom, BunkerUserProfile } from '../../types/bunker';
import { Users, Play, Crown, Copy, Check, LogOut, User } from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface Props {
  room: BunkerRoom;
  profile: BunkerUserProfile | null;
  currentUserId: string;
  onLeave: () => void;
  onStartGame: () => void;
}

export const BunkerRoomLobby: React.FC<Props> = ({ room, currentUserId, onLeave, onStartGame }) => {
  const isHost = room.hostId === currentUserId;
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  const updateCapacity = async (capacity: number) => {
    if (!isHost) return;
    await updateDoc(doc(db, 'bunker_rooms', room.id), {
      'settings.capacity': capacity
    });
  };

  return (
    <div className="page-section p-4 sm:p-6 md:p-8 bg-bg-sidebar border border-border-sidebar backdrop-blur-md rounded-[2rem] shadow-2xl space-y-6">
      <div className="bg-bg-card border border-border-color p-6 rounded-3xl shadow-soft flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-extrabold text-text-primary tracking-tight">Комната ожидания</h2>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-accent-light border border-accent-color/20 rounded-lg cursor-pointer hover:bg-accent-color hover:text-white transition-colors text-accent-color" onClick={handleCopyCode}>
              <span className="text-sm font-bold font-mono tracking-widest">{room.id}</span>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </div>
          </div>
          <p className="text-xs text-text-secondary">
            Соберитесь с силами. Как только ведущий начнет игру, пути назад не будет.
          </p>
        </div>
        
        <button onClick={onLeave} className="px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer">
          <LogOut className="w-4 h-4" /> Выйти
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
              <Users className="w-4 h-4" /> Игроки ({room.players.length} / 16)
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {room.players.map(p => (
              <div key={p.id} className={`p-3 rounded-xl border flex items-center gap-3 ${p.id === currentUserId ? 'bg-accent-light border-accent-color/50 shadow-sm' : 'bg-bg-card border-border-color'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${p.id === room.hostId ? 'bg-yellow-500/20 text-yellow-500' : 'bg-bg-app text-text-secondary'}`}>
                  {p.id === room.hostId ? <Crown className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-text-primary truncate">{p.nickname} {p.id === currentUserId && '(Вы)'}</div>
                  <div className="text-[9px] uppercase font-mono text-text-muted mt-0.5">{p.role}</div>
                </div>
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - room.players.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="p-3 rounded-xl border border-dashed border-border-color/50 flex items-center gap-3 bg-bg-app/30">
                <div className="w-8 h-8 rounded-full bg-bg-card border border-border-color flex items-center justify-center shrink-0 text-border-color">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-text-muted/50">Ожидание...</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
            Настройки
          </h3>
          
          <div className="bg-bg-card border border-border-color rounded-2xl p-4 shadow-soft space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-mono block">Мест в бункере</label>
              <select 
                value={room.settings.capacity} 
                onChange={e => updateCapacity(Number(e.target.value))}
                disabled={!isHost}
                className="w-full bg-bg-app border border-border-color rounded-xl px-3 py-2 text-xs text-text-primary disabled:opacity-50 cursor-pointer"
              >
                {[1,2,3,4,5,6,7,8].map(n => (
                  <option key={n} value={n}>{n} мест</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-mono block">Набор характеристик</label>
              <div className="space-y-2">
                <div className="p-3 rounded-xl border bg-accent-light border-accent-color shadow-soft transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      Базовый набор
                    </div>
                  </div>
                  <div className="text-[10px] text-text-secondary leading-snug">Все профессии и болезни из базы.</div>
                </div>
              </div>
            </div>
          </div>

          {isHost ? (
            <button 
              onClick={onStartGame} 
              disabled={room.players.length < 1}
              className="w-full flex items-center justify-center gap-2 bg-accent-color hover:bg-accent-hover text-white p-4 rounded-2xl shadow-soft font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              {room.players.length < 1 ? 'Ожидание...' : 'Начать игру'}
            </button>
          ) : (
            <div className="w-full p-4 rounded-2xl bg-bg-app border border-border-color text-center text-text-secondary text-xs font-bold shadow-inner">
              Ожидание ведущего...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
