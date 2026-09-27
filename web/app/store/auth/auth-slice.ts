import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../api';

interface LoginPayload {
    email: string;
    password: string;
    remember_me: boolean;
}

interface pinPayload {
    pin: string;
}

interface User {
    message: string;
    user: string;
    email: string;   
    roles: string;
}

interface AuthState {
    isAuthenticated: boolean;
    refreshExpired: boolean;
    accessExpired: boolean;
    user: User | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: AuthState = {
    isAuthenticated: false,
    refreshExpired: false,
    accessExpired: false,
    user: null,
    status: 'idle',
    error: null,
}

export const login = createAsyncThunk<User, LoginPayload, { rejectValue: string }>(
    'auth-slice/login',
    async ({ email, password, remember_me}, thunkAPI) => {
        try {

            const response = await api.post('/auth/login', { email, password, remember_me});

            const userData: User = {
                message: response.data.detail,
                user: response.data.data.name,
                email: response.data.data.email,
                roles: response.data.data.role,
            };

            return userData;


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
);

export const pin = createAsyncThunk<User, pinPayload, { rejectValue: string }>(
    'auth-slice/pin',
    async ({ pin }, thunkAPI) => {
        try {

            const response = await api.post('/auth/pin', { pin });
            const userData: User = {
                message: response.data.detail,
                user: response.data.data.name,
                email: response.data.data.email,
                roles: response.data.data.role,
            };

            return userData;


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
);

export const logout = createAsyncThunk(
    'auth-slice/logout', 
    async (_,thunkAPI) => {
        try {
            await api.post('/auth/logout');
            return true;
        } catch (error: any) {
            return thunkAPI.rejectWithValue("Logout failed");
        }
    }
);

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearAuth: () => initialState,

        // 401
        accessExpired: (state) => {
            state.isAuthenticated   = true; // refresh token valid
            state.accessExpired     = false;
            state.refreshExpired    = true;
        },

        // 400
        refreshExpired: (state) => {
            state.isAuthenticated   = false; // refresh token valid
            state.accessExpired     = false;
            state.refreshExpired    = false;
        },
    },
    extraReducers: (builder) => {
        builder
        .addCase(login.pending, (state) => {
            state.status    = 'loading';
            state.error     = null;
        })
        .addCase(login.fulfilled, (state, action) => {
            state.status          = 'succeeded';
            state.isAuthenticated = true;
            state.accessExpired   = true;
            state.refreshExpired  = true;
            state.user = {
                user:       action.payload.user, 
                email:      action.payload.email,
                roles:      action.payload.roles,
                message:    action.payload.message
            }
            state.error     = null;
        })
        .addCase(login.rejected, (state, action) => {
            state.status            = 'failed';
            state.isAuthenticated   = false; // refresh token valid
            state.accessExpired     = false;
            state.refreshExpired    = false;
            state.user              = null;           
            state.error             = action.payload || 'Login failed';
        })
        .addCase(logout.fulfilled, (state) => {
            return initialState;  
        })
        .addCase(pin.fulfilled, (state, action) => {
            state.status            = 'succeeded';
            state.accessExpired     = true;
            state.user = {
                user:       action.payload.user, 
                email:      action.payload.email,
                roles:      action.payload.roles,
                message:    action.payload.message
            }
            state.error             = null;
        })
        .addCase(pin.rejected, (state, action) => {
            state.status            = 'failed';
            state.accessExpired     = false;
            state.user              = null;           
            state.error             = action.payload || 'Incorrect PIN';
        });
    },
});

export default authSlice.reducer;
export const { clearAuth, accessExpired, refreshExpired } = authSlice.actions;
