import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import CustomSensorName from './custom-sensor-name';
import CustomSensorStatus from './custom-sensor-status';
import { formatLogTime, formatReading } from '../lib/log-filters';

import type { SensorLog } from '../types/logs';

type CustomSensorLogTableProps = {
  logs: SensorLog[];
  now: Date;
};

const CustomSensorLogTable = ({ logs, now }: CustomSensorLogTableProps) => (
  <>
    <Card className="hidden gap-0 overflow-hidden py-0 lg:flex">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="h-11 pl-4 sm:pl-6">Sensor</TableHead>
            <TableHead className="text-right">Reading</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Safe range</TableHead>
            <TableHead className="pr-4 sm:pr-6">Measured</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} className="h-13">
              <TableCell className="pl-4 sm:pl-6">
                <CustomSensorName log={log} />
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{formatReading(log)}</TableCell>
              <TableCell>
                <CustomSensorStatus log={log} />
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">{log.safe_label}</TableCell>
              <TableCell className="pr-4 text-muted-foreground sm:pr-6">{formatLogTime(log.measured_at, now)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>

    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden" aria-label="Sensor logs">
      {logs.map((log) => (
        <li key={log.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <CustomSensorName log={log} />
            <CustomSensorStatus log={log} />
          </div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatReading(log)}</p>
          <p className="text-xs text-muted-foreground">
            Safe {log.safe_label}, {formatLogTime(log.measured_at, now)}
          </p>
        </li>
      ))}
    </ul>
  </>
);

export default CustomSensorLogTable;
