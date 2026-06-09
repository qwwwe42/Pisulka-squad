import React, { useState } from 'react';
import { Users, Plus, Key, Crown } from 'lucide-react';
import type { BunkerRoom, BunkerUserProfile } from '../../types/bunker';

interface Props {
  profile: BunkerUserProfile | null;
  roomsList: BunkerRoom[];
  onCreateRoom: () => Promise<any> | void;
  onJoinRoom: (id: string) => Promise<any> | void;
  onOpenProfile: () => void;
}

export const BunkerLobby: React.FC<Props> = ({ profile, roomsList, onCreateRoom, onJoinRoom, onOpenProfile }) => {
  const [joinCode, setJoinCode] = useState('');

  const handleJoin = async (id: string) => {
    try {
      await onJoinRoom(id);
    } catch (err: any) {
      alert(err.message || 'Ошибка при входе в комнату');
    }
  };

  const handleCreate = async () => {
    try {
      await onCreateRoom();
    } catch (err: any) {
      alert(err.message || 'Ошибка при создании комнаты');
    }
  };

  const activeRooms = roomsList.filter(room => room.players.length > 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[#1a1a1a]/70 backdrop-blur-md rounded-[2rem] shadow-2xl border border-white/5 space-y-6 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-bg-card border border-border-color p-6 rounded-3xl shadow-soft">
        <div>
          <h2 className="text-xl font-extrabold text-text-primary tracking-tight">Игра «Бункер»</h2>
          <p className="text-xs text-text-secondary mt-1 max-w-md">
            Дискуссионная игра на выживание. Докажите, что именно вы достойны места в бункере после глобальной катастрофы.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
          <button onClick={onOpenProfile} className="flex items-center gap-2 px-4 py-2 bg-bg-app border border-border-color rounded-xl hover:border-accent-color/50 transition-colors text-xs font-bold w-full sm:w-auto justify-center cursor-pointer shadow-sm">
            {profile?.role === 'guest' ? <Users className="w-4 h-4 text-text-muted" /> : <Crown className="w-4 h-4 text-yellow-500" />}
            <span className="text-text-primary">{profile?.nickname || 'Гость'}</span>
            <span className="text-[9px] uppercase font-mono text-text-muted border border-border-color bg-bg-card px-1.5 py-0.5 rounded-md ml-1">{profile?.role}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">Открытые комнаты</h3>
          {activeRooms.length === 0 ? (
            <div className="bg-bg-app border border-border-color rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-3">
              <Users className="w-10 h-10 text-text-muted" />
              <p className="text-xs text-text-secondary">Нет открытых комнат. Создайте свою!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeRooms.map(room => (
                <div key={room.id} className="bg-bg-card border border-border-color rounded-2xl p-4 shadow-soft flex justify-between items-center hover:border-accent-color/30 transition-colors">
                  <div>
                    <div className="text-xs font-bold text-text-primary font-mono">Комната {room.id}</div>
                    <div className="text-[10px] text-text-secondary mt-1">Ведущий: <span className="text-accent-color">{room.players.find(p => p.id === room.hostId)?.nickname}</span></div>
                    <div className="text-[10px] text-text-secondary mt-0.5">Игроки: {room.players.length} / 16</div>
                  </div>
                  <button onClick={() => handleJoin(room.id)} className="px-3 py-1.5 bg-accent-light text-accent-color text-[10px] font-bold rounded-lg hover:bg-accent-color hover:text-white transition-colors cursor-pointer">
                    Войти
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">Действия</h3>
          
          <button onClick={handleCreate} className="w-full flex items-center justify-center gap-2 bg-accent-color hover:bg-accent-hover text-white p-4 rounded-2xl shadow-soft font-bold transition-all active:scale-95 cursor-pointer">
            <Plus className="w-5 h-5" />
            Создать комнату
          </button>

          <div className="bg-bg-card border border-border-color rounded-2xl p-4 shadow-soft space-y-3">
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-mono">Войти по коду</h4>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Код из 5 цифр"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                className="w-full bg-bg-app border border-border-color rounded-xl px-3 text-xs text-text-primary focus:outline-none focus:border-accent-color/50"
              />
              <button 
                disabled={joinCode.length < 5}
                onClick={() => handleJoin(joinCode)}
                className="p-2.5 bg-bg-app border border-border-color rounded-xl hover:bg-accent-light hover:text-accent-color hover:border-accent-color/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Key className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
