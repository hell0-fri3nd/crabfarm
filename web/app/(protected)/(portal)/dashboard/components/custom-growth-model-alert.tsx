'use client';

import CustomForecastModelAlert from '@/components/custom/custom-forecast-model-alert';
import { useForecastModelStream } from '@/events/use-forecast-model-stream';

import type { ModelStatus } from '@/types/forecast-model';

type CustomGrowthModelAlertProps = {
  initialStatus: ModelStatus | null;
  canRetrain: boolean;
  selfId: string;
};

const CustomGrowthModelAlert = ({ initialStatus, canRetrain, selfId }: CustomGrowthModelAlertProps) => {
  const { status, markTrainingStarted } = useForecastModelStream(initialStatus, selfId);
  if (!status) return null;

  return <CustomForecastModelAlert status={status} canRetrain={canRetrain} onTrainingStarted={markTrainingStarted} />;
};

export default CustomGrowthModelAlert;
