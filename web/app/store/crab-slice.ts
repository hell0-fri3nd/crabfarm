import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
// import type { RootState } from "./store";
import api from "./api";

interface CrabGroupDetails  {
    id: number;
    name: string
    group_by: string;
}

interface CrabApiResponse {
    status_code: number;
    detail: string;
    data: CrabGroupDetails[];
}

interface CrabState {
    groups: CrabGroupDetails[];
    loading: string;
    error: string | null;
}

const initialState: CrabState = {
    groups: [],
    loading: 'idle',
    error: null,
};

interface crabPayload
{
    "crab_id" : number,
    "type": string,
    "width": number,
    "weight": number
}

export const crab = createAsyncThunk<CrabGroupDetails[],string | null | undefined, { rejectValue: string }>(
    'crab-slice/crab',
    async (crab_group: string | undefined | null , thunkAPI) => {
        try {
            const url = (crab_group != undefined && crab_group != null && crab_group.trim() !== '')  ? `/crabs/${crab_group}` : `/crabs/`;
            const response = await api.get<CrabApiResponse>(url);
            return response.data?.data;
6
        } catch (error: any) {

            if (error.request && !error.response) {
                return thunkAPI.rejectWithValue(
                'Cannot connect to the server. Please check your internet connection or try again later.'
                );
            }
            if (error.response?.status === 401) {
                return thunkAPI.rejectWithValue('TOKEN_ACCESS_EXPIRED');
            }

            if (error.response?.status === 400) {
                return thunkAPI.rejectWithValue('TOKEN_REFRESH_EXPIRED');
            }

            const message = error?.response?.data?.error || 'Request failed';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const insertCrabLogs = createAsyncThunk<{ details: string }, crabPayload, { rejectValue: string }>(
    'crab-slice/insertCrabLogs',
    async (crabPayload, thunkAPI) => {
        try {

            const response = await api.post('/crabs/logs',crabPayload);
            return response.data.detail;


        } catch (error: any) {

            if (!error.response) {
                // If there is no response object, it's a network issue
                const networkErrorMessage = 'Cannot connect to the server. Please check your internet connection or try again later.';
                return thunkAPI.rejectWithValue(networkErrorMessage);
            }

            const message = error?.response.data?.detail || 'Login failed';
            return thunkAPI.rejectWithValue(message);
        }
    }
)

const crabSlice  = createSlice({    
    name: 'crab',
    initialState,
    reducers: {
        clearStatus: () => initialState
    },
    extraReducers: (builder) => {
        builder
        .addCase(crab.pending, (state) => {
            state.loading = 'pending';
            state.groups = [];
            state.error = null;
        })
        .addCase(crab.fulfilled, (state, action) => {
            state.loading = 'succeeded';
            state.groups = action.payload;
            state.error = null;
        })
        .addCase(crab.rejected, (state, action) => {
            state.loading = 'failed';
            state.groups = [];
            state.error = action.payload || 'Failed to fetch catch crabs list';
        }) 
    }
})

export default crabSlice.reducer;
export const { clearStatus } = crabSlice.actions;