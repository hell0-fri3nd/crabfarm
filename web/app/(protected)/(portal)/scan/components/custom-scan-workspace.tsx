'use client';

import { useCallback, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Scale } from 'lucide-react';

import CustomPageHeader from '@/components/custom/custom-page-header';
import CustomStepper from '@/components/custom/custom-stepper';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

import type { Step } from '@/components/custom/custom-stepper';

import CustomReviewForm from './custom-review-form';
import CustomScanViewport from './custom-scan-viewport';
import CustomSessionLog from './custom-session-log';
import { getPreviewCameraWidth, getPreviewForecast, getPreviewScaleReading } from '../lib/preview-scan';
import { measurementSchema } from '../types/scan';

import type { LoggedCrab, MeasurementInput, MeasurementOutput, ScannedSticker } from '../types/scan';

type CustomScanWorkspaceProps = {
  loggedToday: number;
  testCodes: readonly string[];
  isScaleConnected: boolean;
};

const STEPS: Step[] = [
  { id: 'scan', title: 'Scan sticker', description: 'Camera reads the QR' },
  { id: 'weigh', title: 'Weigh and measure', description: 'Scale and camera fill it in' },
  { id: 'save', title: 'Check and save', description: 'Fix anything that looks off' },
];

const EMPTY_MEASUREMENT: MeasurementInput = { weight_g: '', width_cm: '' };

const LOGGED_AT_FORMAT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

const CustomScanWorkspace = ({ loggedToday, testCodes, isScaleConnected }: CustomScanWorkspaceProps) => {
  const [sticker, setSticker] = useState<ScannedSticker | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [entries, setEntries] = useState<LoggedCrab[]>([]);
  const form = useForm<MeasurementInput, unknown, MeasurementOutput>({
    resolver: zodResolver(measurementSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: EMPTY_MEASUREMENT,
  });
  const measurement = useWatch({ control: form.control });

  const isMeasured = measurementSchema.safeParse({ ...EMPTY_MEASUREMENT, ...measurement }).success;
  const stepIndex = Math.min(Number(sticker !== null) + Number(sticker !== null && isMeasured), STEPS.length - 1);
  const forecast = sticker ? getPreviewForecast(sticker.code) : null;

  const handleScan = useCallback(
    (scanned: ScannedSticker) => {
      setSticker(scanned);
      form.reset({
        weight_g: isScaleConnected ? String(getPreviewScaleReading(scanned.code)) : '',
        width_cm: isCameraOn ? String(getPreviewCameraWidth(scanned.code)) : '',
      });
      form.setFocus('weight_g');
    },
    [form, isCameraOn, isScaleConnected],
  );

  const handleRescan = () => {
    setSticker(null);
    form.reset(EMPTY_MEASUREMENT);
  };

  const handleSave = ({ weight_g, width_cm }: MeasurementOutput) => {
    if (!sticker) return;
    const entry: LoggedCrab = {
      id: crypto.randomUUID(),
      code: sticker.code,
      weight_g,
      width_cm,
      logged_at_label: LOGGED_AT_FORMAT.format(new Date()),
    };
    setEntries((current) => [entry, ...current]);
    setSticker(null);
    form.reset(EMPTY_MEASUREMENT);
    notify.undo('Log saved · scanner ready for the next crab', {
      description: `${entry.code} · ${weight_g} g · ${width_cm} cm`,
      onUndo: () => setEntries((current) => current.filter(({ id }) => id !== entry.id)),
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <CustomPageHeader
        title="Scan crab"
        status={
          <>
            <span className="tabular-nums">{loggedToday + entries.length} logged today</span>
            <span className={cn('flex items-center gap-1.5 font-semibold', isScaleConnected ? 'text-primary' : 'text-warning')}>
              <Scale className="size-4" aria-hidden />
              <span aria-hidden className={cn('size-2 rounded-full', isScaleConnected ? 'bg-primary' : 'bg-warning')} />
              {isScaleConnected ? 'Scale connected' : 'Scale not connected'}
            </span>
            <span>Put the crab on the scale, then scan its sticker.</span>
          </>
        }
      />

      <CustomStepper steps={STEPS} currentIndex={stepIndex} label="Scan progress" />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <CustomScanViewport
          sticker={sticker}
          testCodes={testCodes}
          onScan={handleScan}
          onCameraChange={setIsCameraOn}
        />
        <CustomReviewForm
          form={form}
          sticker={sticker}
          forecast={forecast}
          isScaleConnected={isScaleConnected}
          isCameraOn={isCameraOn}
          onSave={handleSave}
          onRescan={handleRescan}
        />
      </div>

      <CustomSessionLog entries={entries} />
    </div>
  );
};

export default CustomScanWorkspace;
