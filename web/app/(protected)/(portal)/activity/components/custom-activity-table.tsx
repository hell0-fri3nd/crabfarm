'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import CustomActivityActor from './custom-activity-actor';
import CustomActivityDetails from './custom-activity-details';
import CustomActivityEvent from './custom-activity-event';
import CustomActivityTypeBadge from './custom-activity-type-badge';

import type { ActivityEntry, DayGroup } from '../types/activity';

type CustomActivityTableProps = {
  groups: DayGroup[];
};

const OPEN_BUTTON =
  'rounded-md text-left outline-none hover:underline hover:underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50';

const CustomActivityTable = ({ groups }: CustomActivityTableProps) => {
  const [selected, setSelected] = useState<ActivityEntry | null>(null);

  return (
    <>
      <Card className="hidden gap-0 overflow-hidden py-0 md:flex">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-11 w-28 pl-4 sm:pl-6">Time</TableHead>
              <TableHead className="w-32">Type</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="w-64">By</TableHead>
              <TableHead className="w-12 pr-4 sm:pr-6">
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          {groups.map(({ key, label, entries }) => (
            <TableBody key={key}>
              <TableRow className="bg-background/60 hover:bg-background/60">
                <TableHead colSpan={5} scope="colgroup" className="h-11 pl-4 text-sm font-semibold text-foreground sm:pl-6">
                  {label}
                </TableHead>
              </TableRow>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="h-14 cursor-pointer" onClick={() => setSelected(entry)}>
                  <TableCell className="pl-4 text-muted-foreground tabular-nums sm:pl-6">{entry.time_label}</TableCell>
                  <TableCell>
                    <CustomActivityTypeBadge type={entry.type} />
                  </TableCell>
                  <TableCell className="font-medium whitespace-normal">
                    <button type="button" className={OPEN_BUTTON} onClick={() => setSelected(entry)}>
                      <CustomActivityEvent entry={entry} />
                    </button>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <CustomActivityActor entry={entry} />
                  </TableCell>
                  <TableCell className="pr-4 text-muted-foreground sm:pr-6">
                    <ChevronRight className="size-4" aria-hidden />
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
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(entry)}
                    className="flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:bg-muted/40"
                  >
                    <span className="flex w-full items-center justify-between gap-3">
                      <CustomActivityTypeBadge type={entry.type} />
                      <span className="text-xs text-muted-foreground tabular-nums">{entry.time_label}</span>
                    </span>
                    <span className="text-sm font-medium">
                      <CustomActivityEvent entry={entry} />
                    </span>
                    <CustomActivityActor entry={entry} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <CustomActivityDetails entry={selected} onClose={() => setSelected(null)} />
    </>
  );
};

export default CustomActivityTable;
