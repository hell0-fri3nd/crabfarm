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
import type { Batch, Crab } from '@/types/crab-management';

import CustomRecentLogs from './custom-recent-logs';
import CustomReviewForm from './custom-review-form';
import CustomScanViewport from './custom-scan-viewport';
import { createLog } from '../actions/create-log';
import { RECENT_LOGS, toRecentLog } from '../lib/recent-logs';
import { measurementSchema } from '../types/scan';

import type { RecentLogs } from './custom-recent-logs';
import type { MeasurementInput, MeasurementOutput, ScannedSticker } from '../types/scan';

type CustomScanWorkspaceProps = {
  batches: Batch[];
  crabs: Crab[];
  initialRecent: RecentLogs;
  loggedToday: number | null;
  isScaleConnected: boolean;
};

const STEPS: Step[] = [
  { id: 'scan', title: 'Scan sticker', description: 'Camera reads the QR' },
  { id: 'weigh', title: 'Weigh and measure', description: 'Type the weight and width' },
  { id: 'save', title: 'Check and save', description: 'Fix anything that looks off' },
];

const EMPTY_MEASUREMENT: MeasurementInput = { weight_g: '', width_mm: '' };

const MEASUREMENT_FIELDS = { weight_g: 'weight_g', width_mm: 'width_mm' } as const;

const isMeasurementField = (field: string): field is keyof typeof MEASUREMENT_FIELDS => field in MEASUREMENT_FIELDS;

const CustomScanWorkspace = ({ batches, crabs, initialRecent, loggedToday, isScaleConnected }: CustomScanWorkspaceProps) => {
  const [sticker, setSticker] = useState<ScannedSticker | null>(null);
  const [recent, setRecent] = useState(initialRecent);
  const [savedCount, setSavedCount] = useState(0);
  const form = useForm<MeasurementInput, unknown, MeasurementOutput>({
    resolver: zodResolver(measurementSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: EMPTY_MEASUREMENT,
  });
  const measurement = useWatch({ control: form.control });

  const isMeasured = measurementSchema.safeParse({ ...EMPTY_MEASUREMENT, ...measurement }).success;
  const stepIndex = Math.min(Number(sticker !== null) + Number(sticker !== null && isMeasured), STEPS.length - 1);

  const handleScan = useCallback(
    (scanned: ScannedSticker) => {
      setSticker(scanned);
      form.reset(EMPTY_MEASUREMENT);
      form.setFocus('weight_g');
    },
    [form],
  );

  const handleRescan = () => {
    setSticker(null);
    form.reset(EMPTY_MEASUREMENT);
  };

  const handleSave = async ({ weight_g, width_mm }: MeasurementOutput) => {
    if (!sticker) return;

    const result = await createLog({
      crab_id: sticker.crab_id,
      batch_id: sticker.batch_id,
      weight_g,
      width_mm,
    });

    if (!result.ok) {
      result.errors.forEach(({ field, message }) => {
        if (isMeasurementField(field)) form.setError(MEASUREMENT_FIELDS[field], { message });
      });
      notify.error(`Couldn't save ${sticker.code}`, { description: `${result.message} Nothing was saved.` });
      return;
    }

    const record = toRecentLog(result.data, { crabs, loggedAt: new Date().toISOString(), loggedBy: 'You' });
    setRecent((current) => ({ ...current, records: [record, ...current.records].slice(0, RECENT_LOGS) }));
    setSavedCount((count) => count + 1);
    setSticker(null);
    form.reset(EMPTY_MEASUREMENT);
    notify.success('Log saved · scanner ready for the next crab', {
      description: `${sticker.code} · ${weight_g} g · ${width_mm} mm`,
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <CustomPageHeader
        title="Scan crab"
        status={
          <>
            {loggedToday !== null && <span className="tabular-nums">{loggedToday + savedCount} logged today</span>}
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <CustomScanViewport batches={batches} crabs={crabs} sticker={sticker} onScan={handleScan} />
        <CustomReviewForm
          form={form}
          sticker={sticker}
          isScaleConnected={isScaleConnected}
          onSave={handleSave}
          onRescan={handleRescan}
        />
      </div>

      <CustomRecentLogs recent={recent} />
    </div>
  );
};

export default CustomScanWorkspace;
