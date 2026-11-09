import Link from 'next/link';
import { ScanLine, ScrollText } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { LoggedCrab } from '../types/scan';

type CustomSessionLogProps = {
  entries: LoggedCrab[];
};

const FROZEN_CELL = 'sticky left-0 z-1 bg-card font-mono font-semibold';

const CustomSessionLog = ({ entries }: CustomSessionLogProps) => (
  <Card className="gap-5 rounded-2xl py-5 sm:py-6">
    <CustomCardHeading
      title="Logged this session"
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
      {entries.length === 0 ? (
        <CustomEmptyState
          icon={ScanLine}
          title="Nothing logged yet"
          hint="Saved crabs show up here so you can catch a typo before you move on."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table className="min-w-120">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className={FROZEN_CELL}>Crab</TableHead>
                <TableHead className="text-right">Weight (g)</TableHead>
                <TableHead className="text-right">Width (cm)</TableHead>
                <TableHead className="text-right">Logged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(({ id, code, weight_g, width_cm, logged_at_label }) => (
                <TableRow key={id}>
                  <TableCell className={FROZEN_CELL}>{code}</TableCell>
                  <TableCell className="text-right tabular-nums">{weight_g}</TableCell>
                  <TableCell className="text-right tabular-nums">{width_cm}</TableCell>
                  <TableCell className="text-right tabular-nums">{logged_at_label}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

export default CustomSessionLog;
