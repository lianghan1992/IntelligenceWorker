
export type View = 'cockpit' | 'techboard' | 'dives' | 'events' | 'ai' | 'mart' | 'admin';
export type AdminView = 'users' | 'events' | 'intelligence' | 'competitiveness' | 'stratify_ai' | 'deep_insight' | 'markdown2html';

export interface User {
    id: string;
    username: string;
    email: string;
    plan_name?: string;
    status?: string;
    source_subscription_count?: number;
    poi_count?: number;
    created_at: string;
}

export interface UserListItem extends User {}
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

export interface PlanDetails {
    free: { name: string; price: number; max_sources: number; max_pois: number };
    premium: { name: string; price: number };
}

export interface SystemSource {
    id: string;
    source_name: string;
    source_type?: string;
    points_count?: number;
    articles_count?: number;
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
}

export interface LivestreamTask {
    id: string;
    task_name: string;
    company: string;
    status: string;
    start_time: string;
    live_url: string;
    cover_image_b64?: string;
    summary_prompt?: string;
    stats_json?: any;
}

export interface LivestreamPrompt {
    name: string;
    content: string;
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

export interface IntelligencePointPublic {
    id: string;
    uuid: string;
    source_id: string;
    source_uuid: string;
    source_name: string;
    name: string;
    point_name: string;
    url: string;
    point_url: string;
    cron_schedule: string;
    is_active: boolean;
    url_filters?: string[];
    extra_hint?: string;
    created_at: string;
    updated_at: string;
    status: string;
    initial_pages?: number;
    total_articles?: number;
    mode?: string;
    type?: string;
    last_crawled_at?: string;
    list_hint?: string;
    list_filters?: string[];
}

export interface SpiderSource extends IntelligenceSourcePublic {}
export interface SpiderPoint extends IntelligencePointPublic {}

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
    tags?: string;
    similarity?: number;
}

export interface ArticlePublic extends InfoItem {}
export interface SpiderArticle extends InfoItem {}

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

export interface ApiPoi {
    id: string;
    content: string;
    keywords?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    size?: number;
}

export interface SearchChunkResult {
    article_id: string;
    chunk_text: string;
    similarity_score: number;
    article_title: string;
    source_name: string;
    article_url: string;
    article_publish_date?: string;
}

export interface LlmSearchTaskItem {
    id: string;
    prompt_text: string;
    created_at: string;
    processed_count: number;
    matched_count: number;
}
export interface LlmSearchRequest {
    query_text: string;
}

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

export interface IntelligenceTaskPublic {
    id: string;
    task_type: string;
    source_name: string;
    point_name: string;
    url: string;
    status: string;
    error_message?: string;
    start_time: string;
    end_time?: string;
    articles_collected?: number;
}

export interface SpiderTask extends IntelligenceTaskPublic {}
export interface SpiderTaskCounts {
    pending: number;
    running: number;
    done: number;
    error: number;
}
export interface SpiderTaskTypeCounts {
    [key: string]: number;
}

export interface IntelLlmTask {
    uuid: string;
    description: string;
    time_range?: string;
    status: string;
    progress: number;
    created_at: string;
}

export interface AnalysisTemplate {
    uuid: string;
    name: string;
    prompt_template: string;
    target_model: string;
    is_active: boolean;
}

export interface AnalysisResult {
    uuid: string;
    article_uuid: string;
    article_title?: string;
    username?: string;
    template_name: string;
    template_uuid?: string;
    result_json: any;
    result?: any;
    status: string;
    duration: string;
    created_at: string;
    completed_at?: string;
    model_used?: string;
}

export interface UploadedDocument {
    uuid: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    page_count: number;
    point_name?: string;
    point_uuid?: string;
    publish_date?: string;
    created_at: string;
    status: string;
    process_stage?: string;
    process_progress?: number;
    error_message?: string;
    summary?: string;
    cover_image?: string;
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

export interface DeepInsightTask {
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    status: string;
    total_pages: number;
    processed_pages: number;
    category_id?: string;
    category_name?: string;
    created_at: string;
    updated_at: string;
    summary?: string;
    cover_image?: string;
}

export interface DeepInsightCategory {
    id: string;
    name: string;
    created_at: string;
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

export interface TechDimensionCategory {
    key: string;
    label: string;
    subDimensions: { key: string; label: string }[];
}

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

export interface TechAnalysisTask {
    id: string;
    // ... (assuming properties based on usage)
}

export interface TechItem {
    id: string;
    name: string;
    description: string;
    vehicle_brand: string;
    tech_dimension: string;
    secondary_tech_dimension: string;
    reliability: number;
    created_at: string;
    updated_at: string;
    history?: TechItemHistory[];
}

export interface TechItemHistory {
    id: string;
    event_time: string;
    reliability_snapshot: number;
    change_type: string;
    description_snapshot: string;
    article_id?: string;
}

export interface CompetitivenessStatus {
    enabled: boolean;
    worker_enabled?: boolean;
    llm_provider?: string;
    cookie_health?: string;
}

export interface CompetitivenessDimension {
    id: string;
    name: string;
    sub_dimensions: string[];
}

export interface DataQueryResponse<T> {
    data: T[];
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

export interface GenerateStreamParams {
    // ...
}

export interface StratifyTask {
    id: string;
    scenario_name: string;
    input_text: string;
    status: string;
    created_at: string;
}

export interface StratifyScenario {
    id: string;
    name: string;
    title: string;
    description: string;
    channel_code?: string;
    model_id?: string;
}

export interface StratifyScenarioFile {
    id: string;
    name: string;
    content: string;
    model?: string;
}

export interface StratifyQueueStatus {
    running_tasks: number;
    pending_tasks: number;
    completed_last_24h: number;
}

export interface LLMChannel {
    id: number;
    channel_code: string;
    name: string;
    base_url: string;
    api_key?: string;
    models: string;
    is_active: boolean;
}

export interface StratifyPrompt {
    id: string;
    name: string;
    description?: string;
    content: string;
    scenario_id: string;
    channel_code?: string;
    model_id?: string;
    variables?: string[];
}

export interface WorkflowConfig {
    variables: { name: string; label: string; type: string; required?: boolean; options?: string[]; default?: any }[];
    steps: { 
        id: string; 
        name: string; 
        type: string; 
        ui?: any; 
        condition?: string;
        prompt_id?: string;
        llm_config?: { channel_code?: string; model?: string };
        input_mapping?: any;
    }[];
}

export interface StratifyOutlinePage {
    title: string;
    content: string;
}

export interface StratifyOutline {
    title: string;
    pages: StratifyOutlinePage[];
}
