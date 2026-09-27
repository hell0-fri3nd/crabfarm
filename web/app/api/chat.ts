import api from "./api";

export interface ChatMessageDto {
    id: number;
    role: "user" | "assistant";
    content: string;
    created_at: string;
}

export interface ChatSessionDto {
    id: string;
    user_id: number | null;
    status: string;
    created_at: string;
    updated_at?: string;
    messages?: ChatMessageDto[];
}

export const createChatSession = async (): Promise<ChatSessionDto> => {
    const { data } = await api.post("/ai/chat/sessions");
    return data.data;
};

export const getChatSession = async ( limit = 30, offset = 0 ): Promise<ChatSessionDto> => {
    const { data } = await api.get(`/ai/chat/sessions`, {
        params: { limit, offset },
    });
    return data.data;
};

export const sendChatMessage = async (
    sessionId: string,
    content: string,
): Promise<{
    user_message: ChatMessageDto;
    assistant_message: ChatMessageDto;
}> => {
    const { data } = await api.post(`/ai/chat/sessions/${sessionId}/messages`, {
        content,
    });
    return data.data;
};


export const deleteChatSession = async (sessionId: string): Promise<void> => {
    await api.delete(`/ai/chat/sessions/${sessionId}`);
};