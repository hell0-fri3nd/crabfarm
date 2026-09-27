import type { SchedulerPayload, SchedulerResponse } from "~/types/scheduler";
import api from "./api";
import type { ApiResponse } from "~/types";

export const postScheduler = async (data : SchedulerPayload): Promise<ApiResponse> => {
    try {
      let url = `settings/schedules`;
      const response = await api.post(url,data);
      return response.data;
    } catch (err: any) {
      throw err.response?.data;
    }
};

export const updateScheduler = async (data : { id : number; is_enabled : boolean }): Promise<ApiResponse> => {
    try {
      let url = `settings/schedules`;
      const response = await api.put(url,data);
      return response.data;
    } catch (err: any) {
      throw err.response?.data;
    }
};

export const deleteScheduler = async (id: number): Promise<ApiResponse> => {
    try {
      let url = `settings/schedules/${id}`;
      const response = await api.delete(url);
      return response.data;
    } catch (err: any) {
      throw err.response?.data;  
    }
};

export const getScheduler = async (): Promise<SchedulerResponse> => {
    try {
      let url = `settings/schedules`;
      const response = await api.get(url);
      return response.data;
    } catch (err: any) {
      throw err.response?.data;
    }
};