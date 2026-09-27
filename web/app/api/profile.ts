import type { ApiResponse } from "~/types";
import api from "./api";

export interface Profile {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at?: string | null;
    updated_at?: string | null;
}

export const getProfile = async (): Promise<Profile> => {
    try {
        const response = await api.get(`auth/profile`);
        return response.data.data;
    } catch (err: any) {
        throw err.response?.data.detail;
    }
};

export const updateProfileName = async (name: string): Promise<ApiResponse> => {
    try {
        const response = await api.patch(`auth/profile`, { name });
        return response.data;
    } catch (err: any) {
        throw err.response?.data.detail;
    }
};

export const updateProfileCredentials = async (data: {
    password?: string;
    pin?: string;
}): Promise<ApiResponse> => {
    try {
        const response = await api.patch(`auth/profile/password`, data);
        return response.data;
    } catch (err: any) {
        throw err.response?.data.detail;
    }
};