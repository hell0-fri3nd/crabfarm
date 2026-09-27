import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "./api";
import type { RootState } from "./store";

interface statusDetails {
    "camera_status": boolean,
    "camera_url": string,
    "extracted_data": string,
    "height_cm": number,
    "width_cm": number
}

interface startStatus {
    "status": string
}


interface statusState {
    data: statusDetails | null;
    loading: 'idle' | 'pending' | 'succeeded' | 'failed';
    error: string | null;
    status: string | null;
}

const initialState: statusState = {
    data: null,
    loading: 'idle',
    error: null,
    status: ''
};


export const status = createAsyncThunk<statusDetails, void, { rejectValue: string }>(
    'camera-slice/status',
    async (__, thunkAPI) => {
        try {
            const state = thunkAPI.getState() as RootState;

            const response = await api.get('gateway/raspberry/camera/status');

            const details: statusDetails = {
                camera_status: response.data.camera_status,
                camera_url: import.meta.env.VITE_API_RASPBERRY_URL + "camera/stream",
                extracted_data: response.data.extracted_data || '',
                height_cm: response.data.height_cm,
                width_cm: response.data.width_cm,
            };

            return details;


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

export const start = createAsyncThunk<startStatus, void, { rejectValue: string }>(
    'camera-slice/start',
    async (__, thunkAPI) => {
        try {

            const state = thunkAPI.getState() as RootState;
            const response = await api.put('gateway/raspberry/camera/start',{});
            
            const status: startStatus = {
                status: response.data.camera_status,
            };

            return status;

        } catch (error: any) {

            if (error.request && !error.response) {
                return thunkAPI.rejectWithValue(
                'Cannot connect to the server. Please check your internet connection or try again later.'
                );
            }
            if (error.response?.status === 401) {
                return thunkAPI.rejectWithValue('ACCESS_TOKEN_EXPIRED');
            }
            
            if (error.response?.status === 400) {
                return thunkAPI.rejectWithValue('REFRESH_TOKEN_EXPIRED');
            }

            const message = error?.response?.data?.error || 'Request failed';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

const cameraSlice = createSlice({
    name: 'camera',
    initialState,
    reducers: {
        // optional: reset state
        clearStatus: () => initialState
    },
    extraReducers: (builder) => {
        builder
        .addCase(status.pending, (state) => {
            state.loading = 'pending';
            state.error = null;
        })
        .addCase(status.fulfilled, (state, action) => {
            state.loading = 'succeeded';
            state.data = action.payload;
            state.error = null;
        })
        .addCase(status.rejected, (state, action) => {
            state.loading = 'failed';
            state.error = action.payload || 'Failed to fetch camera status';
            state.data = null;
        })    
            
        .addCase(start.fulfilled, (state, action) => {
            state.status = action.payload.status;
        })
        .addCase(start.rejected, (state, action) => {
            state.status = action.payload || 'Server error ';
        });
    },
});


export default cameraSlice.reducer;
export const { clearStatus } = cameraSlice.actions;
