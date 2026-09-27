export interface ManagedUser {
    id: number;
    name: string;
    email: string;
    role?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface CreateUserPayload {
    name: string;
    email: string;
}

export interface ResetUserPayload {
    reset_password?: boolean;
    reset_pin?: boolean;
}