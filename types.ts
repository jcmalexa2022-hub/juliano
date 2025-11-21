export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  YOUTUBE = 'YOUTUBE'
}

export type Genre = 'Goth' | 'Industrial' | 'Darkwave' | 'Post-Punk' | 'EBM' | 'Synthpop' | 'Metal' | 'Other';

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  metaDescription?: string;
  genre: Genre;
  youtubeUrl?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  tags: string[];
  date: string;
  groundingSources?: { uri: string; title: string }[];
}

export interface VeoState {
  isGenerating: boolean;
  progress: string;
  videoUrl: string | null;
  error: string | null;
}

export interface LiveState {
  isConnected: boolean;
  isSpeaking: boolean;
  volume: number;
}