import CustomCardHeading from '@/components/custom/custom-card-heading';
import { Card, CardContent } from '@/components/ui/card';

import CustomSensorTile from './custom-sensor-tile';

import type { SensorReading } from '../types/dashboard';

type CustomWaterNowProps = {
  readings: SensorReading[];
};

const CustomWaterNow = ({ readings }: CustomWaterNowProps) => (
  <Card className="gap-5 rounded-2xl py-5 sm:py-6">
    <CustomCardHeading
      title="Water now"
      description={`${readings.length} sensors, read every 10 s`}
    />
    <CardContent className="px-4 sm:px-6">
      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {readings.map((reading) => (
          <li key={reading.kind}>
            <CustomSensorTile reading={reading} />
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

export default CustomWaterNow;
