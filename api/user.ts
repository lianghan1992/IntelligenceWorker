
import { USER_SERVICE_PATH } from '../config';
import { 
    PaginatedResponse, UserListItem, UserForAdminUpdate, UserProfileDetails, 
    PlanDetails, ApiPoi, SystemSource, QuotaItem, WalletBalance, RechargeResponse,
    PaymentStatusResponse, QuotaConfig, ModelPricing,
    AdminTransaction, PaymentOrder, RefundableBalance, RefundOrder
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
        items: response.items || [],
        total: response.total || 0,
        page: response.page || 1,
        // 兼容 limit (API Doc) 和 size (Old Code)
        limit: response.limit || response.size || 20,
        // 兼容 totalPages (API Doc) 和 total_pages (Old Code)
        totalPages: response.totalPages || response.total_pages || 1
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
 */
export const getMyQuotaUsage = async (): Promise<QuotaItem[]> => {
    try {
        const res = await apiFetch<any>(`${USER_SERVICE_PATH}/usage/quota`);
        if (Array.isArray(res)) return res;
        if (res && res.quotas && Array.isArray(res.quotas)) return res.quotas;
        return [];
    } catch (e) {
        return [];
    }
};

export const getPersonalUsageHistory = (params: any = {}): Promise<any[]> => {
    const query = createApiQuery(params);
    return apiFetch<any[]>(`${USER_SERVICE_PATH}/usage/my${query}`);
};

/**
 * 获取钱包流水 (个人)
 */
export const getWalletTransactions = (params: any = {}): Promise<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    items: AdminTransaction[]; // Reuse AdminTransaction structure for simplicity as they are similar
}> => {
    const query = createApiQuery(params);
    return apiFetch<any>(`${USER_SERVICE_PATH}/wallet/transactions${query}`);
};

/**
 * 获取钱包余额
 */
export const getWalletBalance = (): Promise<WalletBalance> => 
    apiFetch<WalletBalance>(`${USER_SERVICE_PATH}/usage/quota`);

/**
 * 获取我的总消费统计
 */
export const getUserUsageStats = (): Promise<any> => 
    apiFetch(`${USER_SERVICE_PATH}/usage/stats`);

export const rechargeWallet = (amount: number, gateway: string = 'manual'): Promise<RechargeResponse> => 
    apiFetch(`${USER_SERVICE_PATH}/wallet/recharge`, {
        method: 'POST',
        body: JSON.stringify({ amount, gateway })
    });

export const checkPaymentStatus = (orderNo: string): Promise<PaymentStatusResponse> =>
    apiFetch(`${USER_SERVICE_PATH}/payment/status/${orderNo}`);

// --- Refund APIs ---
export const getRefundableBalance = (): Promise<RefundableBalance> =>
    apiFetch<RefundableBalance>(`${USER_SERVICE_PATH}/wallet/refund/refundable`);

export const applyRefund = (data: { amount?: number; reason: string }): Promise<{ total_amount: number; refund_orders: RefundOrder[] }> =>
    apiFetch(`${USER_SERVICE_PATH}/wallet/refund/apply`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const getMyRefunds = (params: any = {}): Promise<PaginatedResponse<RefundOrder>> => {
    const query = createApiQuery(params);
    return apiFetch(`${USER_SERVICE_PATH}/wallet/refunds${query}`);
};

export const getAdminRefunds = (params: any = {}): Promise<PaginatedResponse<RefundOrder>> => {
    const query = createApiQuery(params);
    return apiFetch(`${USER_SERVICE_PATH}/admin/refunds${query}`);
};

export const adminCreateRefund = (data: { user_id: string; amount: number; reason: string }): Promise<any> =>
    apiFetch(`${USER_SERVICE_PATH}/admin/refund/create`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const reviewRefund = (refundNo: string, action: 'approve' | 'reject', reason?: string): Promise<void> =>
    apiFetch(`${USER_SERVICE_PATH}/admin/refund/${refundNo}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
    });


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

/**
 * Admin Get All Transactions (Detailed)
 * /api/user/admin/transactions
 */
export const getAdminTransactions = async (params: any): Promise<PaginatedResponse<AdminTransaction>> => {
    const apiParams = { ...params };
    if (apiParams.limit) {
        apiParams.size = apiParams.limit;
        delete apiParams.limit;
    }
    const query = createApiQuery(apiParams);
    const response = await apiFetch<any>(`${USER_SERVICE_PATH}/admin/transactions${query}`);
    return {
        items: response.items || [],
        total: response.total || 0,
        page: response.page || 1,
        limit: response.limit || response.size || 20,
        totalPages: response.totalPages || response.total_pages || 1
    };
};

/**
 * Admin Get All Orders
 * /api/user/admin/orders
 */
export const getAdminOrders = async (params: any): Promise<PaginatedResponse<PaymentOrder>> => {
    const apiParams = { ...params };
    if (apiParams.limit) {
        apiParams.size = apiParams.limit;
        delete apiParams.limit;
    }
    const query = createApiQuery(apiParams);
    const response = await apiFetch<any>(`${USER_SERVICE_PATH}/admin/orders${query}`);
    return {
        items: response.items || [],
        total: response.total || 0,
        page: response.page || 1,
        limit: response.limit || response.size || 20,
        totalPages: response.totalPages || response.total_pages || 1
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

// --- System Config & Gifting (Admin) ---
export const getInitialBalanceConfig = (): Promise<{ value: string; description?: string }> =>
    apiFetch<{ value: string; description?: string }>(`${USER_SERVICE_PATH}/admin/config/initial-balance`);

export const updateInitialBalanceConfig = (data: { value: string; description?: string }): Promise<void> =>
    apiFetch<void>(`${USER_SERVICE_PATH}/admin/config/initial-balance`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const giftBalanceBatch = (data: { user_ids: string[]; amount: number; reason?: string }): Promise<{ message: string; count: number }> =>
    apiFetch<{ message: string; count: number }>(`${USER_SERVICE_PATH}/admin/gift`, {
        method: 'POST',
        body: JSON.stringify(data),
    });