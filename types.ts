
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

// Added UserListItem for admin user management
export interface UserListItem extends User {}

// Added UserForAdminUpdate for admin user update forms
export interface UserForAdminUpdate {
    username: string;
    email: string;
    plan_name: 'free' | 'premium';
    status?: string;
}

// Added UserProfileDetails for user detail modal in admin
export interface UserProfileDetails {
    intelligence_sources: { items: SystemSource[] };
    points_of_interest: { items: ApiPoi[] };
}

// Added PlanDetails for pricing information
export interface PlanDetails {
    free: { name: string; price: number; max_sources: number; max_pois: number };
    premium: { name: string; price: number };
}

export type View = 'cockpit' | 'techboard' | 'dives' | 'events' | 'ai' | 'admin';

export interface SystemSource {
    id: string;
    source_name: string;
    source_type?: string;
    points_count?: number;
    articles_count?: number;
}

// --- Report Generator / Stratify Types (Plumber Mode) ---

export interface Scenario {
    name: string;
    description: string | null;
}

export interface TaskPhase {
    name: string; // 阶段标识，如 "01_outline"
    label: string; // 阶段显示名称，如 "生成大纲"
    status: 'pending' | 'processing' | 'completed' | 'failed';
    content: string | null;
    reasoning?: string;
}

export interface StratifyTask {
    id: string;
    scenario_name: string;
    session_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    input_text: string;
    created_at: string;
    result?: {
        phases: Record<string, TaskPhase>;
    };
    // 扩展字段，用于前端暂存收集的上下文
    context?: {
        files: Array<{ name: string; url: string; type: string }>;
        vector_snippets: Array<{ title: string; content: string }>;
    };
}

// Added StratifyOutline for report generation workflow
export interface StratifyOutline {
    title: string;
    pages: Array<{ title: string; content: string }>;
}

// Added StratifyPage for report generation content
export interface StratifyPage {
    page_index: number;
    title: string;
    content_markdown: string | null;
    html_content: string | null;
    status: 'pending' | 'generating' | 'done' | 'failed';
}

export interface GenerateStreamParams {
    prompt_name: string;
    variables: Record<string, any>;
    scenario?: string;
    model_override?: string;
    session_id?: string;
    task_id?: string;
    phase_name?: string;
    attachments?: Array<{ type: 'image' | 'file'; url: string }>;
}

// --- Intelligence Types ---

// Added SpiderSource for IntelSpider API
export interface SpiderSource {
    uuid: string;
    name: string;
    main_url?: string;
    total_points?: number;
    total_articles?: number;
}

/**
 * Fix: Added IntelligenceSourcePublic to the types.
 */
export interface IntelligenceSourcePublic extends SpiderSource {
    id: string;
    source_name: string;
    points_count: number;
    articles_count: number;
    created_at: string;
    updated_at: string;
}

// Added SpiderPoint for IntelSpider API
export interface SpiderPoint {
    id: string;
    uuid: string;
    source_uuid: string;
    source_name: string;
    name: string;
    url: string;
    cron_schedule: string;
    is_active: boolean;
    last_crawled_at?: string;
    initial_pages?: number;
    url_filters?: string[];
    extra_hint?: string;
}

// Added SpiderTask for IntelSpider task monitoring
export interface SpiderTask {
    id: string;
    uuid: string;
    url: string;
    task_type: string;
    status: string;
    error_message?: string;
    created_at: string;
    end_time?: string;
    start_time?: string;
    articles_collected?: number;
    page_number?: number;
}

// Added SpiderTaskCounts for task summary
export interface SpiderTaskCounts {
    pending: number;
    running: number;
    done: number;
    error: number;
}

// Added SpiderTaskTypeCounts for task type breakdown
export type SpiderTaskTypeCounts = Record<string, number>;

// Added SpiderTaskTriggerResponse for manual task triggers
export interface SpiderTaskTriggerResponse {
    task_id: string;
    status: string;
}

// Added SpiderProxy for proxy management
export interface SpiderProxy {
    url: string;
    enabled: boolean;
    note?: string;
    latency_ms?: number;
}

// Added PendingArticlePublic for moderation API
export interface PendingArticlePublic {
    id: string;
    title: string;
    content: string;
    source_name?: string;
    point_name?: string;
    original_url: string;
    publish_date?: string;
    collected_at: string;
    status?: string;
}

// Added PendingArticle for moderation frontend
export interface PendingArticle extends PendingArticlePublic {
    created_at?: string;
}

// Added SemanticSearchRequest for vector search
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

// Added SemanticSearchResponse for vector search results
export interface SemanticSearchResponse {
    items: Array<{
        article_id: string;
        title: string;
        content: string;
        source_name: string;
        publish_date: string;
        similarity: number;
    }>;
    total_segments: number;
}

// Added CreateIntelLlmTaskRequest for AI analysis tasks
export interface CreateIntelLlmTaskRequest {
    user_uuid: string;
    description: string;
    time_range?: string;
    source_uuids?: string[];
    need_summary?: boolean;
}

// Added IntelLlmTask for AI analysis results
export interface IntelLlmTask {
    uuid: string;
    user_uuid: string;
    description: string;
    status: string;
    progress: number;
    result_url?: string;
    created_at: string;
    time_range?: string;
}

// Added IntelligenceTaskPublic for task dashboard
export interface IntelligenceTaskPublic extends SpiderTask {
    source_name?: string;
    point_name?: string;
}

// Added SearchChunkResult for vector chunk view
export interface SearchChunkResult {
    article_id: string;
    article_title: string;
    article_url: string;
    article_publish_date?: string;
    source_name: string;
    chunk_text: string;
    similarity_score: number;
}

// Added LlmSearchRequest for LLM search
export interface LlmSearchRequest {
    query_text: string;
}

// Added LlmSearchTaskItem for LLM search history
export interface LlmSearchTaskItem {
    id: string;
    prompt_text: string;
    processed_count: number;
    matched_count: number;
    created_at: string;
}

/**
 * Fix: Added point_name, point_url, created_at, and updated_at to GenericPoint.
 */
// Added GenericPoint for generic crawler
export interface GenericPoint extends SpiderPoint {
    point_name: string;
    point_url: string;
    list_hint?: string;
    list_filters?: string[];
    created_at: string;
    updated_at: string;
}

// Added GenericTask for generic task monitor
export interface GenericTask extends SpiderTask {
    source_name: string;
    point_name: string;
    stage?: string;
    detail_info?: string;
}

/**
 * Fix: Added created_at to IntelligencePointPublic.
 */
// Added url_filters, extra_hint, initial_pages to IntelligencePointPublic
export interface IntelligencePointPublic extends SpiderPoint {
    point_name: string;
    point_url: string;
    url_filters?: string[];
    extra_hint?: string;
    max_depth?: number;
    status?: string;
    created_at: string;
    updated_at: string;
    initial_pages?: number;
}

// Added Subscription for internal frontend state
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

// --- Other types remain unchanged ---
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

export type AdminView = 'cockpit' | 'techboard' | 'dives' | 'events' | 'ai' | 'admin' | 'users' | 'intelligence' | 'competitiveness' | 'markdown2html' | 'deep_insight';

// Added StrategicLookKey for cockpit navigation
export type StrategicLookKey = 'industry' | 'customer' | 'competitor' | 'self';

// Added LivestreamPrompt for task creation
export interface LivestreamPrompt {
    name: string;
    content: string;
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

export interface ArticlePublic extends InfoItem {}

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
    is_atomized?: boolean;
    tags?: string;
    status?: string;
}

export interface DeepInsightCategory {
    id: string;
    name: string;
    created_at: string;
}

// Added category_id to DeepInsightTask
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
}

export interface DeepInsightPagesResponse {
    items: DeepInsightPage[];
    total: number;
}

export interface DataQueryResponse<T> {
    data: T[];
    total: number;
}

// Added event_date and updated_at to VehicleTechnologyFinding
export interface VehicleTechnologyFinding {
    id: string;
    entity_name: string;
    technology_name: string;
    application_area?: string;
    maturity_level?: string;
    event_date?: string;
    updated_at: string;
}

// Added market_share, event_date and updated_at to MarketAnalysisFinding
export interface MarketAnalysisFinding {
    id: string;
    entity_name: string;
    revenue?: number;
    growth_rate?: number;
    market_share?: number;
    event_date?: string;
    updated_at: string;
}

// Added created_at and updated_at to DocumentTask
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
    totalPages: number;
}

// Added vehicle_model to TechItem
export interface TechItem {
    id: string;
    name: string;
    vehicle_brand: string;
    vehicle_model?: string;
    tech_dimension: string;
    secondary_tech_dimension: string;
    description: string;
    reliability: number;
    updated_at: string;
    created_at: string;
    history?: TechItemHistory[];
}

// Added TechItemHistory for detailed technical view
export interface TechItemHistory {
    id: string;
    change_type: string;
    description_snapshot: string;
    reliability_snapshot: number;
    event_time: string;
    article_id?: string;
}

export interface CompetitivenessDimension {
    id: string;
    name: string;
    sub_dimensions: string[];
}

export interface CompetitivenessStatus {
    enabled: boolean;
    worker_enabled: boolean;
    llm_provider: string;
    cookie_health?: 'healthy' | 'unhealthy' | 'error';
}

// Added TechDimensionCategory for tech dashboard data
export interface TechDimensionCategory {
    key: string;
    label: string;
    subDimensions: Array<{ key: string, label: string }>;
}

// Added SpecDetail for tech specifications
export interface SpecDetail {
    value: string;
    supplier?: string;
    details?: Record<string, any>;
}

// Added VehicleTechSpec for comparative view
export interface VehicleTechSpec {
    id: string;
    name: string;
    brand: string;
    model: string;
    year: number;
    platform: string;
    specs: Record<string, Record<string, string | SpecDetail | null>>;
}

// Added ComparisonMode for dashboard state
export type ComparisonMode = 'forecast' | 'competitor' | 'brand' | 'evolution' | 'tech' | 'supply_chain';

// Added NewTechForecast for technical predictive view
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

// Added TechAnalysisTask for backend task status
export interface TechAnalysisTask {
    id: string;
    status: string;
}
