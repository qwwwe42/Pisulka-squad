import React, { useState } from 'react';
import { Server, Users, Copy, Check, Gamepad2, Compass, BookOpen, ShieldAlert, Edit3, X, Plus, Trash2, Settings } from 'lucide-react';
import { useStreaming } from '../context/StreamingContext';
import type { MinecraftRule, MinecraftStep, MinecraftPlayer } from '../types/streaming';

const DEFAULT_PLAYERS: MinecraftPlayer[] = [
  { name: 'screp', role: 'Админ', online: true },
  { name: 'antigravity', role: 'Игрок', online: true },
  { name: 'Steve', role: 'Игрок', online: true },
  { name: 'Alex', role: 'Игрок', online: true },
  { name: 'Notch', role: 'Легенда', online: true },
  { name: 'miner_49er', role: 'Игрок', online: true }
];

export const MinecraftView: React.FC = () => {
  const { minecraftConfig, updateMinecraftConfig } = useStreaming();
  const [copied, setCopied] = useState(false);
  const [isAdmin] = useState(() => sessionStorage.getItem('penis_ink_admin') === 'true');
  const [isEditingMode, setIsEditingMode] = useState(false);

  // Local Form States
  const [editServerIp, setEditServerIp] = useState(() => minecraftConfig?.serverIp || '');
  const [editVersion, setEditVersion] = useState(() => minecraftConfig?.version || '');
  const [editDescription, setEditDescription] = useState(() => minecraftConfig?.description || '');
  const [editRules, setEditRules] = useState<MinecraftRule[]>(() => minecraftConfig?.rules || []);
  const [editSteps, setEditSteps] = useState<MinecraftStep[]>(() => minecraftConfig?.steps || []);
  const [editPlayers, setEditPlayers] = useState<MinecraftPlayer[]>(() => minecraftConfig?.players || DEFAULT_PLAYERS);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const serverIp = minecraftConfig.serverIp;

  // Sync state when config changes
  const currentSyncKey = `${isEditingMode}-${minecraftConfig?.serverIp || ''}-${minecraftConfig?.version || ''}-${minecraftConfig?.description || ''}-${minecraftConfig?.rules?.length || 0}-${minecraftConfig?.steps?.length || 0}-${minecraftConfig?.players?.length || 0}`;
  const [prevSyncKey, setPrevSyncKey] = useState(currentSyncKey);
  if (currentSyncKey !== prevSyncKey) {
    setPrevSyncKey(currentSyncKey);
    if (minecraftConfig) {
      setEditServerIp(minecraftConfig.serverIp || '');
      setEditVersion(minecraftConfig.version || '');
      setEditDescription(minecraftConfig.description || '');
      setEditRules(minecraftConfig.rules || []);
      setEditSteps(minecraftConfig.steps || []);
      setEditPlayers(minecraftConfig.players || DEFAULT_PLAYERS);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(serverIp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!editServerIp.trim() || !editVersion.trim() || !editDescription.trim()) {
      alert('Пожалуйста, заполните IP, версию и описание.');
      return;
    }

    try {
      await updateMinecraftConfig({
        serverIp: editServerIp.trim(),
        version: editVersion.trim(),
        description: editDescription.trim(),
        rules: editRules,
        steps: editSteps,
        players: editPlayers
      });
      setIsEditingMode(false);
      showNotification('Настройки успешно сохранены!');
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении настроек.');
    }
  };

  const showNotification = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const players = minecraftConfig.players || DEFAULT_PLAYERS;

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Status Message Toast */}
      {statusMsg && (
        <div className="fixed top-4 right-4 z-50 bg-bg-card border border-emerald-500/30 text-emerald-500 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-soft flex items-center gap-2 animate-[fadeIn_0.15s_ease-out]">
          <Check className="w-4 h-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Admin Toggle Banner */}
      {isAdmin && (
        <div className="p-4 rounded-2xl bg-accent-light border border-accent-color/20 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xs font-sans">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent-light border border-accent-color/25 text-accent-color">
              <Settings className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">Администрирование страницы</h4>
              <p className="text-[10px] text-text-secondary">Вы можете редактировать IP-адрес, версию, описание, правила и шаги прямо здесь.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isEditingMode ? (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl bg-accent-color hover:bg-accent-hover text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-soft transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  Сохранить
                </button>
                <button
                  onClick={() => setIsEditingMode(false)}
                  className="px-4 py-2 rounded-xl bg-bg-card border border-border-color text-text-secondary hover:text-text-primary font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  Отмена
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditingMode(true)}
                className="px-4 py-2 rounded-xl bg-accent-light hover:bg-accent-color/10 border border-accent-color/25 text-accent-color font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Редактировать страницу
              </button>
            )}
          </div>
        </div>
      )}

      {/* Banner / Hero Section */}
      <div className="relative rounded-[32px] overflow-hidden border border-border-color bg-bg-card p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center justify-between shadow-soft">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-gradient-to-tr from-accent-light via-bg-card/50 to-bg-card opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/85 to-transparent" />
        </div>

        <div className="relative z-10 space-y-3 flex-1 text-center md:text-left w-full">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center gap-1 w-fit mx-auto md:mx-0">
            <Server className="w-3 h-3 text-emerald-500" />
            <span>Сервер Онлайн</span>
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold text-text-primary tracking-tight">
            Minecraft Сервер <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-color to-accent-hover">Pisulka Squad</span>
          </h1>
          {isEditingMode ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full bg-bg-app border border-border-color focus:border-accent-color rounded-xl px-3 py-2 text-xs text-text-primary resize-none min-h-[70px] font-sans"
              placeholder="Введите описание сервера..."
            />
          ) : (
            <p className="text-xs md:text-sm text-text-secondary leading-relaxed max-w-xl">
              {minecraftConfig.description}
            </p>
          )}
        </div>

        {/* IP Copy Card */}
        <div className="relative z-10 bg-bg-card border border-border-color p-5 rounded-2xl flex flex-col items-center gap-3 w-full max-w-xs shrink-0 shadow-soft">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">АДРЕС ДЛЯ ПОДКЛЮЧЕНИЯ</span>
          {isEditingMode ? (
            <input
              type="text"
              value={editServerIp}
              onChange={(e) => setEditServerIp(e.target.value)}
              className="w-full bg-bg-app border border-border-color focus:border-accent-color rounded-xl px-3 py-1.5 text-xs text-accent-color font-mono font-bold text-center"
              placeholder="IP сервера"
            />
          ) : (
            <div className="flex items-center gap-2 bg-bg-app border border-border-color rounded-xl px-3.5 py-2 w-full justify-between shadow-inner">
              <code className="text-xs text-accent-color font-mono font-bold">{serverIp}</code>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-bg-card hover:bg-bg-app border border-border-color text-text-secondary hover:text-text-primary transition-all cursor-pointer active:scale-95"
                title="Скопировать IP"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
          <div className="flex gap-4 text-center mt-1 w-full justify-around text-text-secondary font-mono text-[10px]">
            <div>
              <span className="block text-text-muted text-[8px] uppercase tracking-wider font-sans">Версия</span>
              {isEditingMode ? (
                <input
                  type="text"
                  value={editVersion}
                  onChange={(e) => setEditVersion(e.target.value)}
                  className="w-20 bg-bg-app border border-border-color focus:border-accent-color rounded-lg px-1.5 py-0.5 text-center text-text-primary text-[10px]"
                  placeholder="1.20.4"
                />
              ) : (
                <span className="font-bold text-text-primary">{minecraftConfig.version}</span>
              )}
            </div>
            <div className="border-l border-border-color h-6" />
            <div>
              <span className="block text-text-muted text-[8px] uppercase tracking-wider font-sans">Игроки</span>
              <span className="font-bold text-text-primary">6 / 30</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Rules and Instructions */}
        <div className="lg:col-span-2 space-y-6">
          {/* How to Connect */}
          <div className="bg-bg-card border border-border-color rounded-3xl p-6 space-y-4 shadow-soft">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border-color pb-3 font-mono">
              <Gamepad2 className="w-4 h-4 text-accent-color" />
              <span>Как начать играть</span>
            </h3>
            
            <div className="space-y-4">
              {(isEditingMode ? editSteps : minecraftConfig.steps || []).map((step, idx) => (
                <div key={idx} className="flex gap-4 items-start group relative">
                  <div className="w-6 h-6 rounded-full bg-accent-light border border-accent-color/30 text-accent-color flex items-center justify-center font-bold text-xs shrink-0 font-mono mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    {isEditingMode ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const nextSteps = [...editSteps];
                            nextSteps[idx] = { ...step, title: e.target.value };
                            setEditSteps(nextSteps);
                          }}
                          className="w-full bg-bg-app border border-border-color rounded-lg px-2 py-1 text-xs font-bold text-text-primary focus:outline-none focus:border-accent-color/50"
                          placeholder="Заголовок шага"
                        />
                        <textarea
                          value={step.description}
                          onChange={(e) => {
                            const nextSteps = [...editSteps];
                            nextSteps[idx] = { ...step, description: e.target.value };
                            setEditSteps(nextSteps);
                          }}
                          className="w-full bg-bg-app border border-border-color rounded-lg px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-accent-color/50 resize-none min-h-[45px] font-sans"
                          placeholder="Описание шага"
                        />
                      </div>
                    ) : (
                      <>
                        <h4 className="text-xs font-bold text-text-primary">{step.title}</h4>
                        <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                          {step.description}
                        </p>
                      </>
                    )}
                  </div>
                  {isEditingMode && (
                    <button
                      type="button"
                      onClick={() => setEditSteps(editSteps.filter((_, i) => i !== idx))}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 transition-all cursor-pointer shrink-0 ml-2"
                      title="Удалить шаг"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {isEditingMode && (
                <button
                  type="button"
                  onClick={() => setEditSteps([...editSteps, { title: 'Новый шаг', description: 'Описание...' }])}
                  className="px-3 py-1.5 bg-accent-light hover:bg-accent-color hover:text-white border border-accent-color/20 text-accent-color rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Добавить шаг
                </button>
              )}
            </div>
          </div>

          {/* Server Rules */}
          <div className="bg-bg-card border border-border-color rounded-3xl p-6 space-y-4 shadow-soft">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border-color pb-3 font-mono">
              <Compass className="w-4 h-4 text-accent-color" />
              <span>Свод правил нашего сервера</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(isEditingMode ? editRules : minecraftConfig.rules || []).map((rule, idx) => {
                const icons = [BookOpen, ShieldAlert, Server, Gamepad2];
                const IconComponent = icons[idx % icons.length];
                const colors = ['text-cyan-500', 'text-pink-500', 'text-accent-color', 'text-emerald-500'];
                const colorClass = colors[idx % colors.length];

                return (
                  <div key={idx} className="p-3.5 bg-bg-app border border-border-color rounded-2xl flex gap-3 relative group shadow-sm hover:border-accent-color/20 transition-all">
                    <IconComponent className={`w-4 h-4 ${colorClass} shrink-0 mt-0.5`} />
                    <div className="space-y-0.5 flex-1 min-w-0">
                      {isEditingMode ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={rule.title}
                            onChange={(e) => {
                              const nextRules = [...editRules];
                              nextRules[idx] = { ...rule, title: e.target.value };
                              setEditRules(nextRules);
                            }}
                            className="w-full bg-bg-card border border-border-color rounded-lg px-2 py-0.5 text-xs font-bold text-text-primary focus:outline-none focus:border-accent-color/50"
                            placeholder="Правило"
                          />
                          <textarea
                            value={rule.description}
                            onChange={(e) => {
                              const nextRules = [...editRules];
                              nextRules[idx] = { ...rule, description: e.target.value };
                              setEditRules(nextRules);
                            }}
                            className="w-full bg-bg-card border border-border-color rounded-lg px-2 py-1 text-[10px] text-text-secondary focus:outline-none focus:border-accent-color/50 resize-none min-h-[45px] font-sans"
                            placeholder="Описание"
                          />
                        </div>
                      ) : (
                        <>
                          <h4 className="text-xs font-bold text-text-primary">{rule.title}</h4>
                          <p className="text-[10px] text-text-secondary leading-normal">
                            {rule.description}
                          </p>
                        </>
                      )}
                    </div>
                    {isEditingMode && (
                      <button
                        type="button"
                        onClick={() => setEditRules(editRules.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 transition-all cursor-pointer shrink-0 self-start ml-2"
                        title="Удалить правило"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {isEditingMode && (
                <button
                  type="button"
                  onClick={() => setEditRules([...editRules, { title: 'Новое правило', description: 'Описание...' }])}
                  className="px-3 py-1.5 bg-accent-light hover:bg-accent-color hover:text-white border border-accent-color/20 text-accent-color rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all justify-center md:col-span-2 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Добавить правило
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Online Players */}
        <div className="bg-bg-card border border-border-color rounded-3xl p-6 space-y-4 h-fit shadow-soft">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border-color pb-3 font-mono">
            <Users className="w-4 h-4 text-accent-color" />
            <span>В сети ({isEditingMode ? editPlayers.filter(p => p.online).length : players.filter(p => p.online).length})</span>
          </h3>

          <div className="space-y-2">
            {isEditingMode ? (
              <>
                {editPlayers.map((player, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-bg-app border border-border-color rounded-2xl space-y-2.5 relative animate-[fadeIn_0.15s_ease-out]"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border-color pb-2">
                      <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Игрок {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setEditPlayers(editPlayers.filter((_, i) => i !== idx))}
                        className="p-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 transition-all cursor-pointer font-sans"
                        title="Удалить игрока"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="space-y-1 font-sans">
                        <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Имя / Никнейм</label>
                        <input
                          type="text"
                          value={player.name}
                          onChange={(e) => {
                            const next = [...editPlayers];
                            next[idx] = { ...player, name: e.target.value };
                            setEditPlayers(next);
                          }}
                          className="w-full bg-bg-card border border-border-color rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-color/50 font-bold"
                          placeholder="Никнейм игрока"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1 font-sans">
                          <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Роль</label>
                          <input
                            type="text"
                            value={player.role}
                            onChange={(e) => {
                              const next = [...editPlayers];
                              next[idx] = { ...player, role: e.target.value };
                              setEditPlayers(next);
                            }}
                            className="w-full bg-bg-card border border-border-color rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-color/50"
                            placeholder="Игрок / Админ"
                            required
                          />
                        </div>

                        <div className="space-y-1 font-sans">
                          <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Статус</label>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...editPlayers];
                              next[idx] = { ...player, online: !player.online };
                              setEditPlayers(next);
                            }}
                            className={`w-full border rounded-lg px-2 py-1 text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                              player.online
                                ? 'bg-emerald-550/10 border-emerald-500/30 text-emerald-500 hover:border-emerald-500'
                                : 'bg-bg-card border-border-color text-text-muted hover:border-text-secondary'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${player.online ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted'}`} />
                            {player.online ? 'В сети' : 'Офлайн'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => setEditPlayers([...editPlayers, { name: 'Игрок_' + (editPlayers.length + 1), role: 'Игрок', online: true }])}
                  className="w-full py-2 bg-accent-light hover:bg-accent-color hover:text-white border border-accent-color/25 text-accent-color rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Добавить игрока
                </button>
              </>
            ) : (
              players.map((player) => (
                <div
                  key={player.name}
                  className="flex items-center justify-between p-2.5 bg-bg-app border border-border-color rounded-2xl hover:border-accent-color/20 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    {/* Pseudo minecraft head avatar */}
                    <div className="w-7 h-7 bg-bg-card rounded-md border border-border-color flex items-center justify-center font-mono font-bold text-[10px] text-accent-color overflow-hidden shrink-0 shadow-sm">
                      <div className="w-full h-full bg-gradient-to-tr from-accent-color/10 to-accent-hover/5 flex items-center justify-center">
                        {player.name.substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-primary">{player.name}</h4>
                      <span className="text-[9px] text-text-muted">{player.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${player.online ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted'}`} />
                    <span className={`text-[9px] font-mono font-bold ${player.online ? 'text-emerald-500' : 'text-text-muted'}`}>
                      {player.online ? 'онлайн' : 'офлайн'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
