import type { ApiResponse } from "~/types";
import api from "./api";
import type { ApiControlResponse } from "~/types/control";

export const getDispensers = async () => {
    try {
        const response = await api.get(`controls/dispensers`);
        return response.data.detail;
    } catch (err: any) {
        throw err.response?.data.detail;
    }
};


export const setDispensers = async (dispenserID: number): Promise<ApiControlResponse> => {
    try {
      let url = `controls/dispensers/${dispenserID}`;
      const response = await api.post(url);
      return response.data;
    } catch (err: any) {
      throw err.response?.data;
    }
};

export const startFeeding = async (): Promise<ApiControlResponse> => {
    try {
      let url = `controls/start`;
      const response = await api.post(url);
      return response.data;
    } catch (err: any) {
      throw err.response?.data;
    }
};

export const pauseFeeding = async (): Promise<ApiControlResponse> => {
    try {
      let url = `controls/pause`;
      const response = await api.post(url);
      return response.data;
    } catch (err: any) {
      throw err.response?.data;
    }
};

export const stopFeeding = async (): Promise<ApiControlResponse> => {
    try {
      let url = `controls/stop`;
      const response = await api.post(url);
      return response.data;
    } catch (err: any) {
      throw err.response?.data;
    }
};