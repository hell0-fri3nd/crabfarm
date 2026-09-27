export type ActivityLogs = {
  id: number;
  activity_type: string;
  description: string;
  value: number;
  user_id?: number | null;
  name?: string | null;
  created_at: string;
};
