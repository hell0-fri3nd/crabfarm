import { batchSchema, downloadRecordSchema } from '../types/qr-stickers';

// Preview data shaped like the API until this page reads /batches and /crabs

export const PREVIEW_BATCHES = batchSchema.array().parse([
  { code: 'BATCH-3', number: 3, tagged_count: 15, groups: ['A', 'B', 'C', 'D', 'E'], crabs_per_group: 5 },
  { code: 'BATCH-2', number: 2, tagged_count: 25, groups: ['A', 'B', 'C', 'D', 'E'], crabs_per_group: 5 },
  { code: 'BATCH-1', number: 1, tagged_count: 20, groups: ['A', 'B', 'C', 'D'], crabs_per_group: 5 },
]);

export const PREVIEW_DOWNLOADS = downloadRecordSchema.array().parse([
  {
    id: 'dl-3',
    batch_code: 'BATCH-3',
    group: 'A',
    crabs_label: 'A1–A5',
    sheet_label: '40 mm, A4',
    file_type: 'pdf',
    downloaded_at_label: 'Mon 2 Nov, 8:10 AM',
    downloaded_by: 'Art Lisboa',
  },
  {
    id: 'dl-2',
    batch_code: 'BATCH-3',
    group: 'C',
    crabs_label: 'C1–C5',
    sheet_label: '40 mm, A4',
    file_type: 'pdf',
    downloaded_at_label: 'Mon 2 Nov, 8:14 AM',
    downloaded_by: 'Art Lisboa',
  },
  {
    id: 'dl-1',
    batch_code: 'BATCH-2',
    group: 'E',
    crabs_label: 'E2, E4',
    sheet_label: '30 mm, Long',
    file_type: 'png',
    downloaded_at_label: 'Fri 30 Oct, 4:52 PM',
    downloaded_by: 'Maria Santos',
  },
]);
