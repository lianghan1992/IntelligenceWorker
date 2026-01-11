
import { USER_SERVICE_PATH } from '../config';
import { 
    PaginatedResponse, UserListItem, UserForAdminUpdate, UserProfileDetails, 
    PlanDetails, ApiPoi, SystemSource, QuotaItem, WalletBalance, RechargeResponse,
    PaymentStatusResponse, QuotaConfig
} from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- User Management API (Admin) ---
export const getUsers = async (params: any): Promise<PaginatedResponse<UserListItem>> => {
    // Map 'limit' to 'size' for the new API standard if present
    const apiParams = { ...params };
    if (apiParams.limit) {
        apiParams.size = apiParams.limit;
        delete apiParams.limit;
    }
    
    const query = createApiQuery(apiParams);
    // Updated endpoint: /api/user/users (was /user)
    const response = await apiFetch<any>(`${USER_SERVICE_PATH}/users${query}`);
    
    // Map response to frontend type
    return {
        items: response.items,
        total: response.total,
        page: response.page,
        limit: response.size, // Map 'size' back to 'limit'
        totalPages: response.total_pages // Map 'total_pages' back to 'totalPages'
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
export const getMyQuotaUsage = (): Promise<QuotaItem[]> => 
    apiFetch<QuotaItem[]>(`${USER_SERVICE_PATH}/usage/my`);

export const getWalletBalance = (): Promise<WalletBalance> => 
    apiFetch<WalletBalance>(`${USER_SERVICE_PATH}/wallet/balance`);

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
