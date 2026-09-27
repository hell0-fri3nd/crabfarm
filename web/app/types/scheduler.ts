export type SchedulerPayload = {
  type: string;
  scheduler_type: string;
  hour: number;
  seconds: number;
  is_enabled: boolean;
};

export type ApiControlResponse = {
  status_code: number;
  detail: {
    success: string
  };
};
export type SchedulerResponse = {
  status_code: number;
  data: {
    id: number;
    type: string;
    scheduler_type: "custom" | "daily" | "weekly" | "monthly";
    hour: number;
    seconds: number;
    is_enabled: boolean;
  }
  detail:string;
};