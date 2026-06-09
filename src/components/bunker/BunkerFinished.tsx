import React from 'react';
import type { BunkerRoom } from '../../types/bunker';
import { ShieldCheck, ArrowLeft, Skull } from 'lucide-react';

interface Props {
  room: BunkerRoom;
  onLeave: () => void;
}

export const BunkerFinished: React.FC<Props> = ({ room, onLeave }) => {
  const alivePlayers = room.players.filter(p => p.isAlive);
  const deadPlayers = room.players.filter(p => !p.isAlive);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div className="bg-bg-card border border-border-color p-8 rounded-3xl shadow-soft text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-accent-light/50 border border-accent-color/30 rounded-full flex items-center justify-center text-accent-color">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">Игра завершена</h2>
        <p className="text-sm text-text-secondary">
          Двери бункера закрылись. Те, кто оказался внутри, имеют шанс возродить цивилизацию.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-bg-card border border-accent-color/30 rounded-3xl p-6 shadow-soft">
          <h3 className="text-sm font-bold text-accent-color uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Выжившие
          </h3>
          <div className="space-y-2">
            {alivePlayers.map(p => (
              <div key={p.id} className="p-3 bg-accent-light border border-accent-color/20 rounded-xl text-xs font-bold text-text-primary">
                {p.nickname}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-bg-card border border-rose-500/30 rounded-3xl p-6 shadow-soft">
          <h3 className="text-sm font-bold text-rose-500 uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
            <Skull className="w-4 h-4" /> Изгнанные
          </h3>
          <div className="space-y-2">
            {deadPlayers.length > 0 ? deadPlayers.map(p => (
              <div key={p.id} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-bold text-rose-500 opacity-80">
                {p.nickname}
              </div>
            )) : <div className="text-xs text-text-muted">Никого не выгнали.</div>}
          </div>
        </div>
      </div>

      <button onClick={onLeave} className="w-full flex items-center justify-center gap-2 py-4 bg-bg-app border border-border-color hover:border-accent-color/50 text-text-primary rounded-2xl font-bold transition-colors cursor-pointer shadow-sm">
        <ArrowLeft className="w-5 h-5" /> Вернуться в лобби
      </button>
    </div>
  );
};
