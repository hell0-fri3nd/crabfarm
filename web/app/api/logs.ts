import api from "./api";
import type { ActivityLogs } from "~/types/activity-logs";
import type { SensorLogs } from "~/types/sensor-logs";

export const getActivityLogs = async (activityType?: string, id?: number): Promise<ActivityLogs[]> => {
    try {
        let url = `logs/`;
        if (activityType !== undefined) url += `/${activityType}/`;
        if (id !== undefined) url += `/${id}/`;

        const response = await api.get(url);
        return response.data.data;
    } catch (err: any) {
        throw err.response?.data.detail;
    }
};

export const getSensorLogs = async (): Promise<SensorLogs[]> => {
    try {
        let url = `logs/sensor`;
        const response = await api.get(url);
        return response.data.data;
    } catch (err: any) {
        throw err.response?.data.detail;
    }
};