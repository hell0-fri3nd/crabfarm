'use client';

import { useEffect } from 'react';

import { encodeFrame, nextFrameId } from '../lib/frame-codec';

type UseFrameCaptureOptions = {
  isEnabled: boolean;
  getVideo: () => HTMLVideoElement | null | undefined;
  canSend: () => boolean;
  sendFrame: (frame: ArrayBuffer) => boolean;
};

const MAX_FPS = 8;
// At 12 in a 40 mm sticker's QR is ~36 px in a 640 px frame, too small to read; 1280 px makes it ~72 px
const MAX_SIDE_PX = 1280;
const JPEG_QUALITY = 0.7;

const toJpeg = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));

export const useFrameCapture = ({ isEnabled, getVideo, canSend, sendFrame }: UseFrameCaptureOptions) => {
  useEffect(() => {
    if (!isEnabled) return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    let isActive = true;
    let isEncoding = false;
    let frameId = 0;
    let lastSentAt = 0;
    let handle = 0;

    const capture = async (now: number) => {
      handle = window.requestAnimationFrame(capture);
      const video = getVideo();
      const isDue = now - lastSentAt >= 1000 / MAX_FPS;
      if (!video || video.readyState < 2 || !video.videoWidth || isEncoding || !isDue || !canSend()) return;

      isEncoding = true;
      const scale = Math.min(1, MAX_SIDE_PX / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const jpeg = await toJpeg(canvas);
      isEncoding = false;
      if (!isActive || !jpeg) return;

      frameId = nextFrameId(frameId);
      if (sendFrame(await encodeFrame(frameId, jpeg))) lastSentAt = now;
    };

    handle = window.requestAnimationFrame(capture);
    return () => {
      isActive = false;
      window.cancelAnimationFrame(handle);
    };
  }, [isEnabled, getVideo, canSend, sendFrame]);
};
