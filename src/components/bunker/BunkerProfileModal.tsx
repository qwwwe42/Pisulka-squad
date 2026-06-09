import React, { useState } from 'react';
import { X, Crown, User } from 'lucide-react';
import type { BunkerRole, BunkerUserProfile } from '../../types/bunker';

interface Props {
  profile: BunkerUserProfile | null;
  onClose: () => void;
  onSave: (nickname: string, role: BunkerRole) => void;
}

export const BunkerProfileModal: React.FC<Props> = ({ profile, onClose, onSave }) => {
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [role, setRole] = useState<BunkerRole>(profile?.role || 'guest');

  const handleSave = () => {
    if (!nickname.trim()) return;
    onSave(nickname.trim(), role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out] p-4">
      <div className="w-full max-w-md bg-bg-card border border-border-color rounded-3xl p-6 shadow-soft space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-text-primary tracking-tight">Профиль Игрока</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-app transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-mono block">Никнейм</label>
            <input 
              type="text" 
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="w-full bg-bg-app border border-border-color rounded-xl px-3 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-color/50"
              placeholder="Ваш ник..."
              maxLength={20}
            />
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-mono block flex items-center justify-between">
              <span>Монетизация (Mock)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRole('guest')}
                className={`p-3 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                  role === 'guest' ? 'border-accent-color bg-accent-light text-accent-color shadow-soft' : 'border-border-color bg-bg-app text-text-secondary hover:border-accent-color/30'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="text-xs font-bold">Гость</span>
              </button>
              
              <button
                onClick={() => setRole('mvp')}
                className={`p-3 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                  role === 'mvp' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500 shadow-soft' : 'border-border-color bg-bg-app text-text-secondary hover:border-yellow-500/30'
                }`}
              >
                <Crown className="w-4 h-4" />
                <div className="text-left">
                  <div className="text-xs font-bold">MVP</div>
                  <div className="text-[8px] leading-tight opacity-80 mt-0.5">Доступ к доп. пакам</div>
                </div>
              </button>
            </div>
            <p className="text-[9px] text-text-muted leading-tight mt-2">
              *В реальном приложении здесь будет подключен платежный шлюз. MVP статус позволяет создателю комнаты использовать расширенные паки катастроф и персонажей.
            </p>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={!nickname.trim()}
          className="w-full py-3 bg-accent-color hover:bg-accent-hover text-white rounded-xl font-bold text-sm transition-all shadow-soft active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Сохранить
        </button>
      </div>
    </div>
  );
};
