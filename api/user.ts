
import { USER_SERVICE_PATH } from '../config';
import { 
    PaginatedResponse, UserListItem, UserForAdminUpdate, UserProfileDetails, 
    PlanDetails, ApiPoi, SystemSource, QuotaItem, WalletBalance, RechargeResponse,
    PaymentStatusResponse, QuotaConfig, BillItem, BillStats, UserBillSummary, ModelPricing,
    WalletTransaction // Imported new type
} from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- User Management API (Admin) ---
export const getUsers = async (params: any): Promise<PaginatedResponse<UserListItem>> => {
    const apiParams = { ...params };
    if (apiParams.limit) {
        apiParams.size = apiParams.limit;
        delete apiParams.limit;
    }
    const query = createApiQuery(apiParams);
    const response = await apiFetch<any>(`${USER_SERVICE_PATH}/users${query}`);
    return {
        items: response.items,
        total: response.total,
        page: response.page,
        limit: response.size,
        totalPages: response.total_pages
    };
}

export const getUserById = (userId: string): Promise<UserListItem> =>
    apiFetch<UserListItem>(`${USER_SERVICE_PATH}/users/${userId}`);

export const updateUser = (userId: string, data: UserForAdminUpdate): Promise<UserListItem> => 
    apiFetch<UserListItem>(`${USER_SERVICE_PATH}/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deleteUser = (userId: string): Promise<void> =>
    apiFetch<void>(`${USER_SERVICE_PATH}/users/${userId}`, {
        method: 'DELETE',
    });

export const getUserProfileDetails = (userId: string): Promise<UserProfileDetails> =>
    apiFetch<UserProfileDetails>(`${USER_SERVICE_PATH}/users/${userId}/profile/details`);

// --- Plans API ---
export const getPlans = (): Promise<PlanDetails> => apiFetch<PlanDetails>(`${USER_SERVICE_PATH}/plans`);

// --- User POIs (Focus Points) ---
export const getUserPois = (): Promise<ApiPoi[]> => apiFetch<ApiPoi[]>(`${USER_SERVICE_PATH}/me/pois`);

export const addUserPoi = (data: { content: string; keywords: string }): Promise<ApiPoi> =>
    apiFetch<ApiPoi>(`${USER_SERVICE_PATH}/me/pois`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const deleteUserPoi = (poiId: string): Promise<void> => apiFetch<void>(`${USER_SERVICE_PATH}/me/pois/${poiId}`, { method: 'DELETE' });

// --- User Source Subscriptions ---
export const getUserSubscribedSources = (): Promise<SystemSource[]> => apiFetch<SystemSource[]>(`${USER_SERVICE_PATH}/me/sources`);

export const addUserSourceSubscription = (sourceId: string): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/me/sources/${sourceId}`, {
        method: 'POST',
    });

export const deleteUserSourceSubscription = (sourceId: string): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/me/sources/${sourceId}`, { method: 'DELETE' });

// --- Quota & Wallet ---

/**
 * 获取我的个人权益额度 (Used/Limit)
 * 注意：由于后端 API 变更，/usage/quota 可能现在只返回余额信息对象，不再返回数组。
 * 此处做兼容处理。
 */
export const getMyQuotaUsage = async (): Promise<QuotaItem[]> => {
    try {
        const res = await apiFetch<any>(`${USER_SERVICE_PATH}/usage/quota`);
        if (Array.isArray(res)) return res;
        // 如果返回的是对象且包含 quotas 数组，则返回 quotas
        if (res && res.quotas && Array.isArray(res.quotas)) return res.quotas;
        // 否则返回空数组，避免前端崩溃
        return [];
    } catch (e) {
        return [];
    }
};

/**
 * 获取我的个人 AI 使用历史记录 (消费流水)
 * 兼容旧接口，建议迁移至 getWalletTransactions
 */
export const getPersonalUsageHistory = (params: any = {}): Promise<any[]> => {
    const query = createApiQuery(params);
    return apiFetch<any[]>(`${USER_SERVICE_PATH}/usage/my${query}`);
};

/**
 * 获取钱包流水 (新接口)
 * 对接文档 5.2 节 /api/user/wallet/transactions
 */
export const getWalletTransactions = (params: any = {}): Promise<WalletTransaction[]> => {
    const query = createApiQuery(params);
    return apiFetch<WalletTransaction[]>(`${USER_SERVICE_PATH}/wallet/transactions${query}`);
};

/**
 * 获取钱包余额
 * 更新：使用 /api/user/usage/quota 接口，该接口现在返回 { balance, plan_name, remaining_balance }
 */
export const getWalletBalance = (): Promise<WalletBalance> => 
    apiFetch<WalletBalance>(`${USER_SERVICE_PATH}/usage/quota`);

export const rechargeWallet = (amount: number, gateway: string = 'manual'): Promise<RechargeResponse> => 
    apiFetch(`${USER_SERVICE_PATH}/wallet/recharge`, {
        method: 'POST',
        body: JSON.stringify({ amount, gateway })
    });

export const checkPaymentStatus = (orderNo: string): Promise<PaymentStatusResponse> =>
    apiFetch(`${USER_SERVICE_PATH}/payment/status/${orderNo}`);

// --- Quota Management (Admin) ---
export const getQuotaConfigs = (): Promise<QuotaConfig[]> => 
    apiFetch<QuotaConfig[]>(`${USER_SERVICE_PATH}/quotas`);

export const createQuotaConfig = (data: Partial<QuotaConfig>): Promise<void> => 
    apiFetch(`${USER_SERVICE_PATH}/quotas`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const deleteQuotaConfig = (id: string): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/quotas/${id}`, { method: 'DELETE' });

// --- Admin Billing & Finance ---
export const getAdminBills = async (params: any): Promise<PaginatedResponse<BillItem>> => {
    const apiParams = { ...params };
    if (apiParams.limit) {
        apiParams.size = apiParams.limit;
        delete apiParams.limit;
    }
    const query = createApiQuery(apiParams);
    const response = await apiFetch<any>(`${USER_SERVICE_PATH}/admin/bills${query}`);
    return {
        items: response.items,
        total: response.total,
        page: response.page,
        limit: response.size,
        totalPages: response.total_pages
    };
};

export const getAdminBillStats = (params: any): Promise<BillStats> => {
    const query = createApiQuery(params);
    return apiFetch<BillStats>(`${USER_SERVICE_PATH}/admin/bills/stats${query}`);
};

export const getAdminUserBillSummary = async (params: any): Promise<PaginatedResponse<UserBillSummary>> => {
    const apiParams = { ...params };
    if (apiParams.limit) {
        apiParams.size = apiParams.limit;
        delete apiParams.limit;
    }
    const query = createApiQuery(apiParams);
    const response = await apiFetch<any>(`${USER_SERVICE_PATH}/admin/bills/users/summary${query}`);
    return {
        items: response.items,
        total: response.total,
        page: response.page,
        limit: response.size,
        totalPages: response.total_pages
    };
};

export const getModelPricings = (): Promise<ModelPricing[]> => 
    apiFetch<ModelPricing[]>(`${USER_SERVICE_PATH}/admin/model-pricing`);

export const createModelPricing = (data: Partial<ModelPricing>): Promise<ModelPricing> => 
    apiFetch<ModelPricing>(`${USER_SERVICE_PATH}/admin/model-pricing`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const deleteModelPricing = (id: string | number): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/admin/model-pricing/${id}`, { method: 'DELETE' });
