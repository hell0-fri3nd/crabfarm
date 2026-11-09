import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import CustomActivityActor from './custom-activity-actor';
import CustomActivityTypeBadge from './custom-activity-type-badge';
import { formatEntryTime } from '../lib/activity-filters';

import type { DayGroup } from '../lib/activity-filters';

type CustomActivityTableProps = {
  groups: DayGroup[];
};

const CustomActivityTable = ({ groups }: CustomActivityTableProps) => (
  <>
    <Card className="hidden gap-0 overflow-hidden py-0 md:flex">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="h-11 w-28 pl-4 sm:pl-6">Time</TableHead>
            <TableHead className="w-32">Type</TableHead>
            <TableHead>Event</TableHead>
            <TableHead className="w-56 pr-4 sm:pr-6">By</TableHead>
          </TableRow>
        </TableHeader>
        {groups.map(({ key, label, entries }) => (
          <TableBody key={key}>
            <TableRow className="bg-background/60 hover:bg-background/60">
              <TableHead colSpan={4} scope="colgroup" className="h-11 pl-4 text-sm font-semibold text-foreground sm:pl-6">
                {label}
              </TableHead>
            </TableRow>
            {entries.map((entry) => (
              <TableRow key={entry.id} className="h-14">
                <TableCell className="pl-4 text-muted-foreground tabular-nums sm:pl-6">{formatEntryTime(entry.occurred_at)}</TableCell>
                <TableCell>
                  <CustomActivityTypeBadge type={entry.type} />
                </TableCell>
                <TableCell className="font-medium whitespace-normal">{entry.event}</TableCell>
                <TableCell className="pr-4 whitespace-normal sm:pr-6">
                  <CustomActivityActor entry={entry} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        ))}
      </Table>
    </Card>

    <div className="flex flex-col gap-6 md:hidden">
      {groups.map(({ key, label, entries }) => (
        <section key={key} aria-labelledby={`day-${key}`} className="flex flex-col gap-3">
          <h2 id={`day-${key}`} className="text-sm font-semibold">
            {label}
          </h2>
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <CustomActivityTypeBadge type={entry.type} />
                  <span className="text-xs text-muted-foreground tabular-nums">{formatEntryTime(entry.occurred_at)}</span>
                </div>
                <p className="text-sm font-medium">{entry.event}</p>
                <CustomActivityActor entry={entry} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  </>
);

export default CustomActivityTable;
