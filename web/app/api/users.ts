import api from "./api";
import type { ApiResponse } from "~/types";
import type { CreateUserPayload, ManagedUser, ResetUserPayload } from "~/types/users";

export const getUsers = async (): Promise<ManagedUser[]> => {
    try {
        const response = await api.get(`auth/profile/user`);
        return response.data.data;
    } catch (err: any) {
        throw err.response?.data.detail;
    }
};

export const createUser = async (data: CreateUserPayload): Promise<ApiResponse> => {
    try {
        const response = await api.post(`auth/profile/user`, data);
        return response.data;
    } catch (err: any) {
        throw err.response?.data.detail;
    }
};

export const resetUserCredentials = async (
    user_id: number,
    data: ResetUserPayload
): Promise<ApiResponse> => {
    try {
        const response = await api.put(`auth/profile/user/${user_id}`, data);
        return response.data;
    } catch (err: any) {
        throw err.response?.data.detail;
    }
};

export const deleteUser = async (user_id: number): Promise<ApiResponse> => {
    try {
        const response = await api.delete(`auth/profile/user/${user_id}`);
        return response.data;
    } catch (err: any) {
        throw err.response?.data.detail;
    }
};