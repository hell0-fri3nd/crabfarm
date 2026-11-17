// Per-device conveniences: storage can be blocked (private mode, cleared data), so every access is guarded
const CAMERA_KEY = 'crabfarm.scan.camera';

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null) => {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Not remembered; the choice still applies for this visit
  }
};

export const readSavedCamera = () => read(CAMERA_KEY);

export const saveCamera = (cameraId: string | null) => write(CAMERA_KEY, cameraId);
