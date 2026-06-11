import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { BunkerPools } from '../types/bunker';
import { defaultBunkerPools } from '../utils/bunkerDefaultPools';
import { Save, Plus, Trash2, Edit2, Check, X, CheckCircle2, AlertCircle } from 'lucide-react';

export const AdminBunkerDB: React.FC = () => {
  const [pools, setPools] = useState<BunkerPools | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof BunkerPools>('professions');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchPools = async () => {
      try {
        const snap = await getDoc(doc(db, 'bunker_pools', 'base'));
        if (snap.exists()) {
          setPools(snap.data() as BunkerPools);
        } else {
          setPools(defaultBunkerPools);
        }
      } catch (e) {
        setPools(defaultBunkerPools);
      } finally {
        setLoading(false);
      }
    };
    fetchPools();
  }, []);

  const showStatusMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleSave = async () => {
    if (!pools) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'bunker_pools', 'base'), pools);
      showStatusMsg('База Бункера успешно сохранена!');
    } catch (e) {
      showStatusMsg('Ошибка при сохранении базы', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Вы уверены? Это сбросит базу до стандартной!')) return;
    setPools(defaultBunkerPools);
    setSaving(true);
    try {
      await setDoc(doc(db, 'bunker_pools', 'base'), defaultBunkerPools);
      showStatusMsg('База сброшена до стандартной');
    } catch (e) {
      showStatusMsg('Ошибка при сбросе', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !pools) {
    return <div className="text-white text-center py-10">Загрузка базы Бункера...</div>;
  }

  const tabs: { id: keyof BunkerPools; label: string }[] = [
    { id: 'professions', label: 'Профессии' },
    { id: 'diseases', label: 'Болезни' },
    { id: 'hobbies', label: 'Хобби' },
    { id: 'humanTraits', label: 'Черты характера' },
    { id: 'phobias', label: 'Фобии' },
    { id: 'largeInventory', label: 'Крупный инвентарь' },
    { id: 'backpack', label: 'Рюкзак' },
    { id: 'additionalInfo', label: 'Доп. сведения' },
    { id: 'specialActions', label: 'Спец. действия' }
  ];

  return (
    <div className="space-y-6 section-enter">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-3xl">☢️</span> База характеристик Бункера
        </h2>
        <div className="flex gap-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl transition-all"
          >
            Сбросить на станд.
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          statusMsg.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {statusMsg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-4 sm:p-6">
        <GenericListEditor 
          activeTab={activeTab} 
          list={pools[activeTab] as any[]} 
          onChange={(newList) => setPools({ ...pools, [activeTab]: newList })} 
        />
      </div>
    </div>
  );
};

// Generic Editor for arrays in the pool
const GenericListEditor = ({ activeTab, list, onChange }: { activeTab: string, list: any[], onChange: (l: any[]) => void }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  
  const isProfession = activeTab === 'professions';
  const isDisease = activeTab === 'diseases';
  const isHobby = activeTab === 'hobbies';
  const isSpecialAction = activeTab === 'specialActions';
  const isTextItem = !isProfession && !isDisease && !isHobby && !isSpecialAction;

  const handleAdd = () => {
    const newItem: any = { id: `${activeTab}-${Date.now()}` };
    if (isProfession) {
      newItem.name = 'Новая профессия';
      newItem.ability = 'Способность';
    } else if (isDisease) {
      newItem.name = 'Новая болезнь';
      newItem.category = 'Вирусная';
      newItem.system = 'Дыхательная';
    } else if (isHobby) {
      newItem.name = 'Новое хобби';
    } else if (isSpecialAction) {
      newItem.text = 'Новое действие';
      newItem.description = 'Описание';
    } else {
      newItem.text = 'Новая характеристика';
    }
    onChange([...list, newItem]);
  };

  const handleSaveItem = () => {
    onChange(list.map(item => item.id === editingId ? editForm : item));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Удалить элемент?')) return;
    onChange(list.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white capitalize">{activeTab}</h3>
        <button onClick={handleAdd} className="p-2 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40 rounded-lg flex items-center gap-2 transition-all">
          <Plus size={18} /> Добавить
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(item => (
          <div key={item.id} className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
            {editingId === item.id ? (
              <div className="space-y-3">
                {(isProfession || isDisease || isHobby) && (
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" 
                    placeholder="Название"
                  />
                )}
                {isProfession && (
                  <input 
                    type="text" 
                    value={editForm.ability} 
                    onChange={e => setEditForm({...editForm, ability: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" 
                    placeholder="Возможность"
                  />
                )}
                {isDisease && (
                  <>
                    <select 
                      value={editForm.category} 
                      onChange={e => setEditForm({...editForm, category: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
                    >
                      <option value="Вирусная">Вирусная</option>
                      <option value="Неинфекционная">Неинфекционная</option>
                      <option value="Психологическая">Психологическая</option>
                      <option value="Физическая">Физическая</option>
                    </select>
                    <input 
                      type="text" 
                      value={editForm.system} 
                      onChange={e => setEditForm({...editForm, system: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" 
                      placeholder="Система"
                    />
                  </>
                )}
                {(isSpecialAction || isTextItem) && (
                  <input 
                    type="text" 
                    value={editForm.text} 
                    onChange={e => setEditForm({...editForm, text: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" 
                    placeholder="Текст"
                  />
                )}
                {isSpecialAction && (
                  <input 
                    type="text" 
                    value={editForm.description} 
                    onChange={e => setEditForm({...editForm, description: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" 
                    placeholder="Описание"
                  />
                )}
                
                <div className="flex gap-2">
                  <button onClick={handleSaveItem} className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 flex items-center justify-center">
                    <Check size={18} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 flex items-center justify-center">
                    <X size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  {(isProfession || isDisease || isHobby) && <div className="font-bold text-white text-lg mb-1">{item.name}</div>}
                  {isProfession && <div className="text-white/60 text-sm">Возможность: {item.ability}</div>}
                  {isDisease && <div className="text-white/60 text-sm">{item.category} • {item.system}</div>}
                  {(isSpecialAction || isTextItem) && <div className="text-white font-medium mb-1">{item.text}</div>}
                  {isSpecialAction && <div className="text-white/60 text-sm">{item.description}</div>}
                </div>
                
                <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                  <button 
                    onClick={() => { setEditingId(item.id); setEditForm({...item}); }}
                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-400/50 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {list.length === 0 && <div className="text-center text-white/40 py-10">Список пуст</div>}
    </div>
  );
};
