
// api/user.ts
import { USER_SERVICE_PATH } from '../config';
import { apiFetch, createApiQuery } from './helper';
import { 
    PaymentStatusResponse, 
    RefundableBalanceResponse, 
    RefundOrder, 
    RefundApplyResponse, 
    PaginatedResponse,
    User,
    WalletBalance,
    QuotaItem,
    RechargeResponse,
    WalletTransaction,
    UserListItem,
    UserForAdminUpdate,
    UserProfileDetails,
    QuotaConfig,
    PaymentOrder,
    AdminTransaction
} from '../types';

export interface PaymentStatusCheck { 
    status: 'paid' | 'pending' | 'failed' | 'expired';
}

export const checkPaymentStatus = (orderNo: string): Promise<PaymentStatusCheck> =>
    apiFetch<PaymentStatusCheck>(`${USER_SERVICE_PATH}/payment/status/${orderNo}`);

// --- Refund APIs ---

export const getRefundableBalance = (): Promise<RefundableBalanceResponse> =>
    apiFetch<RefundableBalanceResponse>(`${USER_SERVICE_PATH}/wallet/refund/refundable`);

export const applyRefund = (amount?: number, reason?: string): Promise<RefundApplyResponse> =>
    apiFetch<RefundApplyResponse>(`${USER_SERVICE_PATH}/wallet/refund/apply`, {
        method: 'POST',
        body: JSON.stringify({ amount, reason })
    });

export const getMyRefunds = async (params: any = {}): Promise<PaginatedResponse<RefundOrder>> => {
    const query = createApiQuery(params);
    const res = await apiFetch<any>(`${USER_SERVICE_PATH}/wallet/refund/list${query}`);
    return {
        items: res.items,
        total: res.total,
        page: res.page,
        limit: res.limit,
        totalPages: res.pages // Assuming backend returns 'pages'
    };
};

export const getMyQuotaUsage = (): Promise<QuotaItem[]> => 
    apiFetch<QuotaItem[]>(`${USER_SERVICE_PATH}/quota/usage`);

export const getWalletBalance = (): Promise<WalletBalance> => 
    apiFetch<WalletBalance>(`${USER_SERVICE_PATH}/wallet/balance`);

export const rechargeWallet = (amount: number, gateway: string = 'manual'): Promise<RechargeResponse> => 
    apiFetch<RechargeResponse>(`${USER_SERVICE_PATH}/wallet/recharge`, {
        method: 'POST',
        body: JSON.stringify({ amount, gateway })
    });

export const getWalletTransactions = (params: any): Promise<PaginatedResponse<WalletTransaction>> => {
    const query = createApiQuery(params);
    return apiFetch<any>(`${USER_SERVICE_PATH}/wallet/transactions${query}`).then(res => ({
        items: res.items,
        total: res.total,
        page: res.page,
        limit: res.size,
        totalPages: res.total_pages
    }));
}

export const getUserUsageStats = (): Promise<any> => 
    apiFetch<any>(`${USER_SERVICE_PATH}/usage/stats`); // New endpoint, return type any for now

// Admin APIs

export const getUsers = (params: any): Promise<PaginatedResponse<UserListItem>> => {
    const query = createApiQuery(params);
    return apiFetch<any>(`${USER_SERVICE_PATH}/list${query}`).then(res => ({
        items: res.items,
        total: res.total,
        page: res.page,
        limit: res.size,
        totalPages: res.total_pages
    }));
}

export const getUserById = (id: string): Promise<UserListItem> => 
    apiFetch<UserListItem>(`${USER_SERVICE_PATH}/${id}`);

export const updateUser = (id: string, data: UserForAdminUpdate): Promise<User> => 
    apiFetch<User>(`${USER_SERVICE_PATH}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

export const deleteUser = (id: string): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/${id}`, {
        method: 'DELETE'
    });

export const getUserPois = (): Promise<any[]> => 
    apiFetch<any[]>(`${USER_SERVICE_PATH}/pois`);

export const addUserPoi = (data: { content: string; keywords: string }): Promise<any> => 
    apiFetch<any>(`${USER_SERVICE_PATH}/pois`, { method: 'POST', body: JSON.stringify(data) });

export const deleteUserPoi = (id: string): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/pois/${id}`, { method: 'DELETE' });

export const getUserSubscribedSources = (): Promise<any[]> => 
    apiFetch<any[]>(`${USER_SERVICE_PATH}/subscriptions/sources`);

export const addUserSourceSubscription = (sourceId: string): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/subscriptions/sources/${sourceId}`, { method: 'POST' });

export const deleteUserSourceSubscription = (sourceId: string): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/subscriptions/sources/${sourceId}`, { method: 'DELETE' });

export const giftBalanceBatch = (data: { user_ids: string[]; amount: number; reason: string }): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/admin/wallet/gift/batch`, { method: 'POST', body: JSON.stringify(data) });

export const getQuotaConfigs = (): Promise<QuotaConfig[]> => 
    apiFetch<QuotaConfig[]>(`${USER_SERVICE_PATH}/admin/quota/configs`);

export const createQuotaConfig = (data: any): Promise<QuotaConfig> => 
    apiFetch<QuotaConfig>(`${USER_SERVICE_PATH}/admin/quota/configs`, { method: 'POST', body: JSON.stringify(data) });

export const deleteQuotaConfig = (id: string): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/admin/quota/configs/${id}`, { method: 'DELETE' });

export const getAdminTransactions = (params: any): Promise<PaginatedResponse<AdminTransaction>> => {
    const query = createApiQuery(params);
    return apiFetch<any>(`${USER_SERVICE_PATH}/admin/wallet/transactions${query}`).then(res => ({
        items: res.items,
        total: res.total,
        page: res.page,
        limit: res.size,
        totalPages: res.total_pages
    }));
};

export const getAdminOrders = (params: any): Promise<PaginatedResponse<PaymentOrder>> => {
    const query = createApiQuery(params);
    return apiFetch<any>(`${USER_SERVICE_PATH}/admin/wallet/orders${query}`).then(res => ({
        items: res.items,
        total: res.total,
        page: res.page,
        limit: res.size,
        totalPages: res.total_pages
    }));
};

export const getInitialBalanceConfig = (): Promise<{ value: string; description: string }> => 
    apiFetch<{ value: string; description: string }>(`${USER_SERVICE_PATH}/admin/config/initial_balance`);

export const updateInitialBalanceConfig = (data: { value: string; description: string }): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/admin/config/initial_balance`, { method: 'POST', body: JSON.stringify(data) });

export const getAdminRefunds = (params: any): Promise<PaginatedResponse<RefundOrder>> => {
    const query = createApiQuery(params);
    return apiFetch<any>(`${USER_SERVICE_PATH}/admin/refunds${query}`).then(res => ({
        items: res.items,
        total: res.total,
        page: res.page,
        limit: res.size,
        totalPages: res.total_pages
    }));
};

export const adminReviewRefund = (refundNo: string, action: 'approve' | 'reject', reason?: string): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/admin/refunds/${refundNo}/review`, { method: 'POST', body: JSON.stringify({ action, reason }) });

export const adminCreateRefund = (data: { user_id: string; amount: number; reason: string }): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/admin/refunds/create`, { method: 'POST', body: JSON.stringify(data) });

export const getUserProfileDetails = (userId: string): Promise<UserProfileDetails> => 
    apiFetch<UserProfileDetails>(`${USER_SERVICE_PATH}/admin/users/${userId}/details`);

// Pricing (Moved from User to Stratify in some places, but kept here for user facing pricing if needed, or aliases)
// Actually PricingManager uses api/stratify.ts for getPricings etc. But Admin/User/PricingManager uses api/user.ts
export const getModelPricings = (): Promise<any[]> => 
    apiFetch<any[]>(`${USER_SERVICE_PATH}/admin/pricing/models`); // Assuming endpoint exists in user service or proxies to stratify

export const createModelPricing = (data: any): Promise<any> => 
    apiFetch<any>(`${USER_SERVICE_PATH}/admin/pricing/models`, { method: 'POST', body: JSON.stringify(data) });

export const deleteModelPricing = (id: string): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/admin/pricing/models/${id}`, { method: 'DELETE' });
