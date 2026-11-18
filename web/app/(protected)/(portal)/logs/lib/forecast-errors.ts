const MODEL_UNAVAILABLE = 503;

export const toForecastFailureMessage = (status: number, message: string) =>
  status === MODEL_UNAVAILABLE ? "The growth model isn't trained yet. Ask a developer to train it, then try again." : message;
