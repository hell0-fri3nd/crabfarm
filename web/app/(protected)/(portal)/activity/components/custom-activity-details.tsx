'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import CustomActivityActor from './custom-activity-actor';
import CustomActivityEvent from './custom-activity-event';
import CustomActivityTypeBadge from './custom-activity-type-badge';
import CustomDetailList from './custom-detail-list';

import type { ActivityEntry } from '../types/activity';

type CustomActivityDetailsProps = {
  entry: ActivityEntry | null;
  onClose: () => void;
};

const SECTION = 'flex flex-col gap-3';
const SECTION_TITLE = 'text-sm font-semibold';

const CustomActivityDetails = ({ entry, onClose }: CustomActivityDetailsProps) => (
  <Sheet open={entry !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
    <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
      {entry && (
        <>
          <SheetHeader className="gap-3 border-b border-border p-6">
            <CustomActivityTypeBadge type={entry.type} />
            <SheetTitle className="text-lg leading-snug">
              <CustomActivityEvent entry={entry} />
            </SheetTitle>
            <SheetDescription>
              {entry.details.occurred_at_label}
              {entry.count > 1 && ` · happened ${entry.count} times that minute`}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-8 p-6">
            <section className={SECTION}>
              <h3 className={SECTION_TITLE}>Who</h3>
              <CustomActivityActor entry={entry} />
              <CustomDetailList
                rows={[
                  { label: 'Email', value: entry.details.actor_email },
                  { label: 'Role', value: entry.details.actor_role },
                ]}
              />
            </section>

            <section className={SECTION}>
              <h3 className={SECTION_TITLE}>What</h3>
              <CustomDetailList
                rows={[
                  { label: 'Action', value: entry.details.action, isCode: true },
                  { label: 'Target', value: entry.details.target },
                ]}
              />
            </section>

            <section className={SECTION}>
              <h3 className={SECTION_TITLE}>Result</h3>
              <CustomDetailList
                rows={[
                  { label: 'Outcome', value: entry.outcome_label ?? 'Succeeded' },
                  { label: 'Reason', value: entry.details.reason_label },
                  { label: 'Code', value: entry.details.reason_code, isCode: true },
                  { label: 'HTTP status', value: entry.details.http_status?.toString() ?? null },
                ]}
              />
            </section>

            {(entry.details.request ?? entry.details.source_ip ?? entry.details.user_agent) && (
              <section className={SECTION}>
                <h3 className={SECTION_TITLE}>Where</h3>
                <CustomDetailList
                  rows={[
                    { label: 'Request', value: entry.details.request, isCode: true },
                    { label: 'IP address', value: entry.details.source_ip, isCode: true },
                    { label: 'Device', value: entry.details.user_agent },
                  ]}
                />
              </section>
            )}

            {entry.details.changes && (
              <section className={SECTION}>
                <h3 className={SECTION_TITLE}>Recorded data</h3>
                <pre className="max-h-80 overflow-auto rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
                  {entry.details.changes}
                </pre>
              </section>
            )}
          </div>
        </>
      )}
    </SheetContent>
  </Sheet>
);

export default CustomActivityDetails;
