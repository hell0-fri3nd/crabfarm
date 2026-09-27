import type { Crab } from "~/types/crab";
import api from "./api";

export const getCrabLogs = async (logType: string, crabId?: number): Promise<Crab[]> => {
    try {
      let url = `crabs/logs/${logType}`;
      if (crabId !== undefined) url += `/${crabId}/`;
      const response = await api.get(url);
      return response.data.data;
    } catch (err: any) {
      throw err.response?.data.detail;
    }
};