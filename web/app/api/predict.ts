import api from "./api";
import type { ApiResponse } from "~/types";

export const postPredictedCrab = async (crabId: number, batchId?: number | null): Promise<ApiResponse> => {
    try {
      let url = `predictions/${crabId}`;
      const response = await api.post(url, batchId != null ? { batch_id: batchId } : undefined);
      return response.data;
    } catch (err: any) {
      throw err.response?.data;
    }
};