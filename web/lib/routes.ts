export const SIGN_IN_HREF = '/sign-in';
export const PIN_HREF = '/pin';
export const ONBOARDING_HREF = '/team-onboarding';
export const END_SESSION_HREF = '/api/session/end';
export const RETURN_TO_PARAM = 'next';
// Set by proxy.ts, so server code that loses the session knows which page to come back to
export const PAGE_PATH_HEADER = 'x-crabfarm-page';
export const toPinHref = (returnTo?: string | null) =>
  returnTo ? `${PIN_HREF}?${new URLSearchParams({ [RETURN_TO_PARAM]: returnTo })}` : PIN_HREF;
// Same-origin path of the live-detection WebSocket; next.config.ts rewrites it to FastAPI (ADR-0003)
export const DETECTION_SOCKET_PATH = '/ws/detections';
