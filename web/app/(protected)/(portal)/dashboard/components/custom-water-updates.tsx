import Link from 'next/link';
import { ScrollText } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import CustomSensorStatusBadge from '@/components/custom/custom-sensor-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import CustomWaterUpdatesRefresh from './custom-water-updates-refresh';
import CustomWaterValue from './custom-water-value';
import { toLoggedUpdates } from '../lib/water-sensors';

import type { WaterSensorInfo } from '@/lib/water-sensors';
import type { ApiSensorLog } from '@/types/water-sensor-log';

type CustomWaterUpdatesProps = {
  logs: ApiSensorLog[];
  now: Date;
  sensors: WaterSensorInfo[];
};

const toSensorHeading = ({ label, unit }: Pick<WaterSensorInfo, 'label' | 'unit'>) => (unit ? `${label} (${unit})` : label);

const CustomWaterUpdates = ({ logs, now, sensors }: CustomWaterUpdatesProps) => {
  const rows = toLoggedUpdates(logs, now, sensors);

  return (
    <Card id="water-updates" className="scroll-mt-20 gap-5 rounded-2xl py-5 sm:py-6">
      <CustomWaterUpdatesRefresh />
      <CustomCardHeading
        title="Water sensor updates"
        description="Latest sensor logs, saved every 30 minutes"
        actions={
          <Button asChild variant="outline" className="h-9 bg-card">
            <Link href="/logs?tab=sensor">
              <ScrollText aria-hidden />
              See all sensor logs
            </Link>
          </Button>
        }
      />
      <CardContent className="px-4 sm:px-6">
        {rows.length === 0 ? (
          <CustomEmptyState
            icon={ScrollText}
            title="No sensor logs yet"
            hint="The next log is saved at :00 or :30 while the worker and the sensors are running."
          />
        ) : (
          <>
            <div
              role="region"
              aria-label="Water sensor updates table"
              tabIndex={0}
              className="hidden max-h-96 overflow-auto rounded-xl border border-border lg:block"
            >
              <table className="w-full caption-bottom text-sm">
                <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 pl-4">Time</TableHead>
                    <TableHead>Status</TableHead>
                    {sensors.map((sensor) => (
                      <TableHead key={sensor.kind} className="text-right last:pr-4">
                        {toSensorHeading(sensor)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ key, time, readings, status }) => (
                    <TableRow key={key}>
                      <TableCell className="pl-4 text-muted-foreground tabular-nums">{time}</TableCell>
                      <TableCell>
                        <CustomSensorStatusBadge status={status} />
                      </TableCell>
                      {readings.map((reading) => (
                        <TableCell key={reading.kind} className="text-right last:pr-4">
                          <CustomWaterValue reading={reading} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </table>
            </div>

            <ul
              tabIndex={0}
              aria-label="Water sensor updates"
              className="grid max-h-96 grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2 lg:hidden"
            >
              {rows.map(({ key, time, readings, status }) => (
                <li key={key} className="flex flex-col gap-3 rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold tabular-nums">{time}</p>
                    <CustomSensorStatusBadge status={status} />
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {readings.map((reading) => (
                      <div key={reading.kind} className="flex min-w-0 flex-col">
                        <dt className="text-xs text-muted-foreground">{toSensorHeading(reading)}</dt>
                        <dd>
                          <CustomWaterValue reading={reading} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomWaterUpdates;
