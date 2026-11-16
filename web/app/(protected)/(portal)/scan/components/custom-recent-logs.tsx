import Link from 'next/link';
import { CircleX, ScanLine, ScrollText } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { RecentLog } from '../types/scan';

export type RecentLogs = {
  records: RecentLog[];
  isEveryone: boolean;
  error: string | null;
};

type CustomRecentLogsProps = {
  recent: RecentLogs;
};

const FROZEN_CELL = 'sticky left-0 z-1 bg-card font-mono font-semibold';

const CustomRecentLogs = ({ recent: { records, isEveryone, error } }: CustomRecentLogsProps) => (
  <Card className="gap-5 rounded-2xl py-5 sm:py-6">
    <CustomCardHeading
      title={isEveryone ? 'Logged recently' : 'Your recent logs'}
      description={records.length > 0 ? `The latest ${records.length}, newest first.` : undefined}
      actions={
        <Button asChild variant="ghost" className="h-11 px-4 text-muted-foreground">
          <Link href="/logs">
            <ScrollText aria-hidden />
            All crab logs
          </Link>
        </Button>
      }
    />
    <CardContent className="px-4 sm:px-6">
      {error && (
        <CustomEmptyState icon={CircleX} title="Couldn't load recent logs" hint={`${error} Scanning and saving still work.`} />
      )}
      {!error && records.length === 0 && (
        <CustomEmptyState
          icon={ScanLine}
          title="Nothing logged yet"
          hint={
            isEveryone
              ? 'Crabs the team saves show up here, so you can catch a typo before you move on.'
              : 'Crabs you save show up here, so you can catch a typo before you move on.'
          }
        />
      )}
      {!error && records.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-120">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className={FROZEN_CELL}>Crab</TableHead>
                <TableHead className="text-right">Weight (g)</TableHead>
                <TableHead className="text-right">Width (mm)</TableHead>
                <TableHead className="text-right">Logged</TableHead>
                {isEveryone && <TableHead>By</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(({ id, code, weight_label, width_label, logged_at_label, logged_by }) => (
                <TableRow key={id}>
                  <TableCell className={FROZEN_CELL}>{code}</TableCell>
                  <TableCell className="text-right tabular-nums">{weight_label}</TableCell>
                  <TableCell className="text-right tabular-nums">{width_label}</TableCell>
                  <TableCell className="text-right tabular-nums">{logged_at_label}</TableCell>
                  {isEveryone && <TableCell>{logged_by}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

export default CustomRecentLogs;
