


export interface TechItemHistory {
    id: string;
    tech_item_id: string;
    event_time: string;
    change_type: string;
    description_snapshot: string;
    reliability_snapshot: number;
    article_id?: string;
    created_at: string;
}

export interface TechItem {
    id: string;
    vehicle_brand: string;
    vehicle_model: string;
    tech_dimension: string;
    secondary_tech_dimension: string;
    name: string;
    description: string;
    reliability: number;
    latest_article_id: string;
    created_at: string;
    updated_at: string;
    history?: TechItemHistory[];
    is_reviewed?: boolean;
}

export interface User {
    id: string;
    username: string;
    email: string;
    role?: string;
    plan_name?: string;
    created_at: string;
}

export type View = 'dashboard' | 'cockpit' | 'techboard' | 'dives' | 'events' | 'ai' | 'admin';

export interface Subscription {
    id: string;
    source_id?: string;
    source_name: string;
    point_name: string;
    point_url: string;
    cron_schedule: string;
    is_active: boolean | number;
    url_filters?: string[];
    extra_hint?: string;
}

export interface PlanDetails {
    free: { name: string; price: number; max_sources: number; max_pois: number };
    premium: { name: string; price: number };
}

export interface RecommendedSubscription {
    id: string;
    name: string;
    description: string;
}

export interface DeepDive {
    id: string;
    title: string;
    summary: string;
    date: string;
    url?: string;
}

export interface LivestreamTask {
    id: string;
    task_name: string;
    company: string;
    live_url: string;
    start_time: string;
    status: string;
    summary_prompt?: string;
    cover_image_b64?: string;
    stats_json?: any;
    created_at: string;
}

export type AdminView = 'users' | 'events' | 'intelligence' | 'competitiveness' | 'markdown2html' | 'deep_insight';

export interface LivestreamPrompt {
    name: string;
    content: string;
}

export interface SystemSource {
    id: string;
    source_name: string;
    main_url?: string;
    points_count?: number;
    articles_count?: number;
    created_at?: string;
    // UI helper
    points?: Subscription[];
    source_type?: string;
}

export interface InfoItem {
    id: string;
    title: string;
    content: string;
    source_name: string;
    point_name?: string;
    original_url: string;
    publish_date?: string;
    created_at: string;
    is_atomized?: boolean;
    similarity?: number; // Added for semantic search results
}

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
    plan_name?: string;
    status?: string;
}

export interface UserProfileDetails {
    intelligence_sources: { items: { id: string; source_name: string }[] };
    points_of_interest: { items: { id: string; content: string; keywords: string }[] };
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
    keywords?: string;
}

export interface SearchResult {
    items: InfoItem[];
    total: number;
}

export interface SearchChunkResult {
    article_id: string;
    article_title: string;
    article_url: string;
    article_publish_date?: string;
    chunk_index: number;
    chunk_text: string;
    similarity_score: number;
    source_name: string;
    merged_content?: string;
    similarity_scores?: number[];
}

export interface SearchChunksResponse {
    results: SearchChunkResult[];
    total_chunks: number;
    total_articles: number;
}

export interface ExportChunksResponse {
    export_data: {
        article_title: string;
        article_url: string;
        article_publish_date: string;
        merged_content: string;
        similarity_scores: number[];
    }[];
}

export interface LlmSearchRequest {
    query_text: string;
    publish_date_start?: string;
    publish_date_end?: string;
    source_names?: string[];
}

export interface LlmSearchResponse {
    task_id: string;
    message: string;
}

export interface LlmSearchTaskItem {
    id: string;
    prompt_text: string;
    created_at: string;
    processed_count: number;
    matched_count: number;
}

export interface LlmSearchTasksResponse {
    items: LlmSearchTaskItem[];
    total: number;
}

export interface LlmSearchTaskDetail extends LlmSearchTaskItem {
    total_articles: number;
    unrelated_count: number;
    source_names?: string;
    publish_date_start?: string;
    publish_date_end?: string;
}

export interface DeepInsightTask {
    id: string;
    file_name: string;
    file_type: string;
    status: string;
    total_pages: number;
    processed_pages: number;
    created_at: string;
    updated_at: string;
    category_id?: string;
}

export interface DeepInsightCategory {
    id: string;
    name: string;
    created_at: string;
}

export interface DeepInsightPage {
    id: string;
    task_id: string;
    page_index: number;
    status: string;
    image_path?: string;
    html_path?: string;
}

export interface DeepInsightPagesResponse {
    items: DeepInsightPage[];
    total: number;
}

export interface Slide {
    id: string;
    title: string;
    content: string;
    status?: 'queued' | 'generating' | 'done';
}

export type StrategicLookKey = 'industry' | 'customer' | 'competitor' | 'self';

export interface SpecDetail {
    value: string;
    supplier?: string;
    details?: any;
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

export type TechDimensionCategory = {
    key: string;
    label: string;
    subDimensions: { key: string; label: string }[];
}

export interface TechAnalysisTask {
    id: string;
    article_id: string;
    vehicle_brand: string;
    vehicle_model: string;
    tech_dimension: string;
    secondary_tech_dimension: string;
    tech_name: string;
    tech_description: string;
    reliability: number;
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

export interface VehicleTechnologyFinding {
    id: string;
    entity_name: string;
    technology_name: string;
    application_area?: string;
    maturity_level?: string;
    event_date?: string;
    updated_at: string;
}

export interface DataQueryResponse<T> {
    data: T[];
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
    status: 'pending' | 'processing' | 'completed' | 'failed';
    file_size: number;
    total_pages: number;
    created_at: string;
    updated_at: string;
}

export interface PaginatedDocumentsResponse {
    items: DocumentTask[];
    total: number;
    totalPages: number;
}

// --- IntelSpider Types (New API) ---

export interface SpiderSource {
    uuid: string; // New API uses uuid
    id: string;   // Frontend alias for compatibility
    name: string;
    main_url: string;
    total_points: number;
    total_articles: number;
    points_count?: number; // alias
    articles_count?: number; // alias
    created_at?: string;
    updated_at?: string;
    // Legacy support
    source_name?: string;
}

export interface SpiderPoint {
    uuid: string; // New API uses uuid
    id: string;   // Frontend alias for compatibility
    source_uuid: string;
    source_name?: string; // hydrated
    name: string;
    point_name?: string; // alias
    url: string;
    point_url?: string; // alias
    cron_schedule: string;
    initial_pages: number;
    is_active: boolean;
    last_crawled_at?: string;
    // Legacy support
    url_filters?: string[];
    extra_hint?: string;
    created_at?: string;
    updated_at?: string;
    max_depth?: number;
    status?: string;
    mode?: string;
    type?: string;
    list_hint?: string;
    list_filters?: string[];
}

export interface SpiderArticle {
    id: string;
    uuid: string; // New API
    source_uuid?: string; // In new db structure this might be linked differently, assuming flattened for UI
    title: string;
    content: string;
    original_url: string;
    publish_time?: string; // Legacy alias
    publish_date?: string; // New API
    collected_at: string;
    created_at: string; // New API
    is_reviewed?: boolean;
    is_atomized?: boolean; // New API
    source_name?: string; // Optional: Hydrated or joined data
    point_name?: string;
    tags?: string;
}

export interface SpiderProxy {
    url: string;
    enabled: boolean;
    note?: string;
    latency_ms?: number; // UI specific, from test
    last_checked?: string;
}

export interface SpiderTaskTriggerResponse {
    message: string;
    task_uuid: string;
}

export interface SpiderTask {
    uuid: string;
    id: string; // Alias to uuid
    point_uuid: string;
    status: string;
    task_type: string;
    start_time?: string;
    end_time?: string;
    articles_collected?: number;
    error_message?: string;
    created_at: string;
    
    // UI Helpers / Hydrated fields
    source_name?: string;
    point_name?: string;
    url?: string; 
    page_number?: number;
}

export interface SpiderTaskCounts {
    total: number;
    pending: number;
    running: number;
    done: number;
    error: number;
}

export type SpiderTaskTypeCounts = Record<string, number>;

// --- Legacy Compatibility Types & Aliases ---

export type IntelligencePointPublic = SpiderPoint;
export type IntelligenceSourcePublic = SpiderSource;
export type IntelligenceTaskPublic = SpiderTask;

export interface ArticlePublic extends SpiderArticle {
    source_name: string; // Optional in SpiderArticle but required here for UI
    point_name?: string;
    publish_date?: string;
    created_at: string; // Ensure created_at is present
    status?: string;
}

export type PendingArticlePublic = ArticlePublic;

export interface GenericPoint {
    id: string;
    source_name: string;
    point_name: string;
    point_url: string;
    cron_schedule: string;
    is_active: boolean;
    created_at: string;
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
    end_time?: string;
    created_at: string;
    status: string;
}

export interface PendingArticle {
    id: string;
    title: string;
    original_url: string;
    source_name: string;
    point_name: string;
    status: 'pending' | 'rejected' | 'approved';
    content?: string;
    publish_date?: string;
    created_at?: string;
}

export interface ApprovedArticle {
    id: string;
    title: string;
    publish_date: string;
    source_name: string;
    point_name: string;
    original_url: string;
}

export interface SemanticSearchRequest {
    query_text: string;
    source_uuid?: string;
    point_uuid?: string;
    start_date?: string;
    end_date?: string;
    max_segments?: number;
    similarity_threshold?: number;
    page?: number;
    page_size?: number;
}

export interface SemanticSegment {
    article_id: string;
    similarity: number;
    title: string;
    publish_date: string;
    source_name: string;
    content: string;
}

export interface SemanticSearchResponse {
    total_segments: number;
    items: SemanticSegment[];
}

// --- LLM Intelligence Task Types ---

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
    status: 'pending' | 'analyzing' | 'completed' | 'failed';
    progress: number;
    created_at: string;
    completed_at?: string;
    csv_path?: string;
}

// --- StratifyAI (AI Report Generator) Types ---

export interface StratifyTask {
    id: string;
    user_input: string;
    status: 'pending' | 'processing' | 'outline_generated' | 'content_generating' | 'completed' | 'failed';
    current_step: string;
    created_at: string;
    outline?: StratifyOutline;
    pages?: StratifyPage[];
}

export interface StratifyOutline {
    title: string;
    pages: { title: string; content: string }[];
}

export interface StratifyPage {
    page_index: number;
    title: string;
    content: string; // Markdown content
    html_content?: string;
    status: 'pending' | 'generating' | 'completed' | 'failed';
}

export interface StratifyQueueStatus {
    zhipu: { queue_length: number; total_keys: number; total_concurrency: number };
    gemini: { queue_length: number; total_keys: number; total_concurrency: number };
}

export interface StratifyStreamEvent {
    task_id: string;
    status: string;
    current_step: string;
    topic?: string;
    partial_content?: string; // For streaming text
    log?: string; // System logs
    queue_position?: StratifyQueueStatus;
}
