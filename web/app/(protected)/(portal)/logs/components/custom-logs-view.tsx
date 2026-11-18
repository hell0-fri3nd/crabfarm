'use client';

import { useState } from 'react';
import { FileDown, ScrollText, SearchX } from 'lucide-react';
import { subDays } from 'date-fns';

import CustomEmptyState from '@/components/custom/custom-empty-state';
import CustomPageHeader from '@/components/custom/custom-page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

import CustomCrabLogChart from './custom-crab-log-chart';
import CustomCrabLogTable from './custom-crab-log-table';
import CustomLogFilters from './custom-log-filters';
import CustomLogPagination from './custom-log-pagination';
import CustomRunPredictionButton from './custom-run-prediction-button';
import CustomSensorLogTable from './custom-sensor-log-table';
import { exportCrabLogs } from '../actions/export-crab-logs';
import { countOutOfRangeSince, crabLogsToCsv, filterSensorLogs, paginate, resolveDateRange, sensorLogsToCsv } from '../lib/log-filters';
import { PREVIEW_NOW, PREVIEW_SENSOR_LOGS } from '../lib/preview-logs';
import { useLogsSearchParams } from '../lib/use-logs-search-params';
import { logTabSchema } from '../types/logs';

import type { BatchOption } from './custom-log-filters';
import type { CrabLogChart, CrabLogPage, LogTab } from '../types/logs';

type CustomLogsViewProps = {
  crabPage: CrabLogPage;
  crabChart: CrabLogChart | null;
  batches: BatchOption[];
  nowIso: string;
  canRunPrediction: boolean;
};

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

const CustomLogsView = ({
  crabPage,
  crabChart,
  batches,
  nowIso,
  canRunPrediction,
}: CustomLogsViewProps) => {
  const { params, rawParams, setParams, isPending } = useLogsSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  const isCrabTab = params.tab === 'crab';
  const crabTotal = crabChart?.total ?? crabPage.total;
  const now = isCrabTab ? new Date(nowIso) : PREVIEW_NOW;
  const dateRange = resolveDateRange(params, now);

  const sensorRows = filterSensorLogs(PREVIEW_SENSOR_LOGS, params, dateRange);
  const sensorPage = paginate(sensorRows, params.page);
  const visibleCount = isCrabTab ? crabTotal : sensorRows.length;
  const hasFilters = params.q !== '' || dateRange.isCustom || params.preset !== '7d' || params.batch !== 'all' || params.level !== 'all' || params.type !== 'all';
  const rangeText = dateRange.label.toLowerCase();

  const status = isCrabTab
    ? `${crabTotal} crab ${crabTotal === 1 ? 'log' : 'logs'} · ${rangeText}`
    : `${PREVIEW_SENSOR_LOGS.length} sensor readings · ${countOutOfRangeSince(PREVIEW_SENSOR_LOGS, subDays(now, 7))} out of range this week`;

  const handleTabChange = (value: string) => {
    const parsed = logTabSchema.safeParse(value);
    if (parsed.success) setParams({ tab: parsed.data === 'crab' ? null : parsed.data, batch: null, level: null, type: null });
  };

  const exportFilename = `crabfarm-${params.tab}-logs-${rangeText.replaceAll(/[^a-z0-9]+/g, '-')}.csv`;

  const handleExport = async () => {
    if (!isCrabTab) {
      downloadCsv(exportFilename, sensorLogsToCsv(sensorRows));
      notify.success('CSV exported', { description: `${sensorRows.length} sensor readings, ${rangeText}` });
      return;
    }

    setIsExporting(true);
    const result = await exportCrabLogs(rawParams);
    setIsExporting(false);

    if (!result.ok) {
      notify.error("Couldn't export the crab logs", { description: `${result.message} Nothing was downloaded.` });
      return;
    }

    const { rows, total } = result.data;
    downloadCsv(exportFilename, crabLogsToCsv(rows));
    notify.success('CSV exported', {
      description:
        rows.length < total ? `The first ${rows.length} of ${total} crab logs. Narrow the dates for the rest.` : `${rows.length} crab logs, ${rangeText}`,
    });
  };

  const handlePageChange = (page: number) => setParams({ page: page > 1 ? String(page) : null });

  const emptyState = (
    <CustomEmptyState
      icon={hasFilters ? SearchX : ScrollText}
      title={hasFilters ? 'No logs match these filters' : 'No logs yet'}
      hint={
        hasFilters
          ? 'Try a wider date range, another batch or type, or a crab code like B1-A1.'
          : 'Logs appear here after a crab is scanned and weighed, or a sensor reports.'
      }
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
            {isCrabTab && canRunPrediction && <CustomRunPredictionButton />}
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
              series={params.type === 'prediction' ? 'prediction' : 'actual'}
              onSeriesChange={(type) => setParams({ type: type === 'actual' ? null : type })}
            />
          )}
          {crabTotal > 0 && !crabChart && <CustomCrabLogTable logs={crabPage.rows} now={now} />}
          {crabTotal > 0 && !crabChart && (
            <CustomLogPagination {...crabPage} noun="crab logs" onPageChange={handlePageChange} />
          )}
        </TabsContent>

        <TabsContent value="sensor" className="flex flex-col gap-5">
          {sensorPage.total === 0 ? emptyState : <CustomSensorLogTable logs={sensorPage.rows} now={now} />}
          {sensorPage.total > 0 && (
            <CustomLogPagination {...sensorPage} noun="readings" onPageChange={handlePageChange} />
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default CustomLogsView;
