
// --- User & Auth Types ---
export interface User {
    id: string;
    username: string;
    email: string;
    plan_name?: string;
    status?: string;
    created_at: string;
    source_subscription_count?: number;
    poi_count?: number;
}

export type View = 'dashboard' | 'cockpit' | 'techboard' | 'dives' | 'events' | 'ai' | 'admin';

export interface SystemSource {
    id: string;
    source_name: string;
    source_type?: string;
    points_count?: number;
    articles_count?: number;
}

export interface Subscription { // Alias used in IntelligencePointManager
    id: string;
    source_id?: string;
    source_name: string;
    point_name: string;
    point_url: string;
    cron_schedule: string;
    is_active: boolean;
    url_filters?: string[];
    extra_hint?: string;
}

export interface PlanDetails {
    free: { name: string; price: number; max_sources: number; max_pois: number };
    premium: { name: string; price: number };
}

// --- Mock Data Types ---
export interface DeepDive {
    id: string;
    title: string;
    date: string;
    summary: string;
    coverImage?: string;
}

export interface RecommendedSubscription {
    id: string;
    name: string;
    description: string;
}

// --- Livestream Types ---
export interface LivestreamTask {
    id: string;
    task_name: string;
    company: string;
    live_url: string;
    start_time: string;
    status: string;
    cover_image_b64?: string;
    summary_prompt?: string;
    stats_json?: string; 
}

export type AdminView = 'users' | 'events' | 'intelligence' | 'competitiveness' | 'markdown2html' | 'deep_insight';

export interface LivestreamPrompt {
    id: string;
    name: string;
    content: string;
}

// --- Intelligence Types ---
export interface IntelligencePointPublic {
    id: string;
    uuid: string;
    source_uuid: string;
    source_name?: string;
    name: string;
    point_name?: string; // Alias
    url: string;
    point_url?: string; // Alias
    cron_schedule: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    initial_pages?: number;
    list_hint?: string;
    list_filters?: string[];
    extra_hint?: string; // Alias for list_hint
    url_filters?: string[]; // Alias for list_filters
    max_depth?: number;
    status?: string;
    last_crawled_at?: string;
    mode?: string;
    type?: string;
}

export interface IntelligenceSourcePublic {
    id: string;
    uuid: string;
    name: string;
    source_name?: string; // Alias
    main_url: string;
    total_points: number;
    points_count?: number; // Alias
    total_articles: number;
    articles_count?: number; // Alias
    created_at: string;
    updated_at: string;
    points?: IntelligencePointPublic[];
}

export interface InfoItem {
    id: string;
    title: string;
    content: string;
    source_name: string;
    original_url: string;
    publish_date?: string;
    created_at: string;
    similarity?: number;
    point_name?: string;
    is_atomized?: boolean;
    tags?: string;
}

export interface ArticlePublic extends InfoItem {
    // Extends InfoItem
}

export interface UserListItem {
    id: string;
    username: string;
    email: string;
    plan_name: string;
    status: string;
    created_at: string;
    source_subscription_count: number;
    poi_count: number;
}

export interface UserForAdminUpdate {
    username?: string;
    email?: string;
    plan_name?: string;
    status?: string;
}

export interface UserProfileDetails {
    intelligence_sources: { items: { id: string, source_name: string }[] };
    points_of_interest: { items: { id: string, content: string, keywords: string }[] };
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit?: number; 
    page_size?: number; 
    totalPages: number;
}

export interface ApiPoi {
    id: string;
    content: string;
    keywords?: string;
    related_count?: number;
}

// Spider / Intelligence specific types
export type SpiderSource = IntelligenceSourcePublic;
export type SpiderPoint = IntelligencePointPublic;

export interface SpiderArticle {
    id: string;
    uuid: string;
    title: string;
    content: string;
    source_name: string;
    point_name: string;
    original_url: string;
    publish_date?: string;
    created_at: string;
    collected_at?: string;
    is_atomized?: boolean;
    tags?: string;
    status?: string;
}

export interface SpiderTaskTriggerResponse {
    task_id: string;
    message: string;
}

export interface PendingArticle {
    id: string;
    title: string;
    source_name: string;
    point_name: string;
    original_url: string;
    status: 'pending' | 'rejected' | 'approved';
    created_at: string;
    content?: string;
    publish_date?: string;
}

export type PendingArticlePublic = PendingArticle;

export interface SpiderTask {
    id: string;
    uuid?: string;
    url: string;
    task_type: string;
    status: string;
    error_message?: string;
    created_at: string;
    start_time?: string;
    end_time?: string;
    source_name?: string;
    point_name?: string;
    articles_collected?: number;
    page_number?: number;
}

export interface IntelligenceTaskPublic extends SpiderTask {}

export interface SpiderTaskCounts {
    pending: number;
    running: number;
    done: number;
    error: number;
}

export type SpiderTaskTypeCounts = Record<string, number>;

export interface SpiderProxy {
    url: string;
    enabled: boolean;
    latency_ms?: number;
    note?: string;
}

export interface SemanticSearchRequest {
    query_text: string;
    page?: number;
    page_size?: number;
    max_segments?: number;
    similarity_threshold?: number;
    source_uuid?: string;
    point_uuid?: string;
    start_date?: string;
    end_date?: string;
}

export interface SemanticSearchResponse {
    items: {
        article_id: string;
        title: string;
        content: string;
        source_name: string;
        publish_date: string;
        similarity: number;
    }[];
    total_segments: number;
}

export interface CreateIntelLlmTaskRequest {
    user_uuid: string;
    description: string;
    time_range?: string;
    source_uuids?: string[];
    need_summary?: boolean;
}

export interface IntelLlmTask {
    uuid: string;
    user_uuid: string;
    description: string;
    status: string;
    progress: number;
    result_url?: string;
    created_at: string;
    time_range?: string;
    matched_count?: number; 
    processed_count?: number;
    prompt_text?: string;
}

// --- Deep Insight Types ---
export interface DeepInsightCategory {
    id: string;
    name: string;
    created_at: string;
}

export interface DeepInsightTask {
    id: string;
    file_name: string;
    file_type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    created_at: string;
    updated_at: string;
    total_pages: number;
    processed_pages: number;
    category_id?: string;
}

export interface DeepInsightPage {
    id: string;
    page_index: number;
    status: string;
    content_md?: string;
    image_path?: string;
}

export interface DeepInsightPagesResponse {
    items: DeepInsightPage[];
    total: number;
}

// --- Report Generator / Stratify Types ---
export interface Slide {
    id: string;
    title: string;
    content: string;
    status: 'pending' | 'generating' | 'done' | 'failed';
}

export interface SearchChunkResult {
    article_id: string;
    chunk_text: string;
    similarity_score: number;
    article_title?: string;
    source_name?: string;
    article_url?: string;
    article_publish_date?: string;
}

export type StratifyTaskStatus = 'created' | 'outline_generated' | 'content_generating' | 'completed' | 'failed';

export interface StratifyTask {
    id: string;
    topic: string;
    status: StratifyTaskStatus;
    current_step: string;
    created_at: string;
    outline?: StratifyOutline | null;
    pages?: StratifyPage[];
}

export interface StratifyOutline {
    title: string;
    pages: { title: string; content: string }[];
}

export interface StratifyPage {
    page_index: number;
    title: string;
    content_markdown: string | null;
    html_content: string | null;
    status: 'pending' | 'generating' | 'done' | 'failed';
}

export interface StratifyStreamChunk {
    content?: string;
    session_id?: string;
}

export interface GenerateStreamParams {
    prompt_name: string;
    variables: Record<string, any>;
    model_override?: string;
    session_id?: string;
    scenario?: string; // Scenario for prompts
}

// --- Strategic Cockpit Types ---
export type StrategicLookKey = 'industry' | 'customer' | 'competitor' | 'self';

// --- Tech Dashboard & Competitiveness Types ---
export interface TechDimensionCategory {
    key: string;
    label: string;
    subDimensions: { key: string; label: string }[];
}

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

export interface TechAnalysisTask {
    id: string;
    status: string;
}

export interface CompetitivenessStatus {
    enabled: boolean;
    worker_enabled: boolean;
    llm_provider: string;
    cookie_health?: 'healthy' | 'unhealthy' | 'error';
}

export interface CompetitivenessDimension {
    id: string;
    name: string;
    sub_dimensions: string[];
}

export interface TechItem {
    id: string;
    name: string;
    vehicle_brand: string;
    vehicle_model: string;
    tech_dimension: string;
    secondary_tech_dimension: string;
    description: string;
    reliability: number;
    updated_at: string;
    created_at: string;
    history?: TechItemHistory[];
}

export interface TechItemHistory {
    id: string;
    change_type: string;
    event_time: string;
    description_snapshot: string;
    reliability_snapshot: number;
    article_id?: string;
}

export interface DataQueryResponse<T> {
    data: T[];
    total: number;
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

// --- Document Processing Types ---
export interface DocumentTask {
    id: string;
    original_filename: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    file_size: number;
    total_pages: number;
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

// --- LLM Sorting Types ---
export interface LlmSearchRequest {
    query_text: string;
}

export interface LlmSearchTaskItem {
    id: string;
    prompt_text: string;
    created_at: string;
    processed_count: number;
    matched_count: number;
}

// --- Generic Crawler Types ---
export interface GenericPoint extends IntelligencePointPublic {}

export interface GenericTask {
    id: string;
    source_name: string;
    point_name: string;
    url: string;
    task_type: string;
    stage: string;
    detail_info: string;
    start_time: string;
    end_time?: string;
    created_at: string;
}