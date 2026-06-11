import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Users, ChevronRight } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
}

interface RoomItem {
  id: string;
  showTitle: string;
  participants: Participant[];
  lastUpdated: any;
}

export const LiveCoWatchWidget: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'rooms'),
      where('visibility', '==', 'public')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedRooms: RoomItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const participants = data.participants || [];
          // Only show rooms that have participants
          if (participants.length > 0) {
            loadedRooms.push({
              id: docSnap.id,
              showTitle: data.showTitle || 'Совместный просмотр',
              participants: participants,
              lastUpdated: data.lastUpdated,
            });
          }
        });

        // Sort by lastUpdated desc and take first 3 rooms
        loadedRooms.sort((a, b) => {
          const timeA = a.lastUpdated?.seconds || 0;
          const timeB = b.lastUpdated?.seconds || 0;
          return timeB - timeA;
        });

        setRooms(loadedRooms.slice(0, 3));
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to public rooms:', error);
        setRooms([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="item-enter space-y-3 p-6 bg-bg-card/45 border border-border-color/60 rounded-3xl animate-pulse shadow-soft">
        <div className="h-4 bg-border-color rounded w-1/4 mb-4" />
        <div className="space-y-2">
          <div className="h-14 bg-border-color rounded-xl" />
          <div className="h-14 bg-border-color rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-bg-card border border-border-color rounded-[32px] p-6 md:p-8 shadow-soft">
      <div className="border-b border-border-color pb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest font-mono flex items-center gap-2">
          <Users className="w-4 h-4 text-accent-color" />
          <span>Сейчас смотрят вместе</span>
        </h3>
        {rooms.length > 0 && (
          <button
            onClick={() => navigate('/cowatch')}
            className="text-xs font-bold text-accent-color hover:text-accent-hover transition-colors flex items-center gap-1 cursor-pointer"
          >
            Все комнаты
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-xs text-text-secondary">Пока никто не смотрит вместе.</p>
          <button
            onClick={() => navigate('/cowatch')}
            className="px-5 py-2 bg-accent-color hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer inline-flex items-center gap-1"
          >
            Создать комнату
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <ul className="space-y-3" role="list">
          {rooms.map((room) => {
            const participantNames = room.participants
              .slice(0, 3)
              .map((p) => p.name)
              .join(', ');
            const remainingCount = room.participants.length - 3;
            const participantsLabel = remainingCount > 0 
              ? `${participantNames} и еще +${remainingCount}` 
              : participantNames;

            return (
              <li 
                key={room.id}
                className="bg-bg-app border border-border-color hover:border-accent-color/30 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all shadow-soft group"
              >
                <div className="min-w-0 space-y-1 text-left">
                  <h4 className="text-xs font-bold text-text-primary group-hover:text-accent-color transition-colors truncate">
                    {room.showTitle}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                    <span className="px-1.5 py-0.5 rounded bg-accent-light border border-accent-color/10 text-accent-color font-bold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{room.participants.length}</span>
                    </span>
                    <span className="truncate">Смотрят: {participantsLabel}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/cowatch/${room.id}`)}
                  aria-label={`Присоединиться к комнате с трансляцией ${room.showTitle}`}
                  className="px-4 py-2 bg-accent-color hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-soft cursor-pointer transition-all active:scale-[0.98] shrink-0"
                >
                  Присоединиться
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
