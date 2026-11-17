'use client';

import { useEffect, useState } from 'react';

export type CameraOption = { id: string; label: string };

const toCameraOptions = (devices: MediaDeviceInfo[]) =>
  devices
    .filter(({ kind, deviceId }) => kind === 'videoinput' && deviceId)
    .map(({ deviceId, label }, index) => ({ id: deviceId, label: label || `Camera ${index + 1}` }));

// Browsers only reveal camera ids and names after camera permission, so this runs once the camera is on
export const useCameraDevices = (isEnabled: boolean) => {
  const [cameras, setCameras] = useState<CameraOption[]>([]);

  useEffect(() => {
    const media = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
    if (!isEnabled || !media?.enumerateDevices) return;
    let isActive = true;

    const load = async () => {
      const devices = await media.enumerateDevices().catch(() => []);
      if (isActive) setCameras(toCameraOptions(devices));
    };

    void load();
    media.addEventListener('devicechange', load);
    return () => {
      isActive = false;
      media.removeEventListener('devicechange', load);
    };
  }, [isEnabled]);

  return cameras;
};
