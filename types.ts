// src/types.ts

export type View = 'dashboard' | 'cockpit' | 'feed' | 'forecast' | 'dives' | 'events' | 'ai' | 'admin';
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

export type PredictionStatus = '官方证实' | '基本确认' | '高概率' | '传闻';

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