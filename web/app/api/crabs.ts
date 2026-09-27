import api from "./api";
import type { ApiResponse } from "~/types";
import type { CrabBatch, CrabGroup, CrabLogPayload } from "~/types/crabs";

export const getBatches = async (): Promise<CrabBatch[]> => {
    try {
        const response = await api.get(`crabs/batch`);
        return response.data.data;
    } catch (err: any) {
        throw err.response?.data.detail;
    }
};

export const createBatch = async (): Promise<CrabBatch> => {
    try {
        const response = await api.post(`crabs/batch`);
        return response.data.data;
    } catch (err: any) {
        throw err.response?.data.detail;
    }
};

export const getCrabsByGroup = async (group: string): Promise<CrabGroup[]> => {
    try {
        const url = group && group.trim() !== '' ? `crabs/${group}` : `crabs/`;
        const response = await api.get(url);
        return response.data.data;
    } catch (err: any) {
        throw err.response?.data.detail;
    }
};

export const insertCrabLog = async (payload: CrabLogPayload): Promise<ApiResponse> => {
    try {
        const response = await api.post(`crabs/logs`, payload);
        return response.data;
    } catch (err: any) {
        throw err.response?.data.detail;
    }
};
