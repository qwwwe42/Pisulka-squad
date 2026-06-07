import React, { useState, useEffect } from 'react';
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);

  // Local Form States
  const [editServerIp, setEditServerIp] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRules, setEditRules] = useState<MinecraftRule[]>([]);
  const [editSteps, setEditSteps] = useState<MinecraftStep[]>([]);
  const [editPlayers, setEditPlayers] = useState<MinecraftPlayer[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const serverIp = minecraftConfig.serverIp;

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem('penis_ink_admin') === 'true');
  }, []);

  // Sync state when config changes or when editing mode is toggled
  useEffect(() => {
    if (minecraftConfig) {
      setEditServerIp(minecraftConfig.serverIp || '');
      setEditVersion(minecraftConfig.version || '');
      setEditDescription(minecraftConfig.description || '');
      setEditRules(minecraftConfig.rules || []);
      setEditSteps(minecraftConfig.steps || []);
      setEditPlayers(minecraftConfig.players || DEFAULT_PLAYERS);
    }
  }, [minecraftConfig, isEditingMode]);

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
        <div className="fixed top-4 right-4 z-50 bg-green-950/90 border border-green-800 text-green-400 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-black/85 flex items-center gap-2 animate-[fadeIn_0.15s_ease-out]">
          <Check className="w-4 h-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Admin Toggle Banner */}
      {isAdmin && (
        <div className="p-4 rounded-2xl bg-purple-950/10 border border-purple-900/30 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xs font-sans">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/25">
              <Settings className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Администрирование страницы</h4>
              <p className="text-[10px] text-slate-500">Вы можете редактировать IP-адрес, версию, описание, правила и шаги прямо здесь.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isEditingMode ? (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-900/20 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  Сохранить
                </button>
                <button
                  onClick={() => setIsEditingMode(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  Отмена
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditingMode(true)}
                className="px-4 py-2 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 border border-purple-900/50 text-purple-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Редактировать страницу
              </button>
            )}
          </div>
        </div>
      )}

      {/* Banner / Hero Section */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950/40 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-gradient-to-tr from-purple-950/30 via-slate-900/50 to-green-950/20 opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative z-10 space-y-3 flex-1 text-center md:text-left w-full">
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-300 border border-green-800/30 flex items-center gap-1 w-fit mx-auto md:mx-0">
            <Server className="w-3 h-3 text-green-400" />
            <span>Сервер Онлайн</span>
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-100 tracking-tight">
            Minecraft Сервер <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Pisulka Squad</span>
          </h1>
          {isEditingMode ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/60 rounded-xl px-3 py-2 text-xs text-slate-200 resize-none min-h-[70px] font-sans"
              placeholder="Введите описание сервера..."
            />
          ) : (
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-xl">
              {minecraftConfig.description}
            </p>
          )}
        </div>

        {/* IP Copy Card */}
        <div className="relative z-10 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col items-center gap-3 w-full max-w-xs shrink-0 backdrop-blur-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">АДРЕС ДЛЯ ПОДКЛЮЧЕНИЯ</span>
          {isEditingMode ? (
            <input
              type="text"
              value={editServerIp}
              onChange={(e) => setEditServerIp(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500/65 rounded-xl px-3 py-1.5 text-xs text-purple-300 font-mono font-bold text-center"
              placeholder="IP сервера"
            />
          ) : (
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 w-full justify-between">
              <code className="text-xs text-purple-300 font-mono font-bold">{serverIp}</code>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
                title="Скопировать IP"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
          <div className="flex gap-4 text-center mt-1 w-full justify-around text-slate-400 font-mono text-[10px]">
            <div>
              <span className="block text-slate-500 text-[8px] uppercase tracking-wider font-sans">Версия</span>
              {isEditingMode ? (
                <input
                  type="text"
                  value={editVersion}
                  onChange={(e) => setEditVersion(e.target.value)}
                  className="w-20 bg-slate-950 border border-slate-800 focus:border-purple-500/65 rounded-lg px-1.5 py-0.5 text-center text-slate-350 text-[10px]"
                  placeholder="1.20.4"
                />
              ) : (
                <span className="font-bold text-slate-350">{minecraftConfig.version}</span>
              )}
            </div>
            <div className="border-l border-slate-800 h-6" />
            <div>
              <span className="block text-slate-500 text-[8px] uppercase tracking-wider font-sans">Игроки</span>
              <span className="font-bold text-slate-350">6 / 30</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Rules and Instructions */}
        <div className="lg:col-span-2 space-y-6">
          {/* How to Connect */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Gamepad2 className="w-4 h-4 text-purple-400" />
              <span>Как начать играть</span>
            </h3>
            
            <div className="space-y-4">
              {(isEditingMode ? editSteps : minecraftConfig.steps || []).map((step, idx) => (
                <div key={idx} className="flex gap-4 items-start group relative">
                  <div className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 font-mono mt-0.5">
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
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-xs font-bold text-slate-200 focus:outline-none focus:border-purple-500/50"
                          placeholder="Заголовок шага"
                        />
                        <textarea
                          value={step.description}
                          onChange={(e) => {
                            const nextSteps = [...editSteps];
                            nextSteps[idx] = { ...step, description: e.target.value };
                            setEditSteps(nextSteps);
                          }}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-400 focus:outline-none focus:border-purple-500/50 resize-none min-h-[45px] font-sans"
                          placeholder="Описание шага"
                        />
                      </div>
                    ) : (
                      <>
                        <h4 className="text-xs font-bold text-slate-200">{step.title}</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap">
                          {step.description}
                        </p>
                      </>
                    )}
                  </div>
                  {isEditingMode && (
                    <button
                      type="button"
                      onClick={() => setEditSteps(editSteps.filter((_, i) => i !== idx))}
                      className="p-1 rounded bg-rose-950/20 hover:bg-rose-900 border border-rose-900/30 text-rose-400 hover:text-white transition-all cursor-pointer shrink-0 ml-2"
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
                  className="px-3 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-900/40 text-purple-400 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5 animate-pulse" />
                  Добавить шаг
                </button>
              )}
            </div>
          </div>

          {/* Server Rules */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Compass className="w-4 h-4 text-purple-400" />
              <span>Свод правил нашего сервера</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(isEditingMode ? editRules : minecraftConfig.rules || []).map((rule, idx) => {
                const icons = [BookOpen, ShieldAlert, Server, Gamepad2];
                const IconComponent = icons[idx % icons.length];
                const colors = ['text-cyan-400', 'text-pink-400', 'text-purple-400', 'text-emerald-400'];
                const colorClass = colors[idx % colors.length];

                return (
                  <div key={idx} className="p-3 bg-slate-950/30 border border-slate-800/50 rounded-xl flex gap-3 relative group">
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
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-purple-500/50"
                            placeholder="Правило"
                          />
                          <textarea
                            value={rule.description}
                            onChange={(e) => {
                              const nextRules = [...editRules];
                              nextRules[idx] = { ...rule, description: e.target.value };
                              setEditRules(nextRules);
                            }}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-[10px] text-slate-400 focus:outline-none focus:border-purple-500/50 resize-none min-h-[45px] font-sans"
                            placeholder="Описание"
                          />
                        </div>
                      ) : (
                        <>
                          <h4 className="text-xs font-bold text-slate-200">{rule.title}</h4>
                          <p className="text-[10px] text-slate-450 leading-normal">
                            {rule.description}
                          </p>
                        </>
                      )}
                    </div>
                    {isEditingMode && (
                      <button
                        type="button"
                        onClick={() => setEditRules(editRules.filter((_, i) => i !== idx))}
                        className="p-1 rounded bg-rose-950/20 hover:bg-rose-900 border border-rose-900/30 text-rose-400 hover:text-white transition-all cursor-pointer shrink-0 self-start ml-2"
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
                  className="px-3 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-900/40 text-purple-400 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all justify-center md:col-span-2 mt-2"
                >
                  <Plus className="w-3.5 h-3.5 animate-pulse" />
                  Добавить правило
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Online Players */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 h-fit">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Users className="w-4 h-4 text-purple-400" />
            <span>В сети ({isEditingMode ? editPlayers.filter(p => p.online).length : players.filter(p => p.online).length})</span>
          </h3>

          <div className="space-y-2">
            {isEditingMode ? (
              <>
                {editPlayers.map((player, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-2.5 relative animate-[fadeIn_0.15s_ease-out]"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Игрок {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setEditPlayers(editPlayers.filter((_, i) => i !== idx))}
                        className="p-1 rounded bg-rose-950/25 hover:bg-rose-900 border border-rose-900/30 text-rose-400 hover:text-white transition-all cursor-pointer font-sans"
                        title="Удалить игрока"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="space-y-1 font-sans">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Имя / Никнейм</label>
                        <input
                          type="text"
                          value={player.name}
                          onChange={(e) => {
                            const next = [...editPlayers];
                            next[idx] = { ...player, name: e.target.value };
                            setEditPlayers(next);
                          }}
                          className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 font-bold"
                          placeholder="Никнейм игрока"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1 font-sans">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Роль</label>
                          <input
                            type="text"
                            value={player.role}
                            onChange={(e) => {
                              const next = [...editPlayers];
                              next[idx] = { ...player, role: e.target.value };
                              setEditPlayers(next);
                            }}
                            className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
                            placeholder="Игрок / Админ"
                            required
                          />
                        </div>

                        <div className="space-y-1 font-sans">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Статус</label>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...editPlayers];
                              next[idx] = { ...player, online: !player.online };
                              setEditPlayers(next);
                            }}
                            className={`w-full border rounded-lg px-2 py-1 text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                              player.online
                                ? 'bg-green-950/20 border-green-900/40 text-green-400 hover:border-green-800'
                                : 'bg-slate-900 border-slate-850 text-slate-500 hover:border-slate-800'
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
                
                <button
                  type="button"
                  onClick={() => setEditPlayers([...editPlayers, { name: 'Игрок_' + (editPlayers.length + 1), role: 'Игрок', online: true }])}
                  className="w-full py-2 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-900/45 text-purple-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Добавить игрока
                </button>
              </>
            ) : (
              players.map((player) => (
                <div
                  key={player.name}
                  className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-900 rounded-xl hover:border-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Pseudo minecraft head avatar */}
                    <div className="w-7 h-7 bg-slate-800 rounded-md border border-slate-700 flex items-center justify-center font-mono font-bold text-[10px] text-purple-300 overflow-hidden shrink-0">
                      <div className="w-full h-full bg-gradient-to-tr from-purple-900/60 to-pink-900/40 flex items-center justify-center">
                        {player.name.substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{player.name}</h4>
                      <span className="text-[9px] text-slate-500">{player.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${player.online ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
                    <span className={`text-[9px] font-mono font-bold ${player.online ? 'text-green-500' : 'text-slate-500'}`}>
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
