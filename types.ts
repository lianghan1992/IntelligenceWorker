// types.ts

// --- General ---
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  size?: number; // for competitiveness API
  pages?: number; // for competitiveness API
}

// --- User & Auth ---
export interface User {
  id: string;
  username: string;
  email: string;
  plan_name: string;
  status: 'active' | 'disabled';
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

// --- Views ---
export type View = 'dashboard' | 'cockpit' | 'techboard' | 'dives' | 'events' | 'ai' | 'admin';
export type AdminView = 'users' | 'events' | 'intelligence' | 'competitiveness';

// --- Intelligence & Subscriptions ---
export interface Subscription {
  id: string;
  user_id: string;
  source_name: string;
  point_name: string;
  point_url: string;
  cron_schedule: string;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
  url_prompt_key: string;
  summary_prompt_key: string;
}

export interface SystemSource {
  id: string;
  source_name: string;
  description: string | null;
  points_count: number;
  created_at: string;
  updated_at: string;
}

export interface InfoItem {
  id: string;
  source_name: string;
  point_name: string;
  point_id: string;
  title: string;
  content: string;
  original_url: string;
  publish_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchResult extends InfoItem {
  similarity_score?: number;
}

export interface ApiPoi {
    id: string;
    content: string;
    keywords: string;
}

// --- Deep Dives & Recommendations ---
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

export interface RecommendedSubscription {
    id: string;
    name: string;
    description: string;
    subscribers: number;
}

// --- Industry Events (Livestream) ---
export interface LivestreamTask {
  id?: string;
  url: string;
  livestream_name: string;
  entity?: string;
  host_name: string;
  start_time: string;
  status: 'pending' | 'listening' | 'recording' | 'processing' | 'completed' | 'failed';
  summary_report: string | null;
  livestream_image?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LivestreamPrompt {
    name: string;
    content: string;
}

// --- Report Generator ---
export interface Slide {
  id: string;
  title: string;
  content: string;
  status: 'queued' | 'generating' | 'done';
}

// --- Admin ---
export interface UserListItem {
    id: string;
    username: string;
    email: string;
    plan_name: '免费版' | '高级版';
    status: 'active' | 'disabled';
    source_subscription_count: number;
    poi_count: number;
    created_at: string;
}

export interface UserForAdminUpdate {
    username: string;
    email: string;
    plan_name: 'free' | 'premium';
    status: 'active' | 'disabled';
}

export interface UserProfileDetails {
    intelligence_sources: { items: SystemSource[] };
    points_of_interest: { items: ApiPoi[] };
}

export interface Prompt {
    name: string;
    content: string;
    description?: string;
}

export interface AllPrompts {
    url_extraction_prompts: { [key: string]: Prompt };
    content_summary_prompts: { [key: string]: Prompt };
}

export interface IntelligenceTask {
    id: string;
    source_name: string;
    point_name: string;
    created_at: string;
    status: 'processing' | 'completed' | 'failed' | 'pending' | 'pending_jina';
    task_type: string;
    payload: string | null;
}

// --- Strategic Cockpit ---
export type StrategicLookKey = 'industry' | 'customer' | 'competitor' | 'self';

// --- Competitiveness Dashboard & Tech ---
export interface SpecDetail {
    value: string;
    supplier?: string;
    details?: any;
}

export type SpecValue = string | SpecDetail | null;

export interface VehicleTechSpec {
    id: string;
    name: string;
    brand: string;
    model: string;
    year: number;
    platform: string;
    specs: {
        [categoryKey: string]: {
            [subDimensionKey: string]: SpecValue;
        }
    };
}

export interface TechDimension {
    key: string;
    label: string;
}

export interface TechDimensionCategory {
    key: string;
    label: string;
    subDimensions: TechDimension[];
}

export type ComparisonMode = 'forecast' | 'competitor' | 'brand' | 'evolution' | 'tech' | 'supply_chain';

export interface NewTechForecast {
    id: string;
    brand: string;
    model: string;
    techDimensionKey: string;
    techName: string;
    status: 'confirmed' | 'rumored';
    confidence: number;
    firstDisclosedAt: string;
    lastUpdatedAt: string;
    sourceArticle: string;
    sourceUrl: string;
}

// --- Competitiveness Backend ---
export interface CompetitivenessEntity {
    id: string;
    name: string;
    entity_type: string;
    aliases: string[];
    description: string | null;
    metadata: Record<string, any>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CompetitivenessModule {
    id: string;
    module_name: string;
    module_key: string;
    target_entity_types: string[];
    final_data_table: string;
    description: string | null;
    extraction_fields: Record<string, any>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface BackfillJob {
    id: string;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string;
    status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
    created_at: string;
    updated_at: string;
}

export interface SystemStatus {
    status: string;
    database_status: string;
    uptime: string;
    version: string;
    statistics: {
        active_modules: number;
        total_entities: number;
        processing_queue_size: number;
    };
}

export interface DataQueryResponse<T> {
    data: T[];
    total: number;
    limit: number;
    offset: number;
}

export interface VehicleTechnologyFinding {
    id: string;
    entity_id: string;
    entity_name: string;
    technology_name: string | null;
    application_area: string | null;
    maturity_level: string | null;
    event_date: string | null;
    created_at: string;
    updated_at: string;
}

export interface MarketAnalysisFinding {
    id: string;
    entity_id: string;
    entity_name: string;
    revenue: number | null;
    growth_rate: number | null;
    market_share: number | null;
    event_date: string | null;
    created_at: string;
    updated_at: string;
}