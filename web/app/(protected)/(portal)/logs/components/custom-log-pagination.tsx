import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';

type CustomLogPaginationProps = {
  page: number;
  pageCount: number;
  start: number;
  end: number;
  total: number;
  noun: string;
  onPageChange: (page: number) => void;
};

const CustomLogPagination = ({ page, pageCount, start, end, total, noun, onPageChange }: CustomLogPaginationProps) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
      Showing {start}–{end} of {total} {noun}
    </p>
    <Pagination className="mx-0 w-auto justify-start sm:justify-end">
      <PaginationContent className="w-full justify-between gap-2 sm:w-auto">
        <PaginationItem>
          <Button
            type="button"
            variant="outline"
            className="h-11 bg-card px-4"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft aria-hidden />
            Previous
          </Button>
        </PaginationItem>
        <PaginationItem>
          <span className="px-2 text-sm text-muted-foreground tabular-nums">
            <span className="sr-only">Page </span>
            {page} / {pageCount}
          </span>
        </PaginationItem>
        <PaginationItem>
          <Button
            type="button"
            variant="outline"
            className="h-11 bg-card px-4"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight aria-hidden />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  </div>
);

export default CustomLogPagination;
