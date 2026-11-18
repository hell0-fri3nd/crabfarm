'use client';

import { useState } from 'react';
import { FileDown, ScrollText, SearchX } from 'lucide-react';

import CustomEmptyState from '@/components/custom/custom-empty-state';
import CustomForecastModelAlert from '@/components/custom/custom-forecast-model-alert';
import CustomPageHeader from '@/components/custom/custom-page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForecastModelStream } from '@/events/use-forecast-model-stream';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

import CustomCrabLogChart from './custom-crab-log-chart';
import CustomCrabLogTable from './custom-crab-log-table';
import CustomLogFilters from './custom-log-filters';
import CustomLogPagination from './custom-log-pagination';
import CustomRunPredictionButton from './custom-run-prediction-button';
import CustomSensorLogTable from './custom-sensor-log-table';
import { exportCrabLogs } from '../actions/export-crab-logs';
import { exportSensorLogs } from '../actions/export-sensor-logs';
import { withCrabName } from '../lib/crab-log-query';
import { crabLogsToCsv, resolveDateRange, sensorLogsToCsv } from '../lib/log-filters';
import { useLogsSearchParams } from '../lib/use-logs-search-params';
import { logTabSchema } from '../types/logs';

import type { ModelStatus } from '@/types/forecast-model';

import type { BatchOption } from './custom-log-filters';
import type { CrabLogChart, CrabLogPage, LogTab, SensorLogPage, SensorStatusCounts } from '../types/logs';

type CustomLogsViewProps = {
  crabPage: CrabLogPage;
  crabChart: CrabLogChart | null;
  sensorPage: SensorLogPage;
  sensorCounts: SensorStatusCounts;
  batches: BatchOption[];
  nowIso: string;
  canRunPrediction: boolean;
  canRetrain: boolean;
  modelStatus: ModelStatus | null;
  selfId: string;
};

const MODEL_ALERT_ID = 'growth-model-alert';

const TAB_LABELS = { crab: 'Crab logs', sensor: 'Sensor logs' } as const satisfies Record<LogTab, string>;

const CLEARED_FILTERS = { q: null, preset: null, from: null, to: null, batch: null, level: null, type: null };


const downloadCsv = (filename: string, csv: string) => {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const toCrabExport = async (filters: Record<string, string>) => {
  const result = await exportCrabLogs(filters);
  if (!result.ok) return result;
  const { rows, total } = result.data;
  return { ok: true as const, csv: crabLogsToCsv(rows), count: rows.length, total };
};

const toSensorExport = async (filters: Record<string, string>) => {
  const result = await exportSensorLogs(filters);
  if (!result.ok) return result;
  const { rows, total } = result.data;
  return { ok: true as const, csv: sensorLogsToCsv(rows), count: rows.length, total };
};

const CustomLogsView = ({
  crabPage,
  crabChart,
  sensorPage,
  sensorCounts,
  batches,
  nowIso,
  canRunPrediction,
  canRetrain,
  modelStatus,
  selfId,
}: CustomLogsViewProps) => {
  const { status: model, markTrainingStarted } = useForecastModelStream(modelStatus, selfId);
  const isModelMissing = model?.state === 'missing';
  const { params, rawParams, setParams, isPending } = useLogsSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  const isCrabTab = params.tab === 'crab';
  const crabTotal = crabChart?.total ?? crabPage.total;
  const now = new Date(nowIso);
  const dateRange = resolveDateRange(params, now);

  const visibleCount = isCrabTab ? crabTotal : sensorPage.total;
  const hasFilters = params.q !== '' || dateRange.isCustom || params.preset !== '7d' || params.batch !== 'all' || params.level !== 'all' || params.type !== 'all';
  const rangeText = dateRange.label.toLowerCase();

  const status = isCrabTab
    ? `${crabTotal} crab ${crabTotal === 1 ? 'log' : 'logs'} · ${rangeText}`
    : `${sensorPage.total} sensor ${sensorPage.total === 1 ? 'log' : 'logs'} · ${sensorCounts.danger} danger, ${sensorCounts.warning} warning · ${rangeText}`;

  const handleTabChange = (value: string) => {
    const parsed = logTabSchema.safeParse(value);
    if (parsed.success) setParams({ tab: parsed.data === 'crab' ? null : parsed.data, batch: null, level: null, type: null });
  };

  const exportFilename = `crabfarm-${params.tab}-logs-${rangeText.replaceAll(/[^a-z0-9]+/g, '-')}.csv`;

  const handleExport = async () => {
    const noun = isCrabTab ? 'crab logs' : 'sensor logs';
    setIsExporting(true);
    const exported = isCrabTab ? await toCrabExport(rawParams) : await toSensorExport(rawParams);
    setIsExporting(false);

    if (!exported.ok) {
      notify.error(`Couldn't export the ${noun}`, { description: `${exported.message} Nothing was downloaded.` });
      return;
    }

    const { csv, count, total } = exported;
    downloadCsv(exportFilename, csv);
    notify.success('CSV exported', {
      description: count < total ? `The first ${count} of ${total} ${noun}. Narrow the dates for the rest.` : `${count} ${noun}, ${rangeText}`,
    });
  };

  const handlePageChange = (page: number) => setParams({ page: page > 1 ? String(page) : null });

  const filteredHint = isCrabTab
    ? 'Try a wider date range, another batch or type, or a crab code like B1-A1.'
    : 'Try a wider date range, another level, or a sensor name like Ammonia.';
  const emptyHint = isCrabTab
    ? 'Logs appear here after a crab is scanned and weighed.'
    : 'All six water sensors are saved here every 30 minutes while they are connected.';

  const emptyState = (
    <CustomEmptyState
      icon={hasFilters ? SearchX : ScrollText}
      title={hasFilters ? 'No logs match these filters' : 'No logs yet'}
      hint={hasFilters ? filteredHint : emptyHint}
      action={
        hasFilters && (
          <Button type="button" variant="outline" className="h-11 bg-card" onClick={() => setParams(CLEARED_FILTERS)}>
            Clear filters
          </Button>
        )
      }
      className="rounded-xl border border-dashed border-border bg-card/60"
    />
  );

  return (
    <Tabs value={params.tab} onValueChange={handleTabChange} className="flex w-full flex-col gap-8">
      <CustomPageHeader
        title="Logs"
        status={<span>{status}</span>}
        actions={
          <>
            <TabsList className="h-11 bg-card p-1">
              {logTabSchema.options.map((tab) => (
                <TabsTrigger key={tab} value={tab} className="h-full px-4">
                  {TAB_LABELS[tab]}
                </TabsTrigger>
              ))}
            </TabsList>
            {isCrabTab && canRunPrediction && (
              <CustomRunPredictionButton disabledReasonId={isModelMissing ? MODEL_ALERT_ID : undefined} />
            )}
            <Button
              type="button"
              className="h-11 px-5"
              onClick={() => void handleExport()}
              disabled={visibleCount === 0 || isExporting}
            >
              <FileDown aria-hidden />
              {isExporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-5">
        {isCrabTab && model && (
          <CustomForecastModelAlert
            id={MODEL_ALERT_ID}
            status={model}
            canRetrain={canRetrain}
            onTrainingStarted={markTrainingStarted}
          />
        )}
        <CustomLogFilters params={params} batches={batches} dateRange={dateRange} now={now} onChange={setParams} />

        <TabsContent
          value="crab"
          aria-busy={isPending}
          className={cn('flex flex-col gap-5 transition-opacity', isPending && 'opacity-60')}
        >
          {crabTotal === 0 && !crabChart && emptyState}
          {crabChart && (
            <CustomCrabLogChart
              chart={crabChart}
              onCrabChange={(crabName) => setParams({ q: withCrabName(params.q, crabName) })}
            />
          )}
          {crabTotal > 0 && !crabChart && <CustomCrabLogTable logs={crabPage.rows} now={now} />}
          {crabTotal > 0 && !crabChart && (
            <CustomLogPagination {...crabPage} noun="crab logs" onPageChange={handlePageChange} />
          )}
        </TabsContent>

        <TabsContent
          value="sensor"
          aria-busy={isPending}
          className={cn('flex flex-col gap-5 transition-opacity', isPending && 'opacity-60')}
        >
          {sensorPage.total === 0 ? emptyState : <CustomSensorLogTable logs={sensorPage.rows} now={now} />}
          {sensorPage.total > 0 && (
            <CustomLogPagination {...sensorPage} noun="sensor logs" onPageChange={handlePageChange} />
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default CustomLogsView;
