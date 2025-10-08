// Fix: Removed circular self-import of 'InfoSource' that was causing a conflict.
export interface InfoSource {
  id: string;
  name: string;
  url: string;
  iconUrl: string;
}

// REPLACED: This now matches the structure of an Article from the new API
export interface InfoItem {
  id: string;
  point_id: string;
  source_name: string;
  point_name: string;
  title: string;
  original_url: string;
  publish_date: string | null;
  content: string;
  created_at: string;
}

export interface DeepDive {
  id: string;
  title: string;
  summary: string;
  author: string;
  date: string;
  imageUrl: string;
  tags: string[];
  category: {
    primary: string;
    secondary: string;
  };
}

export interface Event {
  id: string;
  title: string;
  status: 'UPCOMING' | 'LIVE' | 'SUMMARIZING' | 'CONCLUDED' | 'FAILED';
  taskType: 'LIVE' | 'OFFLINE';
  pdfStatus?: 'pending' | 'generating' | 'completed' | 'failed' | null;
  startTime: string; // ISO 8601 format
  organizer: {
    name: string;
    platform: string;
  };
  coverImageUrl: string | null;
  liveUrl: string | null;
  sourceUri?: string | null;
  reportContentHtml: string | null;
  pdfDownloadUrl?: string | null;
}


export interface ChatMessage {
    id:string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: string;
}

export interface Slide {
  id: string;
  title: string;
  content: string;
  status: 'queued' | 'generating' | 'done';
}

// REPLACED: This now matches the structure of a Point from the new API v1.1.0
export interface Subscription {
  id: string;
  source_id: string;
  point_name: string; // Replaces title
  source_name: string;
  point_url: string; 
  cron_schedule: string;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
  // Synthesized fields for UI
  keywords: string[];
  newItemsCount?: number;
}

export interface RecommendedSubscription {
  id: string;
  title: string;
  description: string;
  keywords: string[];
}

// REPLACED: This now matches a Source from the new API v1.1.0
export interface SystemSource {
  id: string;
  name: string; // Corresponds to `source_name` from API
  subscription_count: number;
  // Fields below are for UI compatibility and will be synthesized in api.ts
  description: string;
  iconUrl: string;
  category: string;
  infoCount?: number;
  subscriberCount?: number;
}


export interface User {
  user_id: string;
  username: string;
  email: string;
}