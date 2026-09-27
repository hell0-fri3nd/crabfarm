import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import axios, { type AxiosRequestConfig } from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const raspberry_api = axios.create({
    baseURL: import.meta.env.VITE_API_RASPBERRY_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});


export const axiosBaseQuery = (): BaseQueryFn<
    {
        url:      string;
        method:   AxiosRequestConfig['method'];
        data?:    AxiosRequestConfig['data'];
        params?:  AxiosRequestConfig['params'];
        headers?: AxiosRequestConfig['headers'];
    },
    unknown,
    unknown
    > => async ({ url, method, data, params, headers }) => {
    try {
        const result = await api({ url, method, data, params, headers });
        return { data: result.data };
    } catch (axiosError: any) {
      return { error: { status: axiosError.response?.status, data: axiosError.response?.data } };
    }
};

export default api;
