'use client';

import { useDeviceStatusStream } from '@/events/use-device-status-stream';

// Lives in the portal layout, so every page shares one stream and alerts arrive on any page
const CustomDeviceStatusBridge = () => {
  useDeviceStatusStream();
  return null;
};

export default CustomDeviceStatusBridge;
