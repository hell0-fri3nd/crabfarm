export interface CrabBatch {
    id: number;
    user_id: number;
    description: string;
    created_at?: string | null;
}

export interface CrabGroup {
    id: number;
    name: string;
    group_by: string;
}

export interface CrabLogPayload {
    crab_id: number;
    type: 'actual' | 'prediction';
    width: number;
    weight: number;
    batch_id?: number | null;
}
