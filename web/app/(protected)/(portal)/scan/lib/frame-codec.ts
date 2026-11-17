import type { DetectionBox } from '../types/detection';

type Size = { width: number; height: number };

const FRAME_HEADER_BYTES = 4;
const MAX_FRAME_ID = 2 ** 32;

export const nextFrameId = (frameId: number) => (frameId + 1) % MAX_FRAME_ID;

// [u32 big-endian frame_id][JPEG], the binary frame the API expects (api/context 02 §10a)
export const encodeFrame = async (frameId: number, jpeg: Blob) => {
  const body = new Uint8Array(await jpeg.arrayBuffer());
  const frame = new Uint8Array(FRAME_HEADER_BYTES + body.length);
  new DataView(frame.buffer).setUint32(0, frameId);
  frame.set(body, FRAME_HEADER_BYTES);
  return frame.buffer;
};

// The preview uses object-cover: scaled to fill the element and cropped evenly on the overflowing side
const toCover = (frame: Size, element: Size) => {
  const scale = Math.max(element.width / frame.width, element.height / frame.height);
  return {
    scaleX: frame.width * scale,
    scaleY: frame.height * scale,
    offsetX: (element.width - frame.width * scale) / 2,
    offsetY: (element.height - frame.height * scale) / 2,
  };
};

export const toCoverRect = (box: DetectionBox, frame: Size, element: Size) => {
  const { scaleX, scaleY, offsetX, offsetY } = toCover(frame, element);
  return {
    x: offsetX + box.x1 * scaleX,
    y: offsetY + box.y1 * scaleY,
    width: (box.x2 - box.x1) * scaleX,
    height: (box.y2 - box.y1) * scaleY,
  };
};
