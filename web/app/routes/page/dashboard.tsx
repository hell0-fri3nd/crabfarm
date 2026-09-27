import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Biohazard, ChartNoAxesCombined, Droplet, FlaskConical, ThermometerSun, Wind } from 'lucide-react';
import SensorCard from '~/components/sensor-card';
import type { SensorData } from '~/types';
import CardTemplate from "~/components/card-template";
import CrabChart from "~/components/crab-chart";


const Dashbooard = () => {
  const [data,setData] = React.useState<SensorData[]>([
    { Icon: ThermometerSun, description: 'Temperature', value: '0°C', rangesDescription: '0-40°C', percentage: 0, key: 'temperature', maxValue: 40 },
    { Icon: Droplet, description: 'pH Level', value: '0', rangesDescription: '0-14', percentage: 0, key: 'ph', maxValue: 14 },
    { Icon: Biohazard, description: 'TDS (Salinity)', value: '0 PSU', rangesDescription: '0-30ppt', percentage: 0, key: 'tds', maxValue: 30 },
    { Icon: FlaskConical, description: 'Ammonia', value: '0 mg/L', rangesDescription: '0-3ppm', percentage: 0, key: 'ammonium', maxValue: 3 },
    { Icon: Wind, description: 'Dissolved Oxygen', value: '0', rangesDescription: '0-15ppm', percentage: 0, key: 'do', maxValue: 15 }
  ]);
  const [isConnected, setIsConnected] = React.useState<boolean>(false);

  React.useEffect(() => {
    const socket = new WebSocket(`${import.meta.env.VITE_SOCKET_URL}/sensors`);

    // Connection opened
    socket.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };
  
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        setData(prev =>
            prev.map(sensor => {
              const val = data[sensor.key];
              if (val === undefined) return sensor;

              let valueStr = "";
              let warningRanges = [] as Array<[number, number]>;
              let dangerRanges = [] as Array<[number, number]>;

              // Assign units based on sensor key
              switch(sensor.key.toLowerCase()) {

                case 'do':
                  valueStr = `${val}ppm`;
                  warningRanges = [ 
                    [4.5, 4.9], 
                    [12.1, 12.5]
                  ];
                  dangerRanges = [
                    [0, 4.5], 
                    [12.5, Infinity]
                  ];
                break;

                case 'temperature':
                valueStr = `${val}°C`;

                warningRanges = [
                  [24.1, 24.5],
                  [35.1, 35.5]
                ];

                dangerRanges = [
                  [-Infinity, 24.1],
                  [35.5, Infinity]
                ];
              break;

              case 'ph':
                valueStr = `${val}`;

                warningRanges = [
                  [7.1, 7.4],
                  [9.1, 9.5]
                ];

                dangerRanges = [
                  [-Infinity, 7.1],
                  [9.5, Infinity]
                ];
              break;

              case 'tds':
                valueStr = `${val}ppt`;
                warningRanges = [
                  [14.5, 14.9],
                  [20.1, 20.5]
                ];

                dangerRanges = [
                  [-Infinity, 14.5],
                  [20.5, Infinity]
                ];
              break;

              case 'ammonium':
                valueStr = `${val}ppm`;
                warningRanges = [
                  [0.1, 0.4],
                  [3.1, 3.5]
                ];

                dangerRanges = [
                  [-Infinity, 0.1],
                  [3.5, Infinity]
                ];
                break;
            }
            return {
              ...sensor,
              value: valueStr,
              percentage: (val / sensor.maxValue) * 100,
              warningRanges: warningRanges,
              dangerRanges: dangerRanges
            };
          })
        );
      } catch (err) {
        console.error("Invalid JSON:", event.data);
      }
    };

    // Handle errors
    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      setIsConnected(false);
    };

    // Connection closed
    socket.onclose = () => {
      console.log("WebSocket closed");
      setIsConnected(false);
    };
    
    // socket.onopen = () => console.log("Connected!");
    // socket.onmessage = (event) => console.log("Message:", event.data);
    // socket.onerror = (err) => console.error("WebSocket error:", err);
    // socket.onclose = () => console.log("Closed");
  
    return () => socket.close();
  }, []);

  return (
    <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">
      <div className="border-b border-border/40 py-5">
          <div className="max-w-7xl">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Real-time monitoring and Prediction for your crab farming operation</p>
        </div>
      </div>
      <Tabs defaultValue="sensors">

        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-0 overflow-x-auto">

            <TabsList className="w-full sm:w-1/4 grid grid-cols-2 sm:grid-cols-2">
              
              <TabsTrigger value="sensors">
                <Droplet className="w-4 h-4" />
                <span>Sensors</span>
              </TabsTrigger>

              <TabsTrigger value="predictions">
                <ChartNoAxesCombined className="w-7 h-7" />
                <span>Predictions</span>
              </TabsTrigger>

            </TabsList> 

          <div className="grid auto-rows-min gap-4 sm:grid-cols-1">

            <TabsContent value="predictions">
              <CrabChart />
            </TabsContent>

            <TabsContent value="sensors">
              <CardTemplate 
              description="Realtime time update sensor data from all connected devices." 
              status={isConnected} 
              >
                <div className="flex h-full flex-1 flex-col gap-0 rounded-xl overflow-x-auto">
                  <div className="grid auto-rows-min gap-2 sm:grid-cols-3">
                    {data.map((sensor, index) => (
                      <SensorCard
                      key={index}
                      Icon={sensor.Icon}
                      description={sensor.description}
                      value={sensor.value}
                      rangesDescription={sensor.rangesDescription}
                      percentage={sensor.percentage}
                      warningRanges={sensor.warningRanges}
                      dangerRanges={sensor.dangerRanges}
                      />
                    ))}
                  </div>
                </div>
              </CardTemplate>
            </TabsContent>

          </div>     
        </div>

      </Tabs>
    </div>
  )
}

export default Dashbooard