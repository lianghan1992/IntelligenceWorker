// src/types.ts

export type View = 'dashboard' | 'cockpit' | 'forecast' | 'dives' | 'events' | 'ai' | 'admin' | 'techboard';
export type AdminView = 'users' | 'events' | 'intelligence';

export interface User {
  id: string;
  username: string;
  email: string;
  subscription_plan: 'free' | 'premium';
  is_admin?: boolean;
}

export interface UserListItem {
  id: string;
  username: string;
  email: string;
  plan_name: string;
  source_subscription_count: number;
  poi_count: number;
  status: 'active' | 'disabled';
  created_at: string;
}

export interface UserForAdminUpdate {
    username?: string;
    email?: string;
    plan_name?: 'free' | 'premium';
    status?: 'active' | 'disabled';
}

export interface UserProfileSource {
  id: string;
  name: string;
}

export interface UserProfilePOI {
  id: string;
  content: string;
  keywords: string;
}

export interface UserProfileDetails {
  user_id: string;
  username: string;
  intelligence_sources: {
    count: number;
    items: UserProfileSource[];
  };
  points_of_interest: {
    count: number;
    items: UserProfilePOI[];
  };
}


export interface Subscription {
  id: string;
  source_name: string;
  point_name: string;
  point_url: string;
  cron_schedule: string;
  url_prompt_key: string;
  summary_prompt_key: string;
  is_active: 0 | 1;
  created_at: string;
  last_triggered_at: string | null;
}

export interface InfoItem {
  id: string;
  title: string;
  content: string;
  source_name: string;
  point_id: string;
  point_name: string;
  original_url: string;
  publish_date: string;
  created_at: string;
  // Optional fields added for frontend enrichment
  influence?: 'high' | 'medium' | 'low';
  sentiment?: 'positive' | 'neutral' | 'negative';
  entities?: string[];
}

export interface SearchResult extends InfoItem {
  similarity_score?: number;
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

export interface Plan {
    name: string;
    price: number;
    max_sources: number;
    max_pois: number;
}

export interface PlanDetails {
    free: Plan;
    premium: Plan;
}

export interface RecommendedSubscription {
    id: string;
    name: string;
    description: string;
}

// --- Tech Dashboard Types ---
export type ComparisonMode = 'competitor' | 'brand' | 'evolution' | 'tech' | 'supply_chain' | 'forecast';

export interface SpecDetail {
    value: string;
    supplier?: string;
    details?: Record<string, string | number>; // For tech-centric view
}

export interface TechDimension {
    key: string;
    label: string;
    description?: string;
}

export interface TechDimensionCategory {
    key: string;
    label: string;
    subDimensions: TechDimension[];
}

export interface VehicleTechSpec {
    id: string; // e.g., 'li-l7-2024'
    name: string; // e.g., '理想 L7 2024款'
    brand: string; // e.g., '理想'
    model: string; // e.g., 'L7'
    year: number; // e.g., 2024
    platform?: string; // e.g., '理想增程2.0平台'
    specs: {
        [categoryKey: string]: {
            [subDimensionKey: string]: string | SpecDetail | null;
        };
    };
}

export interface NewTechForecast {
    id: string;
    brand: string;
    model: string;
    techDimensionKey: string; // e.g., 'smart_driving'
    techName: string;
    status: 'rumored' | 'confirmed';
    confidence: number; // 0 to 1
    sourceArticle: string;
    sourceUrl: string;
}


export interface LivestreamTask {
    id: string;
    livestream_name: string;
    url: string;
    start_time: string;
    status: string; // e.g., 'pending', 'listening', 'recording', 'processing', 'completed', 'failed'
    summary_report: string | null;
    livestream_image: string | null;
    entity: string;
    host_name: string;
    created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export interface Slide {
    id: string;
    title: string;
    content: string;
    status: 'queued' | 'generating' | 'done';
}

export interface SystemSource {
    id: string;
    source_name: string;
    points_count: number;
}

export interface FocusPoint {
    id: string;
    title: string;
    keywords: string[];
    relatedCount: number;
}

export interface ApiPoi {
    id: string;
    content: string;
    keywords: string;
}

export type StrategicLookKey = 'industry' | 'customer' | 'competitor' | 'self';

export interface InsightBriefing {
    id: string;
    title: string;
    summary: string;
    category: StrategicLookKey;
    sourceArticleIds: string[];
    generatedAt: string;
    entities?: string[];
}

export interface LivestreamPrompt {
    name: string;
    content: string;
}

export interface Prompt {
    name: string;
    description: string;
    prompt: string;
}

export interface AllPrompts {
    url_extraction_prompts: { [key: string]: Prompt };
    content_summary_prompts: { [key: string]: Prompt };
}

export interface IntelligenceTask {
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

export interface ManuscriptItem {
    frame_number: number;
    filename: string;
    confidence: number;
    content: string;
}