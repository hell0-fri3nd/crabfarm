import CustomCardHeading from '@/components/custom/custom-card-heading';
import CustomSeverityAlert from '@/components/custom/custom-severity-alert';
import { Card, CardContent } from '@/components/ui/card';
import { toFarmTime } from '@/lib/format';

import CustomSensorConnection from './custom-sensor-connection';
import CustomSensorTile from './custom-sensor-tile';
import { toInterruptionNotice, toSensorReadings } from '../lib/water-sensors';

import type { WaterSensorInfo } from '@/lib/water-sensors';

import type { SensorConnection, SensorInterruption } from '../lib/water-sensors';
import type { WaterSensorReading } from '../types/water-sensor';

type CustomWaterNowProps = {
  reading: WaterSensorReading | null;
  connection: SensorConnection;
  interruption: SensorInterruption | null;
  sensors: WaterSensorInfo[];
};

const toStatusLine = (reading: WaterSensorReading | null, connection: SensorConnection, sensorCount: number) => {
  const lastReading = reading && `Last reading ${toFarmTime(reading.received_at)}`;

  switch (connection) {
    case 'connected':
      return `${sensorCount} sensors reporting. ${lastReading ?? ''}`.trim();
    case 'disconnected':
      return lastReading ?? 'No reading yet';
    case 'offline':
      return 'Reconnecting to the live feed';
    case 'checking':
      return 'Listening for the sensors';
  }
};

const CustomWaterNow = ({ reading, connection, interruption, sensors }: CustomWaterNowProps) => {
  const readings = toSensorReadings(reading, connection === 'connected', sensors);
  const inDanger = readings.filter(({ status }) => status === 'danger').map(({ label }) => label);
  const notice = interruption && toInterruptionNotice(interruption, reading?.received_at ?? null);

  return (
    <Card id="water-now" className="scroll-mt-20 gap-5 rounded-2xl py-5 sm:py-6">
      <CustomCardHeading
        title="Water now"
        description={toStatusLine(reading, connection, sensors.length)}
        actions={<CustomSensorConnection connection={connection} />}
      />
      <CardContent className="flex flex-col gap-5 px-4 sm:px-6">
        {notice && (
          <CustomSeverityAlert
            level="medium"
            title={notice.title}
            description={notice.description}
            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
          />
        )}
        <p className="sr-only" aria-live="polite">
          {inDanger.length > 0 && `Danger: ${inDanger.join(', ')}`}
        </p>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {readings.map((sensor) => (
            <li key={sensor.kind}>
              <CustomSensorTile reading={sensor} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default CustomWaterNow;
