import { USER_SERVICE_PATH } from '../config';
import { 
    PaginatedResponse, UserListItem, UserForAdminUpdate, UserProfileDetails, 
    PlanDetails, ApiPoi, SystemSource 
} from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- User Management API (Admin) ---
export const getUsers = (params: any): Promise<PaginatedResponse<UserListItem>> => {
    const query = createApiQuery(params);
    // Add trailing slash to avoid backend redirect that causes Mixed Content error
    return apiFetch<PaginatedResponse<UserListItem>>(`${USER_SERVICE_PATH}/${query}`);
}

export const updateUser = (userId: string, data: UserForAdminUpdate): Promise<UserListItem> => 
    apiFetch<UserListItem>(`${USER_SERVICE_PATH}/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deleteUser = (userId: string): Promise<void> =>
    apiFetch<void>(`${USER_SERVICE_PATH}/${userId}`, {
        method: 'DELETE',
    });

export const getUserProfileDetails = (userId: string): Promise<UserProfileDetails> =>
    apiFetch<UserProfileDetails>(`${USER_SERVICE_PATH}/${userId}/profile/details`);

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