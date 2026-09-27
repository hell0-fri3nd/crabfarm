import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '../api';

interface StatusDetails {
  status_code: number;
  detail: string;
}

export const statusApi = createApi({
  reducerPath: 'statusApi',
  baseQuery: axiosBaseQuery(),
  endpoints: (builder) => ({
    getStatus: builder.query<StatusDetails, void>({
      query: () => ({ url: 'auth/status', method: 'GET' }),
    }),
  }),
});


export const { useGetStatusQuery } = statusApi;