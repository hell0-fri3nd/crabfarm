'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, CalendarClock, Check, CircleCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import CustomSeverityAlert from '@/components/custom/custom-severity-alert';
import { notify } from '@/lib/notify';

import type { DashboardAlert } from '../types/dashboard';

type CustomAlertListProps = {
  alerts: DashboardAlert[];
};

const ACTION_ICONS = { ask: Bot, feeding: CalendarClock } as const;

const CustomAlertList = ({ alerts }: CustomAlertListProps) => {
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const openAlerts = alerts.filter(({ id }) => !acknowledgedIds.includes(id));

  const handleAcknowledge = ({ id, title }: DashboardAlert) => {
    setAcknowledgedIds((current) => [...current, id]);
    notify.undo('Alert acknowledged', {
      description: title,
      onUndo: () => setAcknowledgedIds((current) => current.filter((acknowledgedId) => acknowledgedId !== id)),
    });
  };

  if (openAlerts.length === 0) {
    return (
      <section aria-label="Alerts" className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 text-sm">
        <CircleCheck className="size-4.5 text-primary" aria-hidden />
        <span>No open alerts. Every reading is being watched.</span>
      </section>
    );
  }

  return (
    <section aria-label="Alerts" className="flex flex-col gap-4">
      {openAlerts.map((alert) => {
        const ActionIcon = alert.action ? ACTION_ICONS[alert.action.kind] : null;

        return (
          <CustomSeverityAlert
            key={alert.id}
            level={alert.severity}
            title={alert.title}
            description={alert.description}
            actions={
              <>
                {alert.action && ActionIcon && (
                  <Button asChild variant="outline" size="sm" className="h-9 bg-card/60 text-foreground">
                    <Link href={alert.action.href}>
                      <ActionIcon aria-hidden />
                      {alert.action.label}
                    </Link>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 text-muted-foreground"
                  onClick={() => handleAcknowledge(alert)}
                >
                  <Check aria-hidden />
                  Acknowledge
                </Button>
              </>
            }
          />
        );
      })}
    </section>
  );
};

export default CustomAlertList;
