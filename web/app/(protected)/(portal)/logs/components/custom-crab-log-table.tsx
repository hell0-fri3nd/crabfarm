import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toDayTimeLabel } from '@/lib/format';

import { LOG_TYPE_LABELS } from '../lib/log-filters';

import type { CrabLog } from '../types/logs';

type CustomCrabLogTableProps = {
  logs: CrabLog[];
  now: Date;
};

const MEASUREMENT_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

const formatMeasurement = (value: number | null, unit = '') =>
  value === null ? '—' : `${MEASUREMENT_FORMAT.format(value)}${unit}`;

const CustomCrabLogTable = ({ logs, now }: CustomCrabLogTableProps) => (
  <>
    <Card className="hidden gap-0 overflow-hidden py-0 lg:flex">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="h-11 pl-4 sm:pl-6">Crab</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Width mm</TableHead>
            <TableHead className="text-right">Weight g</TableHead>
            <TableHead>Logged by</TableHead>
            <TableHead className="pr-4 sm:pr-6">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} className="h-13">
              <TableCell className="pl-4 font-mono font-semibold sm:pl-6">{log.crab_code}</TableCell>
              <TableCell className="font-medium">{log.batch_label}</TableCell>
              <TableCell>{LOG_TYPE_LABELS[log.log_type]}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMeasurement(log.width_mm)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMeasurement(log.weight_g)}</TableCell>
              <TableCell className="font-medium">{log.logged_by}</TableCell>
              <TableCell className="pr-4 text-muted-foreground sm:pr-6">{toDayTimeLabel(log.logged_at, now)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>

    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden" aria-label="Crab logs">
      {logs.map((log) => (
        <li key={log.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-base font-semibold">{log.crab_code}</span>
            <span className="text-xs font-medium text-muted-foreground">{log.batch_label}</span>
          </div>
          <dl className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-3 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Type</dt>
              <dd className="font-semibold">{LOG_TYPE_LABELS[log.log_type]}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Width</dt>
              <dd className="font-semibold tabular-nums">{formatMeasurement(log.width_mm, ' mm')}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Weight</dt>
              <dd className="font-semibold tabular-nums">{formatMeasurement(log.weight_g, ' g')}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            {log.logged_by}, {toDayTimeLabel(log.logged_at, now)}
          </p>
        </li>
      ))}
    </ul>
  </>
);

export default CustomCrabLogTable;
