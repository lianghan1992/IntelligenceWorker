

export type View = 'cockpit' | 'techboard' | 'dives' | 'events' | 'ai' | 'admin';

export interface User {
    id: string;
    username: string;
    email: string;
    plan_name: string;
    status: string;
    source_subscription_count?: number;
    poi_count?: number;
    created_at: string;
}

export interface SystemSource {
    id: string;
    source_name: string;
    source_type?: string;
    points_count: number;
    articles_count?: number;
}

export interface PlanDetails {
    free: { name: string; price: number; max_sources: number; max_pois: number };
    premium: { name: string; price: number };
}

export interface DeepDive {
    id: string;
    title: string;
}

export interface RecommendedSubscription {
    id: string;
    name: string;
}

export interface LivestreamTask {
    id: string;
    task_name: string;
    company: string;
    status: string;
    start_time: string;
    live_url: string;
    cover_image_b64?: string;
    stats_json?: string | any;
    summary_prompt?: string;
    created_at: string;
}

export interface LivestreamPrompt {
    name: string;
    content: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
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
    url_filters: string[];
    extra_hint: string;
    created_at: string;
    updated_at: string;
    status: string;
    max_depth?: number;
    initial_pages?: number;
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
    url_filters: string[];
    extra_hint: string;
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
    similarity?: number;
    is_atomized?: boolean;
}

export interface ArticlePublic extends InfoItem {
    point_name: string;
    tags?: string;
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
    username: string;
    email: string;
    plan_name: string;
    status: string;
}

export interface UserProfileDetails {
    intelligence_sources: { items: any[] };
    points_of_interest: { items: any[] };
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
    total_points: number;
    total_articles: number;
}

export interface SpiderPoint {
    uuid: string;
    name: string;
    url: string;
    cron_schedule: string;
    is_active: boolean;
    last_crawled_at?: string;
    initial_pages?: number;
    source_uuid: string;
    source_name: string;
}

export interface SpiderArticle {
    id: string;
    uuid: string;
    title: string;
    content: string;
    url: string;
    source_name: string;
    point_name: string;
    publish_date?: string;
    created_at: string;
    is_atomized?: boolean;
    tags?: string;
    original_url?: string;
}

export interface SpiderTaskTriggerResponse {
    message: string;
    task_id?: string;
}

export interface PendingArticle {
    id: string;
    title: string;
    content: string;
    source_name: string;
    point_name: string;
    original_url: string;
    status: string;
    created_at: string;
    publish_date?: string;
}

export interface PendingArticlePublic extends PendingArticle {}

export interface SpiderTask {
    id: string;
    uuid: string;
    url: string;
    task_type: string;
    status: string;
    error_message?: string;
    created_at: string;
    start_time?: string;
    end_time?: string;
    page_number?: number;
    articles_collected?: number;
}

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
    similarity_threshold?: number;
    max_segments?: number;
    source_uuid?: string;
    point_uuid?: string;
    start_date?: string;
    end_date?: string;
}

export interface SemanticSearchResponse {
    items: any[];
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
    description: string;
    status: string;
    progress: number;
    created_at: string;
}

export interface IntelligenceTaskPublic extends SpiderTask {
    source_name?: string;
    point_name?: string;
}

export interface DeepInsightTask {
    id: string;
    file_name: string;
    file_type: string;
    status: string;
    total_pages: number;
    processed_pages: number;
    category_id?: string;
    created_at: string;
    updated_at: string;
}

export interface DeepInsightCategory {
    id: string;
    name: string;
    created_at: string;
}

export interface TaskPhase {
    status: string;
    content?: string;
}

export interface StratifyTask {
    id: string;
    input_text: string;
    scenario_name: string;
    session_id: string;
    status: string;
    created_at: string;
    result?: { phases: Record<string, TaskPhase> };
    context?: any;
}

export interface Scenario {
    name: string;
    title?: string;
    description?: string;
}

export type StrategicLookKey = 'industry' | 'customer' | 'competitor' | 'self';

export interface TechDimensionCategory {
    key: string;
    label: string;
    subDimensions: Array<{ key: string; label: string }>;
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

export interface SpecDetail {
    value: string;
    supplier?: string;
    details?: Record<string, any>;
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
    article_id?: string;
    event_time: string;
    change_type: string;
    description_snapshot: string;
    reliability_snapshot: number;
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
    total: number;
}

export interface VehicleTechnologyFinding {
    id: string;
    entity_name: string;
    technology_name: string;
    application_area: string;
    maturity_level: string;
    event_date: string;
    updated_at: string;
}

export interface MarketAnalysisFinding {
    id: string;
    entity_name: string;
    revenue: number;
    growth_rate: number;
    market_share: number;
    event_date: string;
    updated_at: string;
}

export interface SearchChunkResult {
    article_id: string;
    article_title: string;
    article_url: string;
    source_name: string;
    article_publish_date?: string;
    similarity_score: number;
    chunk_text: string;
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
    page: number;
    limit: number;
    totalPages: number;
}

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

export interface DeepInsightPage {
    id: string;
    page_index: number;
    status: string;
}

export interface DeepInsightPagesResponse {
    items: DeepInsightPage[];
    total: number;
}

export interface StratifyPage {
    page_index: number;
    title: string;
    content_markdown: string;
    html_content: string | null;
    status: 'pending' | 'generating' | 'done' | 'failed';
}

export interface StratifyOutline {
    title: string;
    pages: Array<{ title: string; content: string }>;
}

export interface GenerateStreamParams {
    prompt_name: string;
    variables: any;
    scenario: string;
    task_id?: string;
    phase_name?: string;
    session_id?: string;
    // Fix: Added model_override to GenerateStreamParams to allow passing a specific model engine for generation requests.
    model_override?: string;
}

export type AdminView = 'cockpit' | 'techboard' | 'dives' | 'events' | 'ai' | 'admin' | 'users' | 'intelligence' | 'competitiveness' | 'markdown2html' | 'deep_insight' | 'stratify_ai';

export interface StratifyScenario {
    id: string;
    name: string;
    title: string;
    description: string;
    default_model?: string; // New: Supports setting a default model for the scenario
    created_at: string;
    updated_at: string;
}

export interface StratifyScenarioFile {
    id: string;
    name: string;
    content: string;
    model?: string; // New: Supports specific model for this prompt file
    updated_at: string;
}

export interface StratifyQueueStatus {
    running_tasks: number;
    pending_tasks: number;
    completed_last_24h: number;
}

export interface GenericPoint extends SpiderPoint {
    id: string;
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

export interface AnalysisTemplate {
    uuid: string;
    user_uuid: string;
    name: string;
    prompt_template: string;
    output_schema: Record<string, any>;
    target_model: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateAnalysisTemplateRequest {
    user_uuid: string;
    name: string;
    prompt_template: string;
    output_schema: Record<string, any>;
    target_model?: string;
    is_active?: boolean;
}

// Updated based on new API
export interface AnalysisResult {
    uuid: string;
    article_uuid: string;
    status: string;
    result_json: Record<string, any>;
    created_at: string;
    
    // Optional enriched fields (client-side mapping)
    article_title?: string;
    template_name?: string;
    username?: string;
    model_used?: string;
    completed_at?: string;
    duration?: string;
}

// Updated based on new API
export interface UploadedDocument {
    uuid: string;
    original_filename: string;
    title?: string;
    file_size: number;
    mime_type: string;
    page_count: number;
    download_count: number;
    view_count: number;
    publish_date: string;
    created_at: string;
    point_name: string;
    point_uuid?: string;
    source_name?: string;
    
    // Status fields
    status: string; // 'pending' | 'processing' | 'completed' | 'failed'
    process_stage?: string; // e.g. 'queued', 'ocr', 'vectorize', 'finished'
    process_progress?: number;
    error_message?: string | null;
}

export interface DocTag {
    uuid: string;
    name: string;
    created_at: string;
    doc_count: number;
}