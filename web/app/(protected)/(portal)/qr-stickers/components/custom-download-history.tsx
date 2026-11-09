import { Download } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { DownloadRecord } from '../types/qr-stickers';

type CustomDownloadHistoryProps = {
  records: DownloadRecord[];
};

const FROZEN_CELL = 'sticky left-0 z-1 bg-card font-semibold';

const CustomDownloadHistory = ({ records }: CustomDownloadHistoryProps) => (
  <Card className="gap-5 rounded-2xl py-5 sm:py-6 print:hidden">
    <CustomCardHeading title="Downloaded recently" />
    <CardContent className="px-4 sm:px-6">
      {records.length === 0 ? (
        <CustomEmptyState
          icon={Download}
          title="No sheets downloaded yet"
          hint="Sheets you download show up here, so the next person knows which crabs already have stickers."
        />
      ) : (
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
                  <TableCell className={FROZEN_CELL}>{record.batch_code}</TableCell>
                  <TableCell>{record.group}</TableCell>
                  <TableCell className="font-mono">{record.crabs_label}</TableCell>
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
