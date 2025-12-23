
export type View = 'cockpit' | 'techboard' | 'dives' | 'events' | 'ai' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  plan_name: string;
  created_at: string;
  status: string;
}

export interface SystemSource {
  id: string;
  source_name: string;
  source_type?: string;
  points_count?: number;
  articles_count?: number;
}

export interface PlanDetails {
  free: {
    name: string;
    price: number;
    max_sources: number;
    max_pois: number;
  };
  premium: {
    name: string;
    price: number;
    max_sources: number;
    max_pois: number;
  };
}

export interface DeepDive {
  id: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  created_at: string;
}

export interface RecommendedSubscription {
  id: string;
  name: string;
  description: string;
  source_url: string;
}

export interface LivestreamTask {
  id: string;
  task_name: string;
  company: string;
  live_url: string;
  start_time: string;
  status: string;
  cover_image_b64?: string;
  summary_prompt?: string;
  stats_json?: string | any;
  created_at: string;
}

export type AdminView = 'users' | 'events' | 'intelligence' | 'competitiveness' | 'stratify_ai' | 'markdown2html' | 'deep_insight';

export interface LivestreamPrompt {
  name: string;
  content: string;
}

export interface IntelligencePointPublic {
  id: string;
  uuid: string;
  source_uuid: string;
  source_name: string;
  name: string;
  url: string;
  point_name: string;
  point_url: string;
  cron_schedule: string;
  is_active: boolean;
  url_filters?: string[];
  extra_hint?: string;
  created_at: string;
  updated_at: string;
  status: string;
  initial_pages: number;
  last_crawled_at?: string;
}

export interface IntelligenceSourcePublic {
  id: string;
  uuid: string;
  name: string;
  source_name: string;
  main_url: string;
  total_points: number;
  total_articles: number;
  points_count: number;
  articles_count: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  source_id: string;
  source_name: string;
  point_name: string;
  point_url: string;
  cron_schedule: string;
  is_active: boolean;
  url_filters?: string[];
  extra_hint?: string;
}

export interface InfoItem {
  id: string;
  title: string;
  content: string;
  source_name: string;
  point_name: string;
  original_url: string;
  publish_date: string;
  created_at: string;
  is_atomized: boolean;
  tags: string;
  similarity?: number;
}

export interface ArticlePublic extends InfoItem {}

export interface UserListItem {
  id: string;
  username: string;
  email: string;
  plan_name: string;
  status: string;
  source_subscription_count: number;
  poi_count: number;
  created_at: string;
}

export interface UserForAdminUpdate {
  username?: string;
  email?: string;
  plan_name?: 'free' | 'premium';
  status?: string;
}

export interface UserProfileDetails {
  intelligence_sources: {
    items: SystemSource[];
  };
  points_of_interest: {
    items: ApiPoi[];
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiPoi {
  id: string;
  content: string;
  keywords: string;
}

export interface SpiderSource {
  uuid: string;
  name: string;
  main_url: string;
}

export interface SpiderPoint {
  uuid: string;
  source_uuid: string;
  source_name: string;
  name: string;
  url: string;
  cron_schedule: string;
  is_active: boolean;
  last_crawled_at?: string;
  initial_pages?: number;
}

export interface SpiderArticle {
  uuid: string;
  title: string;
  content: string;
  source_name: string;
  point_name: string;
  url: string;
  publish_date: string;
  created_at: string;
  is_atomized: boolean;
  tags: string;
}

export interface SearchChunkResult {
  article_id: string;
  article_title: string;
  article_url: string;
  source_name: string;
  article_publish_date: string;
  chunk_text: string;
  similarity_score: number;
}

export interface LlmSearchTaskItem {
  id: string;
  prompt_text: string;
  processed_count: number;
  matched_count: number;
  created_at: string;
}

export interface GenericPoint extends SpiderPoint {
  id: string;
  source_name: string;
  last_crawled_at?: string;
  list_hint?: string;
  list_filters?: string[];
}

export interface GenericTask {
  id: string;
  source_name: string;
  point_name: string;
  url: string;
  task_type: string;
  stage: string;
  detail_info: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface PendingArticle {
  id: string;
  title: string;
  content: string;
  source_name: string;
  point_name: string;
  original_url: string;
  publish_date: string;
  created_at: string;
  status: 'pending' | 'rejected' | 'approved';
}

export interface IntelligenceTaskPublic {
  id: string;
  task_type: string;
  source_name: string;
  point_name: string;
  url: string;
  status: string;
  error_message?: string;
  start_time: string;
  end_time: string;
  articles_collected: number;
}

export interface SpiderTask extends IntelligenceTaskPublic {}

export interface IntelLlmTask {
  uuid: string;
  description: string;
  progress: number;
  status: string;
  created_at: string;
  time_range?: string;
}

export interface AnalysisTemplate {
  uuid: string;
  name: string;
  prompt_template: string;
  output_schema: any;
  target_model: string;
  is_active: boolean;
}

export interface AnalysisResult {
  uuid: string;
  article_uuid: string;
  article_title?: string;
  template_name: string;
  result_json: any;
  status: string;
  duration?: string;
  created_at: string;
  completed_at?: string;
  username: string;
  model_used?: string;
}

export interface UploadedDocument {
  uuid: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  status: string;
  page_count: number;
  process_stage?: string;
  process_progress?: number;
  error_message?: string;
  publish_date: string;
  created_at: string;
  point_uuid: string;
  point_name: string;
}

export interface DocTag {
  uuid: string;
  name: string;
  doc_count: number;
  created_at: string;
}

export interface SpiderProxy {
  url: string;
  enabled: boolean;
  latency_ms?: number;
  note?: string;
}

export interface DeepInsightCategory {
  id: string;
  name: string;
  created_at: string;
}

export interface DeepInsightTask {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: string;
  total_pages: number;
  processed_pages: number;
  category_id: string;
  category_name?: string;
  created_at: string;
  updated_at: string;
}

export interface DeepInsightPage {
  id: string;
  page_index: number;
  status: string;
  image_path?: string;
}

export interface DeepInsightPagesResponse {
  items: DeepInsightPage[];
  total: number;
}

export interface TaskPhase {
  status: string;
  content?: string;
}

export interface StratifyTask {
  id: string;
  input_text: string;
  scenario_name: string;
  status: string;
  session_id: string;
  created_at: string;
  result?: {
    phases?: Record<string, TaskPhase>;
  };
  context?: {
    files: any[];
    vector_snippets: any[];
  };
}

export interface Scenario {
  name: string;
  description: string;
}

export interface StratifyScenario {
  id: string;
  name: string;
  title: string;
  description: string;
  default_model?: string;
}

export interface StratifyScenarioFile {
  id: string;
  name: string;
  content: string;
  model?: string;
  updated_at: string;
}

export interface StratifyQueueStatus {
  running_tasks: number;
  pending_tasks: number;
  completed_last_24h: number;
}

export interface StratifyOutline {
  title: string;
  pages: Array<{ title: string; content: string }>;
}

export interface StratifyPage {
  page_index: number;
  title: string;
  content_markdown: string;
  html_content: string | null;
  status: 'pending' | 'generating' | 'done' | 'failed';
}

export type StrategicLookKey = 'industry' | 'customer' | 'competitor' | 'self';

export interface SpecDetail {
  value: string;
  supplier?: string;
  details?: Record<string, any>;
}

export interface VehicleTechSpec {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  platform: string;
  specs: Record<string, Record<string, string | SpecDetail | null>>;
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

export interface TechDimensionCategory {
  key: string;
  label: string;
  subDimensions: Array<{ key: string; label: string }>;
}

export interface TechAnalysisTask {
  id: string;
  status: string;
}

export interface TechItemHistory {
  id: string;
  change_type: string;
  description_snapshot: string;
  reliability_snapshot: number;
  event_time: string;
  article_id?: string;
}

export interface TechItem {
  id: string;
  name: string;
  description: string;
  vehicle_brand: string;
  vehicle_model?: string;
  tech_dimension: string;
  secondary_tech_dimension: string;
  reliability: number;
  updated_at: string;
  created_at: string;
  history?: TechItemHistory[];
}

export interface CompetitivenessStatus {
  enabled: boolean;
  worker_enabled: boolean;
  llm_provider: string;
  cookie_health?: string;
}

export interface CompetitivenessDimension {
  id: string;
  name: string;
  sub_dimensions: string[];
}

export interface DataQueryResponse<T> {
  data: T[];
  total?: number;
}

export interface VehicleTechnologyFinding {
  id: string;
  entity_name: string;
  technology_name: string;
  application_area?: string;
  maturity_level?: string;
  event_date?: string;
  updated_at: string;
}

export interface MarketAnalysisFinding {
  id: string;
  entity_name: string;
  revenue?: number;
  growth_rate?: number;
  market_share?: number;
  event_date?: string;
  updated_at: string;
}

export interface DocumentTask {
  id: string;
  original_filename: string;
  file_size: number;
  total_pages: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface PaginatedDocumentsResponse {
  items: DocumentTask[];
  total: number;
  totalPages: number;
}

export interface LlmSearchRequest {
  query_text: string;
}

export interface SpiderTaskCounts {
  pending: number;
  running: number;
  done: number;
  error: number;
}

export interface SpiderTaskTypeCounts {
  [key: string]: number;
}

export interface Attachment {
    type: 'image' | 'file';
    url: string;
}

export interface GenerateStreamParams {
    prompt_name: string;
    variables: any;
    scenario: string;
    task_id?: string;
    phase_name?: string;
    session_id?: string;
    model_override?: string;
    attachments?: Attachment[];
}
