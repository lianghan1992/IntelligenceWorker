
export interface User {
    id: string;
    username: string;
    email: string;
    role?: string;
    plan_name?: string;
    status?: string;
    created_at: string;
    source_subscription_count?: number;
    poi_count?: number;
}

export type View = 'cockpit' | 'techboard' | 'dives' | 'events' | 'ai' | 'marketplace' | 'admin';

export interface SystemSource {
    id: string;
    source_name: string;
    source_type?: string;
    points_count?: number;
    articles_count?: number;
}

export interface PlanDetails {
    [key: string]: {
        name: string;
        max_sources?: number;
        max_pois?: number;
    }
}

export interface DeepDive {
    id: string;
    title: string;
    summary?: string;
    cover_image?: string;
    created_at: string;
    file_type: string;
    file_size?: number;
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
    summary_prompt?: string;
    cover_image_b64?: string;
    stats_json?: any;
    created_at?: string;
}

export type AdminView = 'users' | 'model_management' | 'events' | 'intelligence' | 'competitiveness' | 'stratify_ai' | 'deep_insight' | 'html_design';

export interface LivestreamPrompt {
    id: string;
    name: string;
    content: string;
}

export interface IntelligencePointPublic {
    id: string;
    uuid: string; // compatibility
    source_id: string;
    source_uuid?: string;
    source_name: string;
    name: string;
    point_name?: string;
    url: string;
    point_url?: string;
    cron_schedule: string;
    is_active: boolean;
    url_filters?: string[];
    extra_hint?: string;
    created_at: string;
    updated_at: string;
    status: string;
    initial_pages: number;
    total_articles?: number;
    
    // Generic point specific
    last_crawled_at?: string;
    list_hint?: string;
    list_filters?: string[];
    mode?: string;
    type?: string;
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
    refined_title?: string;
    content: string;
    refined_content?: string;
    has_refined_content?: boolean;
    source_name: string;
    point_name?: string;
    original_url: string;
    publish_date?: string;
    created_at: string;
    is_atomized: boolean;
    tags?: string;
    similarity?: number;
}

export interface ArticlePublic extends InfoItem {}

export interface UserListItem {
    id: string;
    username: string;
    email: string;
    plan_name?: string;
    status: string;
    created_at: string;
    source_subscription_count?: number;
    poi_count?: number;
}

export interface UserForAdminUpdate {
    username?: string;
    email?: string;
    plan_name?: string;
    status?: string;
}

export interface UserProfileDetails {
    intelligence_sources: { items: any[] }; // simplified
    points_of_interest: { items: ApiPoi[] };
}

export interface ApiPoi {
    id: string;
    content: string;
    keywords?: string;
}

export interface PaymentStatusResponse {
    status: 'paid' | 'pending' | 'failed' | 'expired';
}

export interface RefundableBalanceResponse {
    refundable_amount: number;
    current_balance: number;
    history_recharge_limit: number;
}

export interface RefundOrder {
    refund_no: string;
    original_order_no?: string;
    amount: number;
    status: 'pending' | 'processing' | 'success' | 'failed' | 'rejected';
    reason: string;
    created_at: string;
    user_id?: string;
    username?: string;
}

export interface RefundApplyResponse {
    total_amount?: number;
    refund_orders?: RefundOrder[];
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface SpiderSource {
    id: string;
    name: string;
    main_url: string;
    total_points?: number;
    total_articles?: number;
    created_at?: string;
}

export interface SpiderPoint {
    id: string;
    source_id: string;
    name: string;
    url: string;
    cron_schedule: string;
    is_active: boolean;
    initial_pages: number;
    total_articles?: number;
    last_crawled_at?: string;
    
    // Generic
    mode?: string;
    type?: string;
    list_hint?: string;
    extra_hint?: string;
    list_filters?: string[];
    url_filters?: string[];
}

export interface SpiderArticle {
    id: string;
    title: string;
    refined_title?: string;
    content?: string;
    refined_content?: string;
    has_refined_content?: boolean;
    source_name: string;
    point_name?: string;
    url: string; // original_url in mapped types
    original_url?: string;
    publish_date?: string;
    created_at: string;
    is_atomized?: boolean;
    tags?: string;
}

export interface SearchChunkResult {
    article_id: string;
    chunk_text: string;
    similarity_score: number;
    article_title: string;
    article_url: string;
    article_publish_date?: string;
    source_name: string;
}

export interface LlmSearchTaskItem {
    id: string;
    prompt_text: string;
    created_at: string;
    processed_count: number;
    matched_count: number;
}

export interface GenericPoint extends IntelligencePointPublic {
    // Already defined in IntelligencePointPublic via intersection or just mapping in code
    // Assuming mapping happens in component, GenericPoint just needs to be compatible
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
    end_time?: string;
    created_at: string;
}

export interface PendingArticle {
    id: string;
    title: string;
    content?: string;
    source_name: string;
    point_name: string;
    original_url: string;
    status: 'pending' | 'rejected' | 'approved';
    created_at: string;
    publish_date?: string;
}

export interface IntelligenceTaskPublic {
    id: string;
    task_type: string;
    source_name?: string;
    point_name?: string;
    url?: string;
    status: string;
    error_message?: string;
    start_time?: string;
    end_time?: string;
    created_at: string;
    articles_collected?: number;
    page_number?: number;
}

export interface SpiderTask extends IntelligenceTaskPublic {}

export interface IntelLlmTask {
    id: string;
    description: string;
    time_range?: string;
    status: 'pending' | 'analyzing' | 'completed' | 'failed';
    progress: number;
    created_at: string;
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
    template_name: string;
    username: string;
    article_uuid: string;
    article_title?: string;
    result_json: any;
    result?: any;
    status: string;
    created_at: string;
    completed_at?: string;
    duration?: string;
    model_used?: string;
}

export interface UploadedDocument {
    uuid: string;
    original_filename: string;
    file_size: number;
    page_count: number;
    mime_type?: string;
    status: string;
    process_stage?: string;
    process_progress?: number;
    error_message?: string;
    point_uuid?: string;
    point_name?: string;
    created_at: string;
    updated_at?: string;
    summary?: string;
    cover_image?: string;
    publish_date?: string;
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
    category_id?: string;
    category_name?: string;
    created_at: string;
    updated_at: string;
    summary?: string;
    cover_image?: string;
    // For light list compatibility
    category_name?: string;
}

export interface DeepInsightPagesResponse {
    items: DeepInsightPage[];
    total: number;
}

export interface DeepInsightPage {
    id: string;
    page_index: number;
    status: string;
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

export interface VehicleTechSpec {
    id: string;
    name: string;
    brand: string;
    model: string;
    year: number;
    platform?: string;
    specs: Record<string, any>;
}

export interface SpecDetail {
    value: string;
    supplier?: string;
    details?: any;
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
    subDimensions: { key: string; label: string }[];
}

export interface TechAnalysisTask {
    id: string;
    status: string;
}

export interface TechItem {
    id: string;
    vehicle_brand: string;
    tech_dimension: string;
    secondary_tech_dimension?: string;
    name: string;
    description: string;
    reliability: number;
    created_at: string;
    updated_at: string;
    history?: TechItemHistory[];
    
    // Front-end extra props
    field?: string;
    status?: string; // used for application status in UI
    original_url?: string;
    sourceArticleTitle?: string;
    isSelected?: boolean;
    analysisState?: 'idle' | 'analyzing' | 'generating_html' | 'done' | 'error' | 'review';
    markdownContent?: string;
    markdownDetail?: string;
    htmlContent?: string;
    htmlCode?: string;
    logs?: string[];
    usedModel?: string;
}

export interface TechItemHistory {
    id: string;
    event_time: string;
    change_type: string;
    description_snapshot: string;
    reliability_snapshot: number;
    article_id?: string;
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
    page: number;
    size: number;
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

export interface LlmSearchRequest {
    query_text: string;
}

export interface DocumentTask {
    id: string;
    status: string;
    // ... other fields if needed for documentProcessing.ts
}

export interface PaginatedDocumentsResponse extends PaginatedResponse<DocumentTask> {} // Or UploadedDocument

export interface StratifyTask {
    id: string;
    scenario_name: string;
    input_text: string;
    status: string;
    created_at: string;
}

export interface GenerateStreamParams {
    prompt: string;
    // legacy
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
    base_url?: string;
    api_key?: string; // usually hidden
    models: string;
    is_active: boolean;
}

export interface StratifyPrompt {
    id: string;
    name: string;
    description?: string;
    content: string;
    variables?: string[];
    scenario_id?: string;
    channel_code?: string;
    model_id?: string;
}

export interface ModelPricing {
    id?: string;
    channel_code: string; // was model_name in one file, normalized here
    model: string; // was model_name in another
    model_name?: string; // alias
    input_price: number;
    output_price: number;
    multiplier: number;
    is_active: boolean;
}

export interface AgentSession {
    id: string;
    agent_id: string;
    title: string;
    current_stage: string;
    context_data: any;
    total_cost: number;
    updated_at: string;
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
    session_time: string;
    user_id: string;
    username?: string;
    email?: string;
    session_id: string;
    agent_id: string;
    model: string;
    total_input_tokens: number;
    total_output_tokens: number;
    original_cost: number;
    total_cost: number;
}

export interface UsageSummary {
    total_cost: number;
    total_original_cost: number;
    total_input_tokens: number;
    total_output_tokens: number;
}

export interface StratifyOutline {
    title: string;
    pages: { title: string; content: string }[];
}

export interface WorkflowConfig {
    variables: { name: string; label: string; type: string; required?: boolean; default?: string; options?: string[] }[];
    steps: {
        id: string;
        name: string;
        type: string;
        ui?: any;
        condition?: string;
        prompt_id?: string;
        llm_config?: { channel_code: string; model: string };
        input_mapping?: any;
    }[];
}

export interface QuotaConfig {
    id: string;
    plan_type: string;
    resource_key: string;
    limit_value: number;
    period: string;
    allow_overage: boolean;
    overage_unit_price: number;
    overage_strategy: string;
    remark?: string;
}

export interface QuotaItem {
    resource_key: string;
    usage_count: number;
    limit_value: number;
}

export interface WalletBalance {
    balance: number;
    plan_name?: string;
}

export interface RechargeResponse {
    order_no: string;
    pay_url?: string;
    qr_code_url?: string;
    message: string;
}

export interface WalletTransaction {
    id: string;
    user_id: string;
    transaction_type: string;
    amount: number;
    balance_after: number;
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
    created_at: string;
    paid_at?: string;
    external_order_no?: string;
}

export interface CommonSearchResponse {
    items: CommonSearchItem[];
    meta?: CommonSearchStatus;
}

export interface CommonSearchStatus {
    queue_length: number;
    proxy_enabled: boolean;
}

export interface CommonSearchItem {
    title: string;
    href: string;
    body: string;
}
