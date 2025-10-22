// src/types.ts

// Basic User Information
// The API now consistently returns 'id' for the user identifier.
export interface User {
  id: string;
  username: string;
  email: string;
}

// New type for the user management list from GET /users
export interface AdminUser {
    id: string;
    username: string;
    email: string;
    plan_name: string;
    source_subscription_count: number;
    poi_count: number;
    status: 'active' | 'disabled';
    created_at: string;
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
  // AI-enhanced fields (mocked for now)
  influence?: 'high' | 'medium' | 'low';
  sentiment?: 'positive' | 'neutral' | 'negative';
  entities?: string[];
}

// Represents an event cluster, grouping multiple InfoItems
export interface EventCluster {
  id: string;
  type: 'cluster';
  title: string;
  summary: string;
  sourceNames: string[];
  items: InfoItem[];
  publish_date: string; // For sorting, use the latest article's date
}

// A union type for items displayed in the info feed
export type FeedDisplayItem = InfoItem | EventCluster;


// Represents a user's subscription to a specific intelligence point (now called Intelligence Point in API)
export interface Subscription {
  id: string;
  source_id: string;
  point_name: string;
  source_name: string;
  point_url: string;
  cron_schedule: string;
  is_active: number; // Corresponds to backend integer type
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
  url_prompt_key: string;
  summary_prompt_key: string;
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

// Represents a single slide in the report generator
export interface Slide {
    id: string;
    title: string;
    content: string;
    status: 'queued' | 'generating' | 'done';
}

// Corrected: Renamed 'name' to 'source_name' to match the API response.
export interface SystemSource {
    id: string;
    source_name: string; 
    points_count: number;
    // UI-synthesized fields
    description: string;
    iconUrl: string;
    category: string;
    infoCount: number;
    subscriberCount: number;
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

// Result from semantic search
export interface SearchResult extends InfoItem {
  similarity_score?: number;
}

// AI Prompts
export interface Prompt {
    name: string;
    description: string;
    prompt: string;
}

export interface PromptCollection {
    [key: string]: Prompt;
}

export interface AllPrompts {
    url_extraction_prompts: PromptCollection;
    content_summary_prompts: PromptCollection;
}

// --- New Types for Tech Forecast ---
export type PredictionStatus = '传闻' | '高概率' | '基本确认' | '官方证实';

export interface TechPrediction {
    prediction_id: string;
    vehicle_model: string;
    category: string;
    sub_category: string;
    current_prediction: string;
    confidence_score: number;
    prediction_status: PredictionStatus;
    reasoning_log: string;
    supporting_evidence_ids: string[];
    last_updated_at: string;
}

export interface PredictionEvidence {
    evidence_id: string;
    source_name: string;
    published_at: string;
    source_quote: string;
    original_url: string;
    initial_confidence: number;
}

// --- New Types for Bililive Service ---
export interface BililiveInfo {
    app_name: string;
    app_version: string;
    build_time: string;
    git_hash: string;
    pid: number;
    platform: string;
    go_version: string;
}

export interface BililiveStream {
    id: string;
    live_url: string;
    platform_cn_name: string;
    host_name: string;
    room_name: string;
    status: boolean;      // Is the stream online?
    listening: boolean;   // Are we listening?
    recording: boolean;   // Are we recording?
}

// --- New Types for Livestream/Event Analysis ---
export interface LivestreamTask {
  id: string;
  url: string;
  livestream_name: string;
  entity: string | null;
  start_time: string;
  status: string; // e.g., 'pending', 'listening', 'recording', 'processing', 'completed', 'failed'
  bililive_live_id: string | null;
  host_name: string | null;
  prompt_content: string | null;
  livestream_image: string | null; // This is a base64 data URL
  summary_report: string | null; // markdown format
  created_at: string;
  updated_at: string;
}

// New type for livestream prompts
export interface LivestreamPrompt {
  name: string;
  content: string;
}


// Navigation views
export type View = 'dashboard' | 'cockpit' | 'feed' | 'dives' | 'events' | 'ai' | 'admin' | 'forecast';

// Admin page views
export type AdminView = 'intelligence' | 'users' | 'dives' | 'events';