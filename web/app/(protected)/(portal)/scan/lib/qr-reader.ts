import { z } from 'zod';

export type QrReader = {
  detect: (video: HTMLVideoElement) => Promise<unknown>;
};

const QR_OPTIONS = { formats: ['qr_code'] };

const formatsSchema = z.array(z.string());

// Chrome on Android reads QR natively; desktop Chrome on Mac can expose the API without the qr_code format
const createNativeReader = async (): Promise<QrReader | null> => {
  const Native: unknown = Reflect.get(window, 'BarcodeDetector');
  if (typeof Native !== 'function') return null;

  try {
    const getFormats: unknown = Reflect.get(Native, 'getSupportedFormats');
    const formats = formatsSchema.safeParse(typeof getFormats === 'function' ? await getFormats.call(Native) : []);
    return formats.success && formats.data.includes('qr_code') ? Reflect.construct(Native, [QR_OPTIONS]) : null;
  } catch {
    return null;
  }
};

// Safari, Firefox and the rest decode with ZXing (WebAssembly), loaded only when the camera starts
const createZxingReader = async (): Promise<QrReader | null> => {
  try {
    const { BarcodeDetector } = await import('barcode-detector/ponyfill');
    return new BarcodeDetector({ formats: ['qr_code'] });
  } catch {
    return null;
  }
};

export const createQrReader = async () => (await createNativeReader()) ?? (await createZxingReader());
