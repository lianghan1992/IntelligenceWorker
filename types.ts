// --- General ---

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

// Special for Competitiveness entities endpoint
export interface PaginatedEntitiesResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages?: number;
}


// --- App Navigation ---

export type View = 'dashboard' | 'cockpit' | 'techboard' | 'dives' | 'events' | 'ai' | 'admin';
export type AdminView = 'users' | 'events' | 'intelligence' | 'competitiveness' | 'markdown2html';


// --- User & Auth ---

export interface User {
  id: string;
  username: string;
  email: string;
  plan_name?: string;
}

export interface UserListItem {
  id: string;
  username: string;
  email: string;
  plan_name: string;
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

export interface ApiPoi {
  id: string;
  content: string;
  keywords: string;
}

export interface UserProfileDetails {
  intelligence_sources: { items: SystemSource[] };
  points_of_interest: { items: ApiPoi[] };
}

export interface Plan {
  name: string;
  price: number;
  max_sources?: number;
  max_pois?: number;
}

export interface PlanDetails {
  free: Plan;
  premium: Plan;
}


// --- Intelligence & Data ---

export interface Subscription {
  id: string;
  source_name: string;
  point_name: string;
  point_url: string;
  cron_schedule: string;
  is_active: 0 | 1;
  last_triggered_at: string | null;
  created_at: string;
}

export interface SystemSource {
  id: string;
  source_name: string;
  points_count: number;
}

export interface InfoItem {
  id: string;
  title: string;
  content: string;
  original_url: string;
  source_name: string;
  point_name: string;
  point_id: string;
  publish_date: string | null;
  created_at: string;
  similarity_score?: number;
}

export type SearchResult = InfoItem; // It's used as an alias

export interface IntelligenceTask {
  id: string;
  source_name: string;
  point_name: string;
  created_at: string;
  status: string;
  task_type: string;
  payload: string | null;
}

export interface SearchChunkResult {
  article_id: string;
  article_title: string;
  article_url: string;
  article_publish_date: string | null;
  source_name: string;
  chunk_index: number;
  chunk_text: string;
  similarity_score: number;
}

export interface SearchChunksResponse {
  results: SearchChunkResult[];
  total_chunks: number;
  total_articles: number;
}

export interface ExportChunkData {
    article_title: string;
    article_url: string;
    article_publish_date: string;
    merged_content: string;
    similarity_scores: number[];
}

export interface ExportChunksResponse {
  export_data: ExportChunkData[];
}


// --- Livestream / Events ---

export interface LivestreamTask {
  id: string;
  task_name: string;
  company: string;
  live_url: string;
  start_time: string;
  summary_prompt: string;
  status: 'scheduled' | 'listening' | 'recording' | 'downloading' | 'processing' | 'finished' | 'failed' | 'stopping';
  created_at: string;
  updated_at: string;
  dir?: string;
  cover_image_b64?: string | null;
  stats_json?: any;
  
  // This is not part of the list response, but fetched separately.
  // Kept for modal convenience.
  summary_report?: string | null;
}


export interface LivestreamPrompt {
  name: string;
  content: string;
}


// --- UI / Content Types ---

export interface DeepDive {
  id: string;
  imageUrl: string;
  title: string;
  summary: string;
  author: string;
  date: string;
  tags: string[];
  category: {
    primary: string;
    secondary: string;
  };
}

export interface RecommendedSubscription {
  id: string;
  name: string;
  description: string;
}

export interface Slide {
  id: string;
  title: string;
  content: string;
  status: 'queued' | 'generating' | 'done';
}


// --- Strategic Cockpit ---

export type StrategicLookKey = 'industry' | 'customer' | 'competitor' | 'self';


// --- Tech & Competitiveness Dashboard ---

// ** DEPRECATED ** - Kept for compatibility with other components if needed
export interface SpecDetail {
  value: string;
  supplier?: string;
  details?: Record<string, any>;
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
export interface VehicleTechSpec {
    id: string;
    name: string;
    brand: string;
    model: string;
    year: number;
    platform: string;
    specs: {
        [categoryKey: string]: {
            [subDimensionKey: string]: string | SpecDetail | null;
        };
    };
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
// ** END DEPRECATED **


// --- New Competitiveness Knowledge Base ---

export interface KnowledgeBaseItem {
  id: number;
  car_brand: string;
  tech_dimension: string;
  sub_tech_dimension: string;
  current_reliability_score: number;
  source_article_count: number;
  last_updated_at: string;
  consolidated_tech_preview: {
    name: string;
    description: string;
    reliability: number;
    publish_date: string;
  };
}

export interface TechDetailHistoryItem {
  name: string;
  description: string;
  reliability: number;
  publish_date: string;
  source_stage1_ids: string[];
  source_article_ids: string[];
}

export interface KnowledgeBaseDetail {
  id: number;
  car_brand: string;
  tech_dimension: string;
  sub_tech_dimension: string;
  unique_aggregation_key: string;
  consolidated_tech_details: TechDetailHistoryItem[];
  current_reliability_score: number;
  source_article_ids: string[];
  created_at: string;
  last_updated_at: string;
}

export interface KnowledgeBaseMeta {
  car_brands: string[];
  tech_dimensions: Record<string, string[]>;
}

export interface ExtractedTechnologyRecord {
  id: number;
  article_id: string; // Added from docs for mapping
  tech_name: string;
  tech_description: string;
  reliability: number;
  publish_date: string;
}

export interface SourceArticleWithRecords {
  id: string;
  title: string;
  original_url: string;
  publish_date: string;
  content?: string;
  stage1_records: ExtractedTechnologyRecord[];
}

export interface KnowledgeBaseTraceability {
  kb_id: number;
  car_brand: string;
  tech_dimension: string;
  sub_tech_dimension: string;
  unique_aggregation_key: string;
  current_reliability_score: number;
  aggregated_tech: TechDetailHistoryItem[];
  stage1_records: ExtractedTechnologyRecord[];
  source_articles: {
    id: string;
    title: string;
    original_url: string;
    publish_date: string;
    content?: string;
  }[];
}


// --- Admin (Competitiveness) ---

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
    technology_name: string;
    application_area: string;
    maturity_level: string;
    event_date: string;
    source_id: string;
    updated_at: string;
}

export interface MarketAnalysisFinding {
    id: string;
    entity_id: string;
    entity_name: string;
    revenue: number | null;
    growth_rate: number | null;
    market_share: number | null;
    event_date: string;
    updated_at: string;
}

// --- Admin ---

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
  version: string;
  uptime: string;
  statistics: {
    total_entities: number;
    active_modules: number;
    processing_queue_size: number;
  };
}

export interface DocumentTask {
  id: string;
  original_filename: string;
  file_size: number;
  total_pages: number;
  status: 'completed' | 'processing' | 'pending' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface PaginatedDocumentsResponse {
    items: DocumentTask[];
    total: number;
    page: number;
    page_size: number;
    totalPages: number;
}