import React, { useState, useEffect } from 'react';
import { useBunker } from '../../hooks/useBunker';
import { BunkerLobby } from './BunkerLobby';
import { BunkerRoomLobby } from './BunkerRoomLobby';
import { BunkerPlaying } from './BunkerPlaying';
import { BunkerFinished } from './BunkerFinished';
import { BunkerProfileModal } from './BunkerProfileModal';

export const BunkerGame: React.FC = () => {
  const {
    currentUserId,
    profile,
    updateProfile,
    activeRoom,
    roomsList,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    nextPhase,
    processVoting,
    revealTrait,
    submitVote,
    sendMessage
  } = useBunker();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeRoom) {
        leaveRoom();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeRoom, leaveRoom]);

  if (activeRoom) {
    if (activeRoom.status === 'lobby') {
      return (
        <BunkerRoomLobby 
          room={activeRoom} 
          profile={profile}
          currentUserId={currentUserId}
          onLeave={leaveRoom}
          onStartGame={startGame}
        />
      );
    }
    
    if (activeRoom.status === 'playing') {
      return (
        <BunkerPlaying 
          room={activeRoom}
          currentUserId={currentUserId}
          onRevealTrait={revealTrait}
          onSubmitVote={submitVote}
          onSendMessage={sendMessage}
          onNextPhase={nextPhase}
          onProcessVoting={processVoting}
        />
      );
    }
    
    if (activeRoom.status === 'finished') {
      return (
        <BunkerFinished 
          room={activeRoom}
          onLeave={leaveRoom}
        />
      );
    }
  }

  return (
    <>
      <BunkerLobby 
        profile={profile}
        roomsList={roomsList}
        onCreateRoom={() => createRoom(5, ['base'])}
        onJoinRoom={joinRoom}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {isProfileModalOpen && (
        <BunkerProfileModal 
          profile={profile}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={updateProfile}
        />
      )}
    </>
  );
};
