'use client';

import { FileDown, ScrollText, SearchX } from 'lucide-react';
import { subDays } from 'date-fns';

import CustomEmptyState from '@/components/custom/custom-empty-state';
import CustomPageHeader from '@/components/custom/custom-page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { notify } from '@/lib/notify';

import CustomCrabLogTable from './custom-crab-log-table';
import CustomLogFilters from './custom-log-filters';
import CustomLogPagination from './custom-log-pagination';
import CustomSensorLogTable from './custom-sensor-log-table';
import {
  countFlaggedSince,
  countOutOfRangeSince,
  crabLogsToCsv,
  filterCrabLogs,
  filterSensorLogs,
  paginate,
  resolveDateRange,
  sensorLogsToCsv,
} from '../lib/log-filters';
import { PREVIEW_CRAB_LOGS, PREVIEW_NOW, PREVIEW_SENSOR_LOGS } from '../lib/preview-logs';
import { useLogsSearchParams } from '../lib/use-logs-search-params';
import { logTabSchema } from '../types/logs';

import type { LogTab } from '../types/logs';

const TAB_LABELS = { crab: 'Crab logs', sensor: 'Sensor logs' } as const satisfies Record<LogTab, string>;

const CLEARED_FILTERS = { q: null, preset: null, from: null, to: null, batch: null, level: null };

const downloadCsv = (filename: string, csv: string) => {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const CustomLogsView = () => {
  const { params, setParams } = useLogsSearchParams();
  const now = PREVIEW_NOW;
  const dateRange = resolveDateRange(params, now);
  const weekStart = subDays(now, 7);
  const isCrabTab = params.tab === 'crab';

  const crabRows = filterCrabLogs(PREVIEW_CRAB_LOGS, params, dateRange);
  const sensorRows = filterSensorLogs(PREVIEW_SENSOR_LOGS, params, dateRange);
  const crabPage = paginate(crabRows, params.page);
  const sensorPage = paginate(sensorRows, params.page);
  const visibleCount = isCrabTab ? crabRows.length : sensorRows.length;
  const hasFilters = params.q !== '' || dateRange.isCustom || params.preset !== '7d' || params.batch !== 'all' || params.level !== 'all';

  const status = isCrabTab
    ? `${PREVIEW_CRAB_LOGS.length} crab logs · ${countFlaggedSince(PREVIEW_CRAB_LOGS, weekStart)} flagged this week`
    : `${PREVIEW_SENSOR_LOGS.length} sensor readings · ${countOutOfRangeSince(PREVIEW_SENSOR_LOGS, weekStart)} out of range this week`;

  const handleTabChange = (value: string) => {
    const parsed = logTabSchema.safeParse(value);
    if (parsed.success) setParams({ tab: parsed.data === 'crab' ? null : parsed.data, batch: null, level: null });
  };

  const handleExport = () => {
    const noun = isCrabTab ? 'crab logs' : 'sensor readings';
    const csv = isCrabTab ? crabLogsToCsv(crabRows) : sensorLogsToCsv(sensorRows);
    downloadCsv(`crabfarm-${params.tab}-logs-${dateRange.label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}.csv`, csv);
    notify.success('CSV exported', { description: `${visibleCount} ${noun}, ${dateRange.label.toLowerCase()}` });
  };

  const handlePageChange = (page: number) => setParams({ page: page > 1 ? String(page) : null });

  const emptyState = (
    <CustomEmptyState
      icon={hasFilters ? SearchX : ScrollText}
      title={hasFilters ? 'No logs match these filters' : 'No logs yet'}
      hint={
        hasFilters
          ? 'Try a wider date range, another batch or a shorter search.'
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
    <Tabs value={params.tab} onValueChange={handleTabChange} className="mx-auto flex w-full max-w-6xl flex-col gap-8">
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
            <Button type="button" className="h-11 px-5" onClick={handleExport} disabled={visibleCount === 0}>
              <FileDown aria-hidden />
              Export CSV
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-5">
        <CustomLogFilters params={params} dateRange={dateRange} now={now} onChange={setParams} />

        <TabsContent value="crab" className="flex flex-col gap-5">
          {crabPage.total === 0 ? emptyState : <CustomCrabLogTable logs={crabPage.rows} now={now} />}
          {crabPage.total > 0 && <CustomLogPagination {...crabPage} noun="crab logs" onPageChange={handlePageChange} />}
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
