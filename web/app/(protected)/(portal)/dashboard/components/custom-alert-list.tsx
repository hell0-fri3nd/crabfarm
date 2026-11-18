'use client';

import Link from 'next/link';
import { Bot, CalendarClock, Check, Waves } from 'lucide-react';

import { Button } from '@/components/ui/button';
import CustomSeverityAlert from '@/components/custom/custom-severity-alert';
import { notify } from '@/lib/notify';
import { toSortedWaterAlerts, toWaterAlertDescription, toWaterAlertTitle } from '@/lib/water-alerts';
import { toWaterAlertId, useDeviceStatusStore } from '@/stores/device-status-store';
import { SENSOR_STATUS_LABELS } from '@/types/sensor';

import type { DashboardAlert } from '../types/dashboard';

type CustomAlertListProps = {
  alerts: DashboardAlert[];
};

const ACTION_ICONS = { ask: Bot, feeding: CalendarClock } as const;

const ALERT_CARD_CLASS = 'h-full grid-rows-[auto_1fr]';

const CustomAlertList = ({ alerts }: CustomAlertListProps) => {
  const waterAlerts = useDeviceStatusStore((state) => state.waterAlerts);
  const acknowledgedIds = useDeviceStatusStore((state) => state.acknowledgedAlertIds);
  const acknowledgeAlert = useDeviceStatusStore((state) => state.acknowledgeAlert);
  const restoreAlert = useDeviceStatusStore((state) => state.restoreAlert);
  const openAlerts = alerts.filter(({ id }) => !acknowledgedIds.includes(id));
  const openWaterAlerts = toSortedWaterAlerts(waterAlerts).filter((alert) => !acknowledgedIds.includes(toWaterAlertId(alert)));

  const handleAcknowledge = (id: string, title: string) => {
    acknowledgeAlert(id);
    notify.undo('Alert acknowledged', { description: title, onUndo: () => restoreAlert(id) });
  };

  const renderAcknowledge = (id: string, title: string) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-9 text-muted-foreground"
      onClick={() => handleAcknowledge(id, title)}
    >
      <Check aria-hidden />
      Acknowledge
    </Button>
  );

  if (openAlerts.length === 0 && openWaterAlerts.length === 0) return null;

  return (
    <section aria-label="Alerts" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {openWaterAlerts.map((alert) => {
        const id = toWaterAlertId(alert);
        const title = toWaterAlertTitle(alert);

        return (
          <CustomSeverityAlert
            key={id}
            level={alert.status === 'danger' ? 'high' : 'medium'}
            badgeLabel={SENSOR_STATUS_LABELS[alert.status]}
            title={title}
            description={toWaterAlertDescription(alert)}
            className={ALERT_CARD_CLASS}
            actions={
              <>
                <Button asChild variant="outline" size="sm" className="h-9 bg-card/60 text-foreground">
                  <Link href="#water-now">
                    <Waves aria-hidden />
                    Check the water
                  </Link>
                </Button>
                {renderAcknowledge(id, title)}
              </>
            }
          />
        );
      })}
      {openAlerts.map((alert) => {
        const ActionIcon = alert.action ? ACTION_ICONS[alert.action.kind] : null;

        return (
          <CustomSeverityAlert
            key={alert.id}
            level={alert.severity}
            title={alert.title}
            description={alert.description}
            className={ALERT_CARD_CLASS}
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
                {renderAcknowledge(alert.id, alert.title)}
              </>
            }
          />
        );
      })}
    </section>
  );
};

export default CustomAlertList;
