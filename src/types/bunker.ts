export type BunkerRole = 'guest' | 'user' | 'vip' | 'mvp';
export type BunkerPhase = 'lobby' | 'playing' | 'finished';
export type RoundPhase = 'reveal' | 'discussion' | 'voting';

export interface BunkerUserProfile {
  id: string;
  nickname: string;
  role: BunkerRole;
  isRegistered: boolean;
}

export interface PlayerTraits {
  gender: string;
  physique: string;
  humanTrait: string;
  profession: string;
  health: string;
  hobby: string;
  phobia: string;
  largeInventory: string;
  backpack: string;
  additionalInfo: string;
  specialAction1: {
    id: string;
    text: string;
    description: string;
    isUsed: boolean;
  };
  specialAction2: {
    id: string;
    text: string;
    description: string;
    isUsed: boolean;
  };
}

export interface BunkerDisease {
  id: string;
  name: string;
  category: 'Вирусная' | 'Неинфекционная' | 'Психологическая' | 'Физическая';
  system: string;
  severity?: 'Лёгкая' | 'Средняя' | 'Тяжёлая' | 'Критическая';
}

export interface BunkerProfessionDef {
  id: string;
  name: string;
  ability: string;
}

export interface BunkerPools {
  professions: BunkerProfessionDef[];
  diseases: BunkerDisease[];
  hobbies: { id: string; name: string }[];
  humanTraits: { id: string; text: string }[];
  phobias: { id: string; text: string }[];
  largeInventory: { id: string; text: string }[];
  backpack: { id: string; text: string }[];
  additionalInfo: { id: string; text: string }[];
  specialActions: SpecialActionItem[];
}

export interface BunkerPlayer {
  id: string;
  nickname: string;
  role: BunkerRole;
  isAlive: boolean;
  hasVoted: boolean;
  isKicked?: boolean;
}

export interface BunkerMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: number;
}

export interface BunkerRoom {
  id: string;
  hostId: string;
  status: BunkerPhase;
  settings: {
    capacity: number;
    enabledPacks: string[];
  };
  players: BunkerPlayer[];
  cataclysm: {
    title: string;
    description: string;
  } | null;
  bunkerInfo: {
    size: number;
    description: string;
  } | null;
  // Keyed by userId:
  traits: Record<string, PlayerTraits>; 
  // Keyed by userId, value is an object mapping trait keys to boolean indicating if they are revealed:
  revealedTraits: Record<string, Record<keyof PlayerTraits, boolean>>; 
  gameState: {
    round: number;
    phase: RoundPhase;
    votes: Record<string, string>; // voterId -> targetUserId
    discussionTimerEndsAt: number | null;
  };
  chat: BunkerMessage[];
  logs: string[];
  createdAt: number;
}

export interface PackItem {
  id: string;
  text: string;
}

export interface SpecialActionItem extends PackItem {
  description: string;
}

export interface CataclysmItem {
  title: string;
  description: string;
}

export interface BunkerContentPack {
  id: string;
  name: string;
  description: string;
  requiredRole: 'guest' | 'mvp';
  content: {
    professions: PackItem[];
    biology: PackItem[]; // Will be generated, but we can store bases
    health: PackItem[];
    hobbies: PackItem[];
    phobias: PackItem[];
    inventory: PackItem[];
    characters: PackItem[];
    facts: PackItem[];
    specialActions: SpecialActionItem[];
    cataclysms: CataclysmItem[];
  };
}
