
export type View = 'cockpit' | 'techboard' | 'dives' | 'events' | 'ai' | 'marketplace' | 'admin';
export type AdminView = 'users' | 'model_management' | 'events' | 'intelligence' | 'competitiveness' | 'stratify_ai' | 'deep_insight' | 'html_design';

// --- User & Auth ---
export interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    role?: string;
    plan_name?: string;
    status?: string;
    source_subscription_count?: number;
    poi_count?: number;
    created_at: string;
}

export interface UserListItem extends User {
    // Admin specific fields if any
}

export interface UserForAdminUpdate {
    username?: string;
    email?: string;
    plan_name?: string;
    status?: string;
}

export interface UserProfileDetails {
    intelligence_sources: { items: any[] };
    points_of_interest: { items: any[] };
}

export interface PlanDetails {
    [key: string]: {
        name: string;
        max_sources?: number;
        max_pois?: number;
    }
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    size?: number; // Compat
    total_pages?: number; // Compat
}

// --- Sources & Points ---
export interface SystemSource {
    id: string;
    source_name: string;
    source_type?: string;
    points_count?: number;
    articles_count?: number;
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

export interface SpiderSource {
    id: string;
    name: string;
    main_url: string;
    total_points?: number;
    total_articles?: number;
    created_at?: string;
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

export interface IntelligencePointPublic {
    id: string;
    uuid: string;
    source_id: string;
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
    initial_pages?: number;
    total_articles: number;
    type?: string;
    mode?: string;
    max_depth?: number;
}

export interface SpiderPoint {
    id: string;
    source_id: string;
    source_name?: string;
    name: string;
    url: string;
    cron_schedule: string;
    is_active: boolean;
    initial_pages?: number;
    total_articles?: number;
    last_crawled_at?: string;
    list_hint?: string;
    url_filters?: string[];
    extra_hint?: string;
    mode?: string;
    type?: string;
}

export interface GenericPoint extends SpiderPoint {
    // Extends SpiderPoint
}

export interface ApiPoi {
    id: string;
    content: string;
    keywords?: string;
}

export interface SpiderProxy {
    url: string;
    enabled: boolean;
    latency_ms?: number;
    note?: string;
}

// --- Articles ---
export interface InfoItem {
    id: string;
    title: string;
    content: string;
    source_name: string;
    point_name?: string;
    publish_date?: string;
    created_at: string;
    original_url?: string;
    url?: string;
    similarity?: number;
    is_atomized?: boolean;
    refined_title?: string;
    refined_content?: string;
    has_refined_content?: boolean;
    tags?: string;
}

export interface ArticlePublic extends InfoItem {
    // Public article interface
}

export interface SpiderArticle {
    id: string;
    title: string;
    content: string;
    source_name: string;
    point_name: string;
    url: string;
    original_url?: string;
    publish_date?: string;
    created_at: string;
    is_atomized?: boolean;
    refined_title?: string;
    refined_content?: string;
    has_refined_content?: boolean;
    tags?: string;
}

export interface PendingArticle extends SpiderArticle {
    status: 'pending' | 'rejected' | 'approved';
}

// --- Livestream ---
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
    created_at?: string;
}

export interface LivestreamPrompt {
    name: string;
    content: string;
}

// --- Tasks (Spider/System) ---
export interface IntelligenceTaskPublic {
    id: string;
    task_type: string;
    source_name?: string;
    point_name?: string;
    url?: string;
    status: string;
    start_time?: string;
    end_time?: string;
    articles_collected?: number;
    error_message?: string;
    created_at: string;
}

export interface SpiderTask extends IntelligenceTaskPublic {}

export interface GenericTask extends IntelligenceTaskPublic {
    stage?: string;
    detail_info?: string;
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

// --- Search / LLM ---
export interface SearchChunkResult {
    article_id: string;
    chunk_text: string;
    similarity_score: number;
    article_title?: string;
    source_name?: string;
    article_publish_date?: string;
    article_url?: string;
}

export interface LlmSearchTaskItem {
    id: string;
    prompt_text: string;
    query_text?: string;
    created_at: string;
    processed_count: number;
    matched_count: number;
}

export interface LlmSearchRequest {
    query_text: string;
}

export interface IntelLlmTask {
    id: string;
    user_id: string;
    description: string;
    status: string;
    progress: number;
    created_at: string;
    time_range?: string;
    result_url?: string;
}

export interface CommonSearchResponse {
    items: CommonSearchItem[];
    meta: CommonSearchStatus;
}

export interface CommonSearchItem {
    title: string;
    href: string;
    body: string;
}

export interface CommonSearchStatus {
    queue_length: number;
    proxy_enabled: boolean;
}

// --- Deep Insight (Docs) ---
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

export interface DeepInsightPage {
    id: string;
    page_index: number;
    status: string;
}

export interface DeepInsightPagesResponse {
    items: DeepInsightPage[];
    total: number;
}

export interface UploadedDocument {
    uuid: string;
    id?: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    page_count: number;
    status: string;
    process_progress?: number;
    process_stage?: string;
    error_message?: string;
    point_uuid?: string;
    point_name?: string;
    summary?: string;
    cover_image?: string;
    publish_date?: string;
    created_at: string;
    updated_at?: string;
}

export interface DocTag {
    uuid: string;
    name: string;
    doc_count: number;
    created_at: string;
}

export interface DeepInsightCategory {
    id: string;
    name: string;
    created_at: string;
}

export interface DocumentTask {
    // ...
}

export interface PaginatedDocumentsResponse {
    items: UploadedDocument[];
    total: number;
    page: number;
    size: number;
    total_pages: number;
}

// --- Mock Data Types ---
export interface DeepDive {
    id: string;
    title: string;
    date: string;
    summary: string;
}
export interface RecommendedSubscription {
    id: string;
    name: string;
    description: string;
}

// --- Competitiveness ---
export interface CompetitivenessStatus {
    enabled: boolean;
    worker_enabled: boolean;
    llm_provider: string;
    cookie_health?: string;
}

export interface CompetitivenessDimension {
    id?: string;
    name: string;
    sub_dimensions: string[];
}

export interface TechItem {
    id: string;
    vehicle_brand: string;
    tech_dimension: string;
    secondary_tech_dimension: string;
    name: string;
    description: string;
    reliability: number;
    updated_at: string;
    created_at: string;
    field?: string;
    status?: string;
    original_url?: string;
    sourceArticleTitle?: string;
    isSelected?: boolean;
    analysisState?: string;
    markdownContent?: string;
    markdownDetail?: string;
    htmlContent?: string;
    htmlCode?: string;
    logs?: string[];
    usedModel?: string;
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

export interface TechAnalysisTask {
    // result of stage 1 analysis
}

export interface DataQueryResponse<T> {
    data: T[];
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

export type ComparisonMode = 'forecast' | 'competitor' | 'brand' | 'evolution' | 'tech' | 'supply_chain';

// --- Stratify AI / Agent ---
export interface StratifyScenario {
    id: string;
    title: string;
    name: string;
    description: string;
    channel_code?: string;
    model_id?: string;
    workflow_config?: any;
}

export interface StratifyScenarioFile {
    id: string;
    name: string;
    content: string;
    model?: string;
}

export interface StratifyPrompt {
    id: string;
    name: string;
    description: string;
    content: string;
    channel_code?: string;
    model_id?: string;
    variables?: string[];
    scenario_id?: string;
}

export interface StratifyTask {
    id: string;
    scenario_name: string;
    input_text: string;
    status: string;
    created_at: string;
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
    base_url?: string;
    api_key?: string;
    models: string;
    is_active: boolean;
}

export interface ModelPricing {
    id?: string;
    channel_code: string;
    model: string;
    model_name?: string;
    input_price: number;
    output_price: number;
    multiplier: number;
    is_active: boolean;
}

export interface AgentSession {
    id: string;
    title: string;
    agent_id: string;
    user_id: string;
    total_cost: number;
    created_at: string;
    updated_at: string;
    current_stage?: string;
    context_data?: any;
}

export interface SessionSnapshot {
    id: string;
    session_id: string;
    stage_tag: string;
    description: string;
    data_snapshot: any;
    created_at: string;
}

export interface UsageStat {
    session_id: string;
    user_id: string;
    username?: string;
    email?: string;
    agent_id: string;
    model: string;
    total_input_tokens: number;
    total_output_tokens: number;
    original_cost: number;
    total_cost: number;
    session_time: string;
}

export interface UsageSummary {
    total_cost: number;
    total_original_cost: number;
    total_input_tokens: number;
    total_output_tokens: number;
}

export interface GenerateStreamParams {
    // Legacy params
}

export interface StratifyOutline {
    title: string;
    pages: { title: string; content: string }[];
}

export interface WorkflowConfig {
    variables: any[];
    steps: any[];
}

export interface AnalysisTemplate {
    uuid: string;
    name: string;
    prompt_template: string;
    output_schema?: any;
    target_model?: string;
    is_active: boolean;
}

export interface AnalysisResult {
    uuid: string;
    article_uuid: string;
    template_uuid: string;
    template_name: string;
    user_uuid: string;
    username?: string;
    article_title?: string;
    status: string;
    result_json: any;
    created_at: string;
    completed_at?: string;
    duration?: string;
    model_used?: string;
}

// --- Billing / Wallet ---
export interface QuotaItem {
    resource_key: string;
    usage_count: number;
    limit_value: number;
    period: string;
}

export interface WalletBalance {
    balance: number;
    currency: string;
    plan_name?: string;
}

export interface WalletTransaction {
    id: string;
    user_id: string;
    amount: number;
    balance_after: number;
    transaction_type: string;
    description: string;
    meta_data: string;
    created_at: string;
}

export interface AdminTransaction extends WalletTransaction {}

export interface PaymentOrder {
    order_no: string;
    user_id: string;
    amount: number;
    status: string;
    gateway: string;
    external_order_no?: string;
    paid_at?: string;
    created_at: string;
}

export interface RechargeResponse {
    order_no: string;
    pay_url?: string;
    qr_code_url?: string;
    message: string;
}

export interface PaymentStatusResponse {
    status: string;
}

export interface RefundOrder {
    refund_no: string;
    original_order_no: string;
    amount: number;
    status: 'pending' | 'processing' | 'success' | 'failed' | 'rejected';
    reason: string;
    created_at: string;
    user_id?: string;
    username?: string;
    external_refund_no?: string;
}

export interface RefundBatchResponse {
    total_amount: number;
    refund_orders: RefundOrder[];
}

export interface QuotaConfig {
    id?: string;
    plan_type: string;
    resource_key: string;
    limit_value: number;
    period: 'monthly' | 'daily' | 'total';
    allow_overage: boolean;
    overage_unit_price: number;
    overage_strategy?: 'unit_price' | 'external_pricing';
    remark?: string;
}
