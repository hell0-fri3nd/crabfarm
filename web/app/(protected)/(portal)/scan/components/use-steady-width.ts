'use client';

import { useState } from 'react';

import type { DetectionResult } from '../types/detection';

const WINDOW = 7;
const MIN_SAMPLES = 5;
const STEADY_SPREAD_MM = 1.5;
// QR reading drops the odd frame even when nothing moved; only a run of misses means the sticker left the view
const MAX_MISSES = 3;

type Tracked = { result: DetectionResult | null; widths: number[]; misses: number };

const toMedian = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};

const track = ({ widths, misses }: Tracked, result: DetectionResult | null): Tracked => {
  const width = result?.measurement?.width_mm;
  if (width === undefined) {
    return misses + 1 >= MAX_MISSES ? { result, widths: [], misses: 0 } : { result, widths, misses: misses + 1 };
  }
  return { result, widths: [...widths, width].slice(-WINDOW), misses: 0 };
};

// A single frame's width jitters with hand shake and QR corner noise; the median of recent frames doesn't
export const useSteadyWidth = (result: DetectionResult | null) => {
  const [tracked, setTracked] = useState<Tracked>({ result: null, widths: [], misses: 0 });
  if (tracked.result !== result) setTracked(track(tracked, result));

  const { widths } = tracked;
  if (widths.length === 0) return { widthMm: null, isSteady: false, samples: 0 };

  const spread = Math.max(...widths) - Math.min(...widths);
  return {
    widthMm: toMedian(widths),
    isSteady: widths.length >= MIN_SAMPLES && spread <= STEADY_SPREAD_MM,
    samples: widths.length,
  };
};
