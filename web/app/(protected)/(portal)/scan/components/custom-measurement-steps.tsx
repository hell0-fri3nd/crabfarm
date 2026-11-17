import { Calculator } from 'lucide-react';

import { formatMm, formatScale } from '../lib/format-mm';

import type { DetectionResult } from '../types/detection';

type CustomMeasurementStepsProps = {
  result: DetectionResult;
  medianMm: number | null;
  samples: number;
};

type Step = { label: string; value: string };

const QR_SHARE_TEXT = '0.62';

const toSteps = (result: DetectionResult, medianMm: number | null, samples: number): Step[] => {
  const measurement = result.measurement;
  if (!measurement) return [];
  const box = result.boxes[measurement.box_index];
  const scale = formatScale(measurement.mm_per_px);
  const boxPx = formatMm(measurement.box_width_px);
  const isSticker = measurement.scale_source === 'sticker' && measurement.qr_side_px !== null;

  const scaleSteps: Step[] = isSticker
    ? [
        {
          label: 'QR side, printed',
          value: `${formatMm(measurement.sticker_mm)} mm sticker × ${QR_SHARE_TEXT} = ${formatMm(measurement.qr_side_mm)} mm`,
        },
        { label: 'QR side, seen', value: `${formatMm(measurement.qr_side_px ?? 0)} px` },
        {
          label: 'Scale (from the sticker)',
          value: `${formatMm(measurement.qr_side_mm)} mm ÷ ${formatMm(measurement.qr_side_px ?? 0)} px = ${scale} mm/px`,
        },
      ]
    : [
        {
          label: 'Scale (stand, no sticker seen)',
          value: `2 × ${formatMm(measurement.distance_mm)} mm × tan(${formatMm(measurement.fov_deg)}° ÷ 2) ÷ ${measurement.frame_long_px} px = ${scale} mm/px`,
        },
      ];

  return [
    { label: 'Measured object', value: box ? `${box.label} · ${Math.round(box.confidence * 100)}% sure` : 'Unknown' },
    { label: 'Frame', value: `${result.width} × ${result.height} px` },
    { label: 'Object width in the frame', value: `${boxPx} px (left to right)` },
    ...scaleSteps,
    ...(measurement.offset_mm === 0
      ? [{ label: 'Width, this frame', value: `${boxPx} px × ${scale} mm/px = ${formatMm(measurement.width_mm)} mm` }]
      : [
          {
            label: 'Width, scaled',
            value: `${boxPx} px × ${scale} mm/px = ${formatMm(measurement.box_width_px * measurement.mm_per_px)} mm`,
          },
          {
            label: 'Width, this frame',
            value: `${formatMm(measurement.box_width_px * measurement.mm_per_px)} mm ${measurement.offset_mm < 0 ? '−' : '+'} ${formatMm(Math.abs(measurement.offset_mm))} mm correction = ${formatMm(measurement.width_mm)} mm`,
          },
        ]),
    ...(isSticker
      ? [
          {
            label: 'Camera angle this implies',
            value: `2 × atan(${scale} × ${measurement.frame_long_px} ÷ (2 × ${formatMm(measurement.distance_mm)})) = ${formatMm(measurement.fov_deg)}°`,
          },
        ]
      : []),
    ...(medianMm === null
      ? []
      : [{ label: 'Width in the form', value: `median of the last ${samples} frames = ${formatMm(medianMm)} mm` }]),
  ];
};

// Shows every input and step of the width, so a reading that looks off can be traced to its cause
const CustomMeasurementSteps = ({ result, medianMm, samples }: CustomMeasurementStepsProps) => {
  const steps = toSteps(result, medianMm, samples);
  if (steps.length === 0) return null;

  return (
    <details className="rounded-xl border border-border bg-card/60 px-4 py-3 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold">
        <Calculator className="size-4" aria-hidden />
        How this width was computed
      </summary>
      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[auto_1fr]">
        {steps.map(({ label, value }) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
};

export default CustomMeasurementSteps;
