'use client';

import { useEffect, useRef, useState } from 'react';

import { formatMm } from '../lib/format-measure';
import { toCoverRect } from '../lib/frame-codec';

import type { DetectionResult } from '../types/detection';

type CustomDetectionOverlayProps = {
  result: DetectionResult | null;
};

const LINE_WIDTH_PX = 2;
const MEASURED_LINE_WIDTH_PX = 3;
const LABEL_FONT_PX = 12;
const LABEL_PADDING_PX = 4;

const toLabel = (label: string, confidence: number, widthMm?: number) =>
  widthMm === undefined ? `${label} ${Math.round(confidence * 100)}%` : `${label} · ${formatMm(widthMm)} mm wide`;

const CustomDetectionOverlay = ({ result }: CustomDetectionOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    if (!result || !size.width) return;

    // Colours come from the theme tokens on the canvas element (text-* / bg-* classes), never hard-coded
    const styles = getComputedStyle(canvas);
    const stroke = styles.color;
    const labelText = styles.getPropertyValue('--sidebar-primary-foreground').trim() || styles.backgroundColor;
    context.lineWidth = LINE_WIDTH_PX;
    context.font = `600 ${LABEL_FONT_PX}px ${styles.fontFamily}`;
    context.textBaseline = 'top';

    const { measurement } = result;
    result.boxes.forEach((box, index) => {
      const isMeasured = measurement?.box_index === index;
      const rect = toCoverRect(box, result, size);
      context.strokeStyle = stroke;
      context.lineWidth = isMeasured ? MEASURED_LINE_WIDTH_PX : LINE_WIDTH_PX;
      context.strokeRect(rect.x, rect.y, rect.width, rect.height);

      const label = toLabel(box.label, box.confidence, isMeasured ? measurement.width_mm : undefined);
      const labelWidth = context.measureText(label).width + LABEL_PADDING_PX * 2;
      const labelHeight = LABEL_FONT_PX + LABEL_PADDING_PX * 2;
      const labelY = rect.y >= labelHeight ? rect.y - labelHeight : rect.y;
      context.fillStyle = stroke;
      context.fillRect(rect.x - LINE_WIDTH_PX / 2, labelY, labelWidth, labelHeight);
      context.fillStyle = labelText;
      context.fillText(label, rect.x + LABEL_PADDING_PX, labelY + LABEL_PADDING_PX);
    });
  }, [result, size]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full text-sidebar-primary" />;
};

export default CustomDetectionOverlay;
