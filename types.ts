// src/types.ts

// Basic User Information
// Note: The API is inconsistent. register returns 'id', login returns 'user_id'.
// The app internally will always use 'user_id'.
export interface User {
  user_id: string;
  username: string;
  email: string;
}

// Represents a single piece of intelligence information
export interface InfoItem {
  id: string;
  point_id: string;
  source_name: string;
  point_name: string;
  title: string;
  original_url: string;
  publish_date: string;
  content: string;
  created_at: string;
}

// Represents a user's subscription to a specific intelligence point (now called Intelligence Point in API)
export interface Subscription {
  id: string;
  source_id: string;
  point_name: string;
  source_name: string;
  point_url: string;
  cron_schedule: string;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
  // UI-synthesized fields
  keywords: string[];
  newItemsCount: number;
}

// Represents a deep dive report
export interface DeepDive {
  id: string;
  title: string;
  summary: string;
  author: string;
  date: string;
  tags: string[];
  imageUrl: string;
  category: {
    primary: string;
    secondary: string;
  };
}

// Represents an industry event
export interface Event {
  id: string;
  title: string;
  status: 'UPCOMING' | 'LIVE' | 'SUMMARIZING' | 'CONCLUDED' | 'FAILED';
  taskType: 'LIVE' | 'OFFLINE';
  startTime: string;
  organizer: {
    name: string;
    platform: string;
  };
  coverImageUrl: string | null;
  liveUrl: string | null;
  sourceUri: string | null;
  reportContentHtml: string | null;
}

// Represents a single slide in the report generator
export interface Slide {
    id: string;
    title: string;
    content: string;
    status: 'queued' | 'generating' | 'done';
}

// Represents a system-recognized source of information from GET /intelligence/sources
export interface SystemSource {
    id: string; // Mapped from source_id
    name: string; // Mapped from source_name
    points_count: number;
    // UI-synthesized fields
    description: string;
    iconUrl: string;
    category: string;
    infoCount: number;
    subscriberCount: number; // This can't be fulfilled by the new API directly
}

// API representation of a user's subscribed source from GET /users/{id}/sources
export interface UserSourceSubscription {
    id: string;
    source_name: string;
    subscription_count: number;
    created_at: string;
    updated_at: string;
}

// For the "My Focus Points" dashboard widget (UI)
export interface FocusPoint {
    id: string; 
    title: string;
    keywords: string[];
    relatedCount: number;
}

// Raw POI from User Service API
export interface ApiPoi {
    id: string;
    user_id: string;
    content: string;
    keywords: string; // Comma-separated
    created_at: string;
}

// Details for a single pricing plan from the API
export interface Plan {
    name: string;
    price: number; // Mapped from price
    max_sources: number;
    max_pois: number;
}

// The structure of the entire /users/plans API response
export interface PlanDetails {
    free: Plan;
    premium: Plan;
    [key: string]: Plan; // Allow for other plans like 'enterprise'
}

// For the Strategic Cockpit v2 (Guided Exploration)
export type StrategicLookKey = 'industry' | 'customer' | 'competitor' | 'self' | 'opportunity';

export interface InsightBriefing {
  id: string;
  title: string;
  summary: string;
  category: StrategicLookKey;
  sourceArticleIds: string[]; // IDs of InfoItems used to generate this
  entities?: string[]; // e.g., for competitors like ['Tesla']
  generatedAt: string;
}

// For the recommended subscriptions in mock data
export interface RecommendedSubscription {
  id: string;
  name: string;
  description: string;
  category: string;
}

// Represents a processing task for the Admin page (UI type)
export interface ProcessingTask {
    id: string;
    point_id: string;
    source_name: string;
    point_name: string;
    task_type: string;
    url: string;
    status: string;
    created_at: string;
    updated_at: string;
}

// Raw processing task from GET /intelligence/tasks
export interface ApiProcessingTask {
    id: string;
    point_id: string;
    source_name: string;
    point_name: string;
    task_type: string;
    url: string;
    status: string;
    payload: string | null;
    created_at: string;
    updated_at: string;
}


// Raw event task from API (for events page) - This seems to be from a different service, keeping for compatibility
export interface ApiTask {
    task_id: string;
    task_type: 'LIVE' | 'OFFLINE';
    task_status: 'UPCOMING' | 'LIVE' | 'SUMMARIZING' | 'CONCLUDED' | 'FAILED';
    live_url: string | null;
    replay_url: string | null;
    source_uri: string | null;
    planned_start_time: string; // ISO 8601
    created_at: string; // ISO 8601
    organizer_name: string | null;
    organizer_platform: string | null;
    title: string;
    cover_image_url: string | null;
    report_html: string | null;
    report_pdf_status: 'pending' | 'generating' | 'completed' | 'failed' | null;
    report_pdf_download_url: string | null;
}

// Result from semantic search
// FIX: Made similarity_score optional as it only exists in search results,
// not in regular article listings, allowing the type to be used for both.
export interface SearchResult extends InfoItem {
  similarity_score?: number;
}


// Navigation views
export type View = 'dashboard' | 'cockpit' | 'feed' | 'dives' | 'events' | 'ai' | 'admin';

// Admin page views
export type AdminView = 'intelligence' | 'users' | 'dives' | 'events';