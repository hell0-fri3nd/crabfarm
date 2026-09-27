import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import {
    createChatSession,
    getChatSession,
    sendChatMessage as sendChatMessageApi,
    type ChatMessageDto,
} from "../api/chat";

export const CHAT_HISTORY_LIMIT = 30;

export interface ChatMessageLike {
    role: "user" | "assistant";
    content: string;
}

export interface SendMessageResult {
    user_message: ChatMessageDto;
    assistant_message: ChatMessageDto;
}

interface ChatState {
    sessionId: string | null;
    history: ChatMessageLike[];
    version: number;
    open: boolean;
    loading: "idle" | "pending" | "succeeded" | "failed";
    sending: boolean;
    error: string | null;
}

const initialState: ChatState = {
    sessionId: null,
    history: [],
    version: 0,
    open: false,
    loading: "idle",
    sending: false,
    error: null,
};

/**
 * Fetches the latest session messages whenever the chatbot is opened.
 * Messages are capped by `getChatSession`'s limit (CHAT_HISTORY_LIMIT).
 */
export const loadChatHistory = createAsyncThunk<
    { sessionId: string | null; history: ChatMessageLike[] },
    void,
    { rejectValue: string }
>("chat-slice/loadChatHistory", async (_, thunkAPI) => {
    try {
        const session = await getChatSession(CHAT_HISTORY_LIMIT, 0);
        const history = (session.messages ?? []).map(({ role, content }) => ({
            role,
            content,
        }));

        return { sessionId: session.id ?? null, history };
    } catch (error: any) {
        // Sessions are server-side state; a missing/closed session just
        // means there is nothing to restore yet.
        const detail = error?.response?.data?.detail;
        if (detail === "Session has ended" || detail === "Session not found") {
            thunkAPI.dispatch(clearSession());
        }

        return { sessionId: null, history: [] };
    }
});

export const sendChatMessage = createAsyncThunk<
    SendMessageResult,
    string,
    { rejectValue: string; state: RootState }
>("chat-slice/sendChatMessage", async (content, thunkAPI) => {
    try {
        let sessionId = thunkAPI.getState().chat.sessionId;

        if (!sessionId) {
            const session = await createChatSession();
            sessionId = session.id;
            thunkAPI.dispatch(setSessionId(sessionId));
        }

        try {
            return await sendChatMessageApi(sessionId, content);
        } catch (error: any) {
            // Session was closed server-side -> start a fresh one and retry once
            const detail = error?.response?.data?.detail;
            if (detail === "Session has ended" || detail === "Session not found") {
                thunkAPI.dispatch(clearSession());
                const session = await createChatSession();
                thunkAPI.dispatch(setSessionId(session.id));
                return await sendChatMessageApi(session.id, content);
            }
            throw error;
        }
    } catch (error: any) {
        const message = error?.response?.data?.detail || error?.message || "Failed to send message";
        return thunkAPI.rejectWithValue(message);
    }
});

const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        setSessionId: (state, action: PayloadAction<string | null>) => {
            state.sessionId = action.payload;
        },
        setOpen: (state, action: PayloadAction<boolean>) => {
            state.open = action.payload;
        },
        clearSession: (state) => {
            state.sessionId = null;
            state.history = [];
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadChatHistory.pending, (state) => {
                state.loading = "pending";
                state.error = null;
            })
            .addCase(loadChatHistory.fulfilled, (state, action) => {
                state.loading = "succeeded";
                state.sessionId = action.payload.sessionId ?? state.sessionId;
                state.history = action.payload.history;
                // Bump the version so the runtime re-seeds with the fresh history.
                state.version += 1;
            })
            .addCase(loadChatHistory.rejected, (state, action) => {
                state.loading = "failed";
                state.error = action.payload || "Failed to load chat history";
            })
            .addCase(sendChatMessage.pending, (state) => {
                state.sending = true;
                state.error = null;
            })
            .addCase(sendChatMessage.fulfilled, (state) => {
                state.sending = false;
            })
            .addCase(sendChatMessage.rejected, (state, action) => {
                state.sending = false;
                state.error = action.payload || "Failed to send message";
            });
    },
});

export default chatSlice.reducer;
export const { setSessionId, setOpen, clearSession } = chatSlice.actions;