import React, { useState, useEffect, useRef } from 'react';
import type { BunkerRoom, PlayerTraits } from '../../types/bunker';
import { Shield, Skull, Send, User, Skull as SkullIcon, ChevronDown, MessageSquare, Info, Lock, Crown, Eye, EyeOff } from 'lucide-react';

interface Props {
  room: BunkerRoom;
  currentUserId: string;
  onRevealTrait: (traitKey: keyof PlayerTraits) => void;
  onSubmitVote: (targetId: string) => void;
  onSendMessage: (text: string) => void;
  onNextPhase: (phase: 'reveal' | 'discussion' | 'voting') => void;
  onProcessVoting: () => void;
}

export const BunkerPlaying: React.FC<Props> = ({ room, currentUserId, onRevealTrait, onSubmitVote, onSendMessage, onNextPhase, onProcessVoting }) => {
  const isHost = room.hostId === currentUserId;
  const me = room.players.find(p => p.id === currentUserId);
  const myTraits = room.traits[currentUserId];
  const myRevealed = room.revealedTraits[currentUserId];
  const isAlive = me?.isAlive ?? false;

  const [chatInput, setChatInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState<'myCards' | 'chat'>('myCards');
  const [showCataclysm, setShowCataclysm] = useState(false);

  useEffect(() => {
    if (chatRef.current && (activeTab === 'chat' || window.innerWidth >= 1024)) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [room.chat, room.logs, activeTab]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  const ORDERED_TRAITS: Array<keyof PlayerTraits> = [
    'gender',
    'physique',
    'humanTrait',
    'profession',
    'health',
    'hobby',
    'phobia',
    'largeInventory',
    'backpack',
    'additionalInfo',
    'specialAction1',
    'specialAction2'
  ];

  const traitLabels: Record<keyof PlayerTraits, string> = {
    gender: 'Пол/Возраст',
    physique: 'Телослож.',
    humanTrait: 'Характер',
    profession: 'Профессия',
    health: 'Здоровье',
    hobby: 'Хобби',
    phobia: 'Фобия',
    largeInventory: 'Инвентарь',
    backpack: 'Рюкзак',
    additionalInfo: 'Факт',
    specialAction1: 'Спец. действие 1',
    specialAction2: 'Спец. действие 2'
  };

  const renderMyCard = (key: keyof PlayerTraits) => {
    const isRevealed = myRevealed?.[key];
    const val = myTraits?.[key];
    const text = (key === 'specialAction1' || key === 'specialAction2') ? (val as any)?.text : val;
    
    return (
      <div key={key} className={`relative flex flex-col p-3 rounded-2xl border min-h-[110px] transition-all overflow-hidden ${isRevealed ? 'bg-bg-app border-accent-color/50' : 'bg-gradient-to-br from-bg-card to-bg-app border-border-color'}`}>
         <div className={`text-[9px] font-bold uppercase tracking-wider font-mono absolute top-2 left-2 z-10 ${isRevealed ? 'text-accent-color' : 'text-text-muted'}`}>{traitLabels[key]}</div>
         
         <div className="mt-5 text-xs font-bold leading-tight break-words flex-1 text-text-primary">
            {text as string}
         </div>

         <div className="mt-3 pt-2 border-t border-border-color flex items-center justify-between gap-2">
           {isRevealed ? (
             <span className="text-[10px] text-accent-color font-bold flex items-center gap-1.5"><Eye className="w-3 h-3 shrink-0" /> Раскрыто</span>
           ) : (
             <>
               <span className="text-[9px] text-text-secondary italic flex items-center gap-1"><EyeOff className="w-3 h-3 shrink-0" /> Только вам</span>
               <button onClick={() => isAlive && onRevealTrait(key)} disabled={!isAlive} className="px-3 py-1 bg-accent-color text-white text-[10px] font-bold rounded-lg hover:bg-accent-hover active:scale-95 shadow-soft transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                  Вскрыть
               </button>
             </>
           )}
         </div>
      </div>
    );
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 bg-bg-sidebar border border-border-sidebar backdrop-blur-md rounded-[1.5rem] shadow-2xl flex flex-col gap-4 animate-[fadeIn_0.3s_ease-out] relative pb-8">
      
      {/* 1. Top Bar (Sticky) */}
      <div className="bg-bg-card border border-border-color p-4 rounded-3xl shadow-soft sticky top-4 z-40 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col items-center md:items-start w-full md:w-auto">
           <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-mono mb-1">Раунд {room.gameState.round}</div>
           <div className="text-xl font-extrabold text-accent-color flex items-center gap-2">
             {room.gameState.phase === 'reveal' && 'Вскрытие карт'}
             {room.gameState.phase === 'discussion' && 'Обсуждение'}
             {room.gameState.phase === 'voting' && 'Голосование'}
           </div>
        </div>

        <div className="flex gap-4 text-xs font-bold font-mono">
           <div className="text-text-primary px-3 py-1.5 bg-bg-app rounded-xl border border-border-color">Выживших: <span className="text-accent-color">{room.players.filter(p=>p.isAlive).length}</span></div>
           <div className="text-text-secondary px-3 py-1.5 bg-bg-app rounded-xl border border-border-color">Мест: {room.settings.capacity}</div>
        </div>

        {isHost && (
           <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto border-t md:border-t-0 border-border-color pt-3 md:pt-0">
              {room.gameState.phase === 'reveal' && (
                <button onClick={() => onNextPhase('discussion')} className="px-4 py-2 bg-accent-light text-accent-color border border-accent-color/20 rounded-xl text-xs font-bold hover:bg-accent-color hover:text-white transition-colors cursor-pointer w-full md:w-auto shadow-sm">
                  Начать обсуждение
                </button>
              )}
              {room.gameState.phase === 'discussion' && (
                <button onClick={() => onNextPhase('voting')} className="px-4 py-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-bold hover:bg-rose-500 hover:text-white transition-colors cursor-pointer w-full md:w-auto shadow-sm">
                  Начать голосование
                </button>
              )}
              {room.gameState.phase === 'voting' && (
                <button onClick={() => onProcessVoting()} className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-colors cursor-pointer w-full md:w-auto shadow-sm">
                  Подвести итоги
                </button>
              )}
           </div>
        )}
      </div>

      {/* 2. Cataclysm Accordion */}
      <div className="bg-bg-card border border-border-color rounded-3xl shadow-soft overflow-hidden z-30 relative">
        <button onClick={() => setShowCataclysm(!showCataclysm)} className="w-full p-4 flex justify-between items-center bg-bg-app hover:bg-accent-light hover:text-accent-color transition-colors cursor-pointer">
           <div className="flex items-center gap-2">
             <Info className="w-4 h-4" />
             <span className="font-bold text-sm uppercase tracking-wider font-mono">Условия выживания</span>
           </div>
           <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${showCataclysm ? 'rotate-180' : ''}`} />
        </button>
        <div className={`grid grid-cols-1 md:grid-cols-2 transition-all duration-300 ease-in-out ${showCataclysm ? 'max-h-[500px] opacity-100 border-t border-border-color' : 'max-h-0 opacity-0'}`}>
           <div className="p-5 border-b md:border-b-0 md:border-r border-border-color bg-rose-500/5">
              <div className="flex items-center gap-2 text-rose-500 mb-2">
                <Skull className="w-5 h-5" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono">Катастрофа</h3>
              </div>
              <div className="text-sm font-bold text-text-primary mb-1">{room.cataclysm?.title}</div>
              <div className="text-[11px] text-text-secondary leading-relaxed">{room.cataclysm?.description}</div>
           </div>
           <div className="p-5 bg-accent-light/5">
              <div className="flex items-center gap-2 text-accent-color mb-2">
                <Shield className="w-5 h-5" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono">Бункер</h3>
              </div>
              <div className="text-sm font-bold text-text-primary mb-1">Размер: {room.settings.capacity} чел.</div>
              <div className="text-[11px] text-text-secondary leading-relaxed">{room.bunkerInfo?.description}</div>
           </div>
        </div>
      </div>

      {/* 3. Main Content: Players Table Grid (100% width) */}
      <div className="w-full flex flex-col gap-4 overflow-hidden relative z-20">
        <div className="bg-bg-card border border-border-color rounded-3xl shadow-soft overflow-hidden">
          <div className="w-full overflow-hidden">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr>
                  <th className="w-[12%] p-1 md:p-2 border-b border-border-color bg-bg-app z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)] align-bottom">
                    <span className="text-[8px] md:text-[10px] font-bold text-text-secondary uppercase tracking-wider font-mono">Игрок</span>
                  </th>
                  {ORDERED_TRAITS.map(k => (
                    <th key={k} className="p-0.5 md:p-1.5 border-b border-border-color bg-bg-card text-center overflow-hidden align-bottom">
                      <span className="text-[6.5px] sm:text-[7.5px] md:text-[9px] font-bold text-text-secondary uppercase tracking-tighter font-mono break-words leading-[1.1] block" title={traitLabels[k]}>{traitLabels[k]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {room.players.map(p => {
                  const pRevealed = room.revealedTraits[p.id];
                  const isMe = p.id === currentUserId;
                  const hasVotedMe = room.gameState.votes[currentUserId] === p.id;
                  const isHost = room.hostId === p.id;

                  return (
                    <tr key={p.id} className={`group ${!p.isAlive ? 'bg-bg-app/50 opacity-60 grayscale' : 'hover:bg-accent-light/5 transition-colors'} ${hasVotedMe ? 'bg-rose-500/5' : ''}`}>
                      
                      {/* Player Info */}
                      <td className={`p-1 md:p-2 border-b border-border-color transition-colors ${!p.isAlive ? 'bg-bg-app' : hasVotedMe ? 'bg-rose-500/15' : isMe ? 'bg-accent-light' : 'bg-bg-card group-hover:bg-accent-light'}`}>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1">
                            {p.isAlive ? <User className="w-3 h-3 text-text-secondary shrink-0" /> : <SkullIcon className="w-3 h-3 text-rose-500 shrink-0" />}
                            <span className={`text-[10px] md:text-xs font-bold truncate ${!p.isAlive ? 'line-through text-text-muted' : 'text-text-primary'}`} title={p.nickname}>
                              {p.nickname}
                            </span>
                            {isHost && <span title="Ведущий" className="shrink-0 flex"><Crown className="w-2.5 h-2.5 text-yellow-500" /></span>}
                          </div>
                          
                          {!p.isAlive && <span className="text-[8px] md:text-[9px] text-rose-500 uppercase font-mono font-bold tracking-wider">Изгнан</span>}
                          
                          {/* Vote button logic */}
                          {room.gameState.phase === 'voting' && isAlive && p.isAlive && !hasVotedMe && !me?.hasVoted && (
                            <button onClick={() => onSubmitVote(p.id)} className="w-full px-2 py-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg text-[9px] font-bold transition-colors cursor-pointer shadow-sm">
                              Выбрать
                            </button>
                          )}
                          {hasVotedMe && <div className="w-full text-center px-2 py-1 bg-rose-500 text-white rounded-lg text-[9px] font-bold shadow-sm">Выбран</div>}
                        </div>
                      </td>

                      {/* Traits Columns */}
                      {ORDERED_TRAITS.map(k => {
                        const isRevealed = pRevealed?.[k];
                        const val = room.traits[p.id]?.[k];
                        const text = (k === 'specialAction1' || k === 'specialAction2') ? (val as any)?.text : val;

                        return (
                          <td key={k} className="p-1 md:p-2 border-b border-border-color text-center align-middle overflow-hidden">
                            {p.isAlive ? (
                              isRevealed ? (
                                <div className="bg-bg-app border border-border-color p-1.5 md:p-2 rounded-xl shadow-inner min-h-[40px] md:min-h-[50px] flex items-center justify-center break-words">
                                  <span className="text-[9px] font-bold text-text-primary leading-tight">{text as string}</span>
                                </div>
                              ) : (
                                <div className="bg-gradient-to-br from-bg-app to-bg-card border border-border-color/50 p-1 md:p-1.5 rounded-xl opacity-60 min-h-[40px] md:min-h-[50px] flex items-center justify-center">
                                  <Lock className="w-3 h-3 md:w-3.5 md:h-3.5 text-text-muted shrink-0" />
                                </div>
                              )
                            ) : (
                              /* Dead player view */
                              isRevealed ? (
                                <div className="opacity-50 text-[8px] md:text-[9px] leading-tight px-1 break-words">{text as string}</div>
                              ) : (
                                <div className="opacity-30 flex justify-center"><Lock className="w-2.5 h-2.5 text-text-muted shrink-0" /></div>
                              )
                            )}
                          </td>
                        );
                      })}

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* 4. Bottom Area: My Character & Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        
        {/* Mobile Tabs */}
        <div className="flex lg:hidden bg-bg-card rounded-2xl p-1.5 border border-border-color shadow-soft shrink-0">
          <button 
            onClick={() => setActiveTab('myCards')} 
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'myCards' ? 'bg-accent-color text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-bg-app'}`}
          >
            <User className="w-4 h-4" /> Мой персонаж
          </button>
          <button 
            onClick={() => setActiveTab('chat')} 
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'bg-accent-color text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-bg-app'}`}
          >
            <MessageSquare className="w-4 h-4" /> События и чат
          </button>
        </div>

        {/* My Character Box */}
        <div className={`flex-col h-[500px] bg-bg-card border border-border-color rounded-3xl shadow-soft overflow-hidden ${activeTab === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 bg-bg-app border-b border-border-color flex items-center gap-2 shrink-0">
             <User className="w-4 h-4 text-accent-color" />
             <h3 className="text-sm font-bold uppercase tracking-wider font-mono">Мой персонаж</h3>
          </div>
          <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
            {!isAlive && <div className="p-4 mb-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl text-xs font-bold flex items-center gap-2"><SkullIcon className="w-4 h-4 shrink-0" /> Вы изгнаны. Вы не можете вскрывать карты.</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
              {ORDERED_TRAITS.map(renderMyCard)}
            </div>
          </div>
        </div>

        {/* Chat Box */}
        <div className={`flex-col h-[500px] bg-bg-card border border-border-color rounded-3xl shadow-soft overflow-hidden ${activeTab === 'myCards' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 bg-bg-app border-b border-border-color flex items-center gap-2 shrink-0">
             <MessageSquare className="w-4 h-4 text-accent-color" />
             <h3 className="text-sm font-bold uppercase tracking-wider font-mono">События и чат</h3>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" ref={chatRef}>
              {room.logs.map((log, i) => (
                <div key={`log-${i}`} className="flex gap-2 text-[11px] bg-accent-light/20 p-2 rounded-xl border border-accent-color/10">
                  <Info className="w-3.5 h-3.5 text-accent-color shrink-0 mt-0.5" />
                  <span className="text-text-primary font-mono leading-relaxed">{log}</span>
                </div>
              ))}
              
              {room.logs.length > 0 && room.chat.length > 0 && <div className="h-px bg-border-color my-4"></div>}

              {room.chat.map(msg => (
                <div key={msg.id} className="text-xs leading-relaxed flex flex-col gap-0.5">
                  <span className={msg.senderId === currentUserId ? 'text-accent-color font-bold text-[10px]' : 'text-text-secondary font-bold text-[10px]'}>{msg.senderName}</span>
                  <span className="text-text-primary bg-bg-app inline-block p-2 rounded-xl rounded-tl-none border border-border-color self-start max-w-[90%]">{msg.text}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-border-color bg-bg-app flex gap-2 shrink-0">
              <input 
                type="text" 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder={isAlive ? "Ваше сообщение..." : "Мертвые не говорят"}
                disabled={!isAlive}
                className="flex-1 bg-bg-card border border-border-color rounded-xl px-4 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-color/50 disabled:opacity-50 shadow-inner transition-colors"
              />
              <button type="submit" disabled={!isAlive || !chatInput.trim()} className="p-3 bg-accent-color text-white rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
