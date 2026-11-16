import Link from 'next/link';
import { CircleX, Download, History } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { ACTIVITY_DOWNLOADS_HREF } from '../lib/download-history';
import { pluralize } from '../lib/sticker-sheet';

import type { DownloadHistory } from './custom-qr-stickers-workspace';

type CustomDownloadHistoryProps = {
  history: DownloadHistory;
};

const FROZEN_CELL = 'sticky left-0 z-1 bg-card font-semibold';

const CustomDownloadHistory = ({ history: { records, total, isEveryone, error } }: CustomDownloadHistoryProps) => (
  <Card className="gap-5 rounded-2xl py-5 sm:py-6 print:hidden">
    <CustomCardHeading
      title={isEveryone ? 'Downloaded recently' : 'Your recent downloads'}
      description={records.length > 0 ? `The latest ${pluralize(records.length, 'sheet')}, newest first.` : undefined}
      actions={
        records.length > 0 && (
          <Button asChild variant="outline" className="h-9 bg-card/60 px-4">
            <Link href={ACTIVITY_DOWNLOADS_HREF}>
              <History aria-hidden />
              See all {pluralize(total, 'download')}
            </Link>
          </Button>
        )
      }
    />
    <CardContent className="px-4 sm:px-6">
      {error && (
        <CustomEmptyState icon={CircleX} title="Couldn't load recent downloads" hint={`${error} The sticker sheet still works.`} />
      )}
      {!error && records.length === 0 && (
        <CustomEmptyState
          icon={Download}
          title="No sheets downloaded yet"
          hint={
            isEveryone
              ? 'Every sheet the team downloads shows up here, so the next person knows which crabs already have stickers.'
              : 'Sheets you download show up here, so you know which crabs already have stickers.'
          }
        />
      )}
      {!error && records.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table className="min-w-180">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className={FROZEN_CELL}>Batch</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Crabs</TableHead>
                <TableHead>Sheet</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Downloaded</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className={FROZEN_CELL}>{record.batch_label}</TableCell>
                  <TableCell>{record.group}</TableCell>
                  <TableCell>{record.crabs_label}</TableCell>
                  <TableCell>{record.sheet_label}</TableCell>
                  <TableCell>{record.file_type.toUpperCase()}</TableCell>
                  <TableCell className="tabular-nums">{record.downloaded_at_label}</TableCell>
                  <TableCell>{record.downloaded_by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

export default CustomDownloadHistory;
