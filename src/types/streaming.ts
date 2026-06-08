export interface Episode {
  id: string;
  number: number;
  title: string;
  description?: string;
  driveUrl: string; // Google Drive link (shared)
  releaseDate: string; // ISO string representing when this episode becomes viewable
  duration?: string; // e.g., "24:00"
  thumbnail?: string;
  stills?: string[]; // Behind-the-scenes stills/photos
}

export interface Actor {
  id: string;
  name: string;
  role: string;
  imageUrl?: string;
  imageUrls?: string[]; // Gallery of additional photos
  filmography?: string;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string; // ISO string
  userId: string;
  parentId?: string; // ID of the comment being replied to
  replyToAuthor?: string; // Author nickname of the parent comment
}

export interface EmojiItem {
  id: string;
  emoji: string;
  label: string;
  enabled: boolean;
}

export interface ReactionsConfig {
  emojiList: EmojiItem[];
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  date: string; // ISO string
  tag: string; // e.g. "07 ИЮНЯ 2026" or "ВАЖНО"
  imageUrl?: string; // Optional image url/base64
  ratings?: Record<string, number>; // userId -> rating (1-5)
  comments?: Comment[]; // User comments list
  reactions?: Record<string, string[]>; // emojiId -> array of userIds who reacted
}

export interface MinecraftRule {
  title: string;
  description: string;
}

export interface MinecraftStep {
  title: string;
  description: string;
}

export interface MinecraftPlayer {
  name: string;
  role: string;
  online: boolean;
}

export interface MinecraftConfig {
  serverIp: string;
  version: string;
  description: string;
  rules: MinecraftRule[];
  steps: MinecraftStep[];
  players?: MinecraftPlayer[];
}

export interface Show {
  id: string;
  title: string;
  description: string;
  coverImage?: string; // large banner url/base64
  thumbnailImage?: string; // small card image url/base64
  trailerUrl?: string; // YouTube / Google Drive / MP4 trailer URL
  category: 'Anime' | 'Series' | 'Movies' | 'Other';
  status: 'ongoing' | 'completed';
  episodes: Episode[];
  actors?: Actor[];
  ratings?: Record<string, number>; // userId -> rating (1-5)
  comments?: Comment[]; // User comments list
  nextEpisodeRelease?: string | null; // ISO string representing the next episode release
  scheduleType?: 'manual' | 'weekly';
  scheduleDay?: number; // 0-6 (Sunday-Saturday) for weekly schedule
  scheduleTime?: string; // "HH:MM"
  isHidden?: boolean;
}

export interface WatchProgress {
  episodeId: string;
  showId: string;
  watchedDuration: number; // in seconds
  totalDuration: number; // in seconds
  completed: boolean;
  lastWatched: string; // ISO string
}

export interface GalleryItem {
  id: string;
  imageUrl: string; // Base64 compressed image (WebP)
  uploadedBy: string; // Name of the uploader
  caption?: string; // Optional image description
  createdAt: string; // ISO timestamp
}

